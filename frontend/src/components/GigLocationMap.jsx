import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import { TILE_URL, TILE_ATTRIBUTION } from "../lib/leaflet-setup";

// everyone sees a ~500 m circle, only the owner and hired workers get the exact pin
function GigLocationMap({ gig }) {
  const exact = gig.exact && gig.exact.lat != null ? gig.exact : null;
  const lat = exact ? exact.lat : gig.approxLat ?? gig.lat;
  const lng = exact ? exact.lng : gig.approxLng ?? gig.lng;

  if (lat == null || lng == null) {
    return <div className="map-box">Location not available for this gig.</div>;
  }

  return (
    <div className="card">
      <MapContainer
        center={[lat, lng]}
        zoom={exact ? 16 : 14}
        scrollWheelZoom={false}
        style={{ height: 260, borderRadius: 14 }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {exact ? (
          <Marker position={[lat, lng]} />
        ) : (
          <Circle
            center={[lat, lng]}
            radius={500}
            pathOptions={{ color: "#3b5bdb", fillColor: "#3b5bdb", fillOpacity: 0.2 }}
          />
        )}
      </MapContainer>
      <p className="hint">
        {exact
          ? "Exact location, only you and hired workers can see this."
          : "Approximate area. The exact address is shared once you're hired."}
      </p>
    </div>
  );
}

export default GigLocationMap;