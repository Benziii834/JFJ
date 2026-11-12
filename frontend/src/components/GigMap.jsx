import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { TILE_URL, TILE_ATTRIBUTION } from "../lib/leaflet-setup";
import { api, errorText } from "../api";

function payLabel(type) {
  return type === "DAILY" ? "/ day" : type === "HOURLY" ? "/ hour" : "fixed";
}

// the backend only accepts spots inside India, so we never send a box bigger than India
function clampToIndia(a) {
  return {
    minLat: Math.max(6, a.minLat),
    maxLat: Math.min(38, a.maxLat),
    minLng: Math.max(68, a.minLng),
    maxLng: Math.min(98, a.maxLng),
  };
}

// asks for your location only now that the map opened, and quietly skips if you say no
function Locator() {
  const map = useMap();
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
      () => {}
    );
  }, [map]);
  return null;
}

// tells the page which area is visible, 400ms after you stop moving the map
function AreaWatcher({ onArea }) {
  const map = useMap();
  const timer = useRef(null);

  function report() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const b = map.getBounds();
      onArea(
        clampToIndia({
          minLat: b.getSouth(),
          minLng: b.getWest(),
          maxLat: b.getNorth(),
          maxLng: b.getEast(),
        })
      );
    }, 400);
  }

  useMapEvents({ moveend: report });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { report(); return () => clearTimeout(timer.current); }, []);
  return null;
}

function GigMap({ filterQuery }) {
  const [area, setArea] = useState(null);
  const [pins, setPins] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!area || area.minLat >= area.maxLat || area.minLng >= area.maxLng) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const qs = new URLSearchParams(area).toString();
    api("/gigs/map?" + qs + (filterQuery ? "&" + filterQuery : ""), {
      signal: controller.signal,
    })
      .then((d) => {
        setPins(d.items || []); // old pins stay until the new ones arrive
        setTruncated(!!d.truncated);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return; // an older request got cancelled, that's fine
        setError(errorText(e));
        setLoading(false);
      });
    return () => controller.abort();
  }, [area, filterQuery]);

  return (
    <div>
      {error && <p className="banner">{error}</p>}
      {truncated && <p className="banner">Too many gigs here, zoom in to see all.</p>}
      <MapContainer center={[22.5, 79]} zoom={5} style={{ height: "60vh", borderRadius: 14 }}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Locator />
        <AreaWatcher onArea={setArea} />
        <MarkerClusterGroup chunkedLoading>
          {pins.map((g) => (
            <Marker key={g.id} position={[g.lat, g.lng]}>
              <Popup>
                <b>{g.title}</b>
                <br />₹{g.payAmount} {payLabel(g.payType)}
                <br />
                <Link to={"/gigs/" + g.id}>View gig</Link>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      <p className="hint">Pin positions are approximate.{loading ? " Loading pins..." : ""}</p>
    </div>
  );
}

export default GigMap;