import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

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

    return userCredential.user;
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};