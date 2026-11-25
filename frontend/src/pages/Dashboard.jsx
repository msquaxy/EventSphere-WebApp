import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Compass, QrCode, Ticket, XCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getEvent, getTicketsForOrder, subscribeUserOrders } from "../services/firestore.js";
import { cancelPendingOrder } from "../services/functions.js";
import { errorMessage, formatDate, formatMoney, formatTime, toDate } from "../lib/format.js";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import TicketPass from "../components/TicketPass.jsx";

export default function Dashboard() {
  const { user, isOrganizer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("tickets");
  const [ticketViews, setTicketViews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState("");

  useEffect(() => subscribeUserOrders(user.id, (items) => { setOrders(items); setLoading(false); }, (err) => { setError(errorMessage(err)); setLoading(false); }), [user.id]);

  useEffect(() => {
    let active = true;
    Promise.all(orders.map(async (order) => {
      const [event, tickets] = await Promise.all([getEvent(order.eventId), getTicketsForOrder(order.id, order.attendeeId)]);
      return { order, event, tickets };
    })).then((views) => { if (active) setTicketViews(views); }).catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [orders]);

  const ticketEntries = useMemo(() => ticketViews.flatMap((view) => view.tickets.map((ticket) => ({ ...ticket, event: view.event, order: view.order }))), [ticketViews]);
  const upcoming = ticketEntries.filter((ticket) => ticket.status !== "checked_in" && toDate(ticket.event?.startAt) >= new Date());
  const spent = orders.filter((order) => order.status === "paid").reduce((total, order) => total + (order.totalCentavos || 0), 0);

  const cancel = async (orderId) => {
    setBusyId(orderId); setError("");
    try { await cancelPendingOrder(orderId); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusyId(""); }
  };

  if (loading) return <Loading label="Opening your ticket wallet…" />;

  return (
    <div className="dashboard-page page-shell">
      <div className="dashboard-welcome">
        <div><span className="section-kicker">YOUR EVENTSPHERE</span><h1>Hey {user.fullName.split(" ")[0]}, ready for a good time?</h1><p>Your tickets, upcoming plans, and all the details — in one place.</p></div>
        <Link className="button button-dark" to="/"><Compass size={17} /> Find an event</Link>
      </div>
      {isOrganizer && <Link className="studio-shortcut" to="/organizer"><span><CalendarDays size={21} /></span><div><strong>Your organizer studio is ready</strong><small>Manage events, track sales, and welcome your guests.</small></div><ArrowUpRight size={20} /></Link>}
      <div className="dashboard-stats">
        <div><span className="stat-icon"><Ticket size={21} /></span><div><small>UPCOMING TICKETS</small><strong>{upcoming.length}</strong></div></div>
        <div><span className="stat-icon"><CheckCircle2 size={21} /></span><div><small>EVENTS ATTENDED</small><strong>{ticketEntries.filter((ticket) => ticket.status === "checked_in").length}</strong></div></div>
        <div><span className="stat-icon"><CalendarDays size={21} /></span><div><small>TOTAL BOOKINGS</small><strong>{orders.length}</strong></div></div>
        <div><span className="stat-icon"><QrCode size={21} /></span><div><small>TOTAL SPENT</small><strong>{formatMoney(spent)}</strong></div></div>
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      <div className="dashboard-tabs"><button className={tab === "tickets" ? "active" : ""} onClick={() => setTab("tickets")}>My tickets <span>{ticketEntries.length}</span></button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Booking history <span>{orders.length}</span></button></div>
      {tab === "tickets" ? (
        ticketEntries.length ? <div className="ticket-wallet-grid">{ticketEntries.map((ticket) => <article className="wallet-ticket" key={ticket.id}><div className="wallet-ticket-image"><img src={ticket.event?.coverImage || "/images/community.jpg"} alt="" /><span className={`status-pill status-${ticket.status}`}>{ticket.status === "checked_in" ? "Checked in" : "Ready to go"}</span></div><div className="wallet-ticket-body"><span className="section-kicker">{ticket.event?.category}</span><h3>{ticket.event?.title || "Event ticket"}</h3><p><CalendarDays size={15} /> {formatDate(ticket.event?.startAt, { weekday: "short" })} · {formatTime(ticket.event?.startAt)}</p><p><Clock3 size={15} /> {ticket.event?.venueName}, {ticket.event?.city}</p><div className="wallet-ticket-footer"><span>{ticket.code}</span><button className="button button-outline button-small" onClick={() => setSelected(ticket)}><QrCode size={15} /> View pass</button></div></div></article>)}</div> : <EmptyState title="Your next good time starts here" description="When you book an event, your digital tickets will appear right here." action={<Link className="button button-dark" to="/">Explore events <ArrowRight size={16} /></Link>} />
      ) : (
        orders.length ? <div className="table-card"><table className="data-table"><thead><tr><th>Booking</th><th>Event date</th><th>Tickets</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.reference || order.id.slice(0, 8).toUpperCase()}</strong><small>{formatDate(order.createdAt)}</small></td><td>{formatDate(order.eventStartAt || ticketViews.find((view) => view.order.id === order.id)?.event?.startAt)}</td><td>{order.quantity}</td><td>{formatMoney(order.totalCentavos)}</td><td><span className={`status-pill status-${order.status}`}>{order.status}</span></td><td>{order.status === "pending" && <button className="text-button danger-text" onClick={() => cancel(order.id)} disabled={busyId === order.id}>{busyId === order.id ? "Releasing…" : "Cancel"}</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No bookings yet" description="Your booking history will show up here after your first event." />
      )}
      {selected && <Modal title="Your digital ticket" onClose={() => setSelected(null)}><TicketPass ticket={selected} event={selected.event} /><div className="modal-note"><QrCode size={17} /><p>Show this QR code at the entrance. Each ticket can be checked in once.</p></div></Modal>}
    </div>
  );
}
