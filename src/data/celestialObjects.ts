import type {
  CelestialObject,
  DataPrecision,
  Fact,
  ObjectCategory,
  OrbitParams,
  SourceId,
} from '../types';

/**
 * Central object database — single source of truth for the scene, search, info panels and tests.
 *
 * Provenance rules:
 *  - `real-data` bodies carry measurements published by NASA / IAU sources (see `sources.ts`).
 *  - Scene radii, orbit radii and animation periods are VISUALIZATION values (compressed, see docs/SCIENCE.md).
 *  - Nothing here is an invented measurement: unknown values are omitted rather than guessed.
 */

const F = (
  label: string,
  value: string,
  precision: DataPrecision = 'measured',
  source: SourceId = 'nasa-fact-sheet',
): Fact => ({ label, value, precision, source });

/** Non-linear time compression (exponent 0.55) keeps outer planets visibly moving. Order is preserved. */
export const compressPeriod = (realDays: number): number =>
  Math.round(365.25 * Math.pow(realDays / 365.25, 0.55) * 10) / 10;

const orbit = (
  realSemiMajorAU: number,
  realPeriodDays: number,
  eccentricity: number,
  inclinationDeg: number,
  visualRadius: number,
): OrbitParams => ({
  realSemiMajorAU,
  realPeriodDays,
  eccentricity,
  inclinationDeg,
  visualRadius,
  visualPeriodDays: compressPeriod(realPeriodDays),
});

export const WORLD = {
  /** Milky Way centre (scene origin). */
  galaxyPosition: [0, 0, 0] as [number, number, number],
  /**
   * Solar System anchor inside the visualization space.
   * Lifted above the galactic mid-plane so system orbits never intersect the star disc.
   */
  systemPosition: [8.6, 3.2, 2.2] as [number, number, number],
  galaxyRadius: 12,
  /** Scene units → light years at galaxy scale. */
  lyPerGalaxyUnit: 4166.7,
  kmPerAu: 149597870.7,
};

const GALAXY: CelestialObject = {
  id: 'milky-way',
  name: 'Milky Way',
  category: 'galaxy',
  typeLabel: 'Barred spiral galaxy',
  parent: null,
  description:
    'Our home galaxy: a barred spiral containing hundreds of billions of stars, including the Solar System. The disc, bulge and dust lanes you fly through here are procedurally generated — a visual approximation, not a survey dataset.',
  color: '#7fb4ff',
  facts: [
    F('Diameter', '≈ 100,000 ly (estimates range 100,000–180,000)', 'approximate', 'nasa-hubble'),
    F('Sun’s distance from core', '≈ 26,000 ly', 'approximate', 'nasa-hubble'),
    F('Stellar mass', '≈ 1.5 × 10¹⁰ M☉ in stars', 'approximate', 'nasa-hubble'),
    F('Total mass (incl. halo)', '≈ 1.5 × 10¹² M☉', 'approximate', 'nasa-hubble'),
    F('Age of oldest stars', '≈ 13.6 billion years', 'approximate', 'nasa-hubble'),
    F('Sun’s orbital period', '≈ 230 million years', 'approximate', 'nasa-hubble'),
    F('Rendering', 'Procedural particle model (seeded)', 'procedural', 'cosmovision-docs'),
  ],
  interesting: [
    'The visible disc is only about 1,000 ly thick — a film compared with its 100,000 ly span.',
    'Sunlight takes roughly 26,000 years to reach the galactic centre from Earth.',
    'The Milky Way is on a collision course with the Andromeda galaxy in about 4.5 billion years.',
  ],
  visualRadius: 12,
  worldPosition: WORLD.galaxyPosition,
  provenance: 'procedural-representation',
  sources: ['nasa-hubble', 'cosmovision-docs'],
  tags: ['galaxy', 'milky way', 'home', 'overview'],
};

