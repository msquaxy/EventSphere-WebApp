import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage } from "../lib/format.js";
import Loading from "../components/Loading.jsx";

export default function Login() {
  const { login, resetPassword, isAuthenticated, loading, firebaseReady } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [message, setMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <Loading label="Checking your session…" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true); setError(""); setMessage("");
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) { setError(errorMessage(err, "Unable to log in.")); }
    finally { setSubmitting(false); }
  };

  const forgot = async () => {
    if (!form.email) return setError("Enter your email first, then choose “Forgot password?”.");
    setSubmitting(true); setError("");
    try { await resetPassword(form.email); setResetSent(true); }
    catch (err) { setError(errorMessage(err)); }
    finally { setSubmitting(false); }
  };

  return (
    <section className="auth-page page-shell">
      <div className="auth-visual">
        <img src="/images/community.jpg" alt="Friends connecting at a neighborhood gathering" />
        <div className="auth-visual-overlay" />
        <div className="auth-quote"><span className="quote-spark">✳</span><blockquote>“The best plans start with <em>let’s go.</em>”</blockquote><p>Your next favorite memory is out there.</p></div>
        <div className="auth-proof"><span><CheckCircle2 size={16} /> Real local experiences</span><span><CheckCircle2 size={16} /> Secure, simple booking</span></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="auth-icon"><Sparkles size={22} /></span>
          <span className="section-kicker">WELCOME BACK</span>
          <h1>Good to see you again.</h1>
          <p className="auth-intro">Log in to find your next good time and manage your tickets.</p>
          {location.state?.message && <div className="notice notice-success">{location.state.message}</div>}
          {!firebaseReady && <div className="notice notice-error">Firebase is not configured. Add your web app settings to <code>frontend/.env.local</code>.</div>}
          {error && <div className="notice notice-error">{error}</div>}
          {resetSent && <div className="notice notice-success">Password reset link sent. Check your inbox.</div>}
          {message && <div className="notice notice-info">{message}</div>}
          <form onSubmit={submit} className="auth-form">
            <label>Email address<div className="input-with-icon"><Mail size={18} /><input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={!firebaseReady} /></div></label>
            <label>Password<div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required disabled={!firebaseReady} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            <div className="auth-form-options"><label className="checkbox-label"><input type="checkbox" /> Remember me</label><button type="button" className="text-button" onClick={forgot} disabled={submitting}>Forgot password?</button></div>
            <button className="button button-dark button-full" type="submit" disabled={submitting || !firebaseReady}>{submitting ? "Logging in…" : "Log in"}<ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">New around here? <Link to="/register">Create an account <ArrowRight size={14} /></Link></p>
          <div className="auth-security"><LockKeyhole size={14} /> Your details are protected by Firebase Authentication.</div>
        </div>
      </div>
    </section>
  );
}
