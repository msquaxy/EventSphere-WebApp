import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateAuthProfile,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, firebaseReady } from "../firebase/config";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) return undefined;
    let unsubscribeProfile;
    const unsubscribeAuth = onAuthStateChanged(auth, async (account) => {
      unsubscribeProfile?.();
      setFirebaseUser(account);
      if (!account) {
        setUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubscribeProfile = onSnapshot(doc(db, "users", account.uid), (snapshot) => {
        setUser(snapshot.exists() ? { id: account.uid, ...snapshot.data() } : null);
        setLoading(false);
      }, (error) => {
        console.error("Profile subscription failed", error);
        setUser(null);
        setLoading(false);
      });
    });
    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  const register = useCallback(async ({ fullName, email, password, role }) => {
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

  const login = useCallback(async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!credential.user.emailVerified && import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === "true") {
      await signOut(auth);
      throw new Error("Please verify your email before signing in.");
    }
    return credential.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateUser = useCallback(async (values) => {
    if (!firebaseUser) throw new Error("Please sign in first.");
    await updateDoc(doc(db, "users", firebaseUser.uid), {
      ...values,
      updatedAt: serverTimestamp(),
    });
    if (values.fullName) await updateAuthProfile(firebaseUser, { displayName: values.fullName });
  }, [firebaseUser]);

  const resetPassword = useCallback(async (email) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const value = useMemo(() => ({
    firebaseUser,
    user,
    loading,
    firebaseReady,
    isAuthenticated: Boolean(firebaseUser && user),
    isOrganizer: user?.role === "organizer" || user?.role === "admin",
    isAdmin: user?.role === "admin",
    isActive: user?.status === "active",
    register,
    login,
    logout,
    updateUser,
    resetPassword,
  }), [firebaseUser, user, loading, register, login, logout, updateUser, resetPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