const SYSTEM: CelestialObject = {
  id: 'solar-system',
  name: 'Solar System',
  category: 'system',
  typeLabel: 'Planetary system',
  parent: 'milky-way',
  description:
    'The Sun and everything bound to it by gravity: eight planets, more than 200 known moons, two asteroid belts and a cloud of icy bodies. Planet data below is real; scene distances are compressed for readability.',
  color: '#ffd9a0',
  facts: [
    F('Age', '≈ 4.6 billion years', 'approximate', 'nasa-solar-system'),
    F('Planets', '8', 'measured', 'iau'),
    F('Known moons', '200+', 'approximate', 'iau'),
    F('Known asteroids', '> 1.3 million (numbered + observed)', 'approximate', 'iau'),
    F('Scene scale', '1 unit = 1 AU at Earth’s orbit; outer orbits compressed', 'illustrative', 'cosmovision-docs'),
    F('Rendering', 'Visualization — not a physically exact scale model', 'illustrative', 'cosmovision-docs'),
  ],
  interesting: [
    'Light from the Sun reaches Earth in about 8 minutes 20 seconds.',
    'Over 99% of the system’s mass sits in the Sun.',
  ],
  visualRadius: 7.4,
  worldPosition: WORLD.systemPosition,
  provenance: 'real-data',
  sources: ['nasa-solar-system', 'iau', 'cosmovision-docs'],
  tags: ['system', 'solar system', 'planets', 'overview'],
};

const SOL: CelestialObject = {
  id: 'sol',
  name: 'Sol',
  category: 'star',
  typeLabel: 'G2V main-sequence star',
  parent: 'solar-system',
  description:
    'The Sun: a yellow dwarf star converting about 600 million tonnes of hydrogen into helium every second. Its gravity holds the entire Solar System together.',
  color: '#ffdb8c',
  diameterKm: 1392700,
  visualRadius: 0.15,
  facts: [
    F('Diameter', '1,392,700 km (109 × Earth)', 'measured'),
    F('Mass', '1.9885 × 10³⁰ kg (99.86% of the system)', 'measured'),
    F('Surface temperature', '5,505 °C', 'measured'),
    F('Core temperature', '≈ 15 million °C', 'approximate'),
    F('Composition', '73% hydrogen, 25% helium by mass', 'approximate'),
    F('Age', '≈ 4.6 billion years', 'approximate', 'nasa-solar-system'),
    F('Spectral type', 'G2V', 'measured', 'iau'),
  ],
  interesting: [
    'About 1.3 million Earths would fit inside the Sun.',
    'The Sun’s light takes 8 minutes 20 seconds to reach Earth, but ~4.2 years from Proxima Centauri.',
    'It fuses roughly 600 million tonnes of hydrogen each second.',
  ],
  visualSpinRate: 0.12,
  provenance: 'real-data',
  sources: ['nasa-fact-sheet', 'nasa-solar-system'],
  tags: ['star', 'sun', 'sol', 'g-type'],
};

interface PlanetSpec {
  id: string;
  name: string;
  typeLabel: string;
  diameterKm: number;
  color: string;
  texture: CelestialObject['texture'];
  tilt: number;
  rotationHours: number;
  massKg: string;
  density: string;
  gravity: string;
  moons: number;
  atmosphere: string;
  meanTemp: string;
  distanceKmM: string;
  yearLabel: string;
  dayLabel: string;
  description: string;
  interesting: string[];
  visualRadius: number;
  visualSpin: number;
  orb: [number, number, number, number, number]; // [AU, periodDays, ecc, inclDeg, visualRadius]
  ring?: CelestialObject['ring'];
  tags: string[];
}

