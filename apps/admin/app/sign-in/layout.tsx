// Sign-in page uses its own bare layout (no rail/topbar).
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
