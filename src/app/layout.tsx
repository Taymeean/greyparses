// src/app/layout.tsx
import './globals.css';
import Link from 'next/link';
import { readSession, isOfficer } from '@/lib/auth';

export const metadata = { title: 'GreyParses', description: 'SR tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = readSession();   // server-side cookie read
  const officer = isOfficer();     // server-side officer flag

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="font-semibold tracking-wide">GreyParses 🔧</div>

            <nav className="flex items-center space-x-6 text-sm">
              <NavLink href="/claim">Claim</NavLink>
              <NavLink href="/sr">SR</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/officer">Officer</NavLink>
              <NavLink href="/audit">Audit</NavLink>
            </nav>

            <div className="text-xs text-neutral-400">
              {officer ? 'Officer' : session ? `player:${session.name}` : 'guest'}
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

