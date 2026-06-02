import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { FirebaseError } from 'firebase/app';
import {
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  linkWithPopup,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  unlink,
  updatePassword,
  verifyBeforeUpdateEmail,
  type ActionCodeSettings,
  type AuthProvider as FirebaseAuthProvider,
  type User,
} from 'firebase/auth';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebaseConfig';

export const PASSWORD_RULES = [
  {
    key: 'length',
    label: 'At least 8 characters',
    test: (value: string) => value.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least 1 uppercase letter',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    key: 'lowercase',
    label: 'At least 1 lowercase letter',
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    key: 'number',
    label: 'At least 1 number',
    test: (value: string) => /\d/.test(value),
  },
  {
    key: 'special',
    label: 'At least 1 special character',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export type PasswordStrength = 'Weak' | 'Medium' | 'Strong';

export type PasswordValidation = {
  strength: PasswordStrength;
  score: number;
  isValid: boolean;
  rules: Array<{
    key: (typeof PASSWORD_RULES)[number]['key'];
    label: string;
    met: boolean;
  }>;
};

export type SecuritySession = {
  id: string;
  deviceName: string;
  browser: string;
  location: string;
  platform: string;
  lastActiveAt: Timestamp | null;
  createdAt: Timestamp | null;
  revokedAt: Timestamp | null;
  signedOutAt: Timestamp | null;
};

export type LoginHistoryStatus = 'success' | 'failed';

export type LoginHistoryEntry = {
  id: string;
  timestamp: Timestamp | null;
  maskedIp: string;
  deviceName: string;
  browser: string;
  status: LoginHistoryStatus;
  reported: boolean;
};

export type SecuritySettings = {
  mfaEnabled: boolean;
  backupCodes: string[];
  emailNotificationsNewLogin: boolean;
  updatedAt?: Timestamp | null;
};

export const SOCIAL_PROVIDERS = [
  { id: 'google.com', label: 'Google', icon: 'logo-google' },
  { id: 'facebook.com', label: 'Facebook', icon: 'logo-facebook' },
  { id: 'apple.com', label: 'Apple', icon: 'logo-apple' },
] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number]['id'];

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  mfaEnabled: false,
  backupCodes: [],
  emailNotificationsNewLogin: true,
  updatedAt: null,
};

const SESSION_STORAGE_PREFIX = 'roomradar:security-session';
const BACKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const getUserDocRef = (uid: string) => doc(db, 'users', uid);
const getSecuritySettingsRef = (uid: string) =>
  doc(db, 'users', uid, 'security', 'settings');
const getSessionsCollectionRef = (uid: string) =>
  collection(db, 'users', uid, 'sessions');
const getLoginHistoryCollectionRef = (uid: string) =>
  collection(db, 'users', uid, 'loginHistory');
const getSessionDocRef = (uid: string, sessionId: string) =>
  doc(db, 'users', uid, 'sessions', sessionId);
const getLoginHistoryDocRef = (uid: string, entryId: string) =>
  doc(db, 'users', uid, 'loginHistory', entryId);