const PLANET_SPECS: PlanetSpec[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    typeLabel: 'Terrestrial planet',
    diameterKm: 4879,
    color: '#9c8e82',
    texture: 'rocky-grey',
    tilt: 0.03,
    rotationHours: 1407.6,
    massKg: '3.3011 × 10²³ kg',
    density: '5.427 g/cm³',
    gravity: '3.7 m/s²',
    moons: 0,
    atmosphere: 'Trace: oxygen, sodium, hydrogen',
    meanTemp: '167 °C (mean)',
    distanceKmM: '57.9 million km',
    yearLabel: '88 days',
    dayLabel: '58.6 days (solar day 176 d)',
    description:
      'The smallest planet and the closest to the Sun — a cratered, airless world of temperature extremes.',
    interesting: [
      'Surface temperatures swing from −173 °C at night to 427 °C by day.',
      'A day on Mercury (sunrise to sunrise) lasts 176 Earth days — two of its years.',
      'Its iron core fills about 85% of the planet’s radius.',
    ],
    visualRadius: 0.011,
    visualSpin: 0.05,
    orb: [0.387, 87.97, 0.2056, 7.0, 0.38],
    tags: ['planet', 'terrestrial', 'inner planet'],
  },
  {
    id: 'venus',
    name: 'Venus',
    typeLabel: 'Terrestrial planet',
    diameterKm: 12104,
    color: '#e8c98f',
    texture: 'venus',
    tilt: 177.4,
    rotationHours: -5832.5,
    massKg: '4.8675 × 10²⁴ kg',
    density: '5.243 g/cm³',
    gravity: '8.87 m/s²',
    moons: 0,
    atmosphere: '96.5% carbon dioxide, 3.5% nitrogen',
    meanTemp: '464 °C (mean)',
    distanceKmM: '108.2 million km',
    yearLabel: '224.7 days',
    dayLabel: '243 days (retrograde)',
    description:
      'A cloud-shrouded world with a runaway greenhouse atmosphere — the hottest planet in the Solar System.',
    interesting: [
      'The surface pressure is 92 times Earth’s — equivalent to 900 m of ocean depth.',
      'Venus rotates backwards, so the Sun rises in the west.',
      'It is the hottest planet even though Mercury is closer to the Sun.',
    ],
    visualRadius: 0.025,
    visualSpin: -0.03,
    orb: [0.723, 224.7, 0.0068, 3.39, 0.62],
    tags: ['planet', 'terrestrial', 'inner planet', 'greenhouse'],
  },
  {
    id: 'earth',
    name: 'Earth',
    typeLabel: 'Terrestrial planet',
    diameterKm: 12756,
    color: '#4f8fdc',
    texture: 'earth',
    tilt: 23.44,
    rotationHours: 23.93,
    massKg: '5.9724 × 10²⁴ kg',
    density: '5.514 g/cm³',
    gravity: '9.8 m/s²',
    moons: 1,
    atmosphere: '78% nitrogen, 21% oxygen',
    meanTemp: '15 °C (mean)',
    distanceKmM: '149.6 million km',
    yearLabel: '365.25 days',
    dayLabel: '23.93 hours',
    description:
      'The only world known to host life: liquid surface oceans, a protective magnetic field and a dynamic atmosphere.',
    interesting: [
      '71% of the surface is covered by ocean.',
      'Earth’s day is gradually lengthening — the Moon recedes about 3.8 cm per year.',
      'The atmosphere filters out most ultraviolet radiation and meteors.',
    ],
    visualRadius: 0.026,
    visualSpin: 0.42,
    orb: [1.0, 365.25, 0.0167, 0.0, 1.0],
    tags: ['planet', 'terrestrial', 'habitable', 'ocean', 'life'],
  },
  {
    id: 'mars',
    name: 'Mars',
    typeLabel: 'Terrestrial planet',
    diameterKm: 6792,
    color: '#c1583a',
    texture: 'mars',
    tilt: 25.19,
    rotationHours: 24.62,
    massKg: '6.4171 × 10²³ kg',
    density: '3.933 g/cm³',
    gravity: '3.71 m/s²',
    moons: 2,
    atmosphere: '95% carbon dioxide',
    meanTemp: '−65 °C (mean)',
    distanceKmM: '227.9 million km',
    yearLabel: '687 days',
    dayLabel: '24.62 hours',
    description:
      'The red planet: iron-oxide deserts, the tallest volcano in the Solar System and evidence of ancient water.',
    interesting: [
      'Olympus Mons rises about 22 km — nearly three times the height of Everest.',
      'Valles Marineris is a canyon system over 4,000 km long.',
      'Mars has seasons like Earth because of a similar axial tilt.',
    ],
    visualRadius: 0.015,
    visualSpin: 0.4,
    orb: [1.524, 687, 0.0934, 1.85, 1.45],
    tags: ['planet', 'terrestrial', 'exploration', 'red planet'],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    typeLabel: 'Gas giant',
    diameterKm: 142984,
    color: '#d8a878',
    texture: 'jupiter',
    tilt: 3.13,
    rotationHours: 9.93,
    massKg: '1.8982 × 10²⁷ kg',
    density: '1.326 g/cm³',
    gravity: '23.1 m/s²',
    moons: 95,
    atmosphere: '90% hydrogen, 10% helium',
    meanTemp: '−110 °C (cloud tops)',
    distanceKmM: '778.5 million km',
    yearLabel: '11.9 years',
    dayLabel: '9.93 hours',
    description:
      'The largest planet — a hydrogen-helium giant whose Great Red Spot has raged for centuries.',
    interesting: [
      'Jupiter is more than twice as massive as all other planets combined.',
      'Its day is the shortest of any planet: under 10 hours.',
      'The Great Red Spot is a storm larger than Earth that has persisted for at least 190 years.',
    ],
    visualRadius: 0.075,
    visualSpin: 0.95,
    orb: [5.203, 4331, 0.0489, 1.303, 2.55],
    tags: ['planet', 'gas giant', 'outer planet', 'great red spot'],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    typeLabel: 'Gas giant',
    diameterKm: 120536,
    color: '#e3cf9e',
    texture: 'saturn',
    tilt: 26.73,
    rotationHours: 10.66,
    massKg: '5.6834 × 10²⁶ kg',
    density: '0.687 g/cm³',
    gravity: '10.4 m/s²',
    moons: 146,
    atmosphere: '96% hydrogen, 3% helium',
    meanTemp: '−140 °C (cloud tops)',
    distanceKmM: '1,432 million km',
    yearLabel: '29.5 years',
    dayLabel: '10.66 hours',
    description:
      'The ringed giant: a low-density world surrounded by billions of ice and rock fragments.',
    interesting: [
      'Saturn’s mean density is lower than water’s.',
      'The main rings span about 280,000 km but are often only ~10 m thick.',
      'Titan, its largest moon, has rivers, lakes and seas of liquid methane.',
    ],
    visualRadius: 0.062,
    visualSpin: 0.9,
    orb: [9.537, 10747, 0.0565, 2.485, 3.6],
    ring: { inner: 1.35, outer: 2.3, color: '#d9c9a3' },
    tags: ['planet', 'gas giant', 'rings', 'outer planet'],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    typeLabel: 'Ice giant',
    diameterKm: 51118,
    color: '#8fd0d8',
    texture: 'uranus',
    tilt: 97.77,
    rotationHours: -17.24,
    massKg: '8.6810 × 10²⁵ kg',
    density: '1.270 g/cm³',
    gravity: '8.69 m/s²',
    moons: 28,
    atmosphere: '83% hydrogen, 15% helium, 2% methane',
    meanTemp: '−195 °C',
    distanceKmM: '2,871 million km',
    yearLabel: '84 years',
    dayLabel: '17.24 hours (retrograde)',
    description:
      'An ice giant tipped on its side, with a faint ring system and a cold methane-rich atmosphere.',
    interesting: [
      'Its axial tilt of 98° means Uranus orbits rolling along its path.',
      'Each pole experiences 42 years of sunlight followed by 42 years of darkness.',
      'It was the first planet discovered with a telescope (William Herschel, 1781).',
    ],
    visualRadius: 0.042,
    visualSpin: -0.35,
    orb: [19.191, 30589, 0.0472, 0.773, 4.6],
    ring: { inner: 1.5, outer: 1.9, color: '#9fd4dc', faint: true },
    tags: ['planet', 'ice giant', 'outer planet', 'rings'],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    typeLabel: 'Ice giant',
    diameterKm: 49528,
    color: '#3f66d8',
    texture: 'neptune',
    tilt: 28.32,
    rotationHours: 16.11,
    massKg: '1.0241 × 10²⁶ kg',
    density: '1.638 g/cm³',
    gravity: '11.15 m/s²',
    moons: 16,
    atmosphere: '80% hydrogen, 19% helium, methane trace',
    meanTemp: '−200 °C',
    distanceKmM: '4,495 million km',
    yearLabel: '164.8 years',
    dayLabel: '16.11 hours',
    description:
      'The deepest blue world: an ice giant with the fastest winds recorded on any planet.',
    interesting: [
      'Winds reach about 2,100 km/h — supersonic.',
      'Neptune was found by mathematics before it was seen through a telescope (1846).',
      'Sunlight here is about 1/900th as bright as on Earth.',
    ],
    visualRadius: 0.04,
    visualSpin: 0.45,
    orb: [30.07, 59800, 0.0086, 1.77, 5.5],
    tags: ['planet', 'ice giant', 'outer planet', 'winds'],
  },
];

