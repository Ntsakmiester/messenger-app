import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { env } from "../config/env";
import { verifyAuthToken } from "../utils/jwt";
import { registerMessageHandlers } from "./handlers/message.handler";
import { registerPresenceHandlers } from "./handlers/presence.handler";

export interface AuthedSocketData {
  userId: string;
}

// Sets up Socket.io with a Redis adapter. This is the key piece that lets
// you run multiple server instances (e.g. one in eu-west, one in us-east,
// one in ap-south) behind a load balancer, while still letting a user
// connected to the EU server send a message to a user connected to the
// Asia server in real time - Redis pub/sub relays events between instances.
export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }, // tighten this to your app's domains in production
  });

  const pubClient = createClient({ url: env.redisUrl });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`[socket] Redis adapter connected (region: ${env.region})`);
    })
    .catch((err) => {
      console.error("[socket] Failed to connect Redis adapter:", err);
    });

  // Authenticate every socket connection using the same JWT issued by
  // the REST auth endpoints.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = verifyAuthToken(token);
      (socket.data as AuthedSocketData).userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket.data as AuthedSocketData;
    console.log(`[socket] user ${userId} connected (region: ${env.region})`);

    // Each user joins a personal room named after their userId. This lets
    // us push events to "all of this user's active devices/tabs" without
    // needing to track individual socket IDs.
    socket.join(`user:${userId}`);

    registerPresenceHandlers(io, socket, userId);
    registerMessageHandlers(io, socket, userId);

    socket.on("disconnect", () => {
      console.log(`[socket] user ${userId} disconnected`);
    });
  });

  return io;
}
