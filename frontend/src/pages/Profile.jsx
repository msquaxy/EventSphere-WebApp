import { useState } from "react";
import { Check, LoaderCircle, LockKeyhole, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { errorMessage, initials } from "../lib/format.js";

export default function Profile() {
  const { user, updateUser, resetPassword, isOrganizer, isAdmin } = useAuth();
  const [form, setForm] = useState({ fullName: user.fullName || "", city: user.city || "Manila", phone: user.phone || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try { await updateUser({ ...form, fullName: form.fullName.trim() }); setNotice("Your profile is up to date."); }
    catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const sendReset = async () => {
    setError(""); setNotice("");
    try { await resetPassword(user.email); setNotice("A password reset link is on its way to your inbox."); }
    catch (err) { setError(errorMessage(err)); }
  };

  return (
    <div className="profile-page page-shell">
      <div className="page-heading"><span className="section-kicker">YOUR ACCOUNT</span><h1>A little about you.</h1><p>Keep your details current so we can make every event easier.</p></div>
      <div className="profile-layout">
        <aside className="profile-summary"><span className="profile-avatar">{initials(user.fullName)}</span><h2>{user.fullName}</h2><p>{user.email}</p><span className="role-badge">{isAdmin ? "Administrator" : isOrganizer ? "Event organizer" : "Event explorer"}</span><div className="profile-security"><ShieldCheck size={18} /><span><strong>Your account is secure</strong><small>Protected by Firebase Authentication</small></span></div></aside>
        <section className="profile-form-card"><h2>Profile details</h2><p>This information helps organizers keep you informed about your bookings.</p>{error && <div className="notice notice-error">{error}</div>}{notice && <div className="notice notice-success">{notice}</div>}<form onSubmit={submit}><label>Full name<div className="input-with-icon"><UserRound size={18} /><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength={2} /></div></label><label>Email address<div className="input-with-icon disabled"><Mail size={18} /><input value={user.email} disabled /><small>Managed by Firebase</small></div></label><div className="form-row"><label>City<div className="input-with-icon"><MapPin size={18} /><select value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })}>{["Manila", "Makati", "Quezon City", "Pasig", "Taguig", "Other"].map((city) => <option key={city}>{city}</option>)}</select></div></label><label>Phone number<div className="input-with-icon"><Phone size={18} /><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Optional" /></div></label></div><div className="profile-form-footer"><button className="button button-dark" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{saving ? "Saving…" : "Save changes"}</button><span><Check size={14} /> Changes update across EventSphere.</span></div></form><div className="password-section"><div><span><LockKeyhole size={20} /></span><div><strong>Password & security</strong><p>Send a secure reset link to {user.email}.</p></div></div><button className="button button-outline button-small" onClick={sendReset}>Reset password</button></div></section>
      </div>
    </div>
  );
}
