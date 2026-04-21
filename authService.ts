import {
    createUserWithEmailAndPassword,
    isSignInWithEmailLink,
    reload,
    sendEmailVerification,
    sendPasswordResetEmail,
    sendSignInLinkToEmail,
    signInWithEmailAndPassword,
    signInWithEmailLink,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const emailLoginContinueUrl =
    process.env.EXPO_PUBLIC_EMAIL_LOGIN_CONTINUE_URL ||
    'https://roomradarapp-50fb1.firebaseapp.com/login-approval';

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

export const startEmailLoginVerification = async (
    email: string,
    password: string
): Promise<void> => {
    const normalizedEmail = email.trim();

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

    try {
        await reload(userCredential.user);

        if (!userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user);
            throw new Error('EMAIL_VERIFICATION_LINK_SENT');
        }

        await sendSignInLinkToEmail(auth, normalizedEmail, {
            url: emailLoginContinueUrl,
            handleCodeInApp: true,
        });
    } finally {
        await signOut(auth);
    }
};

export const completeEmailLoginVerification = async (
    email: string,
    emailLink: string
): Promise<User> => {
    const normalizedEmail = email.trim();
    const normalizedEmailLink = emailLink.trim();

    if (!normalizedEmail) {
        throw new Error('MISSING_EMAIL');
    }

    if (!normalizedEmailLink) {
        throw new Error('MISSING_EMAIL_LOGIN_LINK');
    }

    if (!isSignInWithEmailLink(auth, normalizedEmailLink)) {
        throw new Error('INVALID_EMAIL_LOGIN_LINK');
    }

    const userCredential = await signInWithEmailLink(
        auth,
        normalizedEmail,
        normalizedEmailLink
    );

    await reload(userCredential.user);

    if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        throw new Error('EMAIL_VERIFICATION_LINK_SENT');
    }

    return userCredential.user;
};