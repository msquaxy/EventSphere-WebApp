import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, type Unsubscribe } from "firebase/firestore";
import { auth, db, firebaseReady, requireEmailVerification } from "@/config/firebase";
import type { Role, UserProfile } from "@/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: UserProfile | null;
  loading: boolean;
  firebaseReady: boolean;
  isAuthenticated: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
  register: (values: { fullName: string; email: string; password: string; role: Role }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (values: Partial<Pick<UserProfile, "fullName" | "city" | "phone">>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) return undefined;
    let unsubscribeProfile: Unsubscribe | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (account) => {
      unsubscribeProfile?.();
      setFirebaseUser(account);
      if (!account) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      // The website treats a person as signed in only when both the Auth account and users/{uid} exist.
      unsubscribeProfile = onSnapshot(
        doc(db, "users", account.uid),
        (snapshot) => {
          setUser(snapshot.exists() ? ({ id: account.uid, ...snapshot.data() } as UserProfile) : null);
          setLoading(false);
        },
        (error) => {
          console.warn("Profile subscription failed", error);
          setUser(null);
          setLoading(false);
        },
      );
    });
    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async ({ fullName, email, password, role }) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateAuthProfile(credential.user, { displayName: fullName.trim() });
    await setDoc(doc(db, "users", credential.user.uid), {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      status: "active",
      city: "Manila",
      phone: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await signOut(auth);
  }, []);

  const login = useCallback<AuthContextValue["login"]>(async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!credential.user.emailVerified && requireEmailVerification) {
      await signOut(auth);
      throw new Error("Please verify your email before signing in.");
    }
    // Existing web accounts must have a profile document; give a clear message if they don't.
    const profile = await getDoc(doc(db, "users", credential.user.uid)).catch(() => null);
    if (profile && !profile.exists()) {
      await signOut(auth);
      throw new Error("We couldn't find a profile for this account. Please contact EventSphere support.");
    }
    if (profile && profile.data()?.status !== "active") {
      await signOut(auth);
      throw new Error("This account has been suspended.");
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateUser = useCallback<AuthContextValue["updateUser"]>(
    async (values) => {
      if (!firebaseUser) throw new Error("Please sign in first.");
      await updateDoc(doc(db, "users", firebaseUser.uid), { ...values, updatedAt: serverTimestamp() });
      if (values.fullName) await updateAuthProfile(firebaseUser, { displayName: values.fullName });
    },
    [firebaseUser],
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      user,
      loading,
      firebaseReady,
      isAuthenticated: Boolean(firebaseUser && user),
      isOrganizer: user?.role === "organizer" || user?.role === "admin",
      isAdmin: user?.role === "admin",
      register,
      login,
      logout,
      updateUser,
      resetPassword,
    }),
    [firebaseUser, user, loading, register, login, logout, updateUser, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
