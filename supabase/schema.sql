-- ============================================================================
-- NATIONAL AGRI-OS — COMPLETE SUPABASE SCHEMA
-- Edge-to-Cloud Agricultural Ecosystem
-- ============================================================================

-- Drop existing tables if re-running (development only — remove in production)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS marketplace_listings CASCADE;
DROP TABLE IF EXISTS buyer_profiles CASCADE;
DROP TABLE IF EXISTS disaster_broadcasts CASCADE;
DROP TABLE IF EXISTS weather_forecasts CASCADE;
DROP TABLE IF EXISTS alternative_crop_alerts CASCADE;
DROP TABLE IF EXISTS crop_demand_forecast CASCADE;
DROP TABLE IF EXISTS market_prices CASCADE;
DROP TABLE IF EXISTS fertilizer_recommendations CASCADE;
DROP TABLE IF EXISTS irrigation_schedule CASCADE;
DROP TABLE IF EXISTS disease_scans CASCADE;
DROP TABLE IF EXISTS crop_rotation_history CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS soil_assessments CASCADE;
DROP TABLE IF EXISTS land_parcels CASCADE;
DROP TABLE IF EXISTS telemetry_sync_log CASCADE;
DROP TABLE IF EXISTS edge_nodes CASCADE;
DROP TABLE IF EXISTS climate_threats CASCADE;
DROP TABLE IF EXISTS crop_telemetry CASCADE;
DROP TABLE IF EXISTS farmers CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop types if they exist (for clean re-runs)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS season_status CASCADE;
DROP TYPE IF EXISTS scan_status CASCADE;
DROP TYPE IF EXISTS irrigation_status CASCADE;
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS threat_severity CASCADE;
DROP TYPE IF EXISTS broadcast_type CASCADE;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram search for fuzzy matching

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('farmer', 'admin', 'researcher', 'buyer');
CREATE TYPE season_status AS ENUM ('planned', 'active', 'harvested', 'abandoned');
CREATE TYPE scan_status AS ENUM ('pending', 'processed', 'confirmed');
CREATE TYPE irrigation_status AS ENUM ('scheduled', 'completed', 'skipped_rain', 'skipped_manual');
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'cancelled', 'expired');
CREATE TYPE threat_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE broadcast_type AS ENUM ('extreme_weather', 'pest_outbreak', 'disease_alert', 'flood_warning', 'drought_protocol', 'general');


-- ============================================================================
-- LAYER 1: AUTH & FARMERS
-- ============================================================================

-- Profiles: links to Supabase auth.users, stores role and public info
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'farmer',
    full_name TEXT NOT NULL,
    phone TEXT,
    district TEXT,
    province TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Farmers: extended farmer-specific data
CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    farm_size_hectares DECIMAL(8, 2),
    soil_type TEXT,
    primary_crop TEXT,
    years_farming INTEGER CHECK (years_farming >= 0),
    irrigation_source TEXT,  -- 'canal', 'tubewell', 'rainfed', 'drip'
    bank_account_iban TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- LAYER 1b: LAND & SOIL
-- ============================================================================

-- Land parcels: individual fields owned by a farmer
CREATE TABLE land_parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                    -- e.g. "North Field", "Parcel #3"
    area_hectares DECIMAL(8, 2) NOT NULL,
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    soil_ph DECIMAL(4, 2) CHECK (soil_ph BETWEEN 0 AND 14),
    soil_nitrogen_ppm DECIMAL(6, 2),      -- parts per million
    soil_phosphorus_ppm DECIMAL(6, 2),
    soil_potassium_ppm DECIMAL(6, 2),
    soil_organic_carbon_pct DECIMAL(4, 2),
    soil_texture TEXT,                     -- 'clay', 'loam', 'sandy', 'silt_loam'
    elevation_meters DECIMAL(6, 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Soil assessments: time-series soil test results
CREATE TABLE soil_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    nitrogen_ppm DECIMAL(6, 2),
    phosphorus_ppm DECIMAL(6, 2),
    potassium_ppm DECIMAL(6, 2),
    organic_carbon_pct DECIMAL(4, 2),
    ph DECIMAL(4, 2) CHECK (ph BETWEEN 0 AND 14),
    moisture_pct DECIMAL(4, 1),
    notes TEXT,
    tested_by UUID REFERENCES profiles(id)
);

-- ============================================================================
-- LAYER 2: CROP LIFECYCLE
-- ============================================================================

-- Seasons: one planting season per parcel
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,               -- e.g. 'Wheat', 'Cotton', 'Maize'
    variety TEXT,                          -- e.g. 'Punjab-2020', 'NIAB-111'
    sowing_date DATE,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    status season_status NOT NULL DEFAULT 'planned',
    predicted_yield_kg DECIMAL(10, 2),
    actual_yield_kg DECIMAL(10, 2),
    ai_seed_recommendation TEXT,           -- AI's recommended variety
    ai_reasoning TEXT,                     -- why this variety was chosen
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crop rotation history: what was planted in each parcel per season
CREATE TABLE crop_rotation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    crop_type TEXT NOT NULL,
    planted_date DATE,
    harvested_date DATE,
    yield_kg DECIMAL(10, 2),
    soil_impact TEXT,                      -- 'nitrogen_depleting', 'nitrogen_fixing', 'neutral'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disease scans: every leaf photo diagnosis
