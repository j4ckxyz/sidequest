// Approximate coordinates for common UK university cities, used to plot the
// Jersey Chapters map from real student-entered locations. Unknown cities still
// appear in the cluster list, just not as a map node.

export const cityCoords: Record<string, { lat: number; lng: number }> = {
  london: { lat: 51.5072, lng: -0.1276 },
  bristol: { lat: 51.4545, lng: -2.5879 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  exeter: { lat: 50.7184, lng: -3.5339 },
  nottingham: { lat: 52.9548, lng: -1.1581 },
  cardiff: { lat: 51.4816, lng: -3.1791 },
  birmingham: { lat: 52.4862, lng: -1.8904 },
  leeds: { lat: 53.8008, lng: -1.5491 },
  sheffield: { lat: 53.3811, lng: -1.4701 },
  liverpool: { lat: 53.4084, lng: -2.9916 },
  newcastle: { lat: 54.9783, lng: -1.6178 },
  southampton: { lat: 50.9097, lng: -1.4044 },
  bath: { lat: 51.3811, lng: -2.359 },
  oxford: { lat: 51.752, lng: -1.2577 },
  cambridge: { lat: 52.2053, lng: 0.1218 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  glasgow: { lat: 55.8642, lng: -4.2518 },
  durham: { lat: 54.7761, lng: -1.5733 },
  york: { lat: 53.96, lng: -1.0873 },
  loughborough: { lat: 52.7721, lng: -1.2062 },
  coventry: { lat: 52.4068, lng: -1.5197 },
  warwick: { lat: 52.4068, lng: -1.5197 },
  reading: { lat: 51.4543, lng: -0.9781 },
  brighton: { lat: 50.8225, lng: -0.1372 },
  leicester: { lat: 52.6369, lng: -1.1398 },
  portsmouth: { lat: 50.8198, lng: -1.088 },
  plymouth: { lat: 50.3755, lng: -4.1427 },
  aberdeen: { lat: 57.1497, lng: -2.0943 },
  'st andrews': { lat: 56.3398, lng: -2.7967 },
  nottinghamshire: { lat: 52.9548, lng: -1.1581 },
  swansea: { lat: 51.6214, lng: -3.9436 },
  dundee: { lat: 56.462, lng: -2.9707 },
  lancaster: { lat: 54.0465, lng: -2.7908 },
  hull: { lat: 53.7676, lng: -0.3274 },
}

export const jerseyCoord = { lat: 49.21, lng: -2.13 }

export function lookupCity(name: string) {
  return cityCoords[name.trim().toLowerCase()]
}
