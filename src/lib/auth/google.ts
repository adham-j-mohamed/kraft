import { Google, generateCodeVerifier, generateState } from "arctic";
import { appUrl, googleCredentials } from "./config";

export { generateState, generateCodeVerifier };

export function googleClient(): Google {
  const { clientId, clientSecret } = googleCredentials();
  return new Google(clientId, clientSecret, `${appUrl()}/api/auth/google/callback`);
}

export interface GoogleClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  aud: string;
  exp: number;
}

/**
 * ID-token kommer direkt ur Googles tokenväxling över TLS, så den behöver ingen
 * separat JWKS-verifiering. Vi kontrollerar aud, exp och att e-posten är verifierad.
 *
 * Detta är avsiktligt: färre rörliga delar i en POC, och inget beroende av en
 * beta-version av Auth.js.
 */
export function parseIdToken(idToken: string, expectedAud: string): GoogleClaims {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("ogiltig id_token");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  const claims = payload as GoogleClaims;
  if (claims.aud !== expectedAud) throw new Error("id_token har fel aud");
  if (claims.exp * 1000 < Date.now()) throw new Error("id_token har gått ut");
  if (!claims.email_verified) throw new Error("e-postadressen är inte verifierad hos Google");
  return claims;
}
