-- PLZ-Zonen-Zuordnung nur für unsere Kunden-Standorte
-- Optimierte Version mit nur den benötigten Einträgen

-- Lösche eventuell vorhandene Tabelle
DROP TABLE IF EXISTS hut_postal_zones CASCADE;

-- Erstelle PLZ-Zonen-Zuordnungstabelle
CREATE TABLE IF NOT EXISTS hut_postal_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    postal_code VARCHAR(10) NOT NULL,
    zone_code VARCHAR(10) NOT NULL,
    country_code VARCHAR(2) DEFAULT 'DE',
    city_name VARCHAR(100),
    special_note VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postal_code, city_name, country_code)
);

-- Index für schnelle Suche
CREATE INDEX idx_hut_postal_zones_lookup ON hut_postal_zones(postal_code, country_code);
CREATE INDEX idx_hut_postal_zones_city ON hut_postal_zones(city_name);

-- Füge nur die PLZ-Zonen für unsere Kunden-Standorte ein
INSERT INTO hut_postal_zones (postal_code, city_name, zone_code, special_note) VALUES
-- Zone 1 - Stuttgart Flughafen (für Direktlieferungen)
('70629', 'Stuttgart-Flughafen', 'ZONE01', NULL),

-- Zone 2 - Benningen (Spiller)
('71726', 'Benningen', 'ZONE02', NULL),

-- Zone 3 - Unsere Hauptstandorte
('71563', 'Affalterbach', 'ZONE03', NULL),        -- Mercedes-AMG
('71672', 'Marbach/Neckar', 'ZONE03', NULL),      -- Spiller
('71711', 'Steinheim/Murr', 'ZONE03', NULL);      -- Spiller

-- Optional: Weitere wichtige Orte in der Region für zukünftige Kunden
INSERT INTO hut_postal_zones (postal_code, city_name, zone_code, special_note) VALUES
-- Zone 1 - Stuttgart und nahe Umgebung
('70173', 'Stuttgart-Mitte', 'ZONE02', NULL),
('70372', 'Stuttgart-Bad Cannstatt', 'ZONE02', NULL),
('70771', 'Leinfelden-Echterdingen', 'ZONE01', NULL),

-- Zone 2 - Mittlere Entfernung
('71640', 'Ludwigsburg', 'ZONE02', NULL),
('71332', 'Waiblingen', 'ZONE02', NULL),
('74321', 'Bietigheim-Bissingen', 'ZONE03', NULL),

-- Zone 3 - Weitere Entfernung
('71522', 'Backnang', 'ZONE03', NULL),
('74385', 'Pleidelsheim', 'ZONE03', NULL),
('71686', 'Remseck', 'ZONE03', NULL);

-- Kommentar zur Verwendung
COMMENT ON TABLE hut_postal_zones IS 'HuT PLZ-Zonen Zuordnung - Optimiert für aktuelle Kundenstandorte. Nur Zone 1-3 werden verwendet.';