import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AppState } from 'react-native';
import {
    checkEmailVerification as checkEmailVerificationService,
    sendVerificationEmail as sendVerificationEmailService,
} from './authService';
import { auth } from './firebaseConfig';
import {
    endCurrentSecuritySession,
    heartbeatCurrentSession,
    listenForSessionRevocation,
    registerCurrentSession,
} from './securityService';

interface AuthContextType {
  user: User | null;
  initializing: boolean;
  isEmailVerified: boolean;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  initializing: true,
  isEmailVerified: false,
  sendVerificationEmail: async () => {},
  checkEmailVerification: async () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isRevocationSignOutRef = useRef(false);

  useEffect(() => {
    let sessionUnsubscribe: (() => void) | undefined;
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      sessionUnsubscribe?.();
      sessionUnsubscribe = undefined;

      setUser(firebaseUser);

      if (firebaseUser) {
        setIsEmailVerified(firebaseUser.emailVerified);

        try {
          const registration = await registerCurrentSession(firebaseUser);

          if (!isMounted) {
            return;
          }

          setSessionId(registration.sessionId);

          if (registration.revoked) {
            isRevocationSignOutRef.current = true;
            await endCurrentSecuritySession(firebaseUser);
            await signOut(auth);
            isRevocationSignOutRef.current = false;
            return;
          }

          sessionUnsubscribe = listenForSessionRevocation(
            firebaseUser,
            registration.sessionId,
            () => {
              if (isRevocationSignOutRef.current) {
                return;
              }

              isRevocationSignOutRef.current = true;
              void endCurrentSecuritySession(firebaseUser)
                .then(() => signOut(auth))
                .finally(() => {
                  isRevocationSignOutRef.current = false;
                });
            }
          );
        } catch {
          setSessionId(null);
        }
      } else {
        setIsEmailVerified(false);
        setSessionId(null);
      }

      setInitializing(false);
    });

    return () => {
      isMounted = false;
      sessionUnsubscribe?.();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !sessionId) {
      return;
    }

    const heartbeat = () => {
      void heartbeatCurrentSession(user, sessionId).catch(() => {});
    };

    heartbeat();
    const interval = setInterval(heartbeat, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        heartbeat();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [sessionId, user]);

  const sendVerificationEmail = useCallback(async () => {
    await sendVerificationEmailService();
  }, []);

  const checkEmailVerification = useCallback(async () => {
    const verified = await checkEmailVerificationService();
    setIsEmailVerified(verified);
    return verified;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        isEmailVerified,
        sendVerificationEmail,
        checkEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
