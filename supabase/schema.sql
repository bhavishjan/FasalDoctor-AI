CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE farmers_registry (
    farmer_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    location_region TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE crop_telemetry (
    telemetry_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_uuid UUID REFERENCES farmers_registry(farmer_uuid) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    health_status TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE market_economics (
    market_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_type TEXT NOT NULL,
    current_price DECIMAL(10, 2) CHECK (current_price >= 0),
    region TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE climate_threats (
    threat_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region TEXT NOT NULL,
    threat_type TEXT NOT NULL,
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_crop_telemetry_farmer_uuid ON crop_telemetry(farmer_uuid);
CREATE INDEX idx_crop_telemetry_recorded_at ON crop_telemetry(recorded_at DESC);
CREATE INDEX idx_market_economics_crop_region ON market_economics(crop_type, region);
CREATE INDEX idx_climate_threats_region_time ON climate_threats(region, detected_at DESC);

-- Row Level Security
ALTER TABLE farmers_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE climate_threats ENABLE ROW LEVEL SECURITY;
