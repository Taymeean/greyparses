// src/app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { readSession, isOfficer } from '@/lib/auth';

export const metadata = {
  title: 'GreyParses',
  description: 'SR tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-side cookie reads
  const session = readSession();
  const officer = isOfficer();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-neutral-800">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            {/* Brand */}
            <div className="font-semibold tracking-wide">GreyParses</div>

            {/* Nav */}
            <nav className="flex items-center space-x-6 text-sm">
              <NavLink href="/claim">Claim</NavLink>
              <NavLink href="/sr">SR</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/officer">Officer</NavLink>
              <NavLink href="/audit">Audit</NavLink>
            </nav>

            {/* Right side: status + dynamic officer action */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400">
                {officer
                  ? (session ? `Officer • player:${session.name}` : 'Officer')
                  : (session ? `player:${session.name}` : 'guest')}
              </span>

              {officer ? (
                // Officer is logged in → show Logout (POST)
                <form method="post" action="/api/officer/logout">
                  <button className="btn btn-danger px-2 py-1 text-xs" title="Clear officer cookie">
                    Logout
                  </button>
                </form>
              ) : (
                // Not officer → show Login link
                <Link href="/officer" className="btn px-2 py-1 text-xs" title="Enter officer key">
                  Officer Login
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-indigo-300 visited:text-indigo-300 hover:text-white underline-offset-4 hover:underline transition"
    >
      {children}
    </Link>
  );
}
