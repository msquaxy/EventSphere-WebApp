import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, QrCode, ScanLine, Ticket, UsersRound, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getEvent, getTicketsForEvent, subscribeEventOrders, subscribeOrganizerEvents } from "../services/firestore.js";
import { checkInTicket } from "../services/functions.js";
import { errorMessage, formatDate, formatTime } from "../lib/format.js";
import Loading from "../components/Loading.jsx";
import QRScanner from "../components/QRScanner.jsx";

export default function CheckIn() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const processingRef = useRef(false);

  useEffect(() => subscribeOrganizerEvents(user.id, setEvents, () => {}), [user.id]);

  const refreshTickets = useCallback(async (id) => {
    const items = await getTicketsForEvent(id);
    setTickets(items);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setResult(null); setError("");
    getEvent(eventId).then(async (item) => {
      if (!active) return;
      if (!item || item.organizerId !== user.id) { setError("This event is not available in your organizer studio."); setLoading(false); return; }
      setEvent(item);
      await refreshTickets(item.id);
      if (active) setLoading(false);
    }).catch((err) => { if (active) { setError(errorMessage(err)); setLoading(false); } });
    return () => { active = false; };
  }, [eventId, user.id, refreshTickets]);

  useEffect(() => {
    if (!eventId) return undefined;
    return subscribeEventOrders(eventId, setOrders, () => {});
  }, [eventId]);

  const processCode = useCallback(async (rawCode) => {
    if (processingRef.current) return;
    processingRef.current = true; setProcessing(true); setError(""); setResult(null);
    try {
      const response = await checkInTicket(rawCode.trim());
      setResult({ success: true, ...response });
      setScanning(false);
      await refreshTickets(eventId);
    } catch (err) {
      setResult({ success: false, message: errorMessage(err, "This ticket could not be checked in.") });
      setScanning(false);
    } finally {
      processingRef.current = false; setProcessing(false); setManualCode("");
    }
  }, [eventId, refreshTickets]);

  const checkedIn = tickets.filter((ticket) => ticket.status === "checked_in").length;
  const paidAttendees = orders.filter((order) => order.status === "paid");

  if (loading) return <Loading label="Preparing the check-in desk…" />;

  return (
    <div className="checkin-page">
      <div className="page-shell">
        <Link className="back-link" to="/organizer"><ArrowLeft size={16} /> Back to studio</Link>
        <div className="checkin-heading"><div><span className="section-kicker">GUEST CHECK-IN</span><h1>Welcome your people.</h1><p>Scan a digital ticket or enter its code to mark a guest as arrived.</p></div><label className="event-selector">Event<select value={eventId} onChange={(change) => navigate(`/organizer/events/${change.target.value}/check-in`)}>{events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
        {error && <div className="notice notice-error">{error}</div>}
        {event && <div className="checkin-event-bar"><img src={event.coverImage} alt="" /><div><strong>{event.title}</strong><span>{formatDate(event.startAt)} · {formatTime(event.startAt)} · {event.venueName}</span></div><Link to={`/events/${event.id}`} target="_blank">View event <ArrowRight size={14} /></Link></div>}
        <div className="checkin-stats"><div><span className="stat-icon"><UsersRound size={21} /></span><div><small>PAID GUESTS</small><strong>{paidAttendees.reduce((sum, order) => sum + order.quantity, 0)}</strong></div></div><div><span className="stat-icon"><CheckCircle2 size={21} /></span><div><small>CHECKED IN</small><strong>{checkedIn}</strong></div></div><div><span className="stat-icon"><Ticket size={21} /></span><div><small>WAITING TO ARRIVE</small><strong>{Math.max(0, tickets.length - checkedIn)}</strong></div></div></div>
        <div className="checkin-layout">
          <section className="checkin-scanner-panel"><div className="panel-heading"><div><h2>Scan a ticket</h2><p>The camera stays on this device.</p></div><span className={`scanner-status ${scanning ? "active" : ""}`}><span />{scanning ? "Scanner on" : "Scanner paused"}</span></div><QRScanner active={scanning && !processing} onScan={processCode} />
            {processing && <div className="checkin-processing"><LoaderCircle className="spin" size={20} /> Checking ticket…</div>}
            {result && <div className={`scan-result ${result.success ? "success" : "error"}`}>{result.success ? <CheckCircle2 size={30} /> : <XCircle size={30} />}<div><strong>{result.success ? `Welcome, ${result.attendeeName || "guest"}!` : "Ticket not admitted"}</strong><p>{result.success ? `${result.ticket.code} · ${result.eventTitle}` : result.message}</p></div>{result.success && <button className="button button-dark button-small" onClick={() => { setResult(null); setScanning(true); }}>Scan next <ScanLine size={15} /></button>}</div>}
            <form className="manual-checkin" onSubmit={(submitEvent) => { submitEvent.preventDefault(); if (manualCode.trim()) processCode(manualCode); }}><label htmlFor="ticket-code">Or enter ticket code</label><div><input id="ticket-code" value={manualCode} onChange={(change) => setManualCode(change.target.value.toUpperCase())} placeholder="ES-XXXXXX" /><button className="button button-dark" disabled={!manualCode.trim() || processing}>Check in <ArrowRight size={15} /></button></div></form>
          </section>
          <section className="attendee-panel"><div className="panel-heading"><div><h2>Guest list</h2><p>Confirmed ticket holders</p></div><span className="count-badge">{paidAttendees.length}</span></div>{paidAttendees.length ? <div className="attendee-list">{paidAttendees.map((order) => { const guestTickets = tickets.filter((ticket) => ticket.orderId === order.id); const allChecked = guestTickets.length > 0 && guestTickets.every((ticket) => ticket.status === "checked_in"); return <div className="attendee-row" key={order.id}><span className={`attendee-avatar ${allChecked ? "checked" : ""}`}>{allChecked ? <Check size={17} /> : (order.attendeeName || "G").slice(0, 1).toUpperCase()}</span><div><strong>{order.attendeeName || "EventSphere guest"}</strong><small>{order.quantity} ticket{order.quantity === 1 ? "" : "s"} · {order.reference}</small></div><span className={`status-pill ${allChecked ? "status-paid" : "status-pending"}`}>{allChecked ? "Arrived" : "Expected"}</span></div>; })}</div> : <div className="attendee-empty"><QrCode size={30} /><p>Confirmed guests will appear here.</p></div>}</section>
        </div>
      </div>
    </div>
  );
}
