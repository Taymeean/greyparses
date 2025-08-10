'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficerLoginPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    try {
      const res = await fetch('/api/officer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      // cookie set — bounce to /audit
      router.push('/audit');
      router.refresh();
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true); setErr(null);
    try {
      await fetch('/api/officer/logout', { method: 'POST' });
      // cookie cleared — bounce back to /officer
      router.replace('/officer');
      router.refresh();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Officer Login</h1>
      <form onSubmit={login} className="space-y-3">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Officer token</label>
          <input
            className="border rounded px-3 py-2"
            placeholder="paste token here"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="pt-4">
        <button
          onClick={logout}
          disabled={loading}
          className="px-3 py-2 rounded border"
        >
          Log out (clear officer cookie)
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Tip: token lives in your <code>.env</code> as <code>OFFICER_TOKEN</code>.
      </p>
    </div>
  );
}
