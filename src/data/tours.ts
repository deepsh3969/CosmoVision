import type { Tour } from '../types';

/**
 * Discovery Mode tours — curated sequences of real destinations with short briefings.
 * Every step navigates through the normal focus pipeline, so Back/Home still work.
 */
export const TOURS: Tour[] = [
  {
    id: 'inner-worlds',
    name: 'Inner Worlds',
    subtitle: 'Four rocky planets, four very different fates',
    steps: [
      {
        objectId: 'sol',
        title: 'Start at the Sun',
        blurb: 'Sol holds 99.86% of the Solar System’s mass. Its light takes 8 minutes 20 seconds to reach Earth.',
      },
      {
        objectId: 'mercury',
        title: 'Mercury — extremes',
        blurb: 'Closest to the Sun, airless and cratered. A single solar day lasts 176 Earth days.',
      },
      {
        objectId: 'venus',
        title: 'Venus — runaway greenhouse',
        blurb: '96% CO₂ atmosphere, 464 °C surface, 92 bar of pressure. It spins backwards.',
      },
      {
        objectId: 'earth',
        title: 'Earth — the ocean world',
        blurb: '71% liquid water, a magnetic shield and an oxygen atmosphere — the only known biosphere.',
      },
      {
        objectId: 'luna',
        title: 'Luna — Earth’s companion',
        blurb: 'Tide-locked at 384,400 km, it stabilises Earth’s axial tilt and drives our tides.',
      },
      {
        objectId: 'mars',
        title: 'Mars — the exploration zone',
        blurb: 'Iron deserts, Olympus Mons at 22 km, and ancient river valleys carved when water flowed.',
      },
    ],
  },
  {
    id: 'giants-and-rings',
    name: 'Giants & Rings',
    subtitle: 'The outer system: two gas giants and two ice giants',
    steps: [
      {
        objectId: 'main-belt',
        title: 'Crossing the Main Belt',
        blurb: 'Between Mars and Jupiter, over a million catalogued rocks — yet always empty in practice.',
      },
      {
        objectId: 'jupiter',
        title: 'Jupiter — the colossus',
        blurb: 'More massive than every other planet combined, with a storm wider than Earth.',
      },
      {
        objectId: 'io',
        title: 'Io — volcanic moon',
        blurb: 'Tidal flexing from Jupiter powers over 400 active volcanoes.',
      },
      {
        objectId: 'europa',
        title: 'Europa — hidden ocean',
        blurb: 'An ice shell over a salt-water ocean that may hold more water than Earth.',
      },
      {
        objectId: 'saturn',
        title: 'Saturn — the rings',
        blurb: 'Rings spanning 280,000 km, often only metres thick, made of countless ice fragments.',
      },
      {
        objectId: 'titan',
        title: 'Titan — methane seas',
        blurb: 'The only moon with a thick atmosphere, with liquid methane lakes at its poles.',
      },
      {
        objectId: 'uranus',
        title: 'Uranus — tipped on its side',
        blurb: 'A 98° axial tilt gives each pole 42 years of sunlight, then 42 years of darkness.',
      },
      {
        objectId: 'neptune',
        title: 'Neptune — supersonic winds',
        blurb: 'The most distant planet, with winds measured near 2,100 km/h.',
      },
    ],
  },
  {
    id: 'galactic-tour',
    name: 'Galactic Perspective',
    subtitle: 'From the edge of the Solar System out to the Milky Way',
    steps: [
      {
        objectId: 'kuiper-belt',
        title: 'Kuiper Belt',
        blurb: 'Icy bodies beyond Neptune — the source region of short-period comets.',
      },
      {
        objectId: 'solar-system',
        title: 'The whole system',
        blurb: 'Eight planets, two belts and hundreds of moons, all bound to one star.',
      },
      {
        objectId: 'milky-way',
        title: 'The Milky Way',
        blurb: 'Our barred spiral home: roughly 100,000 light years across, 13.6 billion years old.',
      },
    ],
  },
];

export function getTour(id: string | null): Tour | undefined {
  return id ? TOURS.find((tour) => tour.id === id) : undefined;
}
