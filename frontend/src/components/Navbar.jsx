import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Plus, ShieldCheck, Ticket, UserRound, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { initials } from "../lib/format.js";
import Brand from "./Brand.jsx";

export default function Navbar() {
  const { isAuthenticated, isOrganizer, isAdmin, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <div className="top-note">
        <span className="top-note-dot" />
        Good things are happening in your neighborhood.
        <Link to="/#events">Find your people <span aria-hidden="true">↗</span></Link>
      </div>
      <header className="site-header">
        <div className="nav-shell">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <NavLink to="/" end>Discover</NavLink>
            <NavLink to="/organizer">For organizers</NavLink>
            <Link to="/#how-it-works">How it works</Link>
          </nav>
          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                {isOrganizer && (
                  <Link to="/organizer/events/new" className="nav-create">
                    <Plus size={16} /> Create event
                  </Link>
                )}
                <div className="account-menu" ref={accountRef}>
                  <button className="account-trigger" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen}>
                    <span className="avatar">{initials(user?.fullName)}</span>
                    <span className="account-name">{user?.fullName?.split(" ")[0]}</span>
                    <ChevronDown size={15} />
                  </button>
                  {accountOpen && (
                    <div className="account-dropdown">
                      <div className="account-summary">
                        <strong>{user?.fullName}</strong>
                        <span>{user?.email}</span>
                      </div>
                      <Link to="/dashboard"><Ticket size={17} /> My tickets</Link>
                      <Link to="/profile"><UserRound size={17} /> My profile</Link>
                      {isOrganizer && <Link to="/organizer"><LayoutDashboard size={17} /> Organizer studio</Link>}
                      {isAdmin && <Link to="/admin"><ShieldCheck size={17} /> Admin console</Link>}
                      <button onClick={handleLogout}><LogOut size={17} /> Log out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-login">Log in</Link>
                <Link to="/register" className="button button-dark button-small">Sign up</Link>
              </>
            )}
            <button className="mobile-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={mobileOpen}>
              {mobileOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <Link to="/">Discover events</Link>
            <Link to="/organizer">For organizers</Link>
            <Link to="/#how-it-works">How it works</Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">My tickets</Link>
                <Link to="/profile">My profile</Link>
                {isOrganizer && <Link to="/organizer">Organizer studio</Link>}
                {isAdmin && <Link to="/admin">Admin console</Link>}
                <button onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login">Log in</Link>
                <Link to="/register">Create an account</Link>
              </>
            )}
          </nav>
        )}
      </header>
    </>
  );
}
