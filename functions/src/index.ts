import sgMail from "@sendgrid/mail";
import { createHash, randomBytes } from "crypto";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const OTP_LENGTH = 6;

const REGION = process.env.FUNCTION_REGION || "us-central1";

const emailOtpCollection = db.collection("emailOtps");

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

const generateOtp = (): string => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code.padStart(OTP_LENGTH, "0");
};

const getEmailConfig = (): { sender: string } => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const sender = process.env.SENDGRID_SENDER;

  if (!apiKey || !sender) {
    throw new HttpsError("failed-precondition", "Email provider not configured.", {
      code: "EMAIL_PROVIDER_NOT_CONFIGURED",
    });
  }

  sgMail.setApiKey(apiKey);
  return { sender };
};

type OtpRecord = {
  uid: string;
  emailHash: string;
  codeHash: string;
  codeSalt: string;
  attemptsRemaining: number;
  createdAt: Timestamp;
  lastSentAt: Timestamp;
  expiresAt: Timestamp;
  resendAvailableAt: Timestamp;
};

export const sendEmailOtp = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.", {
      code: "AUTH_REQUIRED",
    });
  }

  const email = typeof request.data?.email === "string" ? normalizeEmail(request.data.email) : "";

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required.", {
      code: "MISSING_EMAIL",
    });
  }

  const authEmail = request.auth.token.email
    ? normalizeEmail(String(request.auth.token.email))
    : "";

  if (authEmail && authEmail !== email) {
    throw new HttpsError("permission-denied", "Email mismatch.", {
      code: "EMAIL_MISMATCH",
    });
  }

  const emailHash = sha256(email);
  const otpRef = emailOtpCollection.doc(emailHash);
  const now = Date.now();

  const existingSnap = await otpRef.get();
  if (existingSnap.exists) {
    const existing = existingSnap.data() as OtpRecord;
    const resendAvailableAt = existing.resendAvailableAt.toMillis();

    if (resendAvailableAt > now) {
      throw new HttpsError("resource-exhausted", "Resend cooldown active.", {
        code: "OTP_RESEND_COOLDOWN",
        resendAvailableAt,
      });
    }
  }

  const code = generateOtp();
  const codeSalt = randomBytes(16).toString("hex");
  const codeHash = sha256(codeSalt + code);
  const expiresAt = now + OTP_TTL_MS;
  const resendAvailableAt = now + OTP_RESEND_COOLDOWN_MS;

  const payload: OtpRecord = {
    uid: request.auth.uid,
    emailHash,
    codeHash,
    codeSalt,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
    createdAt: Timestamp.fromMillis(now),
    lastSentAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(expiresAt),
    resendAvailableAt: Timestamp.fromMillis(resendAvailableAt),
  };

  await otpRef.set(payload, { merge: true });

  const { sender } = getEmailConfig();

  try {
    await sgMail.send({
      to: email,
      from: sender,
      subject: "Your RoomRadar verification code",
      text: `Your RoomRadar verification code is ${code}. It expires in 10 minutes.`,
    });
  } catch (error) {
    await otpRef.delete();
    throw new HttpsError("internal", "Failed to deliver verification code.", {
      code: "EMAIL_DELIVERY_FAILED",
    });
  }

  return {
    status: "sent",
    expiresAt,
    resendAvailableAt,
  };
});

export const verifyEmailOtp = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.", {
      code: "AUTH_REQUIRED",
    });
  }

  const email = typeof request.data?.email === "string" ? normalizeEmail(request.data.email) : "";
  const code = typeof request.data?.code === "string" ? request.data.code.trim() : "";

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required.", {
      code: "MISSING_EMAIL",
    });
  }

  if (!/^[0-9]{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Invalid verification code.", {
      code: "INVALID_OTP_FORMAT",
    });
  }

  const authEmail = request.auth.token.email
    ? normalizeEmail(String(request.auth.token.email))
    : "";

  if (authEmail && authEmail !== email) {
    throw new HttpsError("permission-denied", "Email mismatch.", {
      code: "EMAIL_MISMATCH",
    });
  }

  const emailHash = sha256(email);
  const otpRef = emailOtpCollection.doc(emailHash);
  const snapshot = await otpRef.get();

  if (!snapshot.exists) {
    throw new HttpsError("not-found", "No active code found.", {
      code: "OTP_NOT_FOUND",
    });
  }

  const record = snapshot.data() as OtpRecord;

  if (record.uid !== request.auth.uid) {
    throw new HttpsError("permission-denied", "OTP ownership mismatch.", {
      code: "OTP_UID_MISMATCH",
    });
  }

  const now = Date.now();
  const expiresAt = record.expiresAt.toMillis();

  if (expiresAt <= now) {
    await otpRef.delete();
    throw new HttpsError("deadline-exceeded", "Code expired.", {
      code: "OTP_EXPIRED",
    });
  }

  if (record.attemptsRemaining <= 0) {
    await otpRef.delete();
    throw new HttpsError("resource-exhausted", "Attempts exhausted.", {
      code: "OTP_ATTEMPTS_EXHAUSTED",
    });
  }

  const submittedHash = sha256(record.codeSalt + code);

  if (submittedHash !== record.codeHash) {
    const attemptsRemaining = Math.max(0, record.attemptsRemaining - 1);
    await otpRef.set({ attemptsRemaining }, { merge: true });

    if (attemptsRemaining === 0) {
      await otpRef.delete();
    }

    throw new HttpsError("permission-denied", "Invalid verification code.", {
      code: "OTP_INVALID",
      attemptsRemaining,
    });
  }

  await otpRef.delete();

  const userRef = db.collection("users").doc(request.auth.uid);
  const userSnapshot = await userRef.get();
  const update: Record<string, Timestamp> = {
    lastLoginOtpAt: Timestamp.fromMillis(now),
  };

  if (!userSnapshot.exists || !userSnapshot.data()?.emailVerifiedAt) {
    update.emailVerifiedAt = Timestamp.fromMillis(now);
  }

  await userRef.set(update, { merge: true });

  return { verified: true };
});
