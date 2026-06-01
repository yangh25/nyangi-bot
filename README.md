# nyangi-bot

A personal Korean vocabulary tracker built for readers.

I kept looking up the same words over and over while reading Korean books and wanted somewhere to keep track of them. So I built nyangi-bot. Hopefully it helps anyone else out there on the never ending journey of learning a foreign language.

## What it does

**Add words** — search for a Korean word and Claude looks up its definitions, part of speech, hanja origins, and suggests a category. Pick the right sense, add the sentence you found it in, and save it to your bank.

**Word bank** — browse all your saved words, filterable by type: 순우리말, 한자, 사자성어, 속담, 관용어.

**Review** — spaced repetition queue that surfaces words you haven't seen in a while. Mark each one as "Got it" or "Missed it" and keep going as long as you want.

## Stack

- [Next.js 16](https://nextjs.org) — app router, server components
- [Prisma 5](https://prisma.io) + PostgreSQL — database
- [NextAuth v5](https://authjs.dev) — username/password auth
- [Claude Haiku](https://anthropic.com) — word definitions, hanja, category suggestions, with result caching

## Local setup

**Prerequisites:** Node.js 18+, PostgreSQL

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a PostgreSQL database and copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Fill in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/nyangi_bot"
   AUTH_SECRET="your-random-secret"
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

4. Run migrations and start the dev server:
   ```bash
   npx prisma migrate dev
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and register an account.