CREATE TABLE disease_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    edge_node_id UUID,                     -- which edge node processed it (if any)
    image_url TEXT,                        -- Supabase Storage path
    crop_type TEXT NOT NULL,
    diagnosis TEXT NOT NULL,               -- 'Healthy', 'Wheat Rust', 'Corn Blight', etc.
    confidence DECIMAL(4, 3) CHECK (confidence BETWEEN 0 AND 1),  -- 0.000 to 1.000 (normalized)
    inference_time_ms INTEGER,
    treatment_protocol TEXT,               -- AI-recommended treatment
    status scan_status NOT NULL DEFAULT 'processed',
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ
);

-- Irrigation schedule: AI-generated watering plans
CREATE TABLE irrigation_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    volume_liters DECIMAL(10, 2) NOT NULL,
    source TEXT,                           -- 'ai_recommendation', 'farmer_manual'
    reason TEXT,                           -- AI explanation
    weather_rainfall_predicted_mm DECIMAL(6, 1),
    status irrigation_status NOT NULL DEFAULT 'scheduled',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fertilizer recommendations: exact NPK calculations
CREATE TABLE fertilizer_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    recommended_date DATE NOT NULL DEFAULT CURRENT_DATE,
    nitrogen_kg DECIMAL(8, 2) NOT NULL,
    phosphorus_kg DECIMAL(8, 2) NOT NULL,
    potassium_kg DECIMAL(8, 2) NOT NULL,
    total_fertilizer_kg DECIMAL(8, 2) GENERATED ALWAYS AS (nitrogen_kg + phosphorus_kg + potassium_kg) STORED,
    recommended_brand TEXT,                -- cheapest brand from market API
    recommended_brand_price DECIMAL(10, 2),
    price_source_district TEXT,
    application_method TEXT,
    is_applied BOOLEAN NOT NULL DEFAULT false,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- LAYER 3: MARKET & ECONOMY
-- ============================================================================

-- Market prices: input prices per district per brand
CREATE TABLE market_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_type TEXT NOT NULL,            -- 'urea', 'dap', 'seed_wheat', 'seed_cotton', etc.
    brand_name TEXT NOT NULL,
    district TEXT NOT NULL,
    price_pkr DECIMAL(10, 2) NOT NULL CHECK (price_pkr >= 0),
    unit TEXT NOT NULL DEFAULT 'per_50kg_bag',
    supplier_name TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crop demand forecast: AI-generated national yield predictions
CREATE TABLE crop_demand_forecast (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_type TEXT NOT NULL,
    forecast_season TEXT NOT NULL,          -- e.g. 'Rabi 2026', 'Kharif 2026'
    total_predicted_yield_tonnes DECIMAL(12, 2),
    national_demand_tonnes DECIMAL(12, 2),
    surplus_deficit_tonnes DECIMAL(12, 2) GENERATED ALWAYS AS (total_predicted_yield_tonnes - national_demand_tonnes) STORED,
    status TEXT NOT NULL DEFAULT 'projected',  -- 'projected', 'confirmed', 'revised'
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alternative crop alerts: oversupply warnings sent to farmers
CREATE TABLE alternative_crop_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_crop TEXT NOT NULL,
    suggested_crop TEXT NOT NULL,
    reason TEXT NOT NULL,                   -- e.g. 'Wheat oversupply detected — 14% surplus projected'
    target_region TEXT,
    target_farmer_ids UUID[],              -- array of farmer IDs to alert
    expected_profit_uplift_pct DECIMAL(5, 2),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- ============================================================================
-- LAYER 4: CLIMATE & DISASTER
-- ============================================================================

-- Weather forecasts: meteorological data per region
CREATE TABLE weather_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    temp_high_c DECIMAL(4, 1),
    temp_low_c DECIMAL(4, 1),
    humidity_pct DECIMAL(4, 1),
    rainfall_predicted_mm DECIMAL(6, 1),
    wind_speed_kmh DECIMAL(5, 1),
    condition TEXT,                        -- 'clear', 'cloudy', 'rain', 'storm'
    source TEXT,                           -- 'PMD', 'OpenWeather', 'local_station'
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disaster broadcasts: emergency alerts from researchers/government
CREATE TABLE disaster_broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    broadcast_type broadcast_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_regions TEXT[] NOT NULL,        -- array of affected regions
    severity threat_severity NOT NULL DEFAULT 'medium',
    action_required TEXT,                  -- specific farmer action steps
    created_by UUID REFERENCES profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Climate threats: ongoing threat monitoring (expanded from original)
CREATE TABLE climate_threats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region TEXT NOT NULL,
    threat_type TEXT NOT NULL,             -- 'drought', 'flood', 'heatwave', 'pest_migration'
    severity threat_severity NOT NULL DEFAULT 'medium',
    description TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    reported_by UUID REFERENCES profiles(id)
);

-- ============================================================================
-- LAYER 5: MARKETPLACE (DIRECT-TO-BUYER)
-- ============================================================================

