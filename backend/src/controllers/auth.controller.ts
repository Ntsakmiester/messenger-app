import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { generateOtp, verifyOtp } from "../services/otp.service";
import { signAuthToken } from "../utils/jwt";

const requestOtpSchema = z.object({
  phoneNumber: z.string().min(8),
});

const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(8),
  code: z.string().length(6),
  displayName: z.string().min(1).optional(),
  countryCode: z.string().length(2).optional(),
});

// Step 1: user submits their phone number, we "send" (log, in dev) an OTP.
export async function requestOtp(req: Request, res: Response) {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  generateOtp(parsed.data.phoneNumber);
  return res.json({ message: "OTP sent" });
}

// Step 2: user submits the OTP code. On success, we create the user if
// they don't exist yet (sign-up) or log them in (existing user), then
// return a JWT for use on subsequent requests and the socket connection.
export async function verifyOtpAndAuth(req: Request, res: Response) {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { phoneNumber, code, displayName, countryCode } = parsed.data;

  const isValid = verifyOtp(phoneNumber, code);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid or expired code" });
  }

  let user = await prisma.user.findUnique({ where: { phoneNumber } });

  if (!user) {
    if (!displayName || !countryCode) {
      return res.status(400).json({
        error: "New user requires displayName and countryCode on first verification",
      });
    }
    user = await prisma.user.create({
      data: { phoneNumber, displayName, countryCode },
    });
  }

  const token = signAuthToken({ userId: user.id, phoneNumber: user.phoneNumber });

  return res.json({
    token,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      countryCode: user.countryCode,
    },
  });
}
