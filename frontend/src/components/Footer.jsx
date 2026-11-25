import { ArrowUpRight, Camera, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "./Brand.jsx";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main page-shell">
        <div className="footer-brand-column">
          <Brand light />
          <p>Less scrolling. More showing up.<br />Find the good stuff, right where you are.</p>
          <a className="footer-email" href="mailto:hello@eventsphere.ph"><Mail size={16} /> hello@eventsphere.ph</a>
        </div>
        <div className="footer-links">
          <div><h3>Discover</h3><Link to="/">All events</Link><Link to="/?category=Music">Live music</Link><Link to="/?category=Arts">Arts & culture</Link><Link to="/?category=Food">Food & drink</Link></div>
          <div><h3>Host</h3><Link to="/organizer">Organizer studio</Link><Link to="/organizer/events/new">Create an event</Link><Link to="/#how-it-works">How it works</Link></div>
          <div><h3>EventSphere</h3><Link to="/profile">Your account</Link><Link to="/dashboard">My tickets</Link><a href="mailto:support@eventsphere.ph">Help & support <ArrowUpRight size={13} /></a></div>
        </div>
      </div>
      <div className="footer-bottom page-shell">
        <span>© {new Date().getFullYear()} EventSphere. Made for real-life connection.</span>
        <div><span>Manila, Philippines</span><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Camera size={17} /></a></div>
      </div>
    </footer>
  );
}
