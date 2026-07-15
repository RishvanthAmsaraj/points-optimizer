# Supabase Setup Guide for Points Optimizer

## Step 1: Create Your Supabase Project

1. Go to https://supabase.com and sign up/log in
2. Click "New Project"
3. **Organization:** Your personal org (or create one)
4. **Project name:** `points-optimizer` ✓ (yes, that's perfect)
5. **Database Password:** Set a strong password here (see below)
6. **Region:** Choose closest to your users (us-east-1 for US)
7. Click "Create new project"

## About the Database Password

**Yes, you need to set a database password** when creating the project. This is the password for the `postgres` role — the superuser of your database.

### Password Requirements:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Don't use dictionary words

### Important Notes:
- **Save this password somewhere secure** (password manager)
- You'll rarely use it directly (Supabase handles connections via API keys)
- You can change it later in Dashboard → Settings → Database
- If you forget it, you can reset it from the dashboard

## Step 2: Get Your API Keys

After project creation:

1. Go to Project Settings → API
2. Copy these values for your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (starts with eyJ)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (starts with eyJ, keep this secret!)
```

## Step 3: Apply Database Schema

### Option A: Using Supabase Dashboard SQL Editor

1. Go to SQL Editor → New query
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and click "Run"

### Option B: Using Supabase CLI (after linking)

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Step 4: Seed the Database

After schema is applied:

```bash
# Set your env vars
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the seed script
npx tsx scripts/seed-all.ts
```

Or create `.env.local` first:
```bash
cp .env.example .env.local
# Edit .env.local with your values
npx tsx scripts/seed-all.ts
```

## Step 5: Configure Auth (Optional but Recommended)

### Enable OAuth Providers:
1. Go to Authentication → Providers
2. Enable Google:
   - Go to https://console.cloud.google.com/
   - Create OAuth 2.0 credentials
   - Add authorized redirect: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase dashboard
3. Enable GitHub:
   - Go to https://github.com/settings/developers
   - New OAuth App
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Secret to Supabase dashboard

### Configure Site URL:
1. Go to Authentication → URL Configuration
2. Set Site URL: `http://localhost:3000` (for dev)
3. Add redirect URLs: `http://localhost:3000/auth/callback`

## Step 6: Run the App

```bash
npm run dev
```

Visit http://localhost:3000 and test:
1. Sign up with email
2. Add points balances
3. Add credit cards
4. Try building a playbook

## Troubleshooting

### "Invalid API key" error
- Make sure you're using the `anon` key for client-side, `service_role` for server-side
- Check that URLs match (no trailing slashes)

### RLS errors
- RLS is enabled by default — policies are in the migration
- Make sure you're authenticated before testing protected routes

### Seed script fails
- Ensure schema is applied first
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
- The service role key bypasses RLS, which is needed for seeding
