import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { TILE_URL, TILE_ATTRIBUTION } from "../lib/leaflet-setup";

// tap anywhere on the map and the pin jumps there
function ClickToPlace({ onPick }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

function Camera({ pin, focusKey }) {
  const map = useMap();

  // the pin came from address search or "use my location", so fly there
  useEffect(() => {
    if (focusKey > 0 && pin) map.flyTo([pin.lat, pin.lng], 17);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  // on open, quietly center on you if allowed (we never place the pin for you)
  useEffect(() => {
    if (pin || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
      () => {} // denied is fine, we stay on the India view
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function LocationPicker({ pin, focusKey, onPick }) {
  return (
    <MapContainer
      center={[22.5, 79]}
      zoom={5}
      style={{ height: 300, borderRadius: 14, margin: "12px 0" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickToPlace onPick={onPick} />
      <Camera pin={pin} focusKey={focusKey} />
      {pin && (
        <Marker
          position={[pin.lat, pin.lng]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = e.target.getLatLng();
              onPick({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}

export default LocationPicker;