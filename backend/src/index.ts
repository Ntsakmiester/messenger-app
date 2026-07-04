import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { createSocketServer } from "./socket/socketServer";
import authRoutes from "./routes/auth.routes";
import conversationRoutes from "./routes/conversation.routes";
import userRoutes from "./routes/user.routes";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", region: env.region });
});

app.use("/auth", authRoutes);
app.use("/conversations", conversationRoutes);
app.use("/users", userRoutes);

const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Messenger backend running on port ${env.port} (region: ${env.region})`);
});
