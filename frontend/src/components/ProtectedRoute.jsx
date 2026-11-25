import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loading from "./Loading.jsx";

export default function ProtectedRoute({ children, role }) {
  const { loading, isAuthenticated, isOrganizer, isAdmin, isActive, firebaseReady } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Getting things ready…" />;
  if (!firebaseReady) return <div className="page-shell"><div className="notice notice-error">Firebase is not configured. Add your web app settings to <code>frontend/.env.local</code> and restart Vite.</div></div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isActive) return <div className="page-shell access-denied"><h1>Your account is paused</h1><p>Contact the EventSphere team if you believe this is a mistake.</p></div>;
  if (role === "organizer" && !isOrganizer) return <Navigate to="/dashboard" replace />;
  if (role === "admin" && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
