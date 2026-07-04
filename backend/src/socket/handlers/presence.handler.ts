import { Server, Socket } from "socket.io";
import { prisma } from "../../db/prisma";

// Tracks a user's online/offline status and last-seen timestamp, and
// broadcasts changes to their contacts. In production, consider tracking
// active connection counts in Redis (a user might have the app open on
// two devices) rather than a single boolean, so presence doesn't flicker
// when one device disconnects but another is still connected.
export function registerPresenceHandlers(io: Server, socket: Socket, userId: string) {
  markOnline(userId, io);

  socket.on("disconnect", () => {
    markOffline(userId, io);
  });
}

async function markOnline(userId: string, io: Server) {
  await prisma.user.update({ where: { id: userId }, data: { isOnline: true } });
  broadcastPresence(io, userId, true);
}

async function markOffline(userId: string, io: Server) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeenAt: new Date() },
  });
  broadcastPresence(io, userId, false, user.lastSeenAt);
}

async function broadcastPresence(io: Server, userId: string, isOnline: boolean, lastSeenAt?: Date) {
  // Notify everyone who has this user in a shared conversation.
  const conversations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const conversationIds = conversations.map((c) => c.conversationId);

  const peers = await prisma.conversationParticipant.findMany({
    where: { conversationId: { in: conversationIds }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
  });

  for (const peer of peers) {
    io.to(`user:${peer.userId}`).emit("presence:update", { userId, isOnline, lastSeenAt });
  }
}
