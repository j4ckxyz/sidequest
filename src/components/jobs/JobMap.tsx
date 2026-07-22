import type { Parish } from '../../lib/constants';

// Approximate parish centroids (Jersey, Channel Islands). Good enough to place a marker;
// exact addresses are shared privately between poster and helper, not shown publicly.
const PARISH_COORDS: Record<Parish, [number, number]> = {
  'St Helier': [49.186, -2.107],
  'St Saviour': [49.198, -2.083],
  'St Clement': [49.178, -2.055],
  Grouville: [49.185, -2.038],
  'St Martin': [49.213, -2.033],
  Trinity: [49.223, -2.075],
  'St John': [49.239, -2.107],
  'St Mary': [49.234, -2.135],
  'St Ouen': [49.22, -2.18],
  'St Peter': [49.205, -2.155],
  'St Brelade': [49.185, -2.19],
  'St Lawrence': [49.207, -2.13],
};

export function JobMap({ parish }: { parish: Parish }) {
  const [lat, lon] = PARISH_COORDS[parish];
  // Small window around the parish; OpenStreetMap tiles, no key needed.
  const bbox = [lon - 0.035, lat - 0.018, lon + 0.035, lat + 0.018].join(',');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <iframe
        title={`Map of ${parish}, Jersey`}
        src={src}
        className="block h-56 w-full"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
