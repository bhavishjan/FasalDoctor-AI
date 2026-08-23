# Supabase Database Setup Guide

## Step-by-step instructions to deploy the National Agri-OS database

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **"New Project"**
3. Set:
   - **Name:** `fasal-doctor-ai` (or any name you prefer)
   - **Database Password:** (save this somewhere safe)
   - **Region:** South Asia Southeast (Singapore) — closest to Pakistan
4. Click **"Create new project"** and wait ~2 minutes for it to provision

### 2. Run the Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/schema.sql` from this project
4. **Copy the entire contents** and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: `Success. No rows returned`

> If you get errors, make sure you're running the **entire file at once** — the DROP statements at the top must run before the CREATE statements.

### 3. Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see **21 tables**:
   - `profiles`, `farmers`, `land_parcels`, `soil_assessments`
   - `seasons`, `crop_rotation_history`, `disease_scans`, `irrigation_schedule`, `fertilizer_recommendations`
   - `market_prices`, `crop_demand_forecast`, `alternative_crop_alerts`
   - `weather_forecasts`, `disaster_broadcasts`, `climate_threats`
   - `buyer_profiles`, `marketplace_listings`, `transactions`
   - `edge_nodes`, `telemetry_sync_log`, `crop_telemetry`
3. Check that seed data loaded:
   - Click on `edge_nodes` — should have 6 rows (MULTAN-104, FSDB-089, etc.)
   - Click on `market_prices` — should have 10 rows
   - Click on `weather_forecasts` — should have 10 rows

### 4. Enable Realtime

The schema already enables realtime via `ALTER PUBLICATION supabase_realtime ADD TABLE ...`.
Verify by going to **Database > Publications > supabase_realtime** and confirming these tables are listed:
- `crop_telemetry`
- `disaster_broadcasts`
- `climate_threats`
- `edge_nodes`

### 5. Get Your API Keys

1. Go to **Project Settings** (gear icon, bottom-left)
2. Click **API** (under Configuration)
3. Copy these two values:
   - **Project URL** — looks like `https://abcdefghijk.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

### 6. Configure the Admin Portal

1. Open `admin-portal/.env.local` in your editor
2. Replace the placeholder values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
3. Save the file

### 7. Start the Admin Portal

```bash
cd admin-portal
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the dashboard should now fetch real data from Supabase instead of mock data.

### 8. (Optional) Create Test Users

To test RLS policies, create users in Supabase:

1. Go to **Authentication > Users**
2. Click **"Add user" > "Create new user"**
3. Enter email + password
4. Then in **SQL Editor**, run:
   ```sql
   -- Make the user an admin
   INSERT INTO profiles (id, role, full_name, district)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
     'admin',
     'Your Name',
     'Multan'
   );
   ```

---

## Schema Architecture Summary

```
21 Tables across 6 Layers:

Layer 1: Auth & Farmers
  profiles → farmers → land_parcels → soil_assessments

Layer 2: Crop Lifecycle
  land_parcels → seasons → disease_scans
                           → irrigation_schedule
                           → fertilizer_recommendations
              → crop_rotation_history

Layer 3: Market & Economy
  market_prices, crop_demand_forecast, alternative_crop_alerts

Layer 4: Climate & Disaster
  weather_forecasts, disaster_broadcasts, climate_threats

Layer 5: Marketplace
  buyer_profiles → marketplace_listings → transactions

Layer 6: Edge & Telemetry
  edge_nodes → telemetry_sync_log
             → crop_telemetry

7 Database Functions:
  suggest_crop_rotation()
  detect_crop_surplus()
  find_cheapest_fertilizer()
  check_rain_irrigation_alert()
  get_dashboard_stats()
  get_regional_telemetry()
  increment_node_scans()
```

## Troubleshooting

| Error | Fix |
|---|---|
| `relation "auth.users" does not exist` | Make sure you're running this in a Supabase SQL Editor, not plain PostgreSQL |
| `permission denied for schema auth` | You need to be logged in as the project owner in Supabase dashboard |
| `type already exists` | Run the full schema file again — the DROP TYPE statements at the top handle this |
| `policy already exists` | Same — the DROP TABLE CASCADE at the top removes old policies |
| Dashboard shows no data after setup | Check `.env.local` has correct URL + key, then restart `npm run dev` |
