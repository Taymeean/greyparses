// src/app/layout.tsx
import "./globals.css";
import Link from "next/link";
import OfficerLogoutButton from "@/components/OfficerLogoutButton";
import { readSession, isOfficer } from "@/lib/auth";

export const metadata = {
  title: "GreyParses",
  description: "SR tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side cookie reads (no client hooks needed)
  const session = readSession();
  const officer = isOfficer();

  // nicer status label
  const status = officer
    ? session
      ? `Officer • ${session.name}`
      : "Officer"
    : session
      ? session.name
      : "guest";

  return (
    <html lang="en">
      <body className="min-h-screen">
        {/* Sticky, slightly translucent header */}
        <header className="sticky top-0 z-40 border-b border-neutral-800 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30">
          <div className="max-w-6xl mx-auto px-4">
            <div className="headerbar">
              {/* Left: brand */}
              <Link
                href="/"
                className="brand navbrand font-semibold tracking-wide"
              >
                Grey Parses
              </Link>

              {/* Center: nav */}
              <nav className="topnav text-sm">
                <NavLink href="/claim">Claim</NavLink>
                <NavLink href="/sr">SR</NavLink>
                <NavLink href="/history">History</NavLink>
                {officer && <NavLink href="/roster">Roster</NavLink>}
                <NavLink href="/officer">Officer</NavLink>
                {officer && <NavLink href="/audit">Audit</NavLink>}
              </nav>

              {/* Right: status + officer action */}
              <div className="right">
                <span className="text-xs text-neutral-400">{status}</span>
                {officer ? (
                  <OfficerLogoutButton />
                ) : (
                  <Link
                    href="/officer"
                    className="btn px-2 py-1 text-xs"
                    title="Enter officer key"
                  >
                    Officer Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="navlink">
      {children}
    </Link>
  );
}
