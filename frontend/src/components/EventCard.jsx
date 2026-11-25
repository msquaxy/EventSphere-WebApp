import { ArrowUpRight, CalendarDays, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, formatMoney, formatTime } from "../lib/format.js";

export default function EventCard({ event, saved = false, onSave, compact = false }) {
  const remaining = Math.max(0, (event.capacity || 0) - (event.soldCount || 0) - (event.reservedCount || 0));
  return (
    <article className={`event-card ${compact ? "event-card-compact" : ""}`}>
      <div className="event-card-media">
        <Link to={`/events/${event.id}`} aria-label={`View ${event.title}`}>
          <img src={event.coverImage || "/images/community.jpg"} alt="" loading="lazy" />
        </Link>
        <span className="category-badge">{event.category}</span>
        {onSave && (
          <button className={`save-button ${saved ? "is-saved" : ""}`} onClick={() => onSave(event.id)} aria-label={saved ? `Unsave ${event.title}` : `Save ${event.title}`}>
            <Heart size={18} fill={saved ? "currentColor" : "none"} />
          </button>
        )}
        <div className="date-tile">
          <span>{formatDate(event.startAt, { month: "short", day: "numeric", year: undefined }).split(" ")[0]}</span>
          <strong>{formatDate(event.startAt, { month: undefined, day: "numeric", year: undefined }).replace(/[^0-9]/g, "")}</strong>
        </div>
        {event.status === "cancelled" && <span className="cancelled-overlay">Cancelled</span>}
      </div>
      <div className="event-card-body">
        <div className="event-card-meta"><CalendarDays size={14} /> {formatDate(event.startAt, { weekday: "short", year: undefined })} · {formatTime(event.startAt)}</div>
        <Link to={`/events/${event.id}`} className="event-card-title"><h3>{event.title}</h3><ArrowUpRight size={19} /></Link>
        <p className="event-card-location"><MapPin size={14} /> {event.venueName}, {event.city}</p>
        <div className="event-card-footer">
          <span className="event-price">{event.priceCentavos ? formatMoney(event.priceCentavos) : "Free"}</span>
          <span className={remaining <= 5 ? "low-availability" : "muted-text"}>
            {event.status === "cancelled" ? "Event cancelled" : remaining === 0 ? "Sold out" : remaining <= 10 ? `Only ${remaining} left` : "Tickets available"}
          </span>
        </div>
      </div>
    </article>
  );
}
