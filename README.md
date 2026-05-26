# Vmake Creator Program

Web product for managing the Vmake Creator Program. Creators submit monthly content performance data from the public portal, the system calculates estimated rewards from versioned reward rules, and admins review, adjust, approve, and mark payouts as paid from a separate admin surface.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL or Supabase Postgres
- Vitest
- Playwright
- Vercel

## Local Setup

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

If the local shell does not have `npm`, use the project wrapper after installing
the local Node runtime into `tools/node`:

```bash
./tools/bootstrap-node
./tools/npm install
./tools/npm test
./tools/npm run dev
```

The product currently starts with a tested reward and workflow core:

- `src/lib/rewards`: Vmake reward calculation rules and tests
- `src/lib/submissions`: creator submission validation and tests
- `src/lib/adminReview`: admin review workflow and tests
- `src/lib/export`: payout CSV export and tests
- `prisma/schema.prisma`: proposed database schema

## GitHub Deployment Setup

This directory is designed to work as either:

- a standalone GitHub repository, or
- a subdirectory in a monorepo.

If using a monorepo, set the Vercel project Root Directory to:

```txt
vmake-creator-program
```

The included GitHub Actions workflow runs:

```bash
npm install
npm test
npm run build
```

## Vercel Setup

1. Push this project to GitHub.
2. Create a new Vercel project from the GitHub repository.
3. If this is inside a monorepo, set Root Directory to `vmake-creator-program`.
4. Add these environment variables in Vercel:

```txt
DATABASE_URL
NEXT_PUBLIC_APP_URL
ADMIN_APP_HOSTNAMES
AUTH_SECRET
AUTH_GITHUB_ID
AUTH_GITHUB_SECRET
```

Only `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, and `ADMIN_APP_HOSTNAMES` matter for the current split-domain setup. Auth variables are placeholders for the later role-based access milestone.

To split public and internal traffic:

1. Keep the public creator domain pointed at the default site, for example `creators.vmake.ai`.
2. Add a second Vercel domain for the same project, for example `admin.vmake.ai`.
3. Set `ADMIN_APP_HOSTNAMES=admin.vmake.ai`.

Behavior after that configuration:

- Public domains show only the creator submission experience on `/`.
- `admin.vmake.ai/` rewrites to the internal admin dashboard.
- `/admin` on non-admin domains redirects back to `/`.

## Database

Use Supabase Postgres or another managed PostgreSQL provider. After setting `DATABASE_URL`, Prisma commands can be run locally or in CI:

```bash
npx prisma generate
npx prisma migrate dev
```

For production migrations, use:

```bash
npx prisma migrate deploy
```

## Current Implementation Status

Completed:

- Project structure
- Prisma schema draft
- Reward rule model
- Reward calculation tests
- Reward calculation implementation
- Submission validation tests and implementation
- Admin review workflow tests and implementation
- Payout CSV export tests and implementation
- Creator public submission surface
- Host-aware admin route split for separate domains

Next:

- Review and payout UI
- Authentication and role-based access
- Vercel production database migration flow