function buildPlanet(spec: PlanetSpec): CelestialObject {
  const [au, period, ecc, incl, visR] = spec.orb;
  const facts: Fact[] = [
    F('Mean diameter', `${spec.diameterKm.toLocaleString('en-US')} km`),
    F('Mass', spec.massKg),
    F('Density', spec.density),
    F('Surface gravity', spec.gravity),
    F('Distance from Sun', `${au} AU (${spec.distanceKmM})`),
    F('Orbital period', spec.yearLabel),
    F('Rotation period', spec.dayLabel, spec.rotationHours < 0 ? 'measured' : 'measured'),
    F('Axial tilt', `${spec.tilt}°`),
    F('Known moons', `${spec.moons}`, spec.id === 'jupiter' || spec.id === 'saturn' ? 'approximate' : 'measured', 'iau'),
    F('Atmosphere', spec.atmosphere, 'approximate'),
    F('Mean temperature', spec.meanTemp, 'approximate'),
    F('Scene radius', `${spec.visualRadius} units (visualization)`, 'illustrative', 'cosmovision-docs'),
  ];
  return {
    id: spec.id,
    name: spec.name,
    category: 'planet',
    typeLabel: spec.typeLabel,
    parent: 'solar-system',
    description: spec.description,
    color: spec.color,
    diameterKm: spec.diameterKm,
    visualRadius: spec.visualRadius,
    facts,
    interesting: spec.interesting,
    orbit: orbit(au, period, ecc, incl, visR),
    texture: spec.texture,
    axialTiltDeg: spec.tilt,
    rotationPeriodHours: spec.rotationHours,
    visualSpinRate: spec.visualSpin,
    ring: spec.ring,
    provenance: 'real-data',
    sources: ['nasa-fact-sheet', 'iau', 'cosmovision-docs'],
    tags: spec.tags,
  };
}

