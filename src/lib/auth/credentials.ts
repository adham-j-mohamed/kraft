/**
 * Regler för användarnamn och lösenord. Hålls på ett ställe så att registrering,
 * inloggning och adminsidans kontoskapande dömer likadant.
 */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

/** Användarnamn sparas alltid i gemener; inloggning är skiftlägesokänslig. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Null om namnet är giltigt, annars en svensk feltext. */
export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (!username) return "Användarnamn saknas.";
  if (!USERNAME_PATTERN.test(username)) {
    return "Användarnamnet ska vara 3–32 tecken: a–z, 0–9, punkt, bindestreck eller understreck, och börja med en bokstav eller siffra.";
  }
  return null;
}

/** Null om lösenordet är giltigt, annars en svensk feltext. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Lösenordet måste vara minst ${PASSWORD_MIN} tecken.`;
  if (password.length > PASSWORD_MAX) return `Lösenordet får vara högst ${PASSWORD_MAX} tecken.`;
  return null;
}
