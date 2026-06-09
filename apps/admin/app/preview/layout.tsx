// Preview routes have NO admin chrome — they render inside the Composer's iframe.
import "../globals.css";

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
