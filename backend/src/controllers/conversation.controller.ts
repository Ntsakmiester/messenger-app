import { Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AuthedRequest } from "../middleware/auth";

const startConversationSchema = z.object({
  participantUserIds: z.array(z.string().uuid()).min(1),
  isGroup: z.boolean().optional(),
  title: z.string().optional(),
});

// Creates a new 1:1 or group conversation between the current user and
// the given participant(s). For 1:1 chats, reuses an existing conversation
// if one already exists between the two users.
export async function startConversation(req: AuthedRequest, res: Response) {
  const parsed = startConversationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { participantUserIds, isGroup = false, title } = parsed.data;
  const currentUserId = req.userId!;
  const allParticipantIds = Array.from(new Set([currentUserId, ...participantUserIds]));

  if (!isGroup && allParticipantIds.length === 2) {
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: allParticipantIds.map((id) => ({
          participants: { some: { userId: id } },
        })),
      },
      include: { participants: true },
    });
    if (existing) return res.json(existing);
  }

  const conversation = await prisma.conversation.create({
    data: {
      isGroup,
      title: isGroup ? title : null,
      participants: {
        create: allParticipantIds.map((userId) => ({ userId })),
      },
    },
    include: { participants: true },
  });

  return res.status(201).json(conversation);
}

// Lists all conversations the current user is part of, with the most
// recent message preview for each (useful for a chat list screen).
export async function listConversations(req: AuthedRequest, res: Response) {
  const currentUserId = req.userId!;

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: currentUserId } } },
    include: {
      participants: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(conversations);
}

// Fetches paginated message history for a conversation.
export async function getMessages(req: AuthedRequest, res: Response) {
  const { conversationId } = req.params;
  const cursor = req.query.cursor as string | undefined;
  const limit = 50;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return res.json(messages.reverse());
}
