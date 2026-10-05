// Central object database — single source of truth for the simulator.
// Distances inside SOLARIS are visualization units (1 unit = 1 AU at Earth's orbit).
// Real astronomical values are stored separately from simulation values.

export const SCALE = {
  auPerUnit: 1,
  kmPerAu: 149597870.7,
  lyPerGalaxyUnit: 4166.7, // galaxy radius 12 units ≈ 50,000 ly
  kmsPerUnit: 420, // flight velocity display factor (visualization)
  systemPosition: [8.6, 0.35, 2.2], // SOLARIS location inside the galaxy
  solRadius: 0.15,
};

export const SOL = {
  id: 'sol',
  name: 'Sol',
  type: 'G-Type Star',
  parent: 'solaris',
  radiusKm: 696340,
  mass: '1.989 × 10³⁰ kg',
  temperature: '5,778 K',
  color: '#ffdb8c',
  size: SCALE.solRadius,
  status: 'Stable',
  atmosphere: 'Hydrogen / Helium',
  description: 'Main-sequence star anchoring the SOLARIS system. Its light and heat sustain eight orbiting worlds.',
};

export const PLANETS = [
  {
    id: 'mercury', name: 'Mercury', type: 'Terrestrial Planet', parent: 'solaris',
    radiusKm: 2439.7, mass: '3.301 × 10²³ kg', day: '58.6 days', year: '88 days',
    moons: 0, atmosphere: 'Trace (Oxygen, Sodium)', distanceAU: 0.39, temperature: '167 °C avg',
    status: 'Rocky', color: '#9c8e82',
    orbit: { radius: 0.38, speed: 0.30, tilt: 0.03 }, size: 0.011, spin: 0.02,
    texture: 'rocky-grey',
    description: 'Smallest planet, scorched and cratered — a world of extremes closest to Sol.',
  },
  {
    id: 'venus', name: 'Venus', type: 'Terrestrial Planet', parent: 'solaris',
    radiusKm: 6051.8, mass: '4.867 × 10²⁴ kg', day: '243 days (retrograde)', year: '225 days',
    moons: 0, atmosphere: 'Carbon Dioxide / Nitrogen', distanceAU: 0.72, temperature: '464 °C avg',
    status: 'Runaway greenhouse', color: '#e8c98f',
    orbit: { radius: 0.62, speed: 0.22, tilt: 0.06 }, size: 0.025, spin: -0.01,
    texture: 'venus',
    description: 'Shrouded in dense sulfuric clouds, Venus is the hottest world in the system.',
  },
  {
    id: 'earth', name: 'Earth', type: 'Terrestrial Planet', parent: 'solaris',
    radiusKm: 6371, mass: '5.972 × 10²⁴ kg', day: '23.93 h', year: '365.25 days',
    moons: 1, atmosphere: 'Nitrogen / Oxygen', distanceAU: 1.0, temperature: '15 °C avg',
    status: 'Habitable', color: '#4f8fdc',
    orbit: { radius: 1.0, speed: 0.17, tilt: 0.0 }, size: 0.026, spin: 0.4,
    texture: 'earth',
    description: 'Ocean world with a dynamic biosphere, liquid water and a protective magnetic field.',
  },
  {
    id: 'mars', name: 'Mars', type: 'Terrestrial Planet', parent: 'solaris',
    radiusKm: 3389.5, mass: '6.417 × 10²³ kg', day: '24.6 h', year: '687 days',
    moons: 2, atmosphere: 'Carbon Dioxide / Argon', distanceAU: 1.52, temperature: '−65 °C avg',
    status: 'Exploration zone', color: '#c1583a',
    orbit: { radius: 1.45, speed: 0.135, tilt: 0.03 }, size: 0.015, spin: 0.37,
    texture: 'mars',
    description: 'The red planet — iron deserts, giant volcanoes and ancient river valleys.',
  },
  {
    id: 'jupiter', name: 'Jupiter', type: 'Gas Giant', parent: 'solaris',
    radiusKm: 69911, mass: '1.898 × 10²⁷ kg', day: '9.9 h', year: '11.9 years',
    moons: 95, atmosphere: 'Hydrogen / Helium', distanceAU: 5.2, temperature: '−110 °C avg',
    status: 'Gas giant', color: '#d8a878',
    orbit: { radius: 2.55, speed: 0.075, tilt: 0.02 }, size: 0.075, spin: 0.9,
    texture: 'jupiter',
    description: 'The largest planet — a banded hydrogen colossus crowned by the Great Red Spot.',
  },
  {
    id: 'saturn', name: 'Saturn', type: 'Gas Giant', parent: 'solaris',
    radiusKm: 58232, mass: '5.683 × 10²⁶ kg', day: '10.7 h', year: '29.5 years',
    moons: 146, atmosphere: 'Hydrogen / Helium', distanceAU: 9.58, temperature: '−140 °C avg',
    status: 'Ringed giant', color: '#e3cf9e',
    orbit: { radius: 3.6, speed: 0.055, tilt: 0.04 }, size: 0.062, spin: 0.85,
    texture: 'saturn', ring: { inner: 1.35, outer: 2.3, color: '#d9c9a3' },
    description: 'Famous for its brilliant ring system of ice and rock fragments.',
  },
  {
    id: 'uranus', name: 'Uranus', type: 'Ice Giant', parent: 'solaris',
    radiusKm: 25362, mass: '8.681 × 10²⁵ kg', day: '17.2 h (retrograde)', year: '84 years',
    moons: 28, atmosphere: 'Hydrogen / Helium / Methane', distanceAU: 19.2, temperature: '−195 °C avg',
    status: 'Ice giant', color: '#8fd0d8',
    orbit: { radius: 4.6, speed: 0.038, tilt: 0.05 }, size: 0.042, spin: -0.5,
    texture: 'uranus', ring: { inner: 1.5, outer: 1.9, color: '#9fd4dc', faint: true },
    description: 'A cyan ice giant rotating on its side with faint ring bands.',
  },
  {
    id: 'neptune', name: 'Neptune', type: 'Ice Giant', parent: 'solaris',
    radiusKm: 24622, mass: '1.024 × 10²⁶ kg', day: '16.1 h', year: '165 years',
    moons: 16, atmosphere: 'Hydrogen / Helium / Methane', distanceAU: 30.05, temperature: '−200 °C avg',
    status: 'Ice giant', color: '#3f66d8',
    orbit: { radius: 5.5, speed: 0.03, tilt: 0.03 }, size: 0.04, spin: 0.55,
    texture: 'neptune',
    description: 'The deepest blue world — supersonic winds and dark storms churn its atmosphere.',
  },
];

