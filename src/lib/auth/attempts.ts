/**
 * Enkel broms mot gissningar: fem misslyckade inloggningar per användarnamn och
 * IP-adress inom femton minuter. Räknaren lever i processminnet — appen kör som
 * en container, så det räcker. Startar containern om nollställs räknarna, vilket
 * är acceptabelt: bromsen ska stoppa massgissningar, inte överleva omstart.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

interface Entry {
  count: number;
  resetAt: number;
}

const failures = new Map<string, Entry>();

export function loginKey(ip: string, username: string): string {
  return `${ip}|${username}`;
}

function prune(now: number): void {
  if (failures.size < 512) return;
  for (const [key, entry] of failures) {
    if (entry.resetAt <= now) failures.delete(key);
  }
}

export function isBlocked(key: string): boolean {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry) return false;
  if (entry.resetAt <= now) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string): void {
  failures.delete(key);
}

/**
 * Allmän hastighetsgräns: tillåter högst `max` träffar per `windowMs` för en nyckel.
 * Returnerar false när gränsen är nådd. Används för registreringar per IP-adress.
 */
const hits = new Map<string, Entry>();

export function allowHit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size >= 512) {
    for (const [k, entry] of hits) if (entry.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}
