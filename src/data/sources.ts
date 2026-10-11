import type { Source } from '../types';

export const SOURCES: Record<string, Source> = {
  'nasa-fact-sheet': {
    id: 'nasa-fact-sheet',
    name: 'NASA NSSDCA Planetary Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    note: 'Diameters, masses, densities, rotation and orbital periods, temperatures and moon counts.',
  },
  'nasa-solar-system': {
    id: 'nasa-solar-system',
    name: 'NASA Solar System Exploration',
    url: 'https://science.nasa.gov/solar-system/',
    note: 'Descriptive material, composition and mission context.',
  },
  'nasa-hubble': {
    id: 'nasa-hubble',
    name: 'NASA / ESA Hubble Science',
    url: 'https://science.nasa.gov/mission/hubble/',
    note: 'Milky Way size, structure and scale estimates.',
  },
  iau: {
    id: 'iau',
    name: 'International Astronomical Union',
    url: 'https://www.iau.org/',
    note: 'Definitions, nomenclature and officially recognised satellite counts.',
  },
  'cosmovision-docs': {
    id: 'cosmovision-docs',
    name: 'CosmoVision documentation',
    url: 'https://github.com/deepsh3969/CosmoVision/blob/main/docs/SCIENCE.md',
    note: 'Simulation simplifications, visual scale compression and scene modelling notes.',
  },
};

export const SOURCE_LIST: Source[] = Object.values(SOURCES);
