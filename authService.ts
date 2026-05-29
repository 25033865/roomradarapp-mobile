import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebaseConfig';

export type OtpChallenge = {
    expiresAt: number;
    resendAvailableAt: number;
};

type SendOtpResponse = {
    status: 'sent';
    expiresAt: number;
    resendAvailableAt: number;
};

type VerifyOtpResponse = {
    verified: true;
};

const sendEmailOtpCallable = httpsCallable(functions, 'sendEmailOtp');
const verifyEmailOtpCallable = httpsCallable(functions, 'verifyEmailOtp');

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const requestEmailOtp = async (
    email: string,
    purpose: 'signup' | 'login',
    isResend = false
): Promise<OtpChallenge> => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    const result = await sendEmailOtpCallable({
        email: normalizedEmail,
        purpose,
        isResend,
    });

    const data = result.data as SendOtpResponse;
    return {
        expiresAt: data.expiresAt,
        resendAvailableAt: data.resendAvailableAt,
    };
};

export const registerUser = async (
    username: string,
    email: string,
    password: string
): Promise<OtpChallenge> => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    if (!password) {
        throw new Error('MISSING_PASSWORD');
    }

    const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
    );

    if (username.trim()) {
        await updateProfile(userCredential.user, {
            displayName: username.trim(),
        });
    }

    return requestEmailOtp(normalizedEmail, 'signup');
};

export const loginUser = async (
    email: string,
    password: string
): Promise<OtpChallenge> => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    if (!password) {
        throw new Error('MISSING_PASSWORD');
    }

    await signInWithEmailAndPassword(auth, normalizedEmail, password);

    return requestEmailOtp(normalizedEmail, 'login');
};

export const resendEmailOtp = async (
    email: string,
    purpose: 'signup' | 'login'
): Promise<OtpChallenge> => requestEmailOtp(email, purpose, true);

export const verifyEmailOtp = async (
    email: string,
    code: string
): Promise<VerifyOtpResponse> => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    if (!/^[0-9]{6}$/.test(normalizedCode)) {
        throw new Error('INVALID_OTP_FORMAT');
    }

    const result = await verifyEmailOtpCallable({
        email: normalizedEmail,
        code: normalizedCode,
    });

    return result.data as VerifyOtpResponse;
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    await sendPasswordResetEmail(auth, normalizedEmail);
};
