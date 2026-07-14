# Supabase Setup Guide

## Step 1: Create Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate New Token"
3. Name it "Points Optimizer CLI"
4. Copy the token (starts with `sbp_`)

## Step 2: Login via CLI

Run this command with your token:

```bash
supabase login --token YOUR_TOKEN_HERE
```

## Step 3: Initialize Project

```bash
cd /Users/rishvanthamsaraj/.openclaw/workspace/points-optimizer
supabase link --project-ref YOUR_PROJECT_REF
```

## Step 4: Push Schema

```bash
supabase db push
```

## Step 5: Set Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Get these from your Supabase project dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/api
