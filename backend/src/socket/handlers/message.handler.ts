import { Server, Socket } from "socket.io";
import { prisma } from "../../db/prisma";
import { sendPushNotification } from "../../services/push.service";

interface SendMessagePayload {
  conversationId: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
  clientTempId?: string; // lets the sender's UI reconcile optimistic messages
}

interface ReadReceiptPayload {
  conversationId: string;
  messageId: string;
}

interface TypingPayload {
  conversationId: string;
}

export function registerMessageHandlers(io: Server, socket: Socket, userId: string) {
  // Sending a message:
  // 1. Persist it to Postgres (source of truth, survives server restarts)
  // 2. Emit it to every participant's personal room so it's delivered
  //    instantly regardless of which regional server they're connected to
  //    (this cross-server delivery is handled transparently by the Redis
  //    adapter configured in socketServer.ts)
  socket.on("message:send", async (payload: SendMessagePayload) => {
    try {
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: payload.conversationId, userId } },
      });
      if (!participant) {
        socket.emit("error", { message: "Not a participant of this conversation" });
        return;
      }

      const message = await prisma.message.create({
        data: {
          conversationId: payload.conversationId,
          senderId: userId,
          body: payload.body,
          mediaUrl: payload.mediaUrl,
          mediaType: payload.mediaType,
          status: "sent",
        },
      });

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: payload.conversationId },
        include: { user: true },
      });

      const outgoing = { ...message, clientTempId: payload.clientTempId };
      for (const p of participants) {
        io.to(`user:${p.userId}`).emit("message:new", outgoing);
      }

      // Notify everyone except the sender. We send regardless of online
      // status here for simplicity — Expo Go/the OS will just not show a
      // banner if the app is open and in the foreground on that device.
      const sender = participants.find((p) => p.userId === userId)?.user;
      const recipients = participants.filter((p) => p.userId !== userId);
      for (const recipient of recipients) {
        sendPushNotification({
          pushToken: recipient.user.pushToken,
          title: sender?.displayName ?? "New message",
          body: payload.body ?? "Sent a message",
          data: { conversationId: payload.conversationId },
        });
      }
    } catch (err) {
      console.error("[message:send] error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Read receipts: mark a message read and notify the sender.
  socket.on("message:read", async (payload: ReadReceiptPayload) => {
    try {
      const message = await prisma.message.update({
        where: { id: payload.messageId },
        data: { status: "read" },
      });
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: payload.conversationId, userId } },
        data: { lastReadAt: new Date() },
      });
      io.to(`user:${message.senderId}`).emit("message:status", {
        messageId: message.id,
        status: "read",
      });
    } catch (err) {
      console.error("[message:read] error:", err);
    }
  });

  // Typing indicators: purely ephemeral, no DB write, just relayed live.
  socket.on("typing:start", async (payload: TypingPayload) => {
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: payload.conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const p of participants) {
      io.to(`user:${p.userId}`).emit("typing:update", {
        conversationId: payload.conversationId,
        userId,
        isTyping: true,
      });
    }
  });

  socket.on("typing:stop", async (payload: TypingPayload) => {
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: payload.conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const p of participants) {
      io.to(`user:${p.userId}`).emit("typing:update", {
        conversationId: payload.conversationId,
        userId,
        isTyping: false,
      });
    }
  });
}