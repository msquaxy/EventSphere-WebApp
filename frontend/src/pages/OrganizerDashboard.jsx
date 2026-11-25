import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CalendarDays, CircleDollarSign, Eye, LayoutDashboard, Plus, QrCode, Ticket, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getOrdersForEvents, subscribeOrganizerEvents } from "../services/firestore.js";
import { errorMessage, formatDate, formatMoney, toDate } from "../lib/format.js";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => subscribeOrganizerEvents(user.id, (items) => { setEvents(items); setLoading(false); }, (err) => { setError(errorMessage(err)); setLoading(false); }), [user.id]);

  useEffect(() => {
    let active = true;
    getOrdersForEvents(events.map((event) => event.id)).then((items) => { if (active) setOrders(items); }).catch((err) => { if (active) setError(errorMessage(err)); });
    return () => { active = false; };
  }, [events]);

  const paidOrders = useMemo(() => orders.filter((order) => order.status === "paid"), [orders]);
  const revenue = paidOrders.reduce((total, order) => total + (order.totalCentavos || 0), 0);
  const ticketsSold = paidOrders.reduce((total, order) => total + (order.quantity || 0), 0);
  const chart = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    return { label: day.toLocaleDateString("en-PH", { weekday: "short" }).slice(0, 1), value: paidOrders.filter((order) => { const date = toDate(order.paidAt); return date >= day && date < next; }).reduce((sum, order) => sum + order.totalCentavos, 0) };
  }), [paidOrders]);
  const maxChart = Math.max(...chart.map((item) => item.value), 1);

  if (loading) return <Loading label="Opening your organizer studio…" />;

  return (
    <div className="studio-page">
      <div className="studio-shell page-shell">
        <div className="studio-heading"><div><span className="section-kicker">ORGANIZER STUDIO</span><h1>Make good things happen.</h1><p>Welcome back, {user.fullName.split(" ")[0]}. Here’s how your events are doing.</p></div><Link className="button button-dark" to="/organizer/events/new"><Plus size={17} /> Create event</Link></div>
        {error && <div className="notice notice-error">{error}</div>}
        <div className="studio-stats">
          <div><span className="stat-icon"><CircleDollarSign size={22} /></span><small>GROSS REVENUE</small><strong>{formatMoney(revenue)}</strong><span>From confirmed ticket sales</span></div>
          <div><span className="stat-icon"><Ticket size={22} /></span><small>TICKETS SOLD</small><strong>{ticketsSold}</strong><span>Across all your events</span></div>
          <div><span className="stat-icon"><CalendarDays size={22} /></span><small>YOUR EVENTS</small><strong>{events.length}</strong><span>{events.filter((event) => event.status === "published").length} currently published</span></div>
          <div><span className="stat-icon"><TrendingUp size={22} /></span><small>AVG. TICKET VALUE</small><strong>{formatMoney(ticketsSold ? Math.round(revenue / ticketsSold) : 0)}</strong><span>Per confirmed ticket</span></div>
        </div>
        {!events.length ? (
          <EmptyState title="Let’s make your first event happen" description="Create an event page, set your ticket price, and share it with your community. We’ll handle the booking and QR tickets." action={<Link className="button button-dark" to="/organizer/events/new"><Plus size={16} /> Create your first event</Link>} />
        ) : (
          <div className="studio-content-grid">
            <section className="studio-panel revenue-panel"><div className="panel-heading"><div><h2>Sales this week</h2><p>Confirmed ticket revenue</p></div><span className="chart-total">{formatMoney(chart.reduce((sum, day) => sum + day.value, 0))}</span></div><div className="revenue-chart">{chart.map((day, index) => <div className="chart-column" key={index}><span className="chart-value" style={{ height: `${Math.max(3, (day.value / maxChart) * 100)}%` }} title={formatMoney(day.value)} /><small>{day.label}</small></div>)}</div></section>
            <section className="studio-panel getting-started"><div className="panel-heading"><div><h2>A great event starts here</h2><p>Your quick launch checklist</p></div></div><ol><li className="done"><span>✓</span><div><strong>Create your organizer account</strong><small>You’re all set.</small></div></li><li className={events.length ? "done" : ""}><span>{events.length ? "✓" : "2"}</span><div><strong>Publish your first event</strong><small>{events.length ? "Done — keep the momentum going." : "Add clear details and a great cover."}</small></div></li><li className={ticketsSold ? "done" : ""}><span>{ticketsSold ? "✓" : "3"}</span><div><strong>Welcome your first guest</strong><small>{ticketsSold ? "Your community is showing up." : "Share your event link to get bookings."}</small></div></li></ol></section>
          </div>
        )}
        {events.length > 0 && <section className="studio-panel events-panel"><div className="panel-heading"><div><h2>Your events</h2><p>Manage every detail from here</p></div><Link className="text-button" to="/organizer/events/new"><Plus size={15} /> New event</Link></div><div className="table-scroll"><table className="data-table organizer-table"><thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Tickets sold</th><th>Revenue</th><th>Actions</th></tr></thead><tbody>{events.map((event) => { const eventRevenue = paidOrders.filter((order) => order.eventId === event.id).reduce((sum, order) => sum + order.totalCentavos, 0); return <tr key={event.id}><td><div className="table-event"><img src={event.coverImage || "/images/community.jpg"} alt="" /><div><strong>{event.title}</strong><small>{event.city} · {event.category}</small></div></div></td><td>{formatDate(event.startAt)}</td><td><span className={`status-pill status-${event.status}`}>{event.status}</span></td><td><strong>{event.soldCount || 0}</strong> / {event.capacity}</td><td>{formatMoney(eventRevenue)}</td><td><div className="table-actions"><Link to={`/events/${event.id}`} aria-label={`View ${event.title}`}><Eye size={16} /></Link><Link to={`/organizer/events/${event.id}/check-in`} aria-label={`Check in guests at ${event.title}`}><QrCode size={16} /></Link><Link className="table-edit" to={`/organizer/events/${event.id}/edit`}>Edit <ArrowUpRight size={14} /></Link></div></td></tr>; })}</tbody></table></div></section>}
        <div className="studio-footer-note"><LayoutDashboard size={16} /> Need a hand? Email <a href="mailto:hosts@eventsphere.ph">hosts@eventsphere.ph</a> — real humans, happy to help.</div>
      </div>
    </div>
  );
}
