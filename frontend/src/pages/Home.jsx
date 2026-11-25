import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Compass, Cpu, Dumbbell,
  HeartHandshake, Map, MapPin, Music2, Palette, Search, ShieldCheck, ShoppingBag,
  SlidersHorizontal, Sparkles, Ticket, Utensils, UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { addSavedEvent, removeSavedEvent, subscribePublishedEvents, subscribeSavedEvents } from "../services/firestore.js";
import { errorMessage, haversineKm, toDate } from "../lib/format.js";
import EventCard from "../components/EventCard.jsx";
import EventMap from "../components/EventMap.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";

const categories = [
  { name: "All events", icon: Sparkles },
  { name: "Music", icon: Music2 },
  { name: "Food", icon: Utensils },
  { name: "Arts", icon: Palette },
  { name: "Markets", icon: ShoppingBag },
  { name: "Wellness", icon: Dumbbell },
  { name: "Tech", icon: Cpu },
];

export default function Home() {
  const { user, isAuthenticated, firebaseReady } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "All events");
  const [dateFilter, setDateFilter] = useState("all");
  const [city, setCity] = useState("Manila");
  const [mapView, setMapView] = useState(false);
  const [saved, setSaved] = useState([]);
  const [notice, setNotice] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [radius, setRadius] = useState(25);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      setLoadError("Add your Firebase web configuration to frontend/.env.local to load live events.");
      return undefined;
    }
    return subscribePublishedEvents((items) => {
      setEvents(items);
      setLoading(false);
    }, (error) => {
      setLoadError(errorMessage(error, "Could not load events."));
      setLoading(false);
    });
  }, [firebaseReady]);

  useEffect(() => {
    let unsubscribe;
    try {
      const local = JSON.parse(localStorage.getItem("eventsphere-saved") || "[]");
      setSaved(local);
    } catch { setSaved([]); }
    if (user) unsubscribe = subscribeSavedEvents(user.id, setSaved, () => {});
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const incoming = searchParams.get("category");
    if (incoming) setCategory(incoming);
  }, [searchParams]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now); endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(now); endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    return events.filter((event) => {
      const start = toDate(event.startAt);
      if (!start || start < now) return false;
      const searchable = `${event.title} ${event.description} ${event.venueName} ${event.city} ${event.category}`.toLowerCase();
      if (query && !searchable.includes(query.toLowerCase())) return false;
      if (category !== "All events" && event.category !== category) return false;
      if (city !== "All cities" && event.city !== city) return false;
      if (dateFilter === "today" && (!start || start > endOfToday)) return false;
      if (dateFilter === "week" && (!start || start > endOfWeek)) return false;
      if (dateFilter === "month" && (!start || start > endOfMonth)) return false;
      if (coordinates && haversineKm(coordinates, event) > radius) return false;
      return true;
    });
  }, [events, query, category, city, dateFilter, coordinates, radius]);

  const loadingEvents = loading && events.length === 0;
  const publishedCount = events.filter((event) => event.status === "published").length;
  const totalTickets = events.reduce((total, event) => total + (event.soldCount || 0), 0);

  const selectCategory = (name) => {
    setCategory(name);
    if (name === "All events") setSearchParams({});
    else setSearchParams({ category: name });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleSaved = async (eventId) => {
    const alreadySaved = saved.includes(eventId);
    const next = alreadySaved ? saved.filter((id) => id !== eventId) : [...saved, eventId];
    setSaved(next);
    localStorage.setItem("eventsphere-saved", JSON.stringify(next));
    if (user) {
      try {
        if (alreadySaved) await removeSavedEvent(user.id, eventId);
        else await addSavedEvent(user.id, eventId);
      } catch (error) { setNotice(errorMessage(error)); }
    } else {
      setNotice("Saved on this device. Log in to sync your saved events.");
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return setNotice("Location is not supported by this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
      setCity("All cities");
      setLocating(false);
      setNotice("Showing events within your selected radius.");
    }, () => {
      setLocating(false);
      setNotice("We could not access your location. You can still search by city.");
    }, { enableHighAccuracy: false, timeout: 10000 });
  };

  return (
    <>
      <section className="home-hero page-shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-icon"><Compass size={14} /></span> YOUR CITY. YOUR PEOPLE.</div>
          <h1>Good things happen when we <span className="hero-highlight">show up.<svg viewBox="0 0 280 18" preserveAspectRatio="none" aria-hidden="true"><path d="M3 13C74 2 178 2 276 8" /></svg></span></h1>
          <p className="hero-description">Discover local happenings, meet your kind of people, and make a little more room for real life.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <Search size={21} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, venues, or interests" aria-label="Search events" />
            <button type="submit">Explore events <ArrowRight size={17} /></button>
          </form>
          <div className="hero-social-proof">
            <div className="avatar-stack"><span>JM</span><span>AK</span><span>RS</span><span>+2k</span></div>
            <div><div className="proof-stars">★★★★★</div><p>Join locals finding their next favorite thing</p></div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image-main"><img src="/images/night-market.jpg" alt="A crowd celebrating together at a live event" /><div className="hero-image-label"><span>THIS WEEKEND</span><strong>24 reasons to get out</strong></div></div>
          <div className="hero-image-small"><img src="/images/pottery-workshop-v2.jpg" alt="Hands shaping clay at a pottery workshop" /><span>Make something. Meet someone.</span></div>
          <div className="floating-event-card"><span className="floating-icon"><Ticket size={20} /></span><div><strong>Your next good time</strong><span>is closer than you think</span></div><ArrowUpRight size={18} /></div>
          <span className="hero-doodle" aria-hidden="true">✳</span>
        </div>
      </section>

      <section className="community-strip">
        <div className="page-shell community-strip-inner">
          <div><strong>{publishedCount || "6"}</strong><span>curated local events</span></div>
          <div><strong>{totalTickets ? `${totalTickets}+` : "1.2k+"}</strong><span>happy event-goers</span></div>
          <div><strong>40+</strong><span>independent hosts</span></div>
          <div className="community-promise"><HeartHandshake size={27} /><span>Built for community.<br /><strong>Powered by local.</strong></span></div>
        </div>
      </section>

      <section className="discovery-section page-shell" id="events">
        <div className="section-heading">
          <div><span className="section-kicker">FIND YOUR NEXT THING</span><h2>Happening around you</h2><p>From low-key hangs to can’t-miss nights, there’s something with your name on it.</p></div>
          <button className="button button-outline map-toggle" onClick={() => setMapView((value) => !value)}>{mapView ? <SlidersHorizontal size={17} /> : <Map size={17} />}{mapView ? "Show list" : "Show map"}</button>
        </div>
        <div className="category-scroller" aria-label="Event categories">
          {categories.map(({ name, icon: Icon }) => <button key={name} className={category === name ? "active" : ""} onClick={() => selectCategory(name)}><Icon size={17} />{name}</button>)}
        </div>
        <div className="filter-bar">
          <div className="filter-group">
            <label><MapPin size={15} /><select value={city} onChange={(event) => { setCity(event.target.value); setCoordinates(null); }}><option>Manila</option><option>Makati</option><option>Quezon City</option><option>Pasig</option><option>Taguig</option><option>All cities</option></select><ChevronDown size={14} /></label>
            <label><CalendarDays size={15} /><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="all">Any date</option><option value="today">Today</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option></select><ChevronDown size={14} /></label>
            <button className={`location-filter ${coordinates ? "active" : ""}`} onClick={locate} disabled={locating}><Compass size={15} />{locating ? "Locating…" : coordinates ? `Within ${radius} km` : "Use my location"}</button>
          </div>
          <span className="results-count">{filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"} found</span>
        </div>
        {coordinates && <div className="radius-filter"><label htmlFor="radius">Distance radius</label><input id="radius" type="range" min="5" max="100" step="5" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /><strong>{radius} km</strong></div>}
        {notice && <div className="notice notice-info">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {loadError && <div className="notice notice-error">{loadError}</div>}
        {loadingEvents ? <Loading label="Finding good things near you…" /> : filteredEvents.length === 0 ? (
          <EmptyState title="No events match just yet" description="Try a different category, date, or city. Good things are worth the search." action={<button className="button button-outline" onClick={() => { setQuery(""); selectCategory("All events"); setCity("Manila"); setDateFilter("all"); setCoordinates(null); }}>Clear all filters</button>} />
        ) : mapView ? (
          <div className="discovery-map-layout">
            <div className="map-event-list">{filteredEvents.map((event) => <EventCard key={event.id} event={event} compact saved={saved.includes(event.id)} onSave={toggleSaved} />)}</div>
            <EventMap events={filteredEvents} onSelect={(id) => document.getElementById(`map-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="discovery-map" />
          </div>
        ) : (
          <div className="event-grid">{filteredEvents.map((event) => <div id={`map-${event.id}`} key={event.id}><EventCard event={event} saved={saved.includes(event.id)} onSave={toggleSaved} /></div>)}</div>
        )}
        {!loading && filteredEvents.length > 0 && <div className="discovery-bottom"><span>That’s all for now. New good things are added every week.</span><button className="text-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button></div>}
      </section>

      <section className="how-section" id="how-it-works">
        <div className="page-shell">
          <div className="center-heading"><span className="section-kicker">LESS PLANNING. MORE LIVING.</span><h2>From “we should” to “we went.”</h2><p>EventSphere makes it simple to get out and get together.</p></div>
          <div className="steps-grid">
            <div><span className="step-number">01</span><span className="step-icon"><Search size={24} /></span><h3>Find your thing</h3><p>Browse events picked for your neighborhood, your interests, and your kind of weekend.</p></div>
            <div><span className="step-number">02</span><span className="step-icon"><Ticket size={24} /></span><h3>Book in a tap</h3><p>Pay securely with GCash, Maya, QR Ph, or card. Your digital ticket lands right in your wallet.</p></div>
            <div><span className="step-number">03</span><span className="step-icon"><UsersRound size={24} /></span><h3>Show up, connect</h3><p>Scan your QR at the door, meet your people, and take home a story worth telling.</p></div>
          </div>
        </div>
      </section>

      <section className="organizer-cta page-shell">
        <div className="cta-art"><img src="/images/community.jpg" alt="Neighbors gathering at a community event" /><span className="cta-spark">✳</span></div>
        <div className="cta-copy"><span className="section-kicker">FOR THE ONES WHO MAKE IT HAPPEN</span><h2>Have a good idea?<br />Give it a place to happen.</h2><p>Create your event, sell tickets, welcome guests, and see your community grow — all from one simple studio.</p><div className="cta-checks"><span><Check size={15} /> Secure PayMongo checkout</span><span><Check size={15} /> Live sales & attendee insights</span><span><Check size={15} /> QR-powered check-in</span></div><Link to={isAuthenticated ? "/organizer/events/new" : "/register?role=organizer"} className="button button-lime">Start hosting <ArrowUpRight size={17} /></Link></div>
      </section>
      <div className="trust-bar page-shell"><span><ShieldCheck size={18} /> Secure payments with PayMongo</span><span><Ticket size={18} /> Unique QR tickets</span><span><MapPin size={18} /> Made for local communities</span></div>
    </>
  );
}
