import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthTokenPayload {
  userId: string;
  phoneNumber: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}