export const MOONS = [
  {
    id: 'luna', name: 'Luna', type: 'Natural Satellite', parent: 'earth',
    radiusKm: 1737.4, mass: '7.342 × 10²² kg', day: '27.3 days (synchronous)', year: '27.3 days',
    moons: 0, atmosphere: 'None (exosphere)', distanceAU: 0.00257, temperature: '−20 °C avg',
    status: 'Tidally locked', color: '#b8b4ad',
    orbit: { radius: 0.075, speed: 1.1, tilt: 0.09 }, size: 0.0065, spin: 0.05,
    texture: 'moon',
    description: "Earth's only natural satellite — a tide-locked world of maria and highlands.",
  },
  {
    id: 'phobos', name: 'Phobos', type: 'Natural Satellite', parent: 'mars',
    radiusKm: 11.3, mass: '1.066 × 10¹⁶ kg', day: '7.7 h', year: '7.7 h',
    moons: 0, atmosphere: 'None', distanceAU: 0.00017, temperature: '−40 °C avg',
    status: 'Decaying orbit', color: '#8a7f74',
    orbit: { radius: 0.03, speed: 2.4, tilt: 0.05 }, size: 0.0022, spin: 1,
    texture: 'rocky-grey',
    description: 'Irregular Martian moon spiralling slowly toward its parent planet.',
  },
  {
    id: 'io', name: 'Io', type: 'Natural Satellite', parent: 'jupiter',
    radiusKm: 1821.6, mass: '8.932 × 10²² kg', day: '1.8 days (synchronous)', year: '1.8 days',
    moons: 0, atmosphere: 'Sulfur Dioxide (trace)', distanceAU: 0.0028, temperature: '−130 °C avg',
    status: 'Volcanically active', color: '#e8d878',
    orbit: { radius: 0.13, speed: 1.6, tilt: 0.03 }, size: 0.005, spin: 0.2,
    texture: 'io',
    description: 'The most volcanic body in the solar system, heated by Jovian tides.',
  },
  {
    id: 'titan', name: 'Titan', type: 'Natural Satellite', parent: 'saturn',
    radiusKm: 2574.7, mass: '1.345 × 10²³ kg', day: '15.9 days (synchronous)', year: '15.9 days',
    moons: 0, atmosphere: 'Nitrogen / Methane', distanceAU: 0.0082, temperature: '−179 °C avg',
    status: 'Methane lakes', color: '#d8a94e',
    orbit: { radius: 0.16, speed: 0.9, tilt: 0.06 }, size: 0.01, spin: 0.1,
    texture: 'titan',
    description: 'Saturn’s largest moon — a hazy orange world with liquid methane seas.',
  },
];

export const STATIONS = [
  {
    id: 'station-alpha', name: 'Station Alpha', type: 'Orbital Station', parent: 'earth',
    radiusKm: 400, mass: '—', day: 'Rotating habitat', year: '—',
    moons: 0, atmosphere: 'Pressurized (Nitrogen / Oxygen)', distanceAU: 1.02,
    temperature: '21 °C internal', status: 'Operational', color: '#7ee7ff',
    anchor: 'earth', anchorRadius: 0.12, speed: 0.25, size: 0.02,
    description: 'Primary research and docking hub in Earth orbit — home of the CosmoVision fleet.',
  },
  {
    id: 'station-beta', name: 'Station Beta', type: 'Orbital Station', parent: 'mars',
    radiusKm: 320, mass: '—', day: 'Rotating habitat', year: '—',
    moons: 0, atmosphere: 'Pressurized (Nitrogen / Oxygen)', distanceAU: 1.55,
    temperature: '18 °C internal', status: 'Operational', color: '#ffb35c',
    anchor: 'mars', anchorRadius: 0.08, speed: 0.3, size: 0.017,
    description: 'Forward outpost supporting surface missions across the Martian system.',
  },
  {
    id: 'station-omega', name: 'Station Omega', type: 'Orbital Station', parent: 'jupiter',
    radiusKm: 520, mass: '—', day: 'Rotating habitat', year: '—',
    moons: 0, atmosphere: 'Pressurized (Nitrogen / Oxygen)', distanceAU: 5.3,
    temperature: '19 °C internal', status: 'Operational', color: '#a78bfa',
    anchor: 'jupiter', anchorRadius: 0.22, speed: 0.2, size: 0.026,
    description: 'Deep-space gateway station at Jupiter — refuelling point for outer-system runs.',
  },
];

export const WORMHOLES = [
  {
    id: 'wormhole-alpha', name: 'Wormhole Alpha', type: 'Wormhole', parent: 'solaris',
    radiusKm: 0, mass: '—', day: '—', year: '—', moons: 0,
    atmosphere: 'Exotic matter corridor', distanceAU: 12.0, temperature: '—',
    status: 'Stable', color: '#a78bfa',
    localPosition: [0, 0.4, 7.6], destination: 'wormhole-beta',
    destinationName: 'Andromeda Sector', destinationDistance: '2.5 million ly',
    description: 'Stable Einstein–Rosen bridge linking SOLARIS to the Andromeda Sector.',
  },
  {
    id: 'wormhole-beta', name: 'Wormhole Beta', type: 'Wormhole', parent: null,
    radiusKm: 0, mass: '—', day: '—', year: '—', moons: 0,
    atmosphere: 'Exotic matter corridor', distanceAU: 0, temperature: '—',
    status: 'Stable', color: '#7ee7ff',
    worldPosition: [-16.5, 3.2, -13.5], destination: 'wormhole-alpha',
    destinationName: 'SOLARIS System', destinationDistance: '52,000 ly',
    description: 'Exit aperture drifting beyond the galactic disc — passage home to SOLARIS.',
  },
];

export const BELTS = [
  {
    id: 'asteroid-belt', name: 'Asteroid Belt', type: 'Asteroid Field', parent: 'solaris',
    radiusKm: 0, mass: '~4 × 10²¹ kg', day: '—', year: '—', moons: 0,
    atmosphere: 'None', distanceAU: 1.7, temperature: '−100 °C avg',
    status: 'Sparse field', color: '#a89880',
    inner: 1.75, outer: 2.15, count: 1100, cluster: 'main',
    description: 'Millions of rocky fragments between Mars and Jupiter — rendered as a sparse belt.',
  },
  {
    id: 'kuiper-belt', name: 'Kuiper Belt', type: 'Asteroid Field', parent: 'solaris',
    radiusKm: 0, mass: '~2 × 10²¹ kg', day: '—', year: '—', moons: 0,
    atmosphere: 'None', distanceAU: 42, temperature: '−220 °C avg',
    status: 'Icy field', color: '#8fa3b8',
    inner: 6.3, outer: 7.1, count: 700, cluster: 'outer',
    description: 'Icy bodies beyond Neptune — the frozen frontier of the SOLARIS system.',
  },
];

export const SOLARIS = {
  id: 'solaris', name: 'SOLARIS', type: 'Star System', parent: 'milky-way',
  radiusKm: 0, mass: '—', day: '—', year: '—', moons: 8,
  atmosphere: 'Interplanetary medium', distanceAU: 26000, temperature: '—',
  status: 'Charted', color: '#ffd9a0',
  position: SCALE.systemPosition,
  description: 'A G-type system of eight planets, moons, belts and stations — the heart of CosmoVision.',
};

export const GALAXY_OBJECT = {
  id: 'milky-way', name: 'Milky Way', type: 'Barred Spiral Galaxy', parent: null,
  radiusKm: 100000, mass: '~1.5 × 10¹² M☉', day: '225 Myr rotation', year: '—',
  moons: 0, atmosphere: 'Interstellar medium', distanceAU: 0, temperature: '—',
  status: 'Active', color: '#7fb4ff',
  description: 'Home galaxy containing SOLARIS — 45,000 visible star systems in simulation.',
};

// Flat searchable index (galaxy first, then system bodies).
export const CELESTIAL_OBJECTS = [
  GALAXY_OBJECT,
  SOLARIS,
  { ...SOL, ...{ orbit: { radius: 0, speed: 0, tilt: 0 } } },
  ...PLANETS,
  ...MOONS,
  ...STATIONS,
  ...WORMHOLES,
  ...BELTS,
];

// Camera framing distance (visualization units) when focusing an object.
export function focusDistanceFor(def) {
  if (!def) return 4;
  if (def.id === 'milky-way') return 36;
  if (def.id === 'solaris') return 7;
  if (def.type === 'Wormhole') return 5;
  if (def.type === 'Asteroid Field') return 3;
  if (def.type === 'Orbital Station') return (def.size || 0.02) * 9;
  if (def.type === 'Natural Satellite') return (def.size || 0.006) * 8;
  if (def.type === 'G-Type Star') return (def.size || 0.15) * 5.5;
  if (def.type === 'Gas Giant') return (def.size || 0.06) * 5;
  return (def.size || 0.02) * 6.5;
}

export const OBJECT_BY_ID = new Map(CELESTIAL_OBJECTS.map((object) => [object.id, object]));

// Breadcrumb hierarchy helper: id → [root … id]
export const NAV_PATHS = {
  'milky-way': ['milky-way'],
  solaris: ['milky-way', 'solaris'],
  sol: ['milky-way', 'solaris', 'sol'],
  mercury: ['milky-way', 'solaris', 'mercury'],
  venus: ['milky-way', 'solaris', 'venus'],
  earth: ['milky-way', 'solaris', 'earth'],
  mars: ['milky-way', 'solaris', 'mars'],
  jupiter: ['milky-way', 'solaris', 'jupiter'],
  saturn: ['milky-way', 'solaris', 'saturn'],
  uranus: ['milky-way', 'solaris', 'uranus'],
  neptune: ['milky-way', 'solaris', 'neptune'],
  luna: ['milky-way', 'solaris', 'earth', 'luna'],
  phobos: ['milky-way', 'solaris', 'mars', 'phobos'],
  io: ['milky-way', 'solaris', 'jupiter', 'io'],
  titan: ['milky-way', 'solaris', 'saturn', 'titan'],
  'station-alpha': ['milky-way', 'solaris', 'earth', 'station-alpha'],
  'station-beta': ['milky-way', 'solaris', 'mars', 'station-beta'],
  'station-omega': ['milky-way', 'solaris', 'jupiter', 'station-omega'],
  'wormhole-alpha': ['milky-way', 'solaris', 'wormhole-alpha'],
  'wormhole-beta': ['milky-way', 'wormhole-beta'],
  'asteroid-belt': ['milky-way', 'solaris', 'asteroid-belt'],
  'kuiper-belt': ['milky-way', 'solaris', 'kuiper-belt'],
};

export const BREADCRUMB_LABELS = {
  'milky-way': 'MILKY WAY',
  solaris: 'SOLARIS SYSTEM',
  sol: 'SOL',
  earth: 'EARTH',
  luna: 'MOON',
  mercury: 'MERCURY',
  venus: 'VENUS',
  mars: 'MARS',
  jupiter: 'JUPITER',
  saturn: 'SATURN',
  uranus: 'URANUS',
  neptune: 'NEPTUNE',
  phobos: 'PHOBOS',
  io: 'IO',
  titan: 'TITAN',
  'station-alpha': 'ALPHA',
  'station-beta': 'BETA',
  'station-omega': 'OMEGA',
  'wormhole-alpha': 'WORMHOLE A',
  'wormhole-beta': 'WORMHOLE B',
  'asteroid-belt': 'ASTEROID BELT',
  'kuiper-belt': 'KUIPER BELT',
};

export const SIM_SPEEDS = [0, 0.1, 0.5, 1, 2, 10, 100, 1000];

// Distance formatting across scales (visualization units → readable strings).
export function formatDistance(units, inSystem = true) {
  if (!Number.isFinite(units)) return '—';
  if (inSystem) {
    if (units < 0.05) return `${(units * SCALE.kmPerAu / 1e6).toFixed(1)} million km`;
    if (units < 60) return `${units.toFixed(units < 10 ? 2 : 1)} AU`;
  }
  const ly = units * SCALE.lyPerGalaxyUnit;
  if (ly >= 1000) return `${(ly / 1000).toFixed(1)} kly`;
  return `${Math.round(ly)} ly`;
}

export function formatAltitude(units, inSystem) {
  if (inSystem && units < 60) return `${units.toFixed(3)} AU`;
  return `${(units * SCALE.lyPerGalaxyUnit / 1000).toFixed(1)} kly`;
}
