import {
    ActionCodeSettings,
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

const emailLoginAndroidPackageName =
    process.env.EXPO_PUBLIC_EMAIL_LOGIN_ANDROID_PACKAGE_NAME ||
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME ||
    'com.anonymous.roomradarappmobile';

const emailLoginIosBundleId =
    process.env.EXPO_PUBLIC_EMAIL_LOGIN_IOS_BUNDLE_ID ||
    process.env.EXPO_PUBLIC_IOS_BUNDLE_ID;

const emailLinkParamKeys = [
    'link',
    'deep_link_id',
    'url',
    'continueUrl',
    'continue_url',
    'redirectUrl',
    'redirect_url',
] as const;

const extractEmailLinkCandidates = (incomingLink: string): string[] => {
    const queue: string[] = [];
    const seen = new Set<string>();

    const enqueue = (value: string | null | undefined) => {
        if (!value) {
            return;
        }

        const normalized = value
            .trim()
            .replace(/&amp;/gi, '&')
            .replace(/^['"]|['"]$/g, '');

        if (!normalized) {
            return;
        }

        const variants = new Set<string>([normalized]);
        let decoded = normalized;

        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                const nextDecoded = decodeURIComponent(decoded);

                if (!nextDecoded || nextDecoded === decoded) {
                    break;
                }

                variants.add(nextDecoded);
                decoded = nextDecoded;
            } catch {
                break;
            }
        }

        for (const variant of variants) {
            if (seen.has(variant)) {
                continue;
            }

            seen.add(variant);
            queue.push(variant);
        }
    };

    enqueue(incomingLink);

    while (queue.length > 0) {
        const current = queue.shift();

        if (!current) {
            continue;
        }

        let parsed: URL;

        try {
            parsed = new URL(current, emailLoginContinueUrl);
        } catch {
            continue;
        }

        for (const paramKey of emailLinkParamKeys) {
            enqueue(parsed.searchParams.get(paramKey));
        }

        const mode = parsed.searchParams.get('mode');
        const oobCode = parsed.searchParams.get('oobCode');
        const apiKey = parsed.searchParams.get('apiKey');

        if (mode === 'signIn' && oobCode && apiKey) {
            const canonicalLink = `${parsed.origin}${parsed.pathname}?mode=${encodeURIComponent(
                mode
            )}&oobCode=${encodeURIComponent(oobCode)}&apiKey=${encodeURIComponent(
                apiKey
            )}`;

            enqueue(canonicalLink);
        }
    }

    const rankCandidate = (candidate: string): number => {
        let score = 0;

        if (candidate.includes('mode=signIn')) {
            score += 2;
        }

        if (candidate.includes('oobCode=')) {
            score += 2;
        }

        if (candidate.includes('apiKey=')) {
            score += 1;
        }

        return score;
    };

    return Array.from(seen).sort((left, right) => rankCandidate(right) - rankCandidate(left));
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

    await sendEmailVerification(userCredential.user);
    await signOut(auth);

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

    await reload(userCredential.user);

    if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
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

        const actionCodeSettings: ActionCodeSettings = {
            url: emailLoginContinueUrl,
            handleCodeInApp: true,
            android: {
                packageName: emailLoginAndroidPackageName,
                installApp: true,
            },
        };

        if (emailLoginIosBundleId) {
            actionCodeSettings.iOS = {
                bundleId: emailLoginIosBundleId,
            };
        }

        await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);
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

    const emailLinkCandidates = extractEmailLinkCandidates(normalizedEmailLink);
    let lastCompletionError: unknown = null;

    for (const candidateLink of emailLinkCandidates) {
        if (!isSignInWithEmailLink(auth, candidateLink)) {
            continue;
        }

        try {
            const userCredential = await signInWithEmailLink(
                auth,
                normalizedEmail,
                candidateLink
            );

            return userCredential.user;
        } catch (error) {
            lastCompletionError = error;
        }
    }

    if (lastCompletionError) {
        throw lastCompletionError;
    }

    throw new Error('INVALID_EMAIL_LOGIN_LINK');
};