-- Buyer profiles: factories, purchasers
CREATE TABLE buyer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,           -- 'flour_mill', 'textile_factory', 'sugar_mill', 'trader'
    cnic TEXT,
    address TEXT,
    city TEXT,
    phone TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketplace listings: post-harvest crop listings
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    crop_type TEXT NOT NULL,
    quantity_kg DECIMAL(12, 2) NOT NULL CHECK (quantity_kg > 0),
    price_per_kg_pkr DECIMAL(10, 2) NOT NULL CHECK (price_per_kg_pkr >= 0),
    min_order_kg DECIMAL(10, 2),
    quality_grade TEXT,                    -- 'A', 'B', 'C'
    storage_location TEXT,
    delivery_available BOOLEAN NOT NULL DEFAULT false,
    status listing_status NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions: completed sales
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES buyer_profiles(id) ON DELETE CASCADE,
    quantity_kg DECIMAL(12, 2) NOT NULL CHECK (quantity_kg > 0),
    price_per_kg_pkr DECIMAL(10, 2) NOT NULL CHECK (price_per_kg_pkr >= 0),
    total_amount_pkr DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_kg * price_per_kg_pkr) STORED,
    payment_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'paid', 'disputed'
    delivery_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_transit', 'delivered'
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- LAYER 6: EDGE NODES & TELEMETRY SYNC
-- ============================================================================

-- Edge nodes: registered inference devices
CREATE TABLE edge_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_code TEXT NOT NULL UNIQUE,        -- e.g. 'MULTAN-104', 'FSDB-089'
    region TEXT NOT NULL,
    firmware_version TEXT,
    model_name TEXT DEFAULT 'plant_disease_v1',
    status TEXT NOT NULL DEFAULT 'online', -- 'online', 'offline', 'maintenance'
    last_heartbeat_at TIMESTAMPTZ,
    total_scans_processed INTEGER NOT NULL DEFAULT 0,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telemetry sync log: every batch sync from edge to cloud
CREATE TABLE telemetry_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_node_id UUID NOT NULL REFERENCES edge_nodes(id) ON DELETE CASCADE,
    batch_id UUID,
    records_synced INTEGER NOT NULL DEFAULT 0,
    diseases_detected INTEGER NOT NULL DEFAULT 0,
    avg_confidence DECIMAL(4, 3),
    avg_inference_ms INTEGER,
    sync_status TEXT NOT NULL DEFAULT 'success', -- 'success', 'partial', 'failed'
    error_message TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crop telemetry: expanded from original (kept for backward compat with API)
CREATE TABLE crop_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_node_id UUID REFERENCES edge_nodes(id) ON DELETE SET NULL,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    crop_type TEXT NOT NULL,
    health_status TEXT NOT NULL,
    confidence DECIMAL(4, 3),  -- 0.000 to 1.000 (normalized)
    inference_time_ms INTEGER,
    region TEXT,
    ai_recommendation TEXT,
    image_url TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES (performance-critical)
-- ============================================================================

