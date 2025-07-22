-- Komplette Böpple Automotive Fahrzeugtransport-Tarife
-- Alle Transporte gehen VON Affalterbach (71563) zu verschiedenen Zielen

-- Lösche alte Böpple Tarife
DELETE FROM partner_base_rates 
WHERE partner_id = (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH');

-- Verwende kurze Zone-Codes für die 20-Zeichen-Begrenzung
-- Format: F[Anzahl]_[Kategorie] z.B. F1_PKW, F2_KMB, F34_SUV, F56_GRD

-- Stuttgart (70629) - Nahbereich
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'STR',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    -- 1 Fahrzeug
    (1, 'PKW', 215.00),
    (1, 'KMB', 225.00),
    (1, 'SUV', 235.00),
    (1, 'SGL', 255.00),
    (1, 'GRD', 335.00),
    -- 2 Fahrzeuge
    (2, 'PKW', 320.00),
    (2, 'KMB', 340.00),
    (2, 'SUV', 360.00),
    (2, 'SGL', 400.00),
    (2, 'GRD', 520.00),
    -- 3-4 Fahrzeuge
    (3.5, 'PKW', 480.00),
    (3.5, 'KMB', 510.00),
    (3.5, 'SUV', 540.00),
    (3.5, 'SGL', 600.00),
    (3.5, 'GRD', 780.00),
    -- 5-6 Fahrzeuge
    (5.5, 'PKW', 620.00),
    (5.5, 'KMB', 660.00),
    (5.5, 'SUV', 700.00),
    (5.5, 'SGL', 780.00),
    (5.5, 'GRD', 1014.00)
) AS t(vehicle_count, category, price);

-- Frankfurt (FRA) - Fernbereich
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'FRA',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 550.00),
    (1, 'KMB', 575.00),
    (1, 'SUV', 600.00),
    (1, 'SGL', 650.00),
    (1, 'GRD', 845.00),
    (2, 'PKW', 825.00),
    (2, 'KMB', 865.00),
    (2, 'SUV', 905.00),
    (2, 'SGL', 985.00),
    (2, 'GRD', 1280.00),
    (3.5, 'PKW', 1150.00),
    (3.5, 'KMB', 1220.00),
    (3.5, 'SUV', 1290.00),
    (3.5, 'SGL', 1430.00),
    (3.5, 'GRD', 1860.00),
    (5.5, 'PKW', 1475.00),
    (5.5, 'KMB', 1570.00),
    (5.5, 'SUV', 1665.00),
    (5.5, 'SGL', 1855.00),
    (5.5, 'GRD', 2410.00)
) AS t(vehicle_count, category, price);

-- Frankfurt-Hahn (HHN)
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'HHN',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 620.00),
    (1, 'KMB', 650.00),
    (1, 'SUV', 680.00),
    (1, 'SGL', 740.00),
    (1, 'GRD', 960.00),
    (2, 'PKW', 930.00),
    (2, 'KMB', 975.00),
    (2, 'SUV', 1020.00),
    (2, 'SGL', 1110.00),
    (2, 'GRD', 1445.00),
    (3.5, 'PKW', 1300.00),
    (3.5, 'KMB', 1380.00),
    (3.5, 'SUV', 1460.00),
    (3.5, 'SGL', 1620.00),
    (3.5, 'GRD', 2105.00),
    (5.5, 'PKW', 1670.00),
    (5.5, 'KMB', 1775.00),
    (5.5, 'SUV', 1880.00),
    (5.5, 'SGL', 2095.00),
    (5.5, 'GRD', 2725.00)
) AS t(vehicle_count, category, price);

-- Köln/Bonn (CGN)
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'CGN',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 720.00),
    (1, 'KMB', 755.00),
    (1, 'SUV', 790.00),
    (1, 'SGL', 860.00),
    (1, 'GRD', 1120.00),
    (2, 'PKW', 1080.00),
    (2, 'KMB', 1135.00),
    (2, 'SUV', 1190.00),
    (2, 'SGL', 1300.00),
    (2, 'GRD', 1690.00),
    (3.5, 'PKW', 1510.00),
    (3.5, 'KMB', 1605.00),
    (3.5, 'SUV', 1700.00),
    (3.5, 'SGL', 1890.00),
    (3.5, 'GRD', 2455.00),
    (5.5, 'PKW', 1940.00),
    (5.5, 'KMB', 2065.00),
    (5.5, 'SUV', 2190.00),
    (5.5, 'SGL', 2440.00),
    (5.5, 'GRD', 3170.00)
) AS t(vehicle_count, category, price);

-- München (MUC)
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'MUC',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 480.00),
    (1, 'KMB', 505.00),
    (1, 'SUV', 530.00),
    (1, 'SGL', 580.00),
    (1, 'GRD', 755.00),
    (2, 'PKW', 720.00),
    (2, 'KMB', 760.00),
    (2, 'SUV', 800.00),
    (2, 'SGL', 880.00),
    (2, 'GRD', 1145.00),
    (3.5, 'PKW', 1010.00),
    (3.5, 'KMB', 1075.00),
    (3.5, 'SUV', 1140.00),
    (3.5, 'SGL', 1270.00),
    (3.5, 'GRD', 1650.00),
    (5.5, 'PKW', 1300.00),
    (5.5, 'KMB', 1385.00),
    (5.5, 'SUV', 1470.00),
    (5.5, 'SGL', 1640.00),
    (5.5, 'GRD', 2130.00)
) AS t(vehicle_count, category, price);

