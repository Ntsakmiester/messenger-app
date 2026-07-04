import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across the app (avoids exhausting
// DB connections, especially important with serverless/hot-reload setups).
export const prisma = new PrismaClient();
