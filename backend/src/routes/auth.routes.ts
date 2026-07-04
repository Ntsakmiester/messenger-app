import { Router } from "express";
import { requestOtp, verifyOtpAndAuth } from "../controllers/auth.controller";

const router = Router();

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtpAndAuth);

export default router;
