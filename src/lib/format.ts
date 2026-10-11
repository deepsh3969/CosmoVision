import { WORLD } from '../data/celestialObjects';

export function formatAu(au: number): string {
  if (!Number.isFinite(au)) return '—';
  if (au < 0.01) return `${au.toFixed(4)} AU`;
  if (au < 10) return `${au.toFixed(2)} AU`;
  return `${au.toFixed(1)} AU`;
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km >= 1e9) return `${(km / 1e9).toFixed(2)} billion km`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(1)} million km`;
  if (km >= 1e3) return `${Math.round(km).toLocaleString('en-US')} km`;
  return `${km.toFixed(1)} km`;
}

export function formatLightYears(units: number): string {
  const ly = units * WORLD.lyPerGalaxyUnit;
  if (ly >= 1e6) return `${(ly / 1e6).toFixed(2)} Mly`;
  if (ly >= 1000) return `${(ly / 1000).toFixed(1)} kly`;
  return `${Math.round(ly)} ly`;
}

/** Scene-unit distance formatted according to the active scale regime. */
export function formatSceneDistance(units: number, regime: 'galaxy' | 'system'): string {
  return regime === 'galaxy' ? formatLightYears(units) : formatAu(units);
}

export function formatDays(days: number): string {
  if (!Number.isFinite(days)) return '—';
  const abs = Math.abs(days);
  if (abs < 1) return `${(days).toFixed(2)} d`;
  if (abs < 1000) return `${days.toFixed(1)} d`;
  return `${days.toLocaleString('en-US', { maximumFractionDigits: 0 })} d`;
}

export function formatYears(days: number): string {
  const years = days / 365.25;
  if (Math.abs(years) < 1) return `${days.toFixed(1)} days`;
  if (Math.abs(years) < 1000) return `${years.toFixed(1)} years`;
  return `${years.toLocaleString('en-US', { maximumFractionDigits: 0 })} years`;
}

export function formatInt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/** Compact date label derived from the simulation clock (J2000 epoch + days). */
export function formatSimDate(simDays: number): string {
  const epoch = Date.UTC(2000, 0, 1, 12, 0, 0);
  const date = new Date(epoch + simDays * 86400000);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}
