import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarPlus, Check, Eye, EyeOff, LockKeyhole, Mail, Ticket, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage } from "../lib/format.js";
import Loading from "../components/Loading.jsx";

export default function Register() {
  const { register, isAuthenticated, loading, firebaseReady } = useAuth();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") === "organizer" ? "organizer" : "attendee");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (loading) return <Loading label="Getting your account ready…" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Use at least 8 characters for your password.");
    if (form.password !== form.confirm) return setError("Your passwords do not match.");
    setSubmitting(true);
    try {
      await register({ ...form, role });
      navigate("/login", { state: { message: "Your account is ready. Log in to start exploring." } });
    } catch (err) { setError(errorMessage(err, "Could not create your account.")); }
    finally { setSubmitting(false); }
  };

  return (
    <section className="auth-page register-page page-shell">
      <div className="auth-visual register-visual">
        <img src="/images/night-market.jpg" alt="People celebrating at a local live event" />
        <div className="auth-visual-overlay" />
        <div className="auth-quote"><span className="quote-spark">✳</span><blockquote>There’s a place for you here.</blockquote><p>Come as you are. Leave with a story.</p></div>
        <div className="register-benefit"><Ticket size={21} /><div><strong>One account. All the good stuff.</strong><span>Save events, keep your tickets, and pick up where you left off.</span></div></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap register-form-wrap">
          <span className="section-kicker">COME ON IN</span>
          <h1>Make room for good times.</h1>
          <p className="auth-intro">Create your free EventSphere account in a minute.</p>
          {!firebaseReady && <div className="notice notice-error">Firebase is not configured. Add your web app settings to <code>frontend/.env.local</code>.</div>}
          {error && <div className="notice notice-error">{error}</div>}
          <div className="role-picker" aria-label="Account type">
            <button type="button" className={role === "attendee" ? "selected" : ""} onClick={() => setRole("attendee")}><span><Ticket size={20} /></span><strong>I’m here to explore</strong><small>Find events and book tickets</small>{role === "attendee" && <Check size={16} className="role-check" />}</button>
            <button type="button" className={role === "organizer" ? "selected" : ""} onClick={() => setRole("organizer")}><span><CalendarPlus size={20} /></span><strong>I want to host</strong><small>Create and manage events</small>{role === "organizer" && <Check size={16} className="role-check" />}</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            <label>Full name<div className="input-with-icon"><UserRound size={18} /><input autoComplete="name" placeholder="Your full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} minLength={2} required disabled={!firebaseReady} /></div></label>
            <label>Email address<div className="input-with-icon"><Mail size={18} /><input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={!firebaseReady} /></div></label>
            <div className="form-row">
              <label>Password<div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="8+ characters" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={8} required disabled={!firebaseReady} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
              <label>Confirm password<div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} minLength={8} required disabled={!firebaseReady} /></div></label>
            </div>
            <label className="checkbox-label terms-check"><input type="checkbox" required /> I agree to the community guidelines and terms of service.</label>
            <button className="button button-dark button-full" type="submit" disabled={submitting || !firebaseReady}>{submitting ? "Creating your account…" : role === "organizer" ? "Create organizer account" : "Create my account"}<ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Log in <ArrowRight size={14} /></Link></p>
          <div className="auth-security"><LockKeyhole size={14} /> Secure authentication powered by Firebase.</div>
        </div>
      </div>
    </section>
  );
}
