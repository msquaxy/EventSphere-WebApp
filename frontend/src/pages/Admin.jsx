import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, Check, CircleDollarSign, LoaderCircle, Search, ShieldCheck, Ticket, UserCheck, UsersRound, X } from "lucide-react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getAllEvents, getAllOrders, getAllUsers } from "../services/firestore.js";
import { errorMessage, formatDate, formatMoney, initials } from "../lib/format.js";
import Loading from "../components/Loading.jsx";

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([getAllUsers(), getAllEvents(), getAllOrders()]).then(([userItems, eventItems, orderItems]) => { setUsers(userItems); setEvents(eventItems); setOrders(orderItems); }).catch((err) => setError(errorMessage(err))).finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => users.filter((item) => `${item.fullName} ${item.email} ${item.role}`.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const filteredEvents = useMemo(() => events.filter((item) => `${item.title} ${item.city} ${item.organizerName}`.toLowerCase().includes(search.toLowerCase())), [events, search]);
  const paidOrders = orders.filter((order) => order.status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + order.totalCentavos, 0);

  const moderateUser = async (target, values) => {
    setBusy(target.id); setError(""); setNotice("");
    try { await updateDoc(doc(db, "users", target.id), { ...values, updatedAt: serverTimestamp() }); setUsers((items) => items.map((item) => item.id === target.id ? { ...item, ...values } : item)); setNotice(`${target.fullName}'s account was updated.`); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(""); }
  };

  const moderateEvent = async (target, status) => {
    setBusy(target.id); setError(""); setNotice("");
    try { await updateDoc(doc(db, "events", target.id), { status, updatedAt: serverTimestamp() }); setEvents((items) => items.map((item) => item.id === target.id ? { ...item, status } : item)); setNotice(`${target.title} is now ${status}.`); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(""); }
  };

  if (loading) return <Loading label="Loading platform insights…" />;

  return (
    <div className="admin-page">
      <div className="page-shell">
        <div className="admin-heading"><div><span className="section-kicker"><ShieldCheck size={14} /> ADMIN CONSOLE</span><h1>Keep the community thriving.</h1><p>Moderate accounts and events, and keep an eye on platform activity.</p></div><span className="admin-live"><span /> Live platform data</span></div>
        {error && <div className="notice notice-error">{error}</div>}{notice && <div className="notice notice-success">{notice}</div>}
        <div className="admin-stats"><div><span><UsersRound size={22} /></span><small>COMMUNITY MEMBERS</small><strong>{users.length}</strong><p>{users.filter((item) => item.status === "active").length} active accounts</p></div><div><span><CalendarDays size={22} /></span><small>PLATFORM EVENTS</small><strong>{events.length}</strong><p>{events.filter((item) => item.status === "published").length} published</p></div><div><span><Ticket size={22} /></span><small>TICKETS SOLD</small><strong>{paidOrders.reduce((sum, order) => sum + order.quantity, 0)}</strong><p>{paidOrders.length} confirmed bookings</p></div><div><span><CircleDollarSign size={22} /></span><small>GROSS BOOKING VALUE</small><strong>{formatMoney(revenue)}</strong><p>Across the EventSphere community</p></div></div>
        <section className="admin-panel"><div className="admin-tabs"><button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><UsersRound size={17} /> Members <span>{users.length}</span></button><button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}><CalendarDays size={17} /> Events <span>{events.length}</span></button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><Ticket size={17} /> Bookings <span>{orders.length}</span></button><label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === "events" ? "Search events…" : tab === "orders" ? "Search reference…" : "Search members…"} /></label></div>
          {tab === "users" && <div className="table-scroll"><table className="data-table admin-table"><thead><tr><th>Member</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredUsers.map((member) => <tr key={member.id}><td><div className="member-cell"><span className="avatar">{initials(member.fullName)}</span><div><strong>{member.fullName}{member.id === currentUser.id && <small className="you-label">You</small>}</strong><small>{member.email}</small></div></div></td><td>{member.id === currentUser.id ? <span className="role-badge">{member.role}</span> : <select className="role-select" value={member.role} disabled={busy === member.id} onChange={(event) => moderateUser(member, { role: event.target.value })}><option value="attendee">Attendee</option><option value="organizer">Organizer</option><option value="admin">Admin</option></select>}</td><td>{formatDate(member.createdAt)}</td><td><span className={`status-pill status-${member.status}`}>{member.status}</span></td><td>{member.id === currentUser.id ? <span className="muted-text">Current account</span> : <button className={`moderation-button ${member.status === "active" ? "suspend" : "restore"}`} disabled={busy === member.id} onClick={() => moderateUser(member, { status: member.status === "active" ? "suspended" : "active" })}>{busy === member.id ? <LoaderCircle size={15} className="spin" /> : member.status === "active" ? <><X size={14} /> Suspend</> : <><UserCheck size={14} /> Restore</>}</button>}</td></tr>)}</tbody></table></div>}
          {tab === "events" && <div className="table-scroll"><table className="data-table admin-table"><thead><tr><th>Event</th><th>Organizer</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredEvents.map((item) => <tr key={item.id}><td><div className="table-event"><img src={item.coverImage} alt="" /><div><strong>{item.title}</strong><small>{item.city} · {item.category}</small></div></div></td><td>{item.organizerName}</td><td>{formatDate(item.startAt)}</td><td><span className={`status-pill status-${item.status}`}>{item.status}</span></td><td><div className="admin-event-actions"><Link to={`/events/${item.id}`} target="_blank" aria-label="View event"><ArrowUpRight size={16} /></Link>{item.status === "cancelled" ? <button className="moderation-button restore" disabled={busy === item.id} onClick={() => moderateEvent(item, "published")}><Check size={14} /> Restore</button> : <button className="moderation-button suspend" disabled={busy === item.id} onClick={() => moderateEvent(item, "cancelled")}><X size={14} /> Cancel event</button>}</div></td></tr>)}</tbody></table></div>}
          {tab === "orders" && <div className="table-scroll"><table className="data-table admin-table"><thead><tr><th>Reference</th><th>Guest</th><th>Event</th><th>Quantity</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.filter((order) => `${order.reference} ${order.attendeeName} ${order.attendeeEmail}`.toLowerCase().includes(search.toLowerCase())).map((order) => <tr key={order.id}><td><strong>{order.reference}</strong><small>{formatDate(order.createdAt)}</small></td><td><strong>{order.attendeeName}</strong><small>{order.attendeeEmail}</small></td><td className="order-event-id">{order.eventId.slice(0, 10)}…</td><td>{order.quantity}</td><td>{formatMoney(order.totalCentavos)}</td><td><span className={`status-pill status-${order.status}`}>{order.status}</span></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </div>
  );
}
