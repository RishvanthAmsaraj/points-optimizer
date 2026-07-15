# Setup Your Environment Variables

## Step 1: Get Your Keys from Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
2. Click **Project Settings** (gear icon) → **API**
3. Copy these values:

### URL
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
```

### Anon Key (public)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Service Role Key (secret - never share!)
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Step 2: Update .env.local

Open `.env.local` in the project root and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

## Step 3: Apply Database Schema

### Option A: Using Supabase Dashboard (Easiest)

1. Go to your project Dashboard → **SQL Editor**
2. Click **New query**
3. Open `supabase/migrations/001_initial_schema.sql` from this repo
4. Copy all the SQL and paste it into the editor
5. Click **Run**
6. You should see "Success" and all tables created

### Option B: Using Supabase CLI

```bash
# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push the schema
supabase db push
```

## Step 4: Seed the Database

After schema is applied, run:

```bash
npx tsx scripts/seed-all.ts
```

You should see output like:
```
🌱 Seeding database...

📋 Seeding loyalty programs...
  ✓ Chase Ultimate Rewards
  ✓ Amex Membership Rewards
  ...

💳 Seeding credit cards...
  ✓ Chase Sapphire Preferred
  ✓ Chase Sapphire Reserve
  ...

🔄 Seeding transfer rates...
  ✓ Chase Ultimate Rewards → United MileagePlus
  ...

✅ Done seeding database!
```

## Step 5: Run the App

```bash
npm run dev
```

Visit http://localhost:3000

## Troubleshooting

### "Invalid API key" error
- Double-check you copied the full key (they're long)
- Make sure there's no extra whitespace
- `NEXT_PUBLIC_` prefix is required for client-side env vars

### "relation does not exist" error
- Schema hasn't been applied yet — go back to Step 3

### Seed script says "Missing environment variables"
- Make sure `.env.local` exists in the project root
- Make sure the values don't still say "your_..._here"

### Need to reset and start over
```bash
# Delete all data (careful!)
supabase db reset

# Or just re-seed
npx tsx scripts/seed-all.ts
```
