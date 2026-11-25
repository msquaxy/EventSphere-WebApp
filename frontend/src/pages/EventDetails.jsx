import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock, CreditCard,
  MapPin, Minus, Plus, Share2, ShieldCheck, Ticket, UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getEvent, getOrganizer } from "../services/firestore.js";
import { createCheckout } from "../services/functions.js";
import { errorMessage, formatDate, formatMoney, formatTime, initials, toDate } from "../lib/format.js";
import EventMap from "../components/EventMap.jsx";
import Loading from "../components/Loading.jsx";

export default function EventDetails() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    getEvent(eventId).then(async (result) => {
      if (!active) return;
      setEvent(result);
      if (result?.organizerId) {
        try { setOrganizer(await getOrganizer(result.organizerId)); }
        catch { setOrganizer(null); }
      }
      if (active) setLoading(false);
    }).catch((err) => { if (active) { setError(errorMessage(err)); setLoading(false); } });
    return () => { active = false; };
  }, [eventId]);

  const remaining = useMemo(() => Math.max(0, (event?.capacity || 0) - (event?.soldCount || 0) - (event?.reservedCount || 0)), [event]);
  const isPast = event && toDate(event.startAt) < new Date();
  const unavailable = !event || event.status !== "published" || remaining < 1 || isPast;

  const checkout = async () => {
    setError("");
    if (!isAuthenticated) return navigate("/login", { state: { from: `/events/${eventId}` } });
    setSubmitting(true);
    try {
      const session = await createCheckout(eventId, quantity);
      if (session.free) {
        navigate(`/checkout/return?orderId=${encodeURIComponent(session.orderId)}`);
      } else if (session.demo) {
        navigate(`/checkout/return?orderId=${encodeURIComponent(session.orderId)}&demo=1`);
      } else {
        window.location.assign(session.checkoutUrl);
      }
    } catch (err) { setError(errorMessage(err, "Could not start checkout. Please try again.")); setSubmitting(false); }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: event.title, text: `Join me at ${event.title}`, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setNotice("Event link copied to your clipboard."); }
    } catch (err) { if (err.name !== "AbortError") setNotice("Could not share this event."); }
  };

  if (loading) return <Loading label="Opening the event details…" />;
  if (!event) return <div className="page-shell not-found"><span>404</span><h1>This event isn’t here.</h1><p>It may have moved, or the link may be incorrect.</p><Link className="button button-dark" to="/"><ArrowLeft size={16} /> Discover events</Link></div>;

  return (
    <div className="event-detail-page page-shell">
      <div className="breadcrumbs"><Link to="/">Discover</Link><ChevronRight size={14} /><Link to={`/?category=${encodeURIComponent(event.category)}`}>{event.category}</Link><ChevronRight size={14} /><span>{event.title}</span></div>
      {searchParams.get("checkout") === "cancelled" && <div className="notice notice-info">Checkout was cancelled. Your tickets have not been purchased.</div>}
      {event.status === "cancelled" && <div className="notice notice-error">The organizer has cancelled this event. Pending ticket reservations will be released automatically.</div>}
      <div className="event-detail-hero">
        <div className="event-cover"><img src={event.coverImage || "/images/community.jpg"} alt={event.title} /><span className="category-badge">{event.category}</span><button className="cover-share" onClick={share}><Share2 size={17} /> Share event</button></div>
        <div className="event-heading">
          <span className="section-kicker">{event.city.toUpperCase()} · {event.category.toUpperCase()}</span>
          <h1>{event.title}</h1>
          <p>{event.summary}</p>
          <div className="event-host-line"><span className="avatar">{initials(organizer?.fullName || event.organizerName)}</span><span>Hosted by <strong>{organizer?.fullName || event.organizerName || "Independent organizer"}</strong></span><span className="verified-host"><Check size={12} /> Community host</span></div>
        </div>
      </div>
      <div className="event-detail-layout">
        <div className="event-detail-content">
          <section className="detail-section detail-highlights">
            <div><span><CalendarDays size={21} /></span><div><small>DATE</small><strong>{formatDate(event.startAt, { weekday: "long" })}</strong><p>{formatTime(event.startAt)} – {formatTime(event.endAt)}</p></div></div>
            <div><span><MapPin size={21} /></span><div><small>LOCATION</small><strong>{event.venueName}</strong><p>{event.address}, {event.city}</p></div></div>
            <div><span><Ticket size={21} /></span><div><small>TICKETS</small><strong>{event.priceCentavos ? formatMoney(event.priceCentavos) : "Free entry"}</strong><p>{remaining} spots remaining</p></div></div>
          </section>
          <section className="detail-section"><h2>About this event</h2><div className="event-description">{(event.description || "Join us for a welcoming community experience.").split("\n").map((paragraph, index) => paragraph ? <p key={index}>{paragraph}</p> : <br key={index} />)}</div></section>
          <section className="detail-section"><div className="detail-section-heading"><div><h2>Where you’ll be</h2><p>{event.venueName} · {event.address}, {event.city}</p></div><a className="text-button" href={`https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}`} target="_blank" rel="noreferrer">Open in Maps <ArrowRight size={14} /></a></div><EventMap events={[event]} className="detail-map" /></section>
          <section className="detail-section event-good-to-know"><h2>Good to know</h2><div><p><Clock size={17} /><span><strong>Arrive a little early</strong>Doors open 30 minutes before the event. Have your QR ticket ready.</span></p><p><UsersRound size={17} /><span><strong>All are welcome</strong>This is an inclusive, community-focused experience.</span></p><p><ShieldCheck size={17} /><span><strong>Book with confidence</strong>Secure checkout through PayMongo. Your unique QR pass appears in your ticket wallet.</span></p></div></section>
        </div>
        <aside className="checkout-card">
          <div className="checkout-price"><span>{event.priceCentavos ? formatMoney(event.priceCentavos) : "Free"}</span><small>per ticket</small></div>
          <div className="availability-line"><span className="live-dot" />{remaining > 0 ? `${remaining} tickets available` : "This event is sold out"}</div>
          <div className="capacity-track"><span style={{ width: `${Math.min(100, ((event.soldCount || 0) / Math.max(1, event.capacity)) * 100)}%` }} /></div>
          <label className="quantity-label">Number of tickets</label>
          <div className="quantity-control"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={16} /></button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity((value) => Math.min(6, remaining, value + 1))} disabled={quantity >= Math.min(6, remaining)} aria-label="Increase quantity"><Plus size={16} /></button></div>
          <div className="checkout-total"><span>Total</span><strong>{formatMoney((event.priceCentavos || 0) * quantity)}</strong></div>
          {error && <div className="notice notice-error">{error}</div>}
          {notice && <div className="notice notice-success">{notice}</div>}
          <button className="button button-dark button-full checkout-button" onClick={checkout} disabled={submitting || unavailable}>{submitting ? "Opening secure checkout…" : isPast ? "Event has ended" : event.status === "cancelled" ? "Event cancelled" : remaining === 0 ? "Sold out" : event.priceCentavos ? "Get tickets" : "Reserve free tickets"}<ArrowRight size={17} /></button>
          <p className="checkout-note"><ShieldCheck size={14} /> Secure checkout. No hidden fees.</p>
          <div className="payment-methods"><span>GCash</span><span>Maya</span><span>QR Ph</span><span><CreditCard size={13} /> Card</span></div>
          {!isAuthenticated && <p className="checkout-login-note">You’ll log in or create an account before payment.</p>}
          {user?.id === event.organizerId && <Link className="text-button organizer-edit-link" to={`/organizer/events/${event.id}/edit`}>Manage this event <ArrowRight size={14} /></Link>}
        </aside>
      </div>
    </div>
  );
}