-- Farmer & Land
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_district ON profiles(district);
CREATE INDEX idx_farmers_profile ON farmers(profile_id);
CREATE INDEX idx_land_parcels_farmer ON land_parcels(farmer_id);
CREATE INDEX idx_land_parcels_latlon ON land_parcels(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Crop Lifecycle
CREATE INDEX idx_seasons_parcel ON seasons(parcel_id);
CREATE INDEX idx_seasons_status ON seasons(status);
CREATE INDEX idx_seasons_crop_type ON seasons(crop_type);
CREATE INDEX idx_rotation_history_parcel ON crop_rotation_history(parcel_id);
CREATE INDEX idx_rotation_history_crop ON crop_rotation_history(crop_type);
CREATE INDEX idx_disease_scans_farmer ON disease_scans(farmer_id);
CREATE INDEX idx_disease_scans_diagnosis ON disease_scans(diagnosis);
CREATE INDEX idx_disease_scans_time ON disease_scans(scanned_at DESC);
CREATE INDEX idx_irrigation_season ON irrigation_schedule(season_id);
CREATE INDEX idx_irrigation_date ON irrigation_schedule(scheduled_date);
CREATE INDEX idx_fertilizer_season ON fertilizer_recommendations(season_id);

-- Market & Economy
CREATE INDEX idx_market_prices_product ON market_prices(product_type, district);
CREATE INDEX idx_market_prices_updated ON market_prices(updated_at DESC);
CREATE INDEX idx_demand_forecast_crop ON crop_demand_forecast(crop_type, forecast_season);
CREATE INDEX idx_alternative_alerts_region ON alternative_crop_alerts(target_region);

-- Climate & Disaster
CREATE INDEX idx_weather_region_date ON weather_forecasts(region, forecast_date);
CREATE INDEX idx_disaster_broadcasts_active ON disaster_broadcasts(is_active, created_at DESC);
CREATE INDEX idx_disaster_broadcasts_regions ON disaster_broadcasts USING gin(target_regions);
CREATE INDEX idx_climate_threats_active ON climate_threats(is_active, detected_at DESC);

-- Marketplace
CREATE INDEX idx_listings_farmer ON marketplace_listings(farmer_id);
CREATE INDEX idx_listings_status ON marketplace_listings(status, created_at DESC);
CREATE INDEX idx_listings_crop ON marketplace_listings(crop_type);
CREATE INDEX idx_transactions_listing ON transactions(listing_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);

-- Edge & Telemetry
CREATE INDEX idx_edge_nodes_region ON edge_nodes(region);
CREATE INDEX idx_edge_nodes_status ON edge_nodes(status);
CREATE INDEX idx_sync_log_node ON telemetry_sync_log(edge_node_id, synced_at DESC);
CREATE INDEX idx_crop_telemetry_node ON crop_telemetry(edge_node_id);
CREATE INDEX idx_crop_telemetry_region ON crop_telemetry(region, recorded_at DESC);
CREATE INDEX idx_crop_telemetry_health ON crop_telemetry(health_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE land_parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE irrigation_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE fertilizer_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_demand_forecast ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternative_crop_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_telemetry ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role (returns NULL safely if no profile)
CREATE OR REPLACE FUNCTION get_current_user_role() RETURNS user_role AS $$
    SELECT COALESCE(role, 'farmer'::user_role) FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's farmer_id (returns NULL if not a farmer)
CREATE OR REPLACE FUNCTION get_current_farmer_id() RETURNS UUID AS $$
    SELECT id FROM farmers WHERE profile_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
CREATE POLICY "profiles_select" ON profiles FOR SELECT
    USING (id = auth.uid() OR get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
    USING (id = auth.uid());

-- ---- FARMERS ----
CREATE POLICY "farmers_select" ON farmers FOR SELECT
    USING (profile_id = auth.uid() OR get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "farmers_insert" ON farmers FOR INSERT
    WITH CHECK (profile_id = auth.uid());
CREATE POLICY "farmers_update" ON farmers FOR UPDATE
    USING (profile_id = auth.uid() OR get_current_user_role() = 'admin');

-- ---- LAND PARCELS ----
CREATE POLICY "land_parcels_select" ON land_parcels FOR SELECT
    USING (farmer_id = get_current_farmer_id() OR get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "land_parcels_insert" ON land_parcels FOR INSERT
    WITH CHECK (farmer_id = get_current_farmer_id());
CREATE POLICY "land_parcels_update" ON land_parcels FOR UPDATE
    USING (farmer_id = get_current_farmer_id() OR get_current_user_role() = 'admin');
CREATE POLICY "land_parcels_delete" ON land_parcels FOR DELETE
    USING (farmer_id = get_current_farmer_id() OR get_current_user_role() = 'admin');

-- ---- SOIL ASSESSMENTS ----
CREATE POLICY "soil_select" ON soil_assessments FOR SELECT
    USING (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() IN ('admin', 'researcher')
    );
CREATE POLICY "soil_insert" ON soil_assessments FOR INSERT
    WITH CHECK (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() = 'admin'
    );
CREATE POLICY "soil_update" ON soil_assessments FOR UPDATE
    USING (get_current_user_role() IN ('admin', 'researcher'));

-- ---- SEASONS ----
CREATE POLICY "seasons_select" ON seasons FOR SELECT
    USING (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() IN ('admin', 'researcher')
    );
CREATE POLICY "seasons_insert" ON seasons FOR INSERT
    WITH CHECK (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() = 'admin'
    );
CREATE POLICY "seasons_update" ON seasons FOR UPDATE
    USING (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() = 'admin'
    );

-- ---- CROP ROTATION HISTORY ----
CREATE POLICY "rotation_select" ON crop_rotation_history FOR SELECT
    USING (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() IN ('admin', 'researcher')
    );
CREATE POLICY "rotation_insert" ON crop_rotation_history FOR INSERT
    WITH CHECK (
        parcel_id IN (SELECT id FROM land_parcels WHERE farmer_id = get_current_farmer_id())
        OR get_current_user_role() = 'admin'
    );
CREATE POLICY "rotation_update" ON crop_rotation_history FOR UPDATE
    USING (get_current_user_role() IN ('admin', 'researcher'));

-- ---- DISEASE SCANS ----
CREATE POLICY "scans_select" ON disease_scans FOR SELECT
    USING (farmer_id = get_current_farmer_id() OR get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "scans_insert" ON disease_scans FOR INSERT
    WITH CHECK (farmer_id = get_current_farmer_id());

-- ---- IRRIGATION SCHEDULE ----
CREATE POLICY "irrigation_select" ON irrigation_schedule FOR SELECT
    USING (
        season_id IN (
            SELECT s.id FROM seasons s JOIN land_parcels lp ON s.parcel_id = lp.id
            WHERE lp.farmer_id = get_current_farmer_id()
        )
        OR get_current_user_role() IN ('admin', 'researcher')
    );
CREATE POLICY "irrigation_insert" ON irrigation_schedule FOR INSERT
    WITH CHECK (
        season_id IN (
            SELECT s.id FROM seasons s JOIN land_parcels lp ON s.parcel_id = lp.id
            WHERE lp.farmer_id = get_current_farmer_id()
        )
        OR get_current_user_role() = 'admin'
    );
CREATE POLICY "irrigation_update" ON irrigation_schedule FOR UPDATE
    USING (
        season_id IN (
            SELECT s.id FROM seasons s JOIN land_parcels lp ON s.parcel_id = lp.id
            WHERE lp.farmer_id = get_current_farmer_id()
        )
        OR get_current_user_role() = 'admin'
    );

-- ---- FERTILIZER RECOMMENDATIONS ----
CREATE POLICY "fertilizer_select" ON fertilizer_recommendations FOR SELECT
    USING (
        season_id IN (
            SELECT s.id FROM seasons s JOIN land_parcels lp ON s.parcel_id = lp.id
            WHERE lp.farmer_id = get_current_farmer_id()
        )
        OR get_current_user_role() IN ('admin', 'researcher')
    );
CREATE POLICY "fertilizer_insert" ON fertilizer_recommendations FOR INSERT
    WITH CHECK (
        season_id IN (
            SELECT s.id FROM seasons s JOIN land_parcels lp ON s.parcel_id = lp.id
            WHERE lp.farmer_id = get_current_farmer_id()
        )
        OR get_current_user_role() = 'admin'
    );
CREATE POLICY "fertilizer_update" ON fertilizer_recommendations FOR UPDATE
    USING (
        season_id IN (
            SELECT s.id FROM seasons s JOIN land_parcels lp ON s.parcel_id = lp.id
            WHERE lp.farmer_id = get_current_farmer_id()
        )
        OR get_current_user_role() = 'admin'
    );

-- ---- MARKET PRICES (everyone reads, admin writes) ----
CREATE POLICY "market_prices_select" ON market_prices FOR SELECT
    USING (true);
CREATE POLICY "market_prices_insert" ON market_prices FOR INSERT
    WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "market_prices_update" ON market_prices FOR UPDATE
    USING (get_current_user_role() = 'admin');

-- ---- CROP DEMAND FORECAST (everyone reads, admin writes) ----
CREATE POLICY "demand_forecast_select" ON crop_demand_forecast FOR SELECT
    USING (true);
CREATE POLICY "demand_forecast_insert" ON crop_demand_forecast FOR INSERT
    WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "demand_forecast_update" ON crop_demand_forecast FOR UPDATE
    USING (get_current_user_role() = 'admin');

-- ---- ALTERNATIVE CROP ALERTS ----
CREATE POLICY "alt_alerts_select" ON alternative_crop_alerts FOR SELECT
    USING (
        target_farmer_ids IS NOT NULL AND auth.uid() = ANY(target_farmer_ids)
        OR get_current_user_role() IN ('admin', 'researcher')
    );
CREATE POLICY "alt_alerts_manage" ON alternative_crop_alerts FOR INSERT
    WITH CHECK (get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "alt_alerts_update" ON alternative_crop_alerts FOR UPDATE
    USING (get_current_user_role() IN ('admin', 'researcher'));

-- ---- WEATHER FORECASTS (everyone reads, admin writes) ----
CREATE POLICY "weather_select" ON weather_forecasts FOR SELECT
    USING (true);
CREATE POLICY "weather_insert" ON weather_forecasts FOR INSERT
    WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "weather_update" ON weather_forecasts FOR UPDATE
    USING (get_current_user_role() = 'admin');

-- ---- DISASTER BROADCASTS (everyone reads, admin/researcher writes) ----
CREATE POLICY "disaster_select" ON disaster_broadcasts FOR SELECT
    USING (true);
CREATE POLICY "disaster_insert" ON disaster_broadcasts FOR INSERT
    WITH CHECK (get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "disaster_update" ON disaster_broadcasts FOR UPDATE
    USING (get_current_user_role() IN ('admin', 'researcher'));

-- ---- CLIMATE THREATS (everyone reads, admin/researcher writes) ----
CREATE POLICY "threats_select" ON climate_threats FOR SELECT
    USING (true);
CREATE POLICY "threats_insert" ON climate_threats FOR INSERT
    WITH CHECK (get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "threats_update" ON climate_threats FOR UPDATE
    USING (get_current_user_role() IN ('admin', 'researcher'));

-- ---- BUYER PROFILES (everyone reads, own profile writes) ----
CREATE POLICY "buyer_select" ON buyer_profiles FOR SELECT
    USING (true);
CREATE POLICY "buyer_insert" ON buyer_profiles FOR INSERT
    WITH CHECK (profile_id = auth.uid());
CREATE POLICY "buyer_update" ON buyer_profiles FOR UPDATE
    USING (profile_id = auth.uid() OR get_current_user_role() = 'admin');

-- ---- MARKETPLACE LISTINGS (public reads, farmer owns) ----
CREATE POLICY "listings_select" ON marketplace_listings FOR SELECT
    USING (true);
CREATE POLICY "listings_insert" ON marketplace_listings FOR INSERT
    WITH CHECK (farmer_id = get_current_farmer_id());
CREATE POLICY "listings_update" ON marketplace_listings FOR UPDATE
    USING (farmer_id = get_current_farmer_id() OR get_current_user_role() = 'admin');
CREATE POLICY "listings_delete" ON marketplace_listings FOR DELETE
    USING (farmer_id = get_current_farmer_id() OR get_current_user_role() = 'admin');

-- ---- TRANSACTIONS ----
CREATE POLICY "transactions_select" ON transactions FOR SELECT
    USING (
        listing_id IN (SELECT id FROM marketplace_listings WHERE farmer_id = get_current_farmer_id())
        OR buyer_id IN (SELECT id FROM buyer_profiles WHERE profile_id = auth.uid())
        OR get_current_user_role() = 'admin'
    );
CREATE POLICY "transactions_insert" ON transactions FOR INSERT
    WITH CHECK (buyer_id IN (SELECT id FROM buyer_profiles WHERE profile_id = auth.uid()));

-- ---- EDGE NODES (everyone reads, admin writes) ----
CREATE POLICY "edge_nodes_select" ON edge_nodes FOR SELECT
    USING (true);
CREATE POLICY "edge_nodes_insert" ON edge_nodes FOR INSERT
    WITH CHECK (get_current_user_role() = 'admin');
CREATE POLICY "edge_nodes_update" ON edge_nodes FOR UPDATE
    USING (get_current_user_role() = 'admin');

-- ---- TELEMETRY SYNC LOG (admin/researcher reads, anyone inserts for edge sync) ----
CREATE POLICY "sync_log_select" ON telemetry_sync_log FOR SELECT
    USING (get_current_user_role() IN ('admin', 'researcher'));
CREATE POLICY "sync_log_insert" ON telemetry_sync_log FOR INSERT
    WITH CHECK (true);

-- ---- CROP TELEMETRY (everyone reads, anyone inserts for edge sync) ----
CREATE POLICY "telemetry_select" ON crop_telemetry FOR SELECT
    USING (true);
CREATE POLICY "telemetry_insert" ON crop_telemetry FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- DATABASE FUNCTIONS (AI-adjacent logic)
-- ============================================================================

-- 1. Crop Rotation Suggestion
-- Analyzes the last crop grown on a parcel and suggests the next optimal crop
CREATE OR REPLACE FUNCTION suggest_crop_rotation(p_parcel_id UUID)
RETURNS TABLE (
    suggested_crop TEXT,
    reasoning TEXT,
    expected_soil_benefit TEXT
) AS $$
DECLARE
    v_last_crop TEXT;
    v_soil_impact TEXT;
    v_nitrogen_ppm DECIMAL;
BEGIN
    -- Get the most recent crop grown on this parcel
    SELECT crop_type, soil_impact INTO v_last_crop, v_soil_impact
    FROM crop_rotation_history
    WHERE parcel_id = p_parcel_id
    ORDER BY harvested_date DESC NULLS LAST, created_at DESC
    LIMIT 1;

    -- Get current soil nitrogen levels
    SELECT nitrogen_ppm INTO v_nitrogen_ppm
    FROM land_parcels WHERE id = p_parcel_id;

    -- Decision logic
    IF v_last_crop IS NULL THEN
        -- No history — suggest wheat as default staple
        RETURN QUERY SELECT 'Wheat'::TEXT,
            'No prior crop history. Starting with staple cereal.'::TEXT,
            'Baseline cereal rotation.'::TEXT;
    ELSIF v_soil_impact = 'nitrogen_depleting' OR v_nitrogen_ppm < 30 THEN
        -- After heavy feeders (corn, wheat) or low nitrogen → plant legumes
        RETURN QUERY SELECT 'Lentil (Masoor)'::TEXT,
            format('Previous crop "%s" depleted soil nitrogen (%.0f ppm). Legumes will fix nitrogen naturally.', v_last_crop, COALESCE(v_nitrogen_ppm, 0))::TEXT,
            'Expected +20-30 kg/ha nitrogen fixation for next season.'::TEXT;
    ELSIF v_soil_impact = 'nitrogen_fixing' THEN
        -- After legumes → plant a cereal to leverage the nitrogen
        RETURN QUERY SELECT 'Wheat'::TEXT,
            format('Previous legume crop enriched soil. Ideal conditions for high-yield wheat.')::TEXT,
            'Leveraging residual nitrogen for cereal yield boost.'::TEXT;
    ELSE
        -- Default: suggest cotton or rice based on season
        RETURN QUERY SELECT 'Cotton'::TEXT,
            format('After %s, cotton is a suitable rotation to break pest cycles.', v_last_crop)::TEXT,
            'Pest cycle disruption and diversification.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. National Surplus Detection
-- Checks if a crop is approaching oversupply based on planted area forecasts
CREATE OR REPLACE FUNCTION detect_crop_surplus(p_crop_type TEXT, p_season TEXT)
RETURNS TABLE (
    is_surplus BOOLEAN,
    total_predicted_tonnes DECIMAL,
    national_demand_tonnes DECIMAL,
    surplus_pct DECIMAL,
    recommendation TEXT
) AS $$
DECLARE
    v_predicted DECIMAL;
    v_demand DECIMAL;
    v_surplus_pct DECIMAL;
BEGIN
    SELECT total_predicted_yield_tonnes, national_demand_tonnes
    INTO v_predicted, v_demand
    FROM crop_demand_forecast
    WHERE crop_type = p_crop_type AND forecast_season = p_season
    ORDER BY generated_at DESC LIMIT 1;

    IF v_predicted IS NULL OR v_demand IS NULL OR v_demand = 0 THEN
        RETURN QUERY SELECT false, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
            'Insufficient data for surplus analysis.'::TEXT;
        RETURN;
    END IF;

    v_surplus_pct := ((v_predicted - v_demand) / v_demand) * 100;

    IF v_surplus_pct > 10 THEN
        RETURN QUERY SELECT true, v_predicted, v_demand, v_surplus_pct,
            format('CRITICAL: %.1f%% surplus projected. Recommend redirecting farmers to alternative crops.', v_surplus_pct)::TEXT;
    ELSIF v_surplus_pct > 0 THEN
        RETURN QUERY SELECT false, v_predicted, v_demand, v_surplus_pct,
            format('Mild surplus of %.1f%%. Monitor closely as harvest approaches.', v_surplus_pct)::TEXT;
    ELSE
        RETURN QUERY SELECT false, v_predicted, v_demand, v_surplus_pct,
            format('Demand exceeds supply by %.1f%%. Market conditions favorable.', ABS(v_surplus_pct))::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Cheapest Fertilizer Brand Lookup
-- Given a product type and district, returns the cheapest available brand
CREATE OR REPLACE FUNCTION find_cheapest_fertilizer(p_product_type TEXT, p_district TEXT)
RETURNS TABLE (
    brand_name TEXT,
    price_pkr DECIMAL,
    supplier_name TEXT,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT mp.brand_name, mp.price_pkr, mp.supplier_name, mp.is_available
    FROM market_prices mp
    WHERE mp.product_type = p_product_type
      AND mp.district = p_district
      AND mp.is_available = true
    ORDER BY mp.price_pkr ASC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Rain-Based Irrigation Alert
-- Checks if heavy rain is predicted within 48 hours for a region
CREATE OR REPLACE FUNCTION check_rain_irrigation_alert(p_region TEXT)
RETURNS TABLE (
    should_cancel_irrigation BOOLEAN,
    predicted_rainfall_mm DECIMAL,
    forecast_date DATE,
    alert_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (wf.rainfall_predicted_mm > 15),  -- cancel if >15mm expected
        wf.rainfall_predicted_mm,
        wf.forecast_date,
        format(
            'HEAVY RAIN ALERT: %.1fmm rainfall predicted on %s for %s. Cancel scheduled irrigation to prevent root rot and save fuel costs.',
            wf.rainfall_predicted_mm, wf.forecast_date, p_region
        )::TEXT
    FROM weather_forecasts wf
    WHERE wf.region = p_region
      AND wf.forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
      AND wf.rainfall_predicted_mm > 10
    ORDER BY wf.forecast_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Dashboard Stats Aggregation
-- Returns key metrics for the admin command center
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
    total_farmers BIGINT,
    active_seasons BIGINT,
    total_scans_today BIGINT,
    disease_detection_rate DECIMAL,
    active_edge_nodes BIGINT,
    active_threats BIGINT,
    marketplace_active_listings BIGINT,
    national_health_index DECIMAL
) AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT COUNT(*) FROM farmers WHERE is_active = true),
        (SELECT COUNT(*) FROM seasons WHERE status = 'active'),
        (SELECT COUNT(*) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE),
        CASE
            WHEN (SELECT COUNT(*) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE) > 0
            THEN ROUND(
                (SELECT COUNT(*) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE AND health_status != 'Healthy')::DECIMAL
                / (SELECT NULLIF(COUNT(*), 0) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE)::DECIMAL
                * 100, 1
            )
            ELSE 0
        END,
        (SELECT COUNT(*) FROM edge_nodes WHERE status = 'online'),
        (SELECT COUNT(*) FROM climate_threats WHERE is_active = true),
        (SELECT COUNT(*) FROM marketplace_listings WHERE status = 'active'),
        CASE
            WHEN (SELECT COUNT(*) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE) > 0
            THEN ROUND(
                100.0 - (
                    (SELECT COUNT(*) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE AND health_status != 'Healthy')::DECIMAL
                    / (SELECT NULLIF(COUNT(*), 0) FROM crop_telemetry WHERE recorded_at >= CURRENT_DATE)::DECIMAL
                    * 100
                ), 1
            )
            ELSE 100.0
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Regional Telemetry Summary
-- Aggregates telemetry data per region for the dashboard grid
CREATE OR REPLACE FUNCTION get_regional_telemetry()
RETURNS TABLE (
    region TEXT,
    total_scans BIGINT,
    disease_count BIGINT,
    dominant_crop TEXT,
    dominant_disease TEXT,
    avg_confidence DECIMAL,
    active_farmers BIGINT,
    risk_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.region,
        COUNT(*) AS total_scans,
        COUNT(*) FILTER (WHERE ct.health_status != 'Healthy') AS disease_count,
        MODE() WITHIN GROUP (ORDER BY ct.crop_type) AS dominant_crop,
        MODE() WITHIN GROUP (ORDER BY ct.health_status) FILTER (WHERE ct.health_status != 'Healthy') AS dominant_disease,
        ROUND(AVG(ct.confidence)::NUMERIC, 3) AS avg_confidence,
        COUNT(DISTINCT ct.farmer_id) AS active_farmers,
        CASE
            WHEN COUNT(*) FILTER (WHERE ct.health_status != 'Healthy')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0) > 0.4 THEN 'High'
            WHEN COUNT(*) FILTER (WHERE ct.health_status != 'Healthy')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0) > 0.15 THEN 'Medium'
            ELSE 'Low'
        END AS risk_level
    FROM crop_telemetry ct
    WHERE ct.recorded_at >= NOW() - INTERVAL '24 hours'
      AND ct.region IS NOT NULL
    GROUP BY ct.region;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. Increment Edge Node Scan Count
-- Atomically increments the total_scans_processed counter for an edge node
CREATE OR REPLACE FUNCTION increment_node_scans(p_node_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    UPDATE edge_nodes
    SET total_scans_processed = total_scans_processed + 1
    WHERE id = p_node_id
    RETURNING total_scans_processed INTO v_new_count;

    RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS (auto-update timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_farmers_updated BEFORE UPDATE ON farmers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_land_parcels_updated BEFORE UPDATE ON land_parcels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_seasons_updated BEFORE UPDATE ON seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_market_prices_updated BEFORE UPDATE ON market_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crop_demand_updated BEFORE UPDATE ON crop_demand_forecast
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON marketplace_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_edge_nodes_updated BEFORE UPDATE ON edge_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_irrigation_updated BEFORE UPDATE ON irrigation_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SEED DATA (for development & demo)
-- ============================================================================

-- Edge Nodes
INSERT INTO edge_nodes (node_code, region, firmware_version, status, total_scans_processed) VALUES
    ('MULTAN-104', 'Multan', '1.2.0', 'online', 14523),
    ('FSDB-089', 'Faisalabad', '1.2.0', 'online', 12891),
    ('SUKKUR-210', 'Sukkur', '1.1.8', 'online', 8734),
    ('PSHW-055', 'Peshawar', '1.2.0', 'online', 10221),
    ('DGKHAN-033', 'Dera Ghazi Khan', '1.1.8', 'maintenance', 5412),
    ('SAHIWAL-077', 'Sahiwal', '1.2.0', 'online', 9103);

-- Market Prices
INSERT INTO market_prices (product_type, brand_name, district, price_pkr, supplier_name) VALUES
    ('urea', 'Fatima Urea', 'Multan', 4500, 'Fatima Fertilizer'),
    ('urea', 'Engro Urea', 'Multan', 4650, 'Engro Corp'),
    ('urea', 'FFC Urea', 'Faisalabad', 4400, 'Fauji Fertilizer'),
    ('urea', 'Sarsabz Urea', 'Sukkur', 4350, 'Sarsabz Fertilizer'),
    ('dap', 'Fatima DAP', 'Multan', 12500, 'Fatima Fertilizer'),
    ('dap', 'Indus DAP', 'Faisalabad', 12200, 'Indus Fertilizer'),
    ('seed_wheat', 'Punjab-2020', 'Multan', 3200, 'Punjab Seed Corp'),
    ('seed_wheat', 'NIAB-111', 'Faisalabad', 3400, 'NIAB'),
    ('seed_cotton', 'NIAB-786', 'Faisalabad', 5500, 'NIAB'),
    ('seed_maize', 'Pioneer-3232', 'Peshawar', 6800, 'Pioneer Seeds');

-- Weather Forecasts (next 3 days)
INSERT INTO weather_forecasts (region, forecast_date, temp_high_c, temp_low_c, humidity_pct, rainfall_predicted_mm, wind_speed_kmh, condition, source) VALUES
    ('Multan', CURRENT_DATE, 38, 24, 45, 0, 12, 'clear', 'PMD'),
    ('Multan', CURRENT_DATE + 1, 36, 23, 50, 2, 15, 'cloudy', 'PMD'),
    ('Multan', CURRENT_DATE + 2, 34, 22, 65, 18, 20, 'rain', 'PMD'),
    ('Faisalabad', CURRENT_DATE, 35, 22, 55, 0, 10, 'clear', 'PMD'),
    ('Faisalabad', CURRENT_DATE + 1, 34, 21, 58, 5, 12, 'cloudy', 'PMD'),
    ('Faisalabad', CURRENT_DATE + 2, 33, 20, 60, 8, 14, 'cloudy', 'PMD'),
    ('Sukkur', CURRENT_DATE, 40, 27, 35, 0, 8, 'clear', 'PMD'),
    ('Sukkur', CURRENT_DATE + 1, 39, 26, 38, 0, 10, 'clear', 'PMD'),
    ('Peshawar', CURRENT_DATE, 32, 20, 60, 5, 14, 'cloudy', 'PMD'),
    ('Peshawar', CURRENT_DATE + 1, 30, 19, 70, 22, 18, 'rain', 'PMD');

-- Climate Threats
INSERT INTO climate_threats (region, threat_type, severity, description) VALUES
    ('Multan', 'heatwave', 'high', 'Temperatures exceeding 42°C expected in southern Punjab. Heat stress on wheat crops imminent.'),
    ('Faisalabad', 'pest_migration', 'medium', 'Whitefly populations increasing in cotton belt. Monitor fields weekly.'),
    ('Sukkur', 'drought', 'low', 'Below-average monsoon rainfall predicted. Prepare water conservation measures.');

-- Crop Demand Forecast
INSERT INTO crop_demand_forecast (crop_type, forecast_season, total_predicted_yield_tonnes, national_demand_tonnes, status) VALUES
    ('Wheat', 'Rabi 2026', 28500000, 25000000, 'projected'),
    ('Cotton', 'Kharif 2026', 8200000, 9500000, 'projected'),
    ('Maize', 'Kharif 2026', 7100000, 6800000, 'projected'),
    ('Sugarcane', 'Kharif 2026', 67000000, 65000000, 'projected');

-- Disaster Broadcasts (sample)
INSERT INTO disaster_broadcasts (broadcast_type, title, message, target_regions, severity, action_required) VALUES
    ('extreme_weather', 'Heatwave Alert — Southern Punjab',
     'Extreme temperatures above 42°C forecasted for Multan and DG Khan divisions. Wheat crops in grain-filling stage are at risk. Apply light irrigation during early morning hours only. Avoid midday watering.',
     ARRAY['Multan', 'Dera Ghazi Khan'], 'critical',
     '1. Apply light morning irrigation only. 2. Avoid midday watering. 3. Monitor for heat stress symptoms (leaf curling, premature drying).'),
    ('pest_outbreak', 'Whitefly Alert — Cotton Belt',
     'Whitefly populations surging in Faisalabad cotton zones. Leaf Curl Virus transmission risk is HIGH.',
     ARRAY['Faisalabad', 'Multan'], 'high',
     '1. Install yellow sticky traps (5 per acre). 2. Apply Imidacloprid if threshold exceeds 5 whiteflies/leaf. 3. Remove weed hosts from field borders.');

-- ============================================================================
-- REALTIME CHANNELS (Supabase Realtime)
-- Enable realtime on key tables for live dashboard updates
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE crop_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE disaster_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE climate_threats;
ALTER PUBLICATION supabase_realtime ADD TABLE edge_nodes;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
