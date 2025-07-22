-- Haupttabellen für das Tarifkalkulations-System

-- Kunden-Tabelle
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    customer_number TEXT UNIQUE,
    emails TEXT NOT NULL,   -- JSON-Array als Text, z.B. '["a@b.de","b@b.de"]'
    phones TEXT,            -- JSON-Array als Text, z.B. '["0123","0456"]'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adressen-Tabelle (jede Adresse gehört zu einem Kunden)
CREATE TABLE IF NOT EXISTS pickup_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL,
    street TEXT NOT NULL,
    zip TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'DE',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Abholzeiten-Tabelle (jede Zeit gehört zu einer Adresse)
CREATE TABLE IF NOT EXISTS pickup_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL, -- 1=Montag, 7=Sonntag
    time_from TEXT NOT NULL,      -- Format 'HH:MM'
    time_to TEXT NOT NULL,        -- Format 'HH:MM'
    FOREIGN KEY (address_id) REFERENCES pickup_addresses(id) ON DELETE CASCADE
);

-- Partner/Carrier-Tabelle
CREATE TABLE IF NOT EXISTS partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'sammelgut', 'fahrzeugtransport', etc.
    customer_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Basis-Tarife der Partner
CREATE TABLE IF NOT EXISTS partner_base_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL,
    airport_code TEXT,
    zone_code TEXT,
    weight_from DECIMAL(10,2),
    weight_to DECIMAL(10,2),
    base_price DECIMAL(10,2) NOT NULL,
    -- X-Ray Gebühren
    xray_base DECIMAL(10,2),
    xray_per_unit DECIMAL(10,2),
    xray_unit_type TEXT, -- 'per_piece', 'per_kg', etc.
    xray_included_units INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- Fahrzeugtransport-spezifische Tarife (für Böpple)
CREATE TABLE IF NOT EXISTS vehicle_transport_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    vehicle_count_from INTEGER NOT NULL,
    vehicle_count_to INTEGER NOT NULL,
    vehicle_category TEXT NOT NULL, -- 'pkw_normal', 'kombi', 'suv', etc.
    base_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- HuT Postleitzahlen-Zonen Zuordnung
CREATE TABLE IF NOT EXISTS hut_postal_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    postal_code VARCHAR(10) NOT NULL,
    zone_code VARCHAR(10) NOT NULL,
    country_code VARCHAR(2) DEFAULT 'DE',
    city_name VARCHAR(100),
    special_note VARCHAR(50), -- für Zusatzkosten wie '+€25,00'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postal_code, city_name, country_code)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_pickup_addresses_customer_id ON pickup_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickup_times_address_id ON pickup_times(address_id);
CREATE INDEX IF NOT EXISTS idx_partners_customer_id ON partners(customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_base_rates_partner_id ON partner_base_rates(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_base_rates_lookup ON partner_base_rates(partner_id, airport_code, zone_code, weight_from, weight_to);
CREATE INDEX IF NOT EXISTS idx_vehicle_transport_rates_lookup ON vehicle_transport_rates(partner_id, from_location, to_location);
CREATE INDEX IF NOT EXISTS idx_hut_postal_zones_lookup ON hut_postal_zones(postal_code, country_code);
CREATE INDEX IF NOT EXISTS idx_hut_postal_zones_city ON hut_postal_zones(city_name);