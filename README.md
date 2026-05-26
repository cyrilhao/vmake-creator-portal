# Vmake Creator Program

Web product for managing the Vmake Creator Program. Creators submit monthly content performance data, the system calculates estimated rewards from versioned reward rules, and admins review, adjust, approve, and mark payouts as paid.

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
AUTH_SECRET
AUTH_GITHUB_ID
AUTH_GITHUB_SECRET
```

Only `DATABASE_URL` and `NEXT_PUBLIC_APP_URL` are needed for the current build. Auth variables are placeholders for the later role-based access milestone.

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

Next:

- Creator mobile submission form
- Admin dashboard
- Review and payout UI
- Authentication and role-based access
- Vercel production database migration flow