export function validatePassword(value: string): PasswordValidation {
  const rules = PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    met: rule.test(value),
  }));
  const score = rules.filter((rule) => rule.met).length;
  const strength: PasswordStrength =
    score >= 5 ? 'Strong' : score >= 3 ? 'Medium' : 'Weak';

  return {
    strength,
    score,
    isValid: score === PASSWORD_RULES.length,
    rules,
  };
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export async function reauthenticateWithPassword(
  user: User,
  currentPassword: string
): Promise<void> {
  if (!user.email) {
    throw new Error('PASSWORD_PROVIDER_REQUIRED');
  }

  if (!currentPassword) {
    throw new Error('MISSING_CURRENT_PASSWORD');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
}

export async function changePasswordWithReauth(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const validation = validatePassword(newPassword);

  if (!validation.isValid) {
    throw new Error('PASSWORD_RULES_NOT_MET');
  }

  await reauthenticateWithPassword(user, currentPassword);
  await updatePassword(user, newPassword);
  await setDoc(
    getSecuritySettingsRef(user.uid),
    { passwordUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function requestVerifiedEmailChange(
  user: User,
  newEmail: string,
  currentPassword: string
): Promise<void> {
  const normalizedEmail = normalizeEmail(newEmail);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('INVALID_EMAIL_LOCAL');
  }

  await reauthenticateWithPassword(user, currentPassword);

  const continueUrl = process.env.EXPO_PUBLIC_EMAIL_LOGIN_CONTINUE_URL;
  const actionCodeSettings: ActionCodeSettings | undefined = continueUrl
    ? {
        url: continueUrl,
        handleCodeInApp: true,
      }
    : undefined;

  await verifyBeforeUpdateEmail(user, normalizedEmail, actionCodeSettings);
  await setDoc(
    getSecuritySettingsRef(user.uid),
    {
      pendingEmail: normalizedEmail,
      emailChangeRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function resendCurrentEmailVerification(user: User): Promise<void> {
  await reload(user);

  if (user.emailVerified) {
    return;
  }

  await sendEmailVerification(user);
}

export function isIdentityPlatformMfaAvailable(): boolean {
  return process.env.EXPO_PUBLIC_FIREBASE_IDENTITY_PLATFORM_MFA === 'true';
}

export function subscribeToSecuritySettings(
  user: User,
  onChange: (settings: SecuritySettings) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  return onSnapshot(
    getSecuritySettingsRef(user.uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(DEFAULT_SECURITY_SETTINGS);
        void setDoc(
          getSecuritySettingsRef(user.uid),
          {
            ...DEFAULT_SECURITY_SETTINGS,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }

      const data = snapshot.data();
      onChange({
        mfaEnabled: Boolean(data.mfaEnabled),
        backupCodes: Array.isArray(data.backupCodes)
          ? data.backupCodes.filter((code): code is string => typeof code === 'string')
          : [],
        emailNotificationsNewLogin:
          typeof data.emailNotificationsNewLogin === 'boolean'
            ? data.emailNotificationsNewLogin
            : true,
        updatedAt: toTimestamp(data.updatedAt),
      });
    },
    onError
  );
}

export async function updateNewLoginEmailPreference(
  user: User,
  enabled: boolean
): Promise<void> {
  await setDoc(
    getSecuritySettingsRef(user.uid),
    {
      emailNotificationsNewLogin: enabled,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateMfaPreference(user: User, enabled: boolean): Promise<void> {
  if (!isIdentityPlatformMfaAvailable()) {
    throw new Error('MFA_UPGRADE_REQUIRED');
  }

  await setDoc(
    getSecuritySettingsRef(user.uid),
    {
      mfaEnabled: enabled,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function generateBackupCodes(user: User): Promise<string[]> {
  const codes = await Promise.all(
    Array.from({ length: 10 }, () => generateBackupCode())
  );

  await setDoc(
    getSecuritySettingsRef(user.uid),
    {
      backupCodes: codes,
      backupCodesGeneratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return codes;
}

export async function registerCurrentSession(
  user: User
): Promise<{ sessionId: string; revoked: boolean }> {
  const storageKey = getSessionStorageKey(user.uid);
  let sessionId = await AsyncStorage.getItem(storageKey);
  let shouldRecordLogin = false;

  if (!sessionId) {
    sessionId = await generateRandomHex(16);
    await AsyncStorage.setItem(storageKey, sessionId);
    shouldRecordLogin = true;
  }

  let sessionRef = getSessionDocRef(user.uid, sessionId);
  let sessionSnapshot = await getDoc(sessionRef);

  if (sessionSnapshot.exists()) {
    const data = sessionSnapshot.data();

    if (data.revokedAt) {
      return { sessionId, revoked: true };
    }

    if (data.signedOutAt) {
      sessionId = await generateRandomHex(16);
      await AsyncStorage.setItem(storageKey, sessionId);
      sessionRef = getSessionDocRef(user.uid, sessionId);
      sessionSnapshot = await getDoc(sessionRef);
      shouldRecordLogin = true;
    }
  } else {
    shouldRecordLogin = true;
  }

  const metadata = getDeviceMetadata();

  await setDoc(
    getUserDocRef(user.uid),
    {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    sessionRef,
    {
      id: sessionId,
      uid: user.uid,
      ...metadata,
      lastActiveAt: serverTimestamp(),
      createdAt: sessionSnapshot.exists()
        ? sessionSnapshot.data().createdAt ?? serverTimestamp()
        : serverTimestamp(),
      signedOutAt: null,
    },
    { merge: true }
  );

  if (shouldRecordLogin) {
    await addDoc(getLoginHistoryCollectionRef(user.uid), {
      sessionId,
      status: 'success',
      timestamp: serverTimestamp(),
      maskedIp: 'Private',
      ...metadata,
      reported: false,
    });
  }

  return { sessionId, revoked: false };
}

export function listenForSessionRevocation(
  user: User,
  sessionId: string,
  onRevoked: () => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  return onSnapshot(
    getSessionDocRef(user.uid, sessionId),
    (snapshot) => {
      const data = snapshot.data();

      if (data?.revokedAt && !data.signedOutAt) {
        onRevoked();
      }
    },
    onError
  );
}

export async function heartbeatCurrentSession(
  user: User,
  sessionId: string
): Promise<void> {
  await setDoc(
    getSessionDocRef(user.uid, sessionId),
    {
      ...getDeviceMetadata(),
      lastActiveAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function endCurrentSecuritySession(user: User | null): Promise<void> {
  if (!user) {
    return;
  }

  const storageKey = getSessionStorageKey(user.uid);
  const sessionId = await AsyncStorage.getItem(storageKey);

  if (sessionId) {
    await setDoc(
      getSessionDocRef(user.uid, sessionId),
      {
        signedOutAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await AsyncStorage.removeItem(storageKey);
}

export async function getCurrentSecuritySessionId(user: User): Promise<string | null> {
  return AsyncStorage.getItem(getSessionStorageKey(user.uid));
}

export async function fetchActiveSessions(user: User): Promise<SecuritySession[]> {
  const snapshot = await getDocs(
    query(getSessionsCollectionRef(user.uid), orderBy('lastActiveAt', 'desc'))
  );

  return snapshot.docs
    .map((sessionDoc) => mapSession(sessionDoc.id, sessionDoc.data()))
    .filter((session) => !session.revokedAt && !session.signedOutAt);
}

export async function revokeSession(
  user: User,
  sessionId: string
): Promise<void> {
  await updateDoc(getSessionDocRef(user.uid, sessionId), {
    revokedAt: serverTimestamp(),
    revokedBy: user.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function revokeAllOtherSessions(
  user: User,
  currentSessionId: string | null
): Promise<void> {
  const activeSessions = await fetchActiveSessions(user);
  const sessionsToRevoke = activeSessions.filter(
    (session) => session.id !== currentSessionId
  );

  if (!sessionsToRevoke.length) {
    return;
  }

  const batch = writeBatch(db);

  sessionsToRevoke.forEach((session) => {
    batch.update(getSessionDocRef(user.uid, session.id), {
      revokedAt: serverTimestamp(),
      revokedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function fetchLoginHistory(
  user: User,
  status: LoginHistoryStatus | 'all' = 'all'
): Promise<LoginHistoryEntry[]> {
  const snapshot = await getDocs(
    query(
      getLoginHistoryCollectionRef(user.uid),
      orderBy('timestamp', 'desc'),
      firestoreLimit(20)
    )
  );

  return snapshot.docs
    .map((historyDoc) => mapLoginHistory(historyDoc.id, historyDoc.data()))
    .filter((entry) => status === 'all' || entry.status === status);
}

export async function reportSuspiciousLogin(
  user: User,
  entry: LoginHistoryEntry
): Promise<void> {
  await updateDoc(getLoginHistoryDocRef(user.uid, entry.id), {
    reported: true,
    reportedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'users', user.uid, 'suspiciousReports'), {
    loginHistoryId: entry.id,
    timestamp: entry.timestamp ?? null,
    status: entry.status,
    deviceName: entry.deviceName,
    browser: entry.browser,
    createdAt: serverTimestamp(),
  });
}

export async function connectSocialProvider(
  user: User,
  providerId: SocialProviderId
): Promise<void> {
  if (Platform.OS !== 'web') {
    throw new Error('OAUTH_NATIVE_SETUP_REQUIRED');
  }

  await linkWithPopup(user, getProviderInstance(providerId));
  await reload(user);
}

export async function unlinkSocialProvider(
  user: User,
  providerId: SocialProviderId
): Promise<void> {
  const signInMethods = user.providerData.map((provider) => provider.providerId);

  if (!signInMethods.includes(providerId)) {
    return;
  }

  if (signInMethods.length <= 1) {
    throw new Error('LAST_SIGN_IN_METHOD');
  }

  await unlink(user, providerId);
  await reload(user);
}

export async function deleteAccountWithPassword(
  user: User,
  currentPassword: string
): Promise<void> {
  await reauthenticateWithPassword(user, currentPassword);
  await deleteUserData(user.uid);
  await Promise.all([
    AsyncStorage.removeItem(`profile-extras:${user.uid}`),
    user.email ? AsyncStorage.removeItem(`profile-extras:${user.email}`) : Promise.resolve(),
    AsyncStorage.removeItem('roomradar:favorites'),
  ]);
  await deleteUser(user);
  await AsyncStorage.removeItem(getSessionStorageKey(user.uid));
}

export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case 'PASSWORD_PROVIDER_REQUIRED':
        return 'This account does not have a password sign-in method. Use a linked provider or add password sign-in first.';
      case 'MISSING_CURRENT_PASSWORD':
        return 'Enter your current password to continue.';
      case 'PASSWORD_RULES_NOT_MET':
        return 'Your new password does not meet all security rules.';
      case 'INVALID_EMAIL_LOCAL':
        return 'Enter a valid email address.';
      case 'MFA_UPGRADE_REQUIRED':
        return 'Authenticator app MFA requires Firebase Identity Platform. Upgrade the project or enable EXPO_PUBLIC_FIREBASE_IDENTITY_PLATFORM_MFA after setup.';
      case 'OAUTH_NATIVE_SETUP_REQUIRED':
        return 'OAuth linking on native builds needs provider client IDs and an AuthSession/native provider setup. Web linking is available now.';
      case 'LAST_SIGN_IN_METHOD':
        return 'Connect another sign-in method before unlinking this provider.';
    }
  }

  if (!(error instanceof FirebaseError)) {
    return 'Something went wrong. Please try again.';
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'The password you entered is incorrect.';
    case 'auth/requires-recent-login':
      return 'For security, sign in again and retry this action.';
    case 'auth/email-already-in-use':
      return 'That email address is already used by another account.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Choose a stronger password that meets all rules.';
    case 'auth/provider-already-linked':
      return 'That provider is already connected to this account.';
    case 'auth/credential-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return 'This provider is already associated with another account.';
    case 'auth/no-such-provider':
      return 'That provider is not connected to this account.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit and try again.';
    case 'permission-denied':
      return 'You do not have permission to update this security setting.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export function formatSecurityDate(timestamp: Timestamp | null): string {
  if (!timestamp) {
    return 'Not available';
  }

  return timestamp.toDate().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProviderInstance(providerId: SocialProviderId): FirebaseAuthProvider {
  switch (providerId) {
    case 'google.com': {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      return provider;
    }
    case 'facebook.com': {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      return provider;
    }
    case 'apple.com': {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      return provider;
    }
  }
}

async function deleteUserData(uid: string): Promise<void> {
  await Promise.all([
    deleteSubcollection(uid, 'sessions'),
    deleteSubcollection(uid, 'loginHistory'),
    deleteSubcollection(uid, 'security'),
    deleteSubcollection(uid, 'suspiciousReports'),
  ]);

  await deleteDoc(getUserDocRef(uid)).catch(() => {});
}

async function deleteSubcollection(
  uid: string,
  subcollectionName: string
): Promise<void> {
  const snapshot = await getDocs(collection(db, 'users', uid, subcollectionName));

  if (snapshot.empty) {
    return;
  }

  for (let index = 0; index < snapshot.docs.length; index += 450) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(index, index + 450);

    chunk.forEach((snapshotDoc) => {
      batch.delete(snapshotDoc.ref);
    });

    await batch.commit();
  }
}

function mapSession(id: string, data: DocumentData): SecuritySession {
  return {
    id,
    deviceName: typeof data.deviceName === 'string' ? data.deviceName : 'Unknown device',
    browser: typeof data.browser === 'string' ? data.browser : 'RoomRadar app',
    location:
      typeof data.location === 'string' && data.location.trim()
        ? data.location
        : 'Location unavailable',
    platform: typeof data.platform === 'string' ? data.platform : 'unknown',
    lastActiveAt: toTimestamp(data.lastActiveAt),
    createdAt: toTimestamp(data.createdAt),
    revokedAt: toTimestamp(data.revokedAt),
    signedOutAt: toTimestamp(data.signedOutAt),
  };
}

function mapLoginHistory(id: string, data: DocumentData): LoginHistoryEntry {
  return {
    id,
    timestamp: toTimestamp(data.timestamp),
    maskedIp:
      typeof data.maskedIp === 'string' && data.maskedIp.trim()
        ? data.maskedIp
        : 'Private',
    deviceName: typeof data.deviceName === 'string' ? data.deviceName : 'Unknown device',
    browser: typeof data.browser === 'string' ? data.browser : 'RoomRadar app',
    status: data.status === 'failed' ? 'failed' : 'success',
    reported: Boolean(data.reported),
  };
}

function toTimestamp(value: unknown): Timestamp | null {
  return value instanceof Timestamp ? value : null;
}

function getSessionStorageKey(uid: string): string {
  return `${SESSION_STORAGE_PREFIX}:${uid}`;
}

async function generateBackupCode(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(12);
  const raw = Array.from(bytes)
    .map((byte) => BACKUP_CODE_ALPHABET[byte % BACKUP_CODE_ALPHABET.length])
    .join('');

  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function generateRandomHex(byteLength: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getDeviceMetadata() {
  const userAgent = getUserAgent();
  const browser = getBrowserName(userAgent);
  const platform = Platform.OS;

  return {
    deviceName: getDeviceName(platform, browser),
    browser,
    platform,
    location: 'Location unavailable',
  };
}

function getUserAgent(): string {
  const navigatorLike = (globalThis as { navigator?: { userAgent?: string } })
    .navigator;
  return typeof navigatorLike?.userAgent === 'string'
    ? navigatorLike.userAgent
    : '';
}

function getDeviceName(platform: string, browser: string): string {
  if (platform === 'web') {
    return browser === 'Unknown browser' ? 'Web browser' : browser;
  }

  if (platform === 'ios') {
    return 'Apple device';
  }

  if (platform === 'android') {
    return 'Android device';
  }

  return 'RoomRadar device';
}

function getBrowserName(userAgent: string): string {
  if (!userAgent) {
    return Platform.OS === 'web' ? 'Unknown browser' : 'RoomRadar app';
  }

  if (/Edg\//.test(userAgent)) {
    return 'Microsoft Edge';
  }

  if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) {
    return 'Chrome';
  }

  if (/Firefox\//.test(userAgent)) {
    return 'Firefox';
  }

  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) {
    return 'Safari';
  }

  return Platform.OS === 'web' ? 'Web browser' : 'RoomRadar app';
}