interface MoonSpec {
  id: string;
  name: string;
  parent: string;
  diameterKm: number;
  color: string;
  texture: CelestialObject['texture'];
  distanceLabel: string;
  distanceKm: number;
  periodDays: number;
  dayLabel: string;
  gravity: string;
  meanTemp: string;
  atmosphere: string;
  description: string;
  interesting: string[];
  visualRadius: number;
  visualOrbit: number;
  tilt?: number;
}

const MOON_SPECS: MoonSpec[] = [
  {
    id: 'luna',
    name: 'Luna',
    parent: 'earth',
    diameterKm: 3475,
    color: '#b8b4ad',
    texture: 'moon',
    distanceLabel: '384,400 km from Earth',
    distanceKm: 384400,
    periodDays: 27.32,
    dayLabel: '27.32 days (synchronous)',
    gravity: '1.62 m/s²',
    meanTemp: '−20 °C (mean surface)',
    atmosphere: 'None (exosphere only)',
    description:
      'Earth’s only natural satellite — a tide-locked world of dark maria and bright highlands.',
    interesting: [
      'It recedes from Earth by about 3.8 cm each year.',
      'Its far side is far more heavily cratered than the near side.',
      'Footprints from the Apollo missions can last millions of years.',
    ],
    visualRadius: 0.0065,
    visualOrbit: 0.075,
    tilt: 6.68,
  },
  {
    id: 'phobos',
    name: 'Phobos',
    parent: 'mars',
    diameterKm: 22.5,
    color: '#8a7f74',
    texture: 'rocky-grey',
    distanceLabel: '9,376 km from Mars',
    distanceKm: 9376,
    periodDays: 0.319,
    dayLabel: '7.66 hours',
    gravity: '0.0057 m/s²',
    meanTemp: '−40 °C',
    atmosphere: 'None',
    description:
      'The larger Martian moon — an irregular, cratered body spiralling slowly toward Mars.',
    interesting: [
      'Phobos orbits below Mars’ synchronous altitude, so it is drawn ever closer.',
      'From Mars it appears to rise in the west and set in the east.',
      'Stickney crater is nearly half as wide as Phobos itself.',
    ],
    visualRadius: 0.0024,
    visualOrbit: 0.032,
  },
  {
    id: 'io',
    name: 'Io',
    parent: 'jupiter',
    diameterKm: 3643,
    color: '#e8d878',
    texture: 'io',
    distanceLabel: '421,700 km from Jupiter',
    distanceKm: 421700,
    periodDays: 1.769,
    dayLabel: '1.77 days (synchronous)',
    gravity: '1.796 m/s²',
    meanTemp: '−130 °C (mean)',
    atmosphere: 'Sulfur dioxide (trace)',
    description:
      'The most volcanically active body in the Solar System, squeezed by Jovian tides.',
    interesting: [
      'Over 400 active volcanoes have been catalogued.',
      'Tidal heating powers eruptions that reach hundreds of kilometres high.',
      'Io’s surface is continuously repaved by sulfur flows.',
    ],
    visualRadius: 0.005,
    visualOrbit: 0.13,
  },
  {
    id: 'europa',
    name: 'Europa',
    parent: 'jupiter',
    diameterKm: 3122,
    color: '#d8cdb8',
    texture: 'europa',
    distanceLabel: '671,100 km from Jupiter',
    distanceKm: 671100,
    periodDays: 3.551,
    dayLabel: '3.55 days (synchronous)',
    gravity: '1.314 m/s²',
    meanTemp: '−160 °C (equator)',
    atmosphere: 'Trace oxygen',
    description:
      'An ice-covered moon hiding a global salt-water ocean — a prime target in the search for life.',
    interesting: [
      'The ocean may hold two to three times more water than all of Earth’s oceans.',
      'Its cracked, streaked surface is among the smoothest in the Solar System.',
      'Tidal flexing is the leading theory for keeping the ocean liquid.',
    ],
    visualRadius: 0.0044,
    visualOrbit: 0.175,
  },
  {
    id: 'titan',
    name: 'Titan',
    parent: 'saturn',
    diameterKm: 5150,
    color: '#d8a94e',
    texture: 'titan',
    distanceLabel: '1,221,870 km from Saturn',
    distanceKm: 1221870,
    periodDays: 15.95,
    dayLabel: '15.95 days (synchronous)',
    gravity: '1.352 m/s²',
    meanTemp: '−179 °C',
    atmosphere: '95% nitrogen, 5% methane',
    description:
      'Saturn’s largest moon — a hazy orange world with a thick atmosphere and liquid methane seas.',
    interesting: [
      'The only moon with a dense atmosphere.',
      'It has rivers, lakes and seas of liquid methane and ethane.',
      'Huygens probe imagery showed rounded river channels, as on Earth.',
    ],
    visualRadius: 0.01,
    visualOrbit: 0.16,
  },
];