-- Amsterdam (AMS) - International
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'AMS',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 890.00),
    (1, 'KMB', 935.00),
    (1, 'SUV', 980.00),
    (1, 'SGL', 1070.00),
    (1, 'GRD', 1390.00),
    (2, 'PKW', 1335.00),
    (2, 'KMB', 1405.00),
    (2, 'SUV', 1475.00),
    (2, 'SGL', 1615.00),
    (2, 'GRD', 2100.00),
    (3.5, 'PKW', 1870.00),
    (3.5, 'KMB', 1990.00),
    (3.5, 'SUV', 2110.00),
    (3.5, 'SGL', 2350.00),
    (3.5, 'GRD', 3055.00),
    (5.5, 'PKW', 2405.00),
    (5.5, 'KMB', 2560.00),
    (5.5, 'SUV', 2715.00),
    (5.5, 'SGL', 3025.00),
    (5.5, 'GRD', 3935.00)
) AS t(vehicle_count, category, price);

-- Luxemburg (LUX) - International
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'LUX',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 685.00),
    (1, 'KMB', 720.00),
    (1, 'SUV', 755.00),
    (1, 'SGL', 825.00),
    (1, 'GRD', 1075.00),
    (2, 'PKW', 1030.00),
    (2, 'KMB', 1085.00),
    (2, 'SUV', 1140.00),
    (2, 'SGL', 1250.00),
    (2, 'GRD', 1625.00),
    (3.5, 'PKW', 1440.00),
    (3.5, 'KMB', 1530.00),
    (3.5, 'SUV', 1620.00),
    (3.5, 'SGL', 1800.00),
    (3.5, 'GRD', 2340.00),
    (5.5, 'PKW', 1850.00),
    (5.5, 'KMB', 1970.00),
    (5.5, 'SUV', 2090.00),
    (5.5, 'SGL', 2330.00),
    (5.5, 'GRD', 3030.00)
) AS t(vehicle_count, category, price);

-- Liege (LGG) - International
INSERT INTO partner_base_rates (partner_id, airport_code, zone_code, weight_from, weight_to, base_price) 
SELECT 
    (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH'),
    'LGG',
    CASE 
        WHEN vehicle_count = 1 THEN 'F1_' || category
        WHEN vehicle_count = 2 THEN 'F2_' || category
        WHEN vehicle_count = 3.5 THEN 'F34_' || category
        WHEN vehicle_count = 5.5 THEN 'F56_' || category
    END,
    vehicle_count,
    vehicle_count,
    price
FROM (VALUES
    (1, 'PKW', 745.00),
    (1, 'KMB', 785.00),
    (1, 'SUV', 825.00),
    (1, 'SGL', 905.00),
    (1, 'GRD', 1175.00),
    (2, 'PKW', 1120.00),
    (2, 'KMB', 1180.00),
    (2, 'SUV', 1240.00),
    (2, 'SGL', 1360.00),
    (2, 'GRD', 1770.00),
    (3.5, 'PKW', 1570.00),
    (3.5, 'KMB', 1670.00),
    (3.5, 'SUV', 1770.00),
    (3.5, 'SGL', 1970.00),
    (3.5, 'GRD', 2560.00),
    (5.5, 'PKW', 2020.00),
    (5.5, 'KMB', 2150.00),
    (5.5, 'SUV', 2280.00),
    (5.5, 'SGL', 2540.00),
    (5.5, 'GRD', 3305.00)
) AS t(vehicle_count, category, price);

-- Prüfe das Ergebnis
SELECT 
    airport_code as ziel,
    COUNT(DISTINCT zone_code) as anzahl_kombinationen,
    MIN(base_price) as min_preis,
    MAX(base_price) as max_preis
FROM partner_base_rates 
WHERE partner_id = (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH')
GROUP BY airport_code
ORDER BY 
    CASE 
        WHEN airport_code = 'STR' THEN 1
        WHEN airport_code IN ('FRA', 'HHN', 'CGN', 'MUC') THEN 2
        ELSE 3
    END,
    airport_code;

-- Gesamtübersicht
SELECT 
    COUNT(*) as gesamt_tarife,
    COUNT(DISTINCT airport_code) as anzahl_ziele,
    COUNT(DISTINCT zone_code) as anzahl_kombinationen
FROM partner_base_rates 
WHERE partner_id = (SELECT id FROM partners WHERE name = 'Böpple Automotive GmbH');

-- Legende für Zone-Codes:
-- F1_PKW = 1 Fahrzeug, PKW Normal
-- F1_KMB = 1 Fahrzeug, Kombi
-- F1_SUV = 1 Fahrzeug, SUV Klein
-- F1_SGL = 1 Fahrzeug, SUV Groß (SGL = SUV Groß/Large)
-- F1_GRD = 1 Fahrzeug, Guard/Sonderfahrzeug
-- F2_... = 2 Fahrzeuge
-- F34_... = 3-4 Fahrzeuge
-- F56_... = 5-6 Fahrzeuge