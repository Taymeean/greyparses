This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

TO-DO List:
Next-session TODO (top of the pile)
  SRLog: decide fields, add migration, re-enable write.
    Likely fields: bossId, isTier, notes.
    Migration name: srlog_add_boss_isTier_notes.
  Add meta.display to:
    boss kill toggle
    lock all / unlock except killed
    reset week
  Audit UI: prefer meta.display, fall back to diff (already in).
  Roll soft-grey UI to /claim (and any remaining pages).
  (Nice) Officer identity alias panel—make sure it’s saved/visible.
