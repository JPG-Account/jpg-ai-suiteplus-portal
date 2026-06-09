// Provider factory — selects between dev-email, local-password, ias-oidc based on env.
import type { AuthProvider } from "./provider";
import { getAuthProvider as getDevEmail } from "./dev-email-provider";
import { getLocalPasswordProvider } from "./local-password-provider";

let _cached: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (_cached) return _cached;
  const kind = (process.env.AUTH_PROVIDER ?? "dev").toLowerCase();
  if (kind === "local") {
    _cached = getLocalPasswordProvider();
  } else if (kind === "ias") {
    // V0.9-Walk · placeholder until IASOidcAuthProvider lands
    throw new Error("ias provider not implemented yet (V0.9-Walk)");
  } else {
    _cached = getDevEmail();
  }
  return _cached;
}