function buildMoon(spec: MoonSpec): CelestialObject {
  return {
    id: spec.id,
    name: spec.name,
    category: 'moon',
    typeLabel: 'Natural satellite',
    parent: spec.parent,
    description: spec.description,
    color: spec.color,
    diameterKm: spec.diameterKm,
    visualRadius: spec.visualRadius,
    facts: [
      F('Mean diameter', `${spec.diameterKm.toLocaleString('en-US')} km`),
      F('Distance from parent', spec.distanceLabel),
      F('Orbital period', spec.dayLabel),
      F('Surface gravity', spec.gravity),
      F('Mean temperature', spec.meanTemp, 'approximate'),
      F('Atmosphere', spec.atmosphere, 'approximate'),
      F('Scene orbit radius', `${spec.visualOrbit} units (visualization)`, 'illustrative', 'cosmovision-docs'),
    ],
    interesting: spec.interesting,
    orbit: orbit(spec.distanceKm / WORLD.kmPerAu, spec.periodDays, 0.005, 0, spec.visualOrbit),
    texture: spec.texture,
    axialTiltDeg: spec.tilt ?? 0,
    visualSpinRate: 0.1,
    provenance: 'real-data',
    sources: ['nasa-fact-sheet', 'cosmovision-docs'],
    tags: ['moon', 'satellite', spec.parent],
  };
}

const BELTS: CelestialObject[] = [
  {
    id: 'main-belt',
    name: 'Main Asteroid Belt',
    category: 'belt',
    typeLabel: 'Asteroid field',
    parent: 'solar-system',
    description:
      'A ring of rocky bodies between Mars and Jupiter. Contrary to popular imagery, spacecraft cross it routinely without weaving between rocks.',
    color: '#a89880',
    facts: [
      F('Location', '≈ 2.2–3.2 AU from the Sun', 'approximate', 'nasa-solar-system'),
      F('Estimated total mass', '≈ 3 × 10²¹ kg (about 4% of the Moon)', 'approximate', 'nasa-solar-system'),
      F('Largest body', 'Ceres — 940 km diameter', 'measured'),
      F('Known members', '> 1 million numbered asteroids', 'approximate', 'iau'),
      F('Scene rendering', 'Procedural instanced particles', 'procedural', 'cosmovision-docs'),
    ],
    interesting: [
      'All belt asteroids combined would cover a small country if merged.',
      'Ceres alone accounts for roughly a quarter of the belt’s mass.',
    ],
    visualRadius: 1.95,
    provenance: 'real-data',
    sources: ['nasa-solar-system', 'iau', 'cosmovision-docs'],
    tags: ['asteroid', 'belt', 'field', 'rocks'],
  },
  {
    id: 'kuiper-belt',
    name: 'Kuiper Belt',
    category: 'belt',
    typeLabel: 'Icy body field',
    parent: 'solar-system',
    description:
      'A broad ring of icy dwarf planets and short-period comets beyond Neptune — the frozen frontier of the Solar System.',
    color: '#8fa3b8',
    facts: [
      F('Location', '≈ 30–50 AU from the Sun', 'approximate', 'nasa-solar-system'),
      F('Known objects', '> 2,000 catalogued, millions estimated', 'approximate', 'iau'),
      F('Largest known body', 'Pluto — 2,377 km diameter', 'measured'),
      F('Total mass', 'Small fraction of Earth’s mass (model-dependent)', 'approximate', 'nasa-solar-system'),
      F('Scene rendering', 'Procedural instanced particles', 'procedural', 'cosmovision-docs'),
    ],
    interesting: [
      'Voyager 1 has not yet crossed the Kuiper Belt.',
      'Most short-period comets are thought to originate here.',
    ],
    visualRadius: 6.7,
    provenance: 'real-data',
    sources: ['nasa-solar-system', 'iau', 'cosmovision-docs'],
    tags: ['kuiper', 'belt', 'icy', 'dwarf planets', 'comets'],
  },
];

export const CELESTIAL_OBJECTS: CelestialObject[] = [
  GALAXY,
  SYSTEM,
  SOL,
  ...PLANET_SPECS.map(buildPlanet),
  ...MOON_SPECS.map(buildMoon),
  ...BELTS,
];

export const OBJECT_BY_ID: ReadonlyMap<string, CelestialObject> = new Map(
  CELESTIAL_OBJECTS.map((object) => [object.id, object]),
);

export function getObject(id: string | null | undefined): CelestialObject | undefined {
  return id ? OBJECT_BY_ID.get(id) : undefined;
}

export function getChildren(id: string): CelestialObject[] {
  return CELESTIAL_OBJECTS.filter((object) => object.parent === id);
}

/** Root → object ancestry chain used by breadcrumbs. */
export function breadcrumbPath(id: string | null | undefined): CelestialObject[] {
  const chain: CelestialObject[] = [];
  let current = getObject(id);
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    chain.unshift(current);
    current = getObject(current.parent);
  }
  return chain;
}

/** Sibling and child objects offered as "related" links in the info panel. */
export function relatedObjects(id: string): CelestialObject[] {
  const object = getObject(id);
  if (!object) return [];
  const children = getChildren(id);
  const siblings = object.parent ? getChildren(object.parent).filter((o) => o.id !== id) : [];
  const parent = getObject(object.parent);
  const list = [...children, ...(parent ? [parent] : []), ...siblings];
  const seen = new Set<string>();
  return list.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
}

/** Camera framing distance in scene units for a focus transition. */
export function focusDistanceFor(object: CelestialObject): number {
  switch (object.category) {
    case 'galaxy':
      return 34;
    case 'system':
      return 8.6;
    case 'belt':
      return object.id === 'kuiper-belt' ? 9 : 3.4;
    case 'star':
      return object.visualRadius * 6;
    case 'moon':
      return Math.max(object.visualRadius * 9, 0.03);
    case 'planet':
      return object.visualRadius * (object.visualRadius > 0.03 ? 6 : 7.5);
    default:
      return Math.max(object.visualRadius * 6, 0.1);
  }
}

/** Never let the camera enter a body: minimum stand-off distance. */
export function minDistanceFor(object: CelestialObject): number {
  if (object.category === 'galaxy') return 2;
  if (object.category === 'system') return 1.2;
  if (object.category === 'belt') return 0.5;
  return object.visualRadius * 1.9 + 0.005;
}

export function categoryLabel(category: ObjectCategory): string {
  switch (category) {
    case 'galaxy':
      return 'Galaxy';
    case 'system':
      return 'Star system';
    case 'star':
      return 'Star';
    case 'planet':
      return 'Planet';
    case 'moon':
      return 'Moon';
    case 'belt':
      return 'Asteroid field';
  }
}

export const CATEGORIES: ObjectCategory[] = ['galaxy', 'system', 'star', 'planet', 'moon', 'belt'];
