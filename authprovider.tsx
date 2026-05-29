import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { auth } from './firebaseConfig';

interface AuthContextType {
  user: User | null;
  initializing: boolean;
  isOtpVerified: boolean;
  markOtpVerified: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  initializing: true,
  isOtpVerified: false,
  markOtpVerified: async () => {},
});

const getTrustedDeviceKey = (uid: string) => `roomradar:trusted-device:${uid}`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const trustedValue = await AsyncStorage.getItem(
          getTrustedDeviceKey(firebaseUser.uid)
        );
        const isTrusted = trustedValue === 'true';
        setIsOtpVerified(isTrusted);
        lastUserIdRef.current = firebaseUser.uid;
      } else {
        if (lastUserIdRef.current) {
          await AsyncStorage.removeItem(getTrustedDeviceKey(lastUserIdRef.current));
        }
        lastUserIdRef.current = null;
        setIsOtpVerified(false);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const markOtpVerified = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('NO_ACTIVE_USER');
    }

    await AsyncStorage.setItem(getTrustedDeviceKey(currentUser.uid), 'true');
    setIsOtpVerified(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        isOtpVerified,
        markOtpVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);