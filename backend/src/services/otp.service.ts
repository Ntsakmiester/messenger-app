// In-memory OTP store for development.
// PRODUCTION NOTE: replace this with a real SMS provider (Twilio, Vonage,
// AWS SNS, etc.) and store OTPs in Redis with a TTL instead of memory,
// so it works across multiple server instances/regions.

interface OtpEntry {
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, OtpEntry>();

export function generateOtp(phoneNumber: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phoneNumber, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  // PRODUCTION: send via SMS provider here instead of logging.
  console.log(`[DEV ONLY] OTP for ${phoneNumber}: ${code}`);

  return code;
}

export function verifyOtp(phoneNumber: string, code: string): boolean {
  const entry = otpStore.get(phoneNumber);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phoneNumber);
    return false;
  }
  const valid = entry.code === code;
  if (valid) otpStore.delete(phoneNumber);
  return valid;
}
