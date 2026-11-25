import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const token = import.meta.env.VITE_MAPBOX_TOKEN;

export default function EventMap({ events = [], selectedId, onSelect, className = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !containerRef.current) return undefined;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [120.9842, 14.5995],
      zoom: 10.5,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    mapRef.current = map;
    map.on("load", () => setReady(true));
    map.on("error", () => setError("The interactive map could not load. Please try again."));
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const points = events.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));
    if (!points.length) return;
    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((event) => {
      const element = document.createElement("button");
      element.className = `map-marker ${selectedId === event.id ? "selected" : ""}`;
      element.setAttribute("aria-label", event.title);
      element.textContent = "•";
      element.addEventListener("click", () => onSelect?.(event.id));
      const marker = new mapboxgl.Marker({ element, anchor: "bottom" }).setLngLat([event.lng, event.lat]).addTo(mapRef.current);
      const popupContent = document.createElement("div");
      const popupTitle = document.createElement("strong");
      popupTitle.textContent = event.title;
      const popupLocation = document.createElement("span");
      popupLocation.textContent = ` · ${event.venueName || event.city || "Event venue"}`;
      popupContent.append(popupTitle, popupLocation);
      const popup = new mapboxgl.Popup({ offset: 28, closeButton: false }).setDOMContent(popupContent);
      marker.setPopup(popup);
      markersRef.current.push(marker);
      bounds.extend([event.lng, event.lat]);
    });
    if (points.length > 1) mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 700 });
    else mapRef.current.flyTo({ center: [points[0].lng, points[0].lat], zoom: 13, essential: true });
  }, [events, ready, selectedId, onSelect]);

  if (!token) {
    const valid = events.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lng));
    const latitudes = valid.map((event) => event.lat);
    const longitudes = valid.map((event) => event.lng);
    const latRange = Math.max(...latitudes) - Math.min(...latitudes) || 0.1;
    const lngRange = Math.max(...longitudes) - Math.min(...longitudes) || 0.1;
    return (
      <div className={`fallback-map ${className}`}>
        <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
        <span className="map-water" />
        {valid.map((event) => {
          const left = 18 + ((event.lng - Math.min(...longitudes)) / lngRange) * 64;
          const top = 18 + ((Math.max(...latitudes) - event.lat) / latRange) * 58;
          return <button key={event.id} className={`fallback-marker ${selectedId === event.id ? "selected" : ""}`} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => onSelect?.(event.id)} aria-label={event.title}><MapPin size={19} /></button>;
        })}
        <div className="map-caption"><Navigation size={15} /><span>{valid.length ? `${valid.length} event${valid.length === 1 ? "" : "s"} in this area` : "Manila, Philippines"}</span></div>
      </div>
    );
  }

  return (
    <div className={`map-container ${className}`}>
      <div ref={containerRef} className="mapbox-map" />
      {error && <div className="map-error">{error}</div>}
    </div>
  );
}
