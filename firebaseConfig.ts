import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
    getAuth,
    initializeAuth,
    type Auth,
    type Persistence,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
    apiKey: "AIzaSyDvlTDJguVeaxQ2xyzZYRsjgkp8ssrTghg",
    authDomain: "roomradarapp-50fb1.firebaseapp.com",
    projectId: "roomradarapp-50fb1",
    storageBucket: "roomradarapp-50fb1.firebasestorage.app",
    messagingSenderId: "220829230425",
    appId: "1:220829230425:web:3a8f8a02fb1a76f493d848",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
let db: Firestore;
let functions: Functions;

type ReactNativePersistenceFactory = (
    storage: typeof AsyncStorage
) => Persistence;

const getReactNativePersistence = (
    FirebaseAuth as { getReactNativePersistence?: ReactNativePersistenceFactory }
).getReactNativePersistence;

const functionsRegion =
    process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';

try {
    if (getReactNativePersistence) {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } else {
        auth = getAuth(app);
    }
} catch {
    auth = getAuth(app);
}

db = getFirestore(app);
functions = getFunctions(app, functionsRegion);

export { app, auth, db, functions };
