import {
    createUserWithEmailAndPassword,
    reload,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

type EmailOtpRequestResult = {
    challengeId: string;
    expiresAt?: number;
};

const otpRequestUrl = process.env.EXPO_PUBLIC_OTP_REQUEST_URL;
const otpVerifyUrl = process.env.EXPO_PUBLIC_OTP_VERIFY_URL;

const ensureOtpEndpointsConfigured = (): void => {
    if (!otpRequestUrl || !otpVerifyUrl) {
        throw new Error('OTP_ENDPOINTS_NOT_CONFIGURED');
    }
};

export const registerUser = async (
    username: string,
    email: string,
    password: string
): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
    );

    if (username.trim()) {
        await updateProfile(userCredential.user, {
            displayName: username.trim(),
        });
    }

    // Send verification email after signup
    await sendEmailVerification(userCredential.user);

    return userCredential.user;
};

export const loginUser = async (
    email: string,
    password: string
): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
    );

    // Reload user to get latest email verification status
    await reload(userCredential.user);

    // Check if email is verified
    if (!userCredential.user.emailVerified) {
        // Re-send verification link when unverified user attempts login
        await sendEmailVerification(userCredential.user);

        // Sign out unverified user
        await signOut(auth);
        throw new Error('EMAIL_VERIFICATION_LINK_SENT');
    }

    return userCredential.user;
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const sendVerificationEmail = async (): Promise<void> => {
    if (!auth.currentUser) {
        throw new Error('No user logged in');
    }
    await sendEmailVerification(auth.currentUser);
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    await sendPasswordResetEmail(auth, normalizedEmail);
};

export const resendVerificationForCredentials = async (
    email: string,
    password: string
): Promise<'sent' | 'already_verified'> => {
    const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
    );

    await reload(userCredential.user);

    if (userCredential.user.emailVerified) {
        await signOut(auth);
        return 'already_verified';
    }

    await sendEmailVerification(userCredential.user);
    await signOut(auth);
    return 'sent';
};

export const checkEmailVerification = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
};

export const requestEmailOtp = async (email: string): Promise<EmailOtpRequestResult> => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    ensureOtpEndpointsConfigured();

    const response = await fetch(otpRequestUrl as string, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
    });

    if (!response.ok) {
        throw new Error('OTP_REQUEST_FAILED');
    }

    const payload = (await response.json()) as {
        challengeId?: string;
        expiresAt?: number;
    };

    if (!payload.challengeId) {
        throw new Error('OTP_REQUEST_FAILED');
    }

    return {
        challengeId: payload.challengeId,
        expiresAt: payload.expiresAt,
    };
};

export const verifyEmailOtp = async (
    email: string,
    code: string,
    challengeId: string
): Promise<void> => {
    const normalizedEmail = email.trim();
    const normalizedCode = code.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    if (!normalizedCode) {
        throw new Error('MISSING_OTP_CODE');
    }

    if (!challengeId.trim()) {
        throw new Error('MISSING_OTP_CHALLENGE');
    }

    ensureOtpEndpointsConfigured();

    const response = await fetch(otpVerifyUrl as string, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: normalizedEmail,
            code: normalizedCode,
            challengeId,
        }),
    });

    if (!response.ok) {
        throw new Error('OTP_INVALID_OR_EXPIRED');
    }
};