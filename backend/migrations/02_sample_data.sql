-- Beispieldaten für das Tarifkalkulations-System

-- Kunden
INSERT INTO customers (company_name, customer_number, emails, phones) VALUES 
('Mercedes-AMG GmbH', 'K-2025-001', '["logistics@mercedes-amg.com", "export@mercedes-amg.com"]', '["07144-302-0", "07144-302-100"]'),
('Spiller GmbH', 'K-2025-002', '["versand@spiller.de"]', '["07144-123-0"]'),
('Delphex GmbH', 'K-2025-003', '["logistics@delphex.com"]', '["06163-123-0"]');

-- Adressen für Mercedes-AMG (Affalterbach)
INSERT INTO pickup_addresses (customer_id, street, zip, city, country, is_primary) 
SELECT id, 'Daimlerstraße 1', '71563', 'Affalterbach', 'DE', true 
FROM customers WHERE company_name = 'Mercedes-AMG GmbH';

INSERT INTO pickup_addresses (customer_id, street, zip, city, country, is_primary) 
SELECT id, 'Siemensstraße 10', '71563', 'Affalterbach', 'DE', false 
FROM customers WHERE company_name = 'Mercedes-AMG GmbH';

-- Adressen für Spiller (verschiedene Standorte)
INSERT INTO pickup_addresses (customer_id, street, zip, city, country, is_primary) 
SELECT id, 'Industriestraße 5', '71672', 'Marbach', 'DE', true 
FROM customers WHERE company_name = 'Spiller GmbH';

INSERT INTO pickup_addresses (customer_id, street, zip, city, country, is_primary) 
SELECT id, 'Hauptstraße 20', '71711', 'Steinheim an der Murr', 'DE', false 
FROM customers WHERE company_name = 'Spiller GmbH';

INSERT INTO pickup_addresses (customer_id, street, zip, city, country, is_primary) 
SELECT id, 'Neckarstraße 15', '71726', 'Benningen', 'DE', false 
FROM customers WHERE company_name = 'Spiller GmbH';

-- Adresse für Delphex (Breuberg)
INSERT INTO pickup_addresses (customer_id, street, zip, city, country, is_primary) 
SELECT id, 'Gewerbegebiet Nord 10', '64747', 'Breuberg', 'DE', true 
FROM customers WHERE company_name = 'Delphex GmbH';

-- Abholzeiten für Mercedes-AMG Hauptadresse
INSERT INTO pickup_times (address_id, day_of_week, time_from, time_to)
SELECT id, day, '08:00', '17:00'
FROM pickup_addresses 
CROSS JOIN generate_series(1, 5) AS day
WHERE street = 'Daimlerstraße 1' AND zip = '71563';

-- Abholzeiten für Spiller Marbach (Mo-Fr unterschiedlich)
INSERT INTO pickup_times (address_id, day_of_week, time_from, time_to)
SELECT id, 1, '07:00', '15:00' FROM pickup_addresses WHERE street = 'Industriestraße 5' AND zip = '71672'
UNION ALL
SELECT id, 2, '07:00', '16:00' FROM pickup_addresses WHERE street = 'Industriestraße 5' AND zip = '71672'
UNION ALL
SELECT id, 3, '07:00', '16:00' FROM pickup_addresses WHERE street = 'Industriestraße 5' AND zip = '71672'
UNION ALL
SELECT id, 4, '07:00', '16:00' FROM pickup_addresses WHERE street = 'Industriestraße 5' AND zip = '71672'
UNION ALL
SELECT id, 5, '07:00', '14:00' FROM pickup_addresses WHERE street = 'Industriestraße 5' AND zip = '71672';

-- Partner/Carrier
INSERT INTO partners (name, type, customer_id, is_active) VALUES 
('HuT', 'sammelgut', NULL, true),
('BT Blue Transport UG', 'sammelgut', NULL, true),
('Böpple Automotive GmbH', 'fahrzeugtransport', NULL, true);

-- Beispiel-Tarife für HuT (Stuttgart Zone 1)
INSERT INTO partner_base_rates 
(partner_id, airport_code, zone_code, weight_from, weight_to, base_price, xray_base, xray_per_unit, xray_unit_type, xray_included_units)
SELECT 
    id, 'STR', 'ZONE01', 0, 30, 14.32, 30.00, 6.00, 'per_piece', 5
FROM partners WHERE name = 'HuT'
UNION ALL
SELECT 
    id, 'STR', 'ZONE01', 30.01, 40, 17.32, 30.00, 6.00, 'per_piece', 5
FROM partners WHERE name = 'HuT'
UNION ALL
SELECT 
    id, 'STR', 'ZONE01', 40.01, 50, 18.80, 30.00, 6.00, 'per_piece', 5
FROM partners WHERE name = 'HuT';

-- Beispiel-Tarife für BT Blue (Frankfurt Zone 1)
INSERT INTO partner_base_rates 
(partner_id, airport_code, zone_code, weight_from, weight_to, base_price, xray_base, xray_per_unit, xray_unit_type)
SELECT 
    id, 'FRA', 'ZONE01', 0, 100, 55.00, 30.00, 0.08, 'per_kg'
FROM partners WHERE name = 'BT Blue Transport UG'
UNION ALL
SELECT 
    id, 'FRA', 'ZONE01', 100.01, 200, 82.50, 30.00, 0.08, 'per_kg'
FROM partners WHERE name = 'BT Blue Transport UG';

-- Beispiel-Fahrzeugtarife für Böpple
INSERT INTO vehicle_transport_rates 
(partner_id, from_location, to_location, vehicle_count_from, vehicle_count_to, vehicle_category, base_price)
SELECT 
    id, 'Affalterbach', 'Stuttgart', 1, 1, 'pkw_normal', 215.00
FROM partners WHERE name = 'Böpple Automotive GmbH'
UNION ALL
SELECT 
    id, 'Affalterbach', 'Stuttgart', 1, 1, 'kombi', 225.00
FROM partners WHERE name = 'Böpple Automotive GmbH'
UNION ALL
SELECT 
    id, 'Affalterbach', 'Frankfurt', 1, 1, 'pkw_normal', 550.00
FROM partners WHERE name = 'Böpple Automotive GmbH';

-- Beispiel PLZ-Zonen für HuT
INSERT INTO hut_postal_zones (postal_code, city_name, zone_code, special_note) VALUES
('71563', 'Affalterbach', 'ZONE03', NULL),
('71672', 'Marbach/Neckar', 'ZONE03', NULL),
('71726', 'Benningen', 'ZONE02', NULL),
('71711', 'Steinheim/Murr', 'ZONE03', NULL),
('70629', 'Stuttgart-Flughafen', 'ZONE01', NULL),
('64747', 'Breuberg', 'ZONE14', '+€35,00');