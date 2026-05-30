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

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const registerUser = async (
    username: string,
    email: string,
    password: string
): Promise<User> => {
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

    await sendEmailVerification(userCredential.user);
    return userCredential.user;
};

export const loginUser = async (
    email: string,
    password: string
): Promise<User> => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    if (!password) {
        throw new Error('MISSING_PASSWORD');
    }

    const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
    );

    await reload(userCredential.user);

    if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        throw new Error('EMAIL_VERIFICATION_LINK_SENT');
    }

    return userCredential.user;
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const sendVerificationEmail = async (): Promise<void> => {
    if (!auth.currentUser) {
        throw new Error('NO_ACTIVE_USER');
    }

    await sendEmailVerification(auth.currentUser);
};

export const checkEmailVerification = async (): Promise<boolean> => {
    if (!auth.currentUser) {
        return false;
    }

    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    await sendPasswordResetEmail(auth, normalizedEmail);
};
