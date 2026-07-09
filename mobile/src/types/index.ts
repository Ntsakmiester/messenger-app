export interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  avatarUrl?: string;
  countryCode: string;
  isOnline?: boolean;
  publicKey?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
  status: "sent" | "delivered" | "read";
  createdAt: string;
  clientTempId?: string;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  user: User;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  title?: string;
  participants: ConversationParticipant[];
  messages?: Message[];
}