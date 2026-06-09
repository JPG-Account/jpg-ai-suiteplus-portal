// ADMIN layout — Rail + CSRF bootstrap + content frame.
// Wraps every page under app/(admin)/* without affecting URL paths
// (route groups in parentheses are NOT part of the URL).
// Performs a server-side session check so a stale cookie redirects to /sign-in
// instead of every admin page erroring with HTTP 401 from its first fetch.
import { redirect } from "next/navigation";
import { Rail } from "../../components/Rail";
import CsrfBootstrap from "../../components/CsrfBootstrap";
import { getCurrentUser } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/");
  return (
    <>
      <a href="#main" style={{ position: "absolute", left: -9999 }}>Skip to main content</a>
      <CsrfBootstrap />
      <div className="app">
        <Rail />
        <div className="work" id="main">{children}</div>
      </div>
    </>
  );
}
