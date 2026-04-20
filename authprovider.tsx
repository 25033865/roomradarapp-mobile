import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { checkEmailVerification, sendVerificationEmail } from './authService';
import { auth } from './firebaseConfig';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsEmailVerified(firebaseUser.emailVerified);
      } else {
        setIsEmailVerified(false);
      }
      setInitializing(false);
    });

    return unsubscribe;
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