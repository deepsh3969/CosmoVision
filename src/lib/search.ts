import { CELESTIAL_OBJECTS, getObject } from '../data/celestialObjects';
import type { CelestialObject, ObjectCategory } from '../types';

export interface SearchOptions {
  categories?: ObjectCategory[];
  limit?: number;
}

const norm = (value: string): string => value.toLowerCase().trim();

function rankMatch(object: CelestialObject, query: string): number {
  const q = norm(query);
  if (!q) return 9;
  const name = norm(object.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(/\s+/).some((word) => word.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  if (object.tags.some((tag) => norm(tag).startsWith(q))) return 4;
  if (object.tags.some((tag) => norm(tag).includes(q))) return 5;
  if (norm(object.typeLabel).includes(q)) return 6;
  if (norm(object.description).includes(q)) return 7;
  return -1;
}

/** Case-insensitive ranked search across names, tags, type labels and descriptions. */
export function searchObjects(
  query: string,
  { categories, limit = 12 }: SearchOptions = {},
): CelestialObject[] {
  const pool = categories && categories.length ? filterByCategories(CELESTIAL_OBJECTS, categories) : CELESTIAL_OBJECTS;
  const q = norm(query);
  const scored: { object: CelestialObject; score: number }[] = [];
  for (const object of pool) {
    const score = q ? rankMatch(object, query) : 0;
    if (score >= 0) scored.push({ object, score });
  }
  scored.sort((a, b) => a.score - b.score || a.object.name.localeCompare(b.object.name));
  return scored.slice(0, limit).map((entry) => entry.object);
}

export function filterByCategories(
  objects: CelestialObject[],
  categories: ObjectCategory[],
): CelestialObject[] {
  if (!categories.length) return objects;
  const set = new Set(categories);
  return objects.filter((object) => set.has(object.category));
}

export function matchCategory(object: CelestialObject, query: string): boolean {
  const q = norm(query);
  return (
    norm(object.category).includes(q) ||
    norm(object.typeLabel).includes(q) ||
    object.tags.some((tag) => norm(tag).includes(q))
  );
}

/** Objects whose name or tags mention the given object — used for "related" suggestions. */
export function relatedByTag(id: string, limit = 4): CelestialObject[] {
  const object = getObject(id);
  if (!object) return [];
  const tokens = new Set([...object.tags, norm(object.name)]);
  return CELESTIAL_OBJECTS.filter((candidate) => candidate.id !== id)
    .map((candidate) => ({
      candidate,
      score: candidate.tags.reduce((acc, tag) => (tokens.has(tag) ? acc + 1 : acc), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}
