import { Router, Response } from "express";
import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Find a user by phone number, e.g. when adding a new contact.
// This is how cross-continent users find each other: by phone number,
// exactly like WhatsApp's contact discovery.
router.get("/lookup", async (req: AuthedRequest, res: Response) => {
  const phoneNumber = req.query.phoneNumber as string;
  if (!phoneNumber) return res.status(400).json({ error: "phoneNumber query param required" });

  const user = await prisma.user.findUnique({
    where: { phoneNumber },
    select: { id: true, displayName: true, avatarUrl: true, phoneNumber: true, isOnline: true },
  });

  if (!user) return res.status(404).json({ error: "No user with that phone number" });
  return res.json(user);
});

router.get("/me", async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  return res.json(user);
});

export default router;
