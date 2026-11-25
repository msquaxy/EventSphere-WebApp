import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Check, LoaderCircle, MapPin, Save, Search, Send, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getEvent, saveEvent } from "../services/firestore.js";
import { errorMessage, toDate } from "../lib/format.js";
import Loading from "../components/Loading.jsx";

const coverOptions = [
  { label: "Community", value: "/images/community.jpg" },
  { label: "Live music", value: "/images/night-market.jpg" },
  { label: "Workshop", value: "/images/pottery-workshop-v2.jpg" },
  { label: "Food", value: "/images/food-market.jpg" },
  { label: "Tech", value: "/images/tech-workshop.jpg" },
];

function localInput(date) {
  const value = new Date(date);
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export default function EventEditor() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const start = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 7); date.setHours(18, 0, 0, 0); return date; }, []);
  const end = useMemo(() => { const date = new Date(start); date.setHours(21, 0, 0, 0); return date; }, [start]);
  const [form, setForm] = useState({ title: "", category: "Music", summary: "", description: "", venueName: "", address: "", city: "Manila", startAt: localInput(start), endAt: localInput(end), capacity: 50, priceCentavos: 25000, lat: 14.5995, lng: 120.9842, coverImage: "/images/community.jpg", status: "draft" });
  const [loading, setLoading] = useState(Boolean(eventId));
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then((event) => {
      if (!event || event.organizerId !== user.id) { setError("This event could not be found or is not yours to edit."); setLoading(false); return; }
      setForm({ ...form, ...event, startAt: localInput(toDate(event.startAt)), endAt: localInput(toDate(event.endAt)) });
      setLoading(false);
    }).catch((err) => { setError(errorMessage(err)); setLoading(false); });
  }, [eventId, user.id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const completion = [form.title, form.summary, form.description, form.venueName, form.address, form.startAt, form.endAt].filter(Boolean).length;

  const validate = (publishing) => {
    if (!form.title.trim() || !form.summary.trim() || !form.description.trim()) return "Add a title, short summary, and full event description.";
    if (!form.venueName.trim() || !form.address.trim()) return "Add the venue name and street address.";
    const startDate = new Date(form.startAt); const endDate = new Date(form.endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) return "The end time must be after the start time.";
    if (form.capacity < 1 || form.priceCentavos < 0) return "Capacity must be at least 1 and ticket price cannot be negative.";
    if (Number(form.capacity) < (form.soldCount || 0) + (form.reservedCount || 0)) return "Capacity cannot be lower than tickets already sold or reserved.";
    if (publishing && startDate < new Date()) return "Published events need a future start date.";
    return "";
  };

  const submit = async (status) => {
    const validation = validate(status === "published");
    if (validation) return setError(validation);
    setSaving(status); setError(""); setNotice("");
    try {
      const payload = { ...form, title: form.title.trim(), summary: form.summary.trim(), description: form.description.trim(), venueName: form.venueName.trim(), address: form.address.trim(), startAt: new Date(form.startAt), endAt: new Date(form.endAt), capacity: Number(form.capacity), priceCentavos: Math.round(Number(form.priceCentavos)), lat: Number(form.lat), lng: Number(form.lng), coverImage: form.coverImage.trim() || "/images/community.jpg", status, organizerId: user.id, organizerName: user.fullName, ...(!eventId && { soldCount: 0, reservedCount: 0 }), eventStartLabel: form.startAt };
      await saveEvent(eventId, payload);
      navigate(`/organizer?saved=${status === "published" ? "published" : "draft"}`);
    } catch (err) { setError(errorMessage(err)); setSaving(""); }
  };

  const geocode = async () => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return setError("Add VITE_MAPBOX_TOKEN to use address search. You can still enter latitude and longitude manually.");
    setLocating(true); setError("");
    try {
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${form.address}, ${form.city}, Philippines`)}.json?access_token=${encodeURIComponent(token)}&country=ph&limit=1`);
      if (!response.ok) throw new Error("Address search is unavailable right now.");
      const data = await response.json();
      const place = data.features?.[0];
      if (!place) throw new Error("We could not find that address. Try a nearby landmark.");
      update("lng", place.center[0]); update("lat", place.center[1]); update("address", place.place_name.split(",")[0]);
      setNotice("Venue coordinates found. The event map is ready.");
    } catch (err) { setError(errorMessage(err)); }
    finally { setLocating(false); }
  };

  if (loading) return <Loading label="Loading your event…" />;

  return (
    <div className="editor-page page-shell">
      <Link className="back-link" to="/organizer"><ArrowLeft size={16} /> Back to studio</Link>
      <div className="editor-heading"><div><span className="section-kicker">{eventId ? "EDIT EVENT" : "NEW EVENT"}</span><h1>{eventId ? "Polish the details." : "Let’s bring people together."}</h1><p>{eventId ? "Keep your event page accurate and your guests in the loop." : "Start with the essentials. You can save a draft and come back anytime."}</p></div><div className="draft-actions"><button className="button button-outline" onClick={() => submit("draft")} disabled={Boolean(saving)}><Save size={16} /> Save draft</button><button className="button button-dark" onClick={() => submit("published")} disabled={Boolean(saving)}>{saving ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}{saving ? "Saving…" : eventId && form.status === "published" ? "Update event" : "Publish event"}</button></div></div>
      <div className="editor-progress"><span style={{ width: `${(completion / 7) * 100}%` }} /><small>{completion} of 7 essentials added</small></div>
      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice notice-info">{notice}</div>}
      <div className="editor-layout">
        <div className="editor-form">
          <section className="editor-card"><div className="editor-card-heading"><span>01</span><div><h2>The basics</h2><p>Give people a reason to stop scrolling.</p></div></div><div className="editor-fields"><label>Event title<input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Manila After Dark: Night Market" maxLength={90} /></label><label>Category<select value={form.category} onChange={(event) => update("category", event.target.value)}>{["Music", "Food", "Arts", "Markets", "Wellness", "Tech", "Community"].map((category) => <option key={category}>{category}</option>)}</select></label><label>Short summary<textarea rows={2} value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="One or two sentences that capture the vibe." maxLength={180} /><small>{form.summary.length}/180 characters</small></label><label>Full description<textarea rows={6} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="What will guests experience? Include what to bring, who it’s for, and the schedule." /></label></div></section>
          <section className="editor-card"><div className="editor-card-heading"><span>02</span><div><h2>When & where</h2><p>Make it easy to plan the perfect night out.</p></div></div><div className="editor-fields"><div className="form-row"><label>Starts<input type="datetime-local" value={form.startAt} onChange={(event) => update("startAt", event.target.value)} /></label><label>Ends<input type="datetime-local" value={form.endAt} onChange={(event) => update("endAt", event.target.value)} /></label></div><label>Venue name<input value={form.venueName} onChange={(event) => update("venueName", event.target.value)} placeholder="e.g. The Laneway Creative Space" /></label><div className="form-row"><label>Street address<input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, barangay, or landmark" /></label><label>City<select value={form.city} onChange={(event) => update("city", event.target.value)}>{["Manila", "Makati", "Quezon City", "Pasig", "Taguig"].map((city) => <option key={city}>{city}</option>)}</select></label></div><button type="button" className="button button-outline geocode-button" onClick={geocode} disabled={locating}>{locating ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}{locating ? "Finding venue…" : "Find venue coordinates"}</button><div className="form-row coordinate-fields"><label>Latitude<input type="number" step="any" value={form.lat} onChange={(event) => update("lat", event.target.value)} /></label><label>Longitude<input type="number" step="any" value={form.lng} onChange={(event) => update("lng", event.target.value)} /></label></div></div></section>
          <section className="editor-card"><div className="editor-card-heading"><span>03</span><div><h2>Tickets & capacity</h2><p>Set your price and keep attendance comfortable.</p></div></div><div className="editor-fields"><div className="form-row"><label>Ticket price (PHP)<input type="number" min="0" step="1" value={(form.priceCentavos || 0) / 100} onChange={(event) => update("priceCentavos", Math.round(Number(event.target.value) * 100))} /><small>Set to 0 for a free event.</small></label><label>Capacity<input type="number" min="1" step="1" value={form.capacity} onChange={(event) => update("capacity", event.target.value)} /><small>Maximum guests for this event.</small></label></div><div className="info-callout"><Sparkles size={18} /><p>PayMongo securely processes GCash, Maya, QR Ph, and card payments. EventSphere never stores card details.</p></div></div></section>
        </div>
        <aside className="editor-sidebar"><section className="editor-card cover-card"><div className="editor-card-heading"><span>04</span><div><h2>Cover image</h2><p>Make a great first impression.</p></div></div><div className="cover-preview"><img src={form.coverImage || "/images/community.jpg"} alt="Event cover preview" /></div><label>Cover image URL<input type="text" inputMode="url" value={form.coverImage} onChange={(event) => update("coverImage", event.target.value)} placeholder="https://example.com/cover.jpg" /><small>Paste a public image URL or choose a cover below.</small></label><p className="cover-label">Or choose a cover</p><div className="cover-options">{coverOptions.map((cover) => <button key={cover.value} className={form.coverImage === cover.value ? "selected" : ""} onClick={() => update("coverImage", cover.value)}><img src={cover.value} alt={cover.label} />{form.coverImage === cover.value && <span><Check size={13} /></span>}</button>)}</div></section><section className="preview-card"><div className="preview-card-image"><img src={form.coverImage} alt="" /><span>{form.category}</span></div><div><small>LIVE PREVIEW</small><h3>{form.title || "Your event title"}</h3><p><CalendarDays size={14} /> {form.startAt ? new Date(form.startAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Date not set"}</p><p><MapPin size={14} /> {form.venueName || "Venue to be announced"}</p></div></section><div className="publishing-note"><strong>Before you publish</strong><p>Double-check your date, venue, ticket price, and capacity. You can edit these details later.</p></div></aside>
      </div>
    </div>
  );
}
