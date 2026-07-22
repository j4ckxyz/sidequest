import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const JERSEY_CENTER: [number, number] = [49.2144, -2.1313];
const JERSEY_BOUNDS: [[number, number], [number, number]] = [
  [49.14, -2.3],
  [49.28, -1.96],
];

interface Location {
  lat: number;
  lng: number;
}

function MapClickHandler({ onChange }: { onChange: (location: Location) => void }) {
  useMapEvents({
    click(event) {
      onChange({
        lat: Number(event.latlng.lat.toFixed(5)),
        lng: Number(event.latlng.lng.toFixed(5)),
      });
    },
  });
  return null;
}

function MapView({ location }: { location: Location | null }) {
  const map = useMap();
  const lat = location?.lat;
  const lng = location?.lng;

  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);

  return null;
}

export function LocationPicker({ location, onChange }: { location: Location | null; onChange: (location: Location) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={location ? [location.lat, location.lng] : JERSEY_CENTER}
        zoom={location ? 14 : 11}
        minZoom={10}
        maxZoom={18}
        maxBounds={JERSEY_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="h-72 w-full bg-surface-2"
        aria-label="Choose the job location on a map of Jersey"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <MapView location={location} />
        {location ? (
          <CircleMarker
            center={[location.lat, location.lng]}
            radius={9}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#356859', fillOpacity: 1 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
