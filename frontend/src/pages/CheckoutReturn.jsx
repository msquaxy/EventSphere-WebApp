import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, LoaderCircle, QrCode, ShieldCheck, Ticket, XCircle } from "lucide-react";
import { getEvent, getTicketsForOrder, subscribeOrder } from "../services/firestore.js";
import { completeDemoOrder } from "../services/functions.js";
import { errorMessage, formatDate } from "../lib/format.js";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import TicketPass from "../components/TicketPass.jsx";

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const isDemo = params.get("demo") === "1";
  const [order, setOrder] = useState(null);
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const startedDemo = useRef(false);

  useEffect(() => {
    if (!orderId) { setLoading(false); setError("No booking reference was provided."); return undefined; }
    return subscribeOrder(orderId, setOrder, (err) => { setError(errorMessage(err)); setLoading(false); });
  }, [orderId]);

  useEffect(() => {
    if (!order) { if (!loading) setLoading(false); return; }
    setLoading(false);
    getEvent(order.eventId).then(setEvent).catch((err) => setError(errorMessage(err)));
    if (order.status === "paid") getTicketsForOrder(order.id, order.attendeeId).then(setTickets).catch((err) => setError(errorMessage(err)));
    if (isDemo && order.status === "pending" && !startedDemo.current) {
      startedDemo.current = true;
      completeDemoOrder(order.id).catch((err) => setError(errorMessage(err)));
    }
  }, [order, isDemo, loading]);

  if (loading || (order && order.status === "pending")) return <div className="checkout-return page-shell"><div className="payment-waiting"><span className="payment-orbit"><LoaderCircle className="spin" size={34} /></span><span className="section-kicker">{isDemo ? "DEMO CHECKOUT" : "CONFIRMING PAYMENT"}</span><h1>{isDemo ? "Completing your demo booking…" : "Hang tight. We’re confirming your payment."}</h1><p>{isDemo ? "This is an emulator-only payment. No money will be charged." : "PayMongo usually confirms within a few seconds. Keep this page open and don’t pay again."}</p><div className="payment-reference"><Clock3 size={16} /> Booking reference: <strong>{order?.reference || orderId}</strong></div></div></div>;

  return (
    <div className="checkout-return page-shell">
      {error && <div className="notice notice-error">{error}</div>}
      {!order ? <div className="payment-waiting"><XCircle size={44} /><h1>We couldn’t find that booking.</h1><p>Check your ticket wallet or contact support if you were charged.</p><Link className="button button-dark" to="/dashboard">Open my ticket wallet</Link></div> : order.status === "paid" ? (
        <div className="payment-success"><span className="success-mark"><CheckCircle2 size={38} /></span><span className="section-kicker">YOU’RE GOING!</span><h1>Your good time is booked.</h1><p>We’ve confirmed your {order.quantity} ticket{order.quantity === 1 ? "" : "s"} for <strong>{event?.title || "your event"}</strong>. Your QR passes are ready below.</p>{event && <div className="confirmed-event-card"><img src={event.coverImage} alt="" /><div><span>{event.category}</span><h3>{event.title}</h3><p>{formatDate(event.startAt)} · {event.venueName}, {event.city}</p></div><strong>{order.reference}</strong></div>}<div className="confirmed-tickets">{tickets.map((ticket) => <button key={ticket.id} onClick={() => setSelected(ticket)}><span><QrCode size={24} /></span><div><strong>{ticket.code}</strong><small>Tap to view digital pass</small></div><ArrowRight size={17} /></button>)}</div><div className="payment-success-actions"><Link className="button button-dark" to="/dashboard">Go to my ticket wallet <ArrowRight size={16} /></Link><Link className="button button-outline" to="/">Discover more events</Link></div><p className="payment-security"><ShieldCheck size={15} /> {isDemo ? "Demo booking completed without a real charge." : "Payment confirmed securely by PayMongo."}</p></div>
      ) : (
        <div className="payment-waiting"><XCircle size={44} /><h1>This booking is no longer active.</h1><p>The reservation expired or was cancelled. You can return to the event and choose new tickets.</p><Link className="button button-dark" to={event ? `/events/${event.id}` : "/"}>Back to the event</Link></div>
      )}
      {selected && <Modal title="Your digital ticket" onClose={() => setSelected(null)}><TicketPass ticket={selected} event={event} /></Modal>}
    </div>
  );
}
