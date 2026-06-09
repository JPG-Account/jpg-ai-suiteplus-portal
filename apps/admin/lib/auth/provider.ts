// AuthProvider — interface implemented by DevEmailAuthProvider (V0.7) and
// LocalPasswordAuthProvider (V0.9-Crawl). V0.9-Walk will add IASOidcAuthProvider.
// Route handlers never depend on the concrete impl.

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "super_admin" | "editor" | "viewer";
  totpRequired?: boolean;
};

export type SignInResult =
  | { ok: true; sessionToken: string; user: SessionUser }
  | { ok: false; reason: "not_allowed" | "invalid_email" | "wrong_password" | "locked" | "no_password" | "totp_required" | "totp_invalid" | "password_policy" };

export type SignInInput =
  | { kind: "email-only"; email: string }
  | { kind: "password"; email: string; password: string; totpCode?: string };

export interface AuthProvider {
  readonly kind: "dev-email" | "local-password" | "ias-oidc";
  signIn(input: SignInInput): Promise<SignInResult>;
  resolveSession(token: string | undefined): Promise<SessionUser | null>;
  signOut(token: string | undefined): Promise<void>;
  // Optional · IAS impl returns undefined (delegates to IdP)
  setPasswordFromToken?(token: string, newPassword: string): Promise<{ ok: true; userId: string } | { ok: false; reason: string }>;
  changePassword?(userId: string, current: string, next: string): Promise<{ ok: true } | { ok: false; reason: string }>;
}
