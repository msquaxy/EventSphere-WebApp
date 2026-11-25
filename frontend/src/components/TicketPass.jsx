import { useEffect, useState } from "react";
import { CalendarDays, Download, MapPin, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { formatDate, formatTime } from "../lib/format.js";

export default function TicketPass({ ticket, event }) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL(ticket.code, { width: 360, margin: 2, color: { dark: "#173f35", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [ticket.code]);

  const download = () => {
    if (!qr) return;
    const link = document.createElement("a");
    link.href = qr;
    link.download = `EventSphere-${ticket.code}.png`;
    link.click();
  };

  return (
    <div className="ticket-pass">
      <div className="ticket-main">
        <div className="ticket-kicker"><span className="live-dot" /> EventSphere digital pass</div>
        <h3>{event?.title || "Your event ticket"}</h3>
        <p><CalendarDays size={15} /> {event ? `${formatDate(event.startAt)} · ${formatTime(event.startAt)}` : "See event details"}</p>
        <p><MapPin size={15} /> {event ? `${event.venueName}, ${event.city}` : "EventSphere"}</p>
        <div className="ticket-code"><QrCode size={15} /> {ticket.code}</div>
        <span className={`status-pill status-${ticket.status}`}>{ticket.status === "checked_in" ? "Checked in" : "Valid ticket"}</span>
      </div>
      <div className="ticket-stub">
        {qr ? <img src={qr} alt={`QR code for ticket ${ticket.code}`} /> : <QrCode size={90} />}
        <button className="text-button" onClick={download}><Download size={14} /> Save QR</button>
      </div>
    </div>
  );
}
