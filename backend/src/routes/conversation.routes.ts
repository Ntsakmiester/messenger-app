import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  startConversation,
  listConversations,
  getMessages,
} from "../controllers/conversation.controller";

const router = Router();

router.use(requireAuth);
router.post("/", startConversation);
router.get("/", listConversations);
router.get("/:conversationId/messages", getMessages);

export default router;
