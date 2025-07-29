// backend/server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Express App initialisieren
const app = express();
const PORT = process.env.PORT || 3001;

// CORS für Frontend konfigurieren
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://logistikpro-app.vercel.app',
    'https://logistikpro-lucrdjw20-sergio-s-projects-34d127fd.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Zusätzlicher CORS-Handler für OPTIONS requests
app.options('*', cors());

// JSON Body Parser
app.use(express.json());

// Milestone-Definitionen importieren
const { getMilestones } = require('./milestoneDefinitions');

// TEST ENDPOINT - zum Debuggen
app.get('/api/test-shipments', async (req, res) => {
  try {
    // Einfacher Query ohne Joins
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Test Query Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Test Query Success:', data);
    res.json({ 
      success: true,
      count: data?.length || 0,
      data: data || [],
      sample: data?.[0] || null 
    });
  } catch (err) {
    console.error('Test Endpoint Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// CSP Header Middleware
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; img-src https://logistikpro-production.onrender.com; script-src 'self'; style-src 'self'"
  );
  next();
});

// Statische Dateien aus dem Ordner 'public' bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(express.json());

// Supabase-Client konfigurieren
const supabaseUrl = 'https://vjehwwmhtzqilvwtppcc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZWh3d21odHpxaWx2d3RwcGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDYwMDIsImV4cCI6MjA2NzQ4MjAwMn0.wkFyJHFi2mAb_FRsbjrrBTqX75vqV_4nsfWQLWm8QjI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Root-Route
app.get('/', (req, res) => {
  res.send('LogistikPro Backend läuft');
});

// Get single shipment  
app.get('/api/shipments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching shipment:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Sendung nicht gefunden' });
    }

    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// Update shipment milestone
app.put('/api/shipments/:id/milestone', async (req, res) => {
  try {
    const { id } = req.params;
    const { milestone } = req.body;

    console.log(`🎯 Milestone Update: Sendung ${id} → Milestone ${milestone}`);

    // Validierung
    if (milestone < 0 || milestone > 10) {
      return res.status(400).json({ 
        error: 'Milestone muss zwischen 0 und 10 liegen',
        success: false 
      });
    }

    // Update in Datenbank
    const { data, error } = await supabase
      .from('shipments')
      .update({ 
        current_milestone: milestone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase Milestone Update Fehler:', error);
      return res.status(500).json({ 
        error: 'Datenbankfehler beim Milestone-Update',
        success: false 
      });
    }

    // History-Eintrag erstellen (optional)
    const historyEntry = {
      shipment_id: id,
      action: 'milestone_update',
      details: `Milestone geändert auf ${milestone}`,
      created_at: new Date().toISOString()
    };

    // History speichern (ignoriert Fehler wenn Tabelle nicht existiert)
    try {
      await supabase
        .from('shipment_history')
        .insert([historyEntry]);
    } catch (historyError) {
      console.warn('⚠️ History konnte nicht gespeichert werden:', historyError);
      // Ignorieren - nicht kritisch
    }

    console.log('✅ Milestone erfolgreich aktualisiert:', data);
    
    res.json({ 
      success: true, 
      data: data,
      message: `Milestone auf ${milestone} aktualisiert`
    });

  } catch (error) {
    console.error('❌ Milestone Update Fehler:', error);
    res.status(500).json({ 
      error: 'Server-Fehler beim Milestone-Update',
      success: false 
    });
  }
});

// --- CUSTOMER ROUTES ---

// GET /api/customers - Holt alle Kunden mit ihren Kontakten und Adressen
app.get('/api/customers', async (req, res) => {
  try {
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (customersError) throw customersError;

    const result = [];
    for (const customer of customers) {
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('customer_id', customer.id);

      if (contactsError) throw contactsError;

      const { data: addresses, error: addressesError } = await supabase
        .from('pickup_addresses')
        .select(`
          *,
          pickup_times (*),
          contacts (*)
        `)
        .eq('customer_id', customer.id);

      if (addressesError) throw addressesError;

      result.push({
        ...customer,
        contacts: contacts || [],
        pickup_addresses: addresses || []
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Fehler beim Abrufen der Kunden:', err);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Kunden', details: err.message });
  }
});

// POST /api/customers - Erstellt einen neuen Kunden
app.post('/api/customers', async (req, res) => {
  const { name, info, emails } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  const safeEmails = Array.isArray(emails) ? emails : [];
  const safeInfo = typeof info === 'string' ? info : '';

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: name.trim(),
        info: safeInfo,
        emails: JSON.stringify(safeEmails)
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/customers/:id - Aktualisiert einen Kunden
app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, info, emails } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  const safeEmails = Array.isArray(emails) ? emails : [];
  const safeInfo = typeof info === 'string' ? info : '';

  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        name: name.trim(),
        info: safeInfo,
        emails: safeEmails
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// DELETE /api/customers/:id - Löscht einen Kunden
app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;

    try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Kunde erfolgreich gelöscht' });
  } catch (err) {
    console.error('Fehler beim Löschen des Kunden:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// POST /api/contacts - Ansprechpartner erstellen
app.post('/api/contacts', async (req, res) => {
  const { customer_id, name, phones, email } = req.body;

  if (!customer_id || !name) {
    return res.status(400).json({ error: 'Kunde und Name sind erforderlich' });
  }

  const safePhones = Array.isArray(phones) ? phones : [];
  const safeEmail = typeof email === 'string' ? email : null;

  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        customer_id: parseInt(customer_id),
        name: name.trim(),
        phones: safePhones,
        email: safeEmail
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/contacts/:id - Ansprechpartner aktualisieren
app.put('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phones, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  const safePhones = Array.isArray(phones) ? phones : [];
  const safeEmail = typeof email === 'string' ? email : null;

  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: name.trim(),
        phones: safePhones,
        email: safeEmail
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Kontakt nicht gefunden' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// DELETE /api/contacts/:id
app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Kontakt erfolgreich gelöscht' });
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// --- ADDRESS ROUTES ---

// POST /api/pickup_addresses - Adresse erstellen
app.post('/api/pickup_addresses', async (req, res) => {
  const { customer_id, street, zip, city, country, contact_id } = req.body;

  if (!customer_id || !street || !zip || !city) {
    return res.status(400).json({ error: 'Kunde, Straße, PLZ und Stadt sind erforderlich' });
  }

  try {
    const { data, error } = await supabase
      .from('pickup_addresses')
      .insert([{
        customer_id: parseInt(customer_id),
        street: street.trim(),
        zip: zip.trim(),
        city: city.trim(),
        country: country || 'Deutschland',
        contact_id: contact_id ? parseInt(contact_id) : null
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/pickup_addresses/:id
app.put('/api/pickup_addresses/:id', async (req, res) => {
  const { id } = req.params;
  const { street, zip, city, country, contact_id } = req.body;

  if (!street || !zip || !city) {
    return res.status(400).json({ error: 'Straße, PLZ und Stadt sind erforderlich' });
  }

  try {
    const { data, error } = await supabase
      .from('pickup_addresses')
      .update({
        street: street.trim(),
        zip: zip.trim(),
        city: city.trim(),
        country: country || 'Deutschland',
        contact_id: contact_id ? parseInt(contact_id) : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Adresse nicht gefunden' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// DELETE /api/pickup_addresses/:id
app.delete('/api/pickup_addresses/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('pickup_addresses')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Adresse erfolgreich gelöscht' });
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// --- PICKUP TIME ROUTES ---

// POST /api/pickup_times
app.post('/api/pickup_times', async (req, res) => {
  const { address_id, day_of_week, time_from, time_to } = req.body;

  if (!address_id || !day_of_week || !time_from || !time_to) {
    return res.status(400).json({ error: 'Alle Zeitfelder sind erforderlich' });
  }

  try {
    const { data, error } = await supabase
      .from('pickup_times')
      .insert([{
        address_id: parseInt(address_id),
        day_of_week: parseInt(day_of_week),
        time_from,
        time_to
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// --- PARTNER ROUTES ---

// GET /api/partners - Alle Partner abrufen
app.get('/api/partners', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Fehler beim Abrufen der Partner:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/partners/by-service - Partner nach Service-Typ
app.get('/api/partners/by-service', async (req, res) => {
  const { service } = req.query;
  
  try {
    let query = supabase.from('partners').select('*');
    
    if (service === 'pickup') {
      // Vorlauf-Partner (HuT, Böpple, BAT)
      query = query.in('type', ['carrier', 'trucking']).eq('service_type', 'pickup');
    } else if (service === 'airline') {
      // Airlines und WebCargo
      query = query.in('type', ['airline', 'platform']);
    } else if (service === 'agent') {
      // Auslands-Agenten
      query = query.eq('type', 'agent');
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/partners/by-airport - Hole Partner für bestimmten Flughafen
app.get('/api/partners/by-airport', async (req, res) => {
  const { airport } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('partner_airports')
      .select(`
        partner_id,
        is_primary,
        partners (
          id,
          name,
          type,
          contact_email,
          contact_phone
        )
      `)
      .eq('airport_code', airport);
      
    if (error) throw error;
    
    res.json(data.map(item => ({
      ...item.partners,
      is_primary: item.is_primary
    })));
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Partner:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Partner' });
  }
});

// POST /api/partners - Erstellt einen neuen Partner
app.post('/api/partners', async (req, res) => {
  const { name, type, info, emails, phones, address } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  if (!type || !['carrier', 'agent'].includes(type)) {
    return res.status(400).json({ error: 'Typ muss "carrier" oder "agent" sein' });
  }

  const safeEmails = Array.isArray(emails) ? emails : [];
  const safePhones = Array.isArray(phones) ? phones : [];
  const safeInfo = typeof info === 'string' ? info : '';
  const safeAddress = address || null;

  try {
    const { data, error } = await supabase
      .from('partners')
      .insert([{
        name: name.trim(),
        type,
        info: safeInfo,
        emails: safeEmails,
        phones: safePhones,
        address: safeAddress
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/partners/:id - Partner aktualisieren
app.put('/api/partners/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, info, emails, phones, address } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  if (!type || !['carrier', 'agent'].includes(type)) {
    return res.status(400).json({ error: 'Typ muss "carrier" oder "agent" sein' });
  }

  const safeEmails = Array.isArray(emails) ? emails : [];
  const safePhones = Array.isArray(phones) ? phones : [];
  const safeInfo = typeof info === 'string' ? info : '';
  const safeAddress = address || null;

  try {
    const { data, error } = await supabase
      .from('partners')
      .update({
        name: name.trim(),
        type,
        info: safeInfo,
        emails: safeEmails,
        phones: safePhones,
        address: safeAddress
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Partner nicht gefunden' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// DELETE /api/partners/:id - Partner löschen  
app.delete('/api/partners/:id', async (req, res) => {  
  try {  
    const { id } = req.params;  
    
    const { error } = await supabase  
      .from('partners')  
      .delete()  
      .eq('id', id);  
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ message: 'Partner gelöscht' });  
  } catch (error) {  
    res.status(500).json({ error: error.message });  
  }  
});


// --- PARTNER RATE ROUTES ---

// GET /api/partner-rates/zone - Ermittle Zone basierend auf PLZ
app.get('/api/partner-rates/zone', async (req, res) => {
  const { partner_id, plz } = req.query;
  
  try {
    // Extrahiere PLZ-Prefix (erste 2-3 Zeichen)
    const plzPrefix = plz.substring(0, 3);
    const plzPrefix2 = plz.substring(0, 2);
    
    // Suche nach Zone
    const { data, error } = await supabase
      .from('plz_zones')
      .select('zone_code')
      .eq('partner_id', partner_id)
      .or(`plz_prefix.eq.${plzPrefix},plz_prefix.eq.${plzPrefix2}`)
      .single();
      
    if (error || !data) {
      // Fallback auf Default-Zone
      return res.json({ zone: 'ZONE1' });
    }
    
    res.json({ zone: data.zone_code });
  } catch (error) {
    console.error('Fehler beim Ermitteln der Zone:', error);
    res.status(500).json({ error: 'Fehler beim Ermitteln der Zone' });
  }
});

// GET /api/partner-rates/base - Hole Basis-Tarif
app.get('/api/partner-rates/base', async (req, res) => {
  const { partner_id, zone, weight, airport } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('partner_base_rates')
      .select('*')
      .eq('partner_id', partner_id)
      .eq('zone_code', zone)
      .eq('airport_code', airport)
      .lte('weight_from', weight)  // weight_from <= weight
      .gte('weight_to', weight)    // weight_to >= weight
      .single();
      
    if (error || !data) {
      return res.status(404).json({ error: 'Kein Tarif gefunden' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Fehler beim Abrufen des Tarifs:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Tarifs' });
  }
});

// POST /api/partner-rates/calculate - Berechne Kosten mit Tarifen
app.post('/api/partner-rates/calculate', async (req, res) => {
  const { partner_id, pickup_plz, weight, volume, pieces, airport } = req.body;
  
  try {
    // 1. Ermittle Zone
    const plzPrefix = pickup_plz.substring(0, 3);
    const plzPrefix2 = pickup_plz.substring(0, 2);
    
    const { data: zoneData } = await supabase
      .from('plz_zones')
      .select('zone_code')
      .eq('partner_id', partner_id)
      .or(`plz_prefix.eq.${plzPrefix},plz_prefix.eq.${plzPrefix2}`)
      .single();
      
    const zone = zoneData?.zone_code || 'ZONE1';
    
    // 2. Hole Tarif
    const { data: rateData, error: rateError } = await supabase
      .from('partner_base_rates')
      .select('*')
      .eq('partner_id', partner_id)
      .eq('zone_code', zone)
      .eq('airport_code', airport)
      .lte('weight_from', weight)  // weight_from <= weight
      .gte('weight_to', weight)    // weight_to >= weight
      .single();
      
    if (rateError || !rateData) {
      return res.status(404).json({ 
        error: 'Kein Tarif gefunden',
        details: { partner_id, zone, weight, airport }
      });
    }
    
    // 3. Berechne Kosten
    let baseCost = rateData.base_price || 0;
    let xrayCost = 0;
    
    // X-Ray Berechnung
    if (rateData.xray_unit_type === 'per_piece') {
      // HuT Style: Basis + Extra pro Stück
      xrayCost = rateData.xray_base || 0;
      if (pieces > (rateData.xray_included_units || 0)) {
        xrayCost += (pieces - rateData.xray_included_units) * (rateData.xray_per_unit || 0);
      }
    } else if (rateData.xray_unit_type === 'per_kg') {
      // BT Blue Style: Minimum oder pro kg (max 400€)
      const kgCost = weight * (rateData.xray_per_unit || 0);
      xrayCost = Math.max(rateData.xray_base || 0, Math.min(kgCost, 400));
    }
    
    const totalCost = baseCost + xrayCost;
    
    // 4. Hole Partner-Name
    const { data: partner } = await supabase
      .from('partners')
      .select('name')
      .eq('id', partner_id)
      .single();
    
    res.json({
      success: true,
      partner: partner?.name,
      zone: zone,
      calculation: {
        base_rate: baseCost,
        xray_cost: xrayCost,
        total: totalCost,
        currency: 'EUR',
        breakdown: {
          transport: `${baseCost.toFixed(2)}€`,
          xray: `${xrayCost.toFixed(2)}€`
        }
      }
    });
    
  } catch (error) {
    console.error('Fehler bei Tarifberechnung:', error);
    res.status(500).json({ error: 'Fehler bei der Tarifberechnung' });
  }
});
/// Helper Funktion für Transit Days Berechnung
function calculateTransitDays(pickupDate, deliveryDate) {
  if (!pickupDate || !deliveryDate) return null;
  
  const pickup = new Date(pickupDate);
  const delivery = new Date(deliveryDate);
  
  // Berechne die Differenz in Millisekunden
  const diffTime = delivery - pickup;
  
  // Konvertiere zu Tagen
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : null;
}

function getDeliveryStatusText(milestone, status) {
  if (milestone >= 10) return 'Zugestellt';
  if (milestone >= 9) return 'In Zustellung';
  if (milestone >= 8) return 'Agent kontaktiert';
  if (status === 'in_transit') return 'In Transit';
  return 'Geplant';
}

// --- SHIPMENT ROUTES ---

// GET /api/shipments - Holt alle Sendungen mit Filtern
app.get('/api/shipments', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select(`
        *,
        customer:customers(name, id),
        pickup_partner:partners!shipments_pickup_partner_id_fkey(name, id, emails, phones),
        mainrun_partner:partners!shipments_mainrun_partner_id_fkey(name, id, emails, phones),
        delivery_partner:partners!shipments_delivery_partner_id_fkey(name, id, emails, phones)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Daten für Frontend aufbereiten
    const processedData = (data || []).map(shipment => ({
      ...shipment,
      // Customer Name direkt verfügbar machen
      customer_name: shipment.customer?.name || 'N/A',
      // Partner Namen
      pickup_partner_name: shipment.pickup_partner?.name || 'N/A',
      main_partner_name: shipment.mainrun_partner?.name || 'N/A',
      delivery_partner_name: shipment.delivery_partner?.name || 'N/A',
      // Carrier/Airline Name für AWB/Carrier Spalte
      carrier_name: shipment.mainrun_partner?.name || shipment.airline || 'N/A',
      // Flughäfen - verwende die richtigen Feldnamen
      from_airport: shipment.origin_airport,
      to_airport: shipment.destination_airport,
      from_city: shipment.from_city || shipment.origin_city || 'N/A',
      to_city: shipment.to_city || shipment.destination_city || 'N/A',
      // AWB
      awb_number: shipment.awb_number || shipment.awb || '-',
      // Gewicht und Stücke
      total_weight: shipment.total_weight || shipment.weight || 0,
      total_pieces: shipment.total_pieces || shipment.pieces || 0,
      // Status und Milestone
      current_milestone: shipment.current_milestone || 1,
      shipment_type: shipment.import_export === 'import' ? 'IMPORT' : 'EXPORT',
      // Transit Days berechnen
      transit_days: shipment.transit_days || calculateTransitDays(shipment.pickup_date, shipment.delivery_date),
      // Delivery Status Text
      delivery_status: getDeliveryStatusText(shipment.current_milestone || 1, shipment.status),
      // Partner E-Mails (erste aus dem Array)
      pickup_partner_email: shipment.pickup_partner?.emails?.[0] || '',
      main_partner_email: shipment.mainrun_partner?.emails?.[0] || '',
      delivery_partner_email: shipment.delivery_partner?.emails?.[0] || ''
    }));

    res.json({ data: processedData });
  } catch (err) {
    console.error('Fehler beim Abrufen der Sendungen:', err);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Sendungen' });
  }
});

// GET /api/shipments/:id - Einzelne Sendung abrufen
app.get('/api/shipments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hole Sendung mit allen Relationen
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        *,
        customer:customers(name, id),
        pickup_address:pickup_addresses(street, city, zip, country),
        pickup_partner:partners!shipments_pickup_partner_id_fkey(name, id, emails, phones),
        mainrun_partner:partners!shipments_mainrun_partner_id_fkey(name, id, emails, phones),
        delivery_partner:partners!shipments_delivery_partner_id_fkey(name, id, emails, phones)
      `)
      .eq('id', id)
      .single();
    
    if (shipmentError) {
      if (shipmentError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Sendung nicht gefunden' });
      }
      throw shipmentError;
    }
    
    // Hole Packstücke
    const { data: pieces, error: piecesError } = await supabase
      .from('shipment_pieces')
      .select('*')
      .eq('shipment_id', id)
      .order('id');
    
    if (piecesError) {
      console.error('Fehler beim Abrufen der Packstücke:', piecesError);
    }
    
    // Bereite Sendungsdaten auf
    const processedShipment = {
      ...shipment,
      customer_name: shipment.customer?.name || 'N/A',
      pickup_address: shipment.pickup_address ? 
        `${shipment.pickup_address.street}, ${shipment.pickup_address.zip} ${shipment.pickup_address.city}` : 
        'N/A',
      pickup_city: shipment.pickup_address?.city || 'N/A',
      pickup_zip: shipment.pickup_address?.zip || 'N/A',
      pieces: pieces || []
    };
    
    res.json(processedShipment);
  } catch (error) {
    console.error('Fehler beim Abrufen der Sendung:', error);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Sendung' });
  }
});

// 📁 DATEI: backend/server.js

// POST /api/shipments - Neue Sendung erstellen
app.post('/api/shipments', async (req, res) => {
  const shipmentData = req.body;

  console.log('=== BACKEND DEBUG: Empfangene Daten ===');
  console.log('req.body.pickup_cost:', req.body.pickup_cost, typeof req.body.pickup_cost);
  console.log('req.body.main_cost:', req.body.main_cost, typeof req.body.main_cost);
  console.log('req.body.delivery_cost:', req.body.delivery_cost, typeof req.body.delivery_cost);
  console.log('Position:', shipmentData.position);
  console.log('Status:', shipmentData.status);
  console.log('Customer ID:', shipmentData.customer_id);
  
  try {
    // Spezielle Behandlung für Anfragen
    if (shipmentData.position && shipmentData.position.startsWith('ANF-')) {
      shipmentData.status = 'ANFRAGE';
    }
    
    // Generiere Position
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .like('position', `SND-${year}-%`);
    
    // Behalte übergebene Position (z.B. ANF-...) oder generiere neue
    const position = shipmentData.position || `SND-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Pieces aus den Daten entfernen für die Haupttabelle
    const { pieces, ...mainShipmentData } = shipmentData;

    // Mapping der Felder auf die korrekten Datenbank-Spalten
    const processedData = {
      position: mainShipmentData.position || position,
      customer_id: mainShipmentData.customer_id,
      reference: mainShipmentData.reference || null,
      import_export: mainShipmentData.import_export || 'export',
      transport_type: mainShipmentData.transport_type || 'AIR',
      origin_airport: mainShipmentData.from_airport || mainShipmentData.origin_airport,
      destination_airport: mainShipmentData.to_airport || mainShipmentData.destination_airport,
      from_city: mainShipmentData.from_city || null,
      to_city: mainShipmentData.to_city || null,
      incoterm: mainShipmentData.incoterm || 'CPT',
      pickup_date: mainShipmentData.pickup_date,
      pickup_address_id: mainShipmentData.pickup_address_id || null,
      pickup_partner_id: mainShipmentData.pickup_partner_id || null,
      mainrun_partner_id: mainShipmentData.mainrun_partner_id || mainShipmentData.main_partner_id || null,
      delivery_partner_id: mainShipmentData.delivery_partner_id || null,
      
      // WICHTIG: KOSTEN-FELDER RICHTIG MAPPEN
      cost_pickup: mainShipmentData.pickup_cost || mainShipmentData.cost_pickup || 0,
      cost_mainrun: mainShipmentData.main_cost || mainShipmentData.cost_mainrun || 0,
      cost_delivery: mainShipmentData.delivery_cost || mainShipmentData.cost_delivery || 0,
      
      // Gewicht und Volumen
      total_weight: pieces ? pieces.reduce((sum, p) => sum + ((p.quantity || 0) * (p.weight_per_piece || 0)), 0) : 0,
      total_pieces: pieces ? pieces.reduce((sum, p) => sum + (p.quantity || 0), 0) : 0,
      total_volume: pieces ? pieces.reduce((sum, p) => sum + ((p.quantity || 0) * (p.volume || 0)), 0) : 0,
      
      // Status
      status: shipmentData.status || mainShipmentData.status || 'neu',
      current_milestone: 1,
      
      // Weitere Felder
      awb_number: mainShipmentData.awb_number || null,
      flight_number: mainShipmentData.flight_number || null,
      airline: mainShipmentData.airline || null,
      eta: mainShipmentData.eta || null,
      delivery_date: mainShipmentData.delivery_date || null,
      selling_price: mainShipmentData.selling_price || 0,
      profit: mainShipmentData.profit || 0,
      margin: mainShipmentData.margin || 0,
      
      // Empfänger-Daten
      consignee_name: mainShipmentData.consignee_name || null,
      consignee_address: mainShipmentData.consignee_address || null,
      consignee_zip: mainShipmentData.consignee_zip || null,
      consignee_city: mainShipmentData.consignee_city || null,
      consignee_country: mainShipmentData.consignee_country || null,
      created_at: new Date().toISOString()
    };

    console.log('BACKEND: Verarbeitete Kosten:');
    console.log('cost_pickup:', processedData.cost_pickup);
    console.log('cost_mainrun:', processedData.cost_mainrun);
    console.log('cost_delivery:', processedData.cost_delivery);

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert([processedData])
      .select()
      .single();

    if (shipmentError) {
      console.error('Fehler beim Erstellen der Sendung:', shipmentError);
      return res.status(500).json({ error: shipmentError.message });
    }

    console.log('GESPEICHERT in DB:', shipment);
    console.log('DB cost_pickup:', shipment.cost_pickup);
    console.log('DB cost_mainrun:', shipment.cost_mainrun); 
    console.log('DB cost_delivery:', shipment.cost_delivery);

    // Packstücke erstellen (falls vorhanden)
    if (pieces && pieces.length > 0) {
      const piecesData = pieces.map(piece => ({
        shipment_id: shipment.id,
        quantity: piece.quantity || 1,
        weight_per_piece: piece.weight_per_piece || 0,
        length: piece.length || 0,
        width: piece.width || 0,
        height: piece.height || 0,
        volume: piece.volume || 0,
        description: piece.description || '',
        packaging_type: piece.packaging_type || 'box'
      }));

      const { error: piecesError } = await supabase
        .from('shipment_pieces')
        .insert(piecesData);

      if (piecesError) {
        console.error('Fehler beim Erstellen der Packstücke:', piecesError);
      }
    }

    // Historie-Eintrag
    await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: shipment.id,
        action: 'Sendung erstellt',
        details: `Neue Sendung ${position} wurde erstellt`,
        created_at: new Date().toISOString()
      }]);

    res.status(201).json(shipment);
  } catch (err) {
    console.error('Fehler beim Erstellen der Sendung:', err);
    res.status(500).json({ error: 'Serverfehler beim Erstellen der Sendung' });
  }
});


// PUT /api/shipments/:id - Sendung aktualisieren
app.put('/api/shipments/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const { data, error } = await supabase
      .from('shipments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Historie-Eintrag
    await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: id,
        action: 'Sendung aktualisiert',
        details: 'Sendungsdaten wurden aktualisiert'
      }]);

    res.json(data);
  } catch (err) {
    console.error('Fehler beim Aktualisieren:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PUT /api/shipments/:id/status - Status aktualisieren
app.put('/api/shipments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status ist erforderlich' });
  }

  try {
    // Timestamp-Feld bestimmen
    const timestampFields = {
      'pre_alert_sent': 'pre_alert_at',
      'picked_up': 'picked_up_at',
      'export_terminal': 'export_terminal_at',
      'departed': 'departed_at',
      'arrived': 'arrived_at',
      'import_terminal': 'import_terminal_at',
      'out_for_delivery': 'out_for_delivery_at',
      'delivered': 'delivered_at'
    };

    const updateData = { 
      status,
      updated_at: new Date().toISOString()
    };
    const timestampField = timestampFields[status];
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Historie-Eintrag
    await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: id,
        action: 'Status geändert',
        details: `Status wurde auf "${status}" geändert`
      }]);

    res.json(data);
  } catch (err) {
    console.error('Fehler beim Status-Update:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// PUT /api/shipments/:id/milestone - Milestone aktualisieren
app.put('/api/shipments/:id/milestone', async (req, res) => {
  const { id } = req.params;
  const { milestone_id } = req.body;

  try {
    // Erst die Sendung holen um Transport-Type und Shipment-Type zu bekommen
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Sendung nicht gefunden' });
    }

    // Update Milestone
    const { data, error } = await supabase
      .from('shipments')
      .update({ 
        current_milestone: milestone_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Hole Milestone-Text für Historie
    const milestones = getMilestones(data.transport_type, data.shipment_type || 'EXPORT');
    const milestone = milestones.find(m => m.id === milestone_id);
    
    // Historie-Eintrag erstellen
    const { error: historyError } = await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: id,
        action: 'Milestone Update',
        details: `Status geändert zu: ${milestone?.text || 'Unbekannt'} (Milestone ${milestone_id})`,
        milestone_id: milestone_id,
        created_at: new Date().toISOString(),
        created_by: req.body.user_id || 'System'
      }]);

    if (historyError) {
      console.error('Fehler beim Erstellen des Historie-Eintrags:', historyError);
    }

    // Status automatisch basierend auf Milestone aktualisieren
    let newStatus = data.status;
    
    if (milestone_id === 1) newStatus = 'neu';
    else if (milestone_id === 2) newStatus = 'booked';
    else if (milestone_id === 3) newStatus = 'abgeholt';
    else if (milestone_id >= 4 && milestone_id <= 8) newStatus = 'in_transit';
    else if (milestone_id === 9) newStatus = 'zustellung';
    else if (milestone_id >= 10) newStatus = 'zugestellt';

    if (newStatus !== data.status) {
      const { error: statusError } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (statusError) {
        console.error('Fehler beim Status-Update:', statusError);
      }
    }

    res.json({
      ...data,
      status: newStatus,
      milestone_text: milestone?.text || 'Unbekannt'
    });

  } catch (err) {
    console.error('Fehler beim Milestone-Update:', err);
    res.status(500).json({ error: 'Serverfehler beim Milestone-Update' });
  }
});

// GET /api/shipments/:id/milestones - Alle Milestones für eine Sendung abrufen
app.get('/api/shipments/:id/milestones', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('transport_type, shipment_type, current_milestone')
      .eq('id', id)
      .single();

    if (error || !shipment) {
      return res.status(404).json({ error: 'Sendung nicht gefunden' });
    }

    const milestones = getMilestones(
      shipment.transport_type, 
      shipment.shipment_type || 'EXPORT'
    );

    const { data: history } = await supabase
      .from('shipment_history')
      .select('milestone_id, created_at, created_by, details')
      .eq('shipment_id', id)
      .eq('action', 'Milestone Update')
      .order('created_at', { ascending: true });

    const enrichedMilestones = milestones.map(milestone => {
      const historyEntry = history?.find(h => h.milestone_id === milestone.id);
      
      return {
        ...milestone,
        status: milestone.id <= shipment.current_milestone ? 'completed' : 
                milestone.id === shipment.current_milestone + 1 ? 'pending' : 'future',
        completed_at: historyEntry?.created_at || null,
        completed_by: historyEntry?.created_by || null
      };
    });

    res.json({
      current_milestone: shipment.current_milestone,
      milestones: enrichedMilestones
    });

  } catch (err) {
    console.error('Fehler beim Abrufen der Milestones:', err);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Milestones' });
  }
});

// POST /api/shipments/:id/milestone-email - E-Mail für Milestone-Status senden
app.post('/api/shipments/:id/milestone-email', async (req, res) => {
  const { id } = req.params;
  const { partner_email, partner_name, milestone_text } = req.body;

  try {
    // Sendung holen
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !shipment) {
      return res.status(404).json({ error: 'Sendung nicht gefunden' });
    }

    // E-Mail-Inhalt vorbereiten
    const emailData = {
      to: partner_email,
      subject: `Status Update Request - AWB: ${shipment.awb_number}`,
      body: `
Sehr geehrte Damen und Herren,

wir bitten um ein Status-Update für folgende Sendung:

AWB: ${shipment.awb_number}
Referenz: ${shipment.reference || '-'}
Route: ${shipment.from_airport} → ${shipment.to_airport}
Aktueller Status: ${milestone_text}

Sendungsdetails:
- Abholung: ${shipment.pickup_date ? new Date(shipment.pickup_date).toLocaleDateString('de-DE') : '-'}
- Gewicht: ${shipment.total_weight} kg
- Packstücke: ${shipment.total_pieces}

Bitte teilen Sie uns den aktuellen Stand mit.

Mit freundlichen Grüßen
Ihr Logistik-Team
      `
    };

    // Historie-Eintrag
    await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: id,
        action: 'Status-Anfrage',
        details: `E-Mail an ${partner_name} (${partner_email}) gesendet - Status: ${milestone_text}`,
        created_at: new Date().toISOString()
      }]);

    // In der Praxis würdest du hier einen E-Mail-Service verwenden
    // z.B. SendGrid, Nodemailer, etc.
    
    res.json({ 
      success: true, 
      message: 'E-Mail-Anfrage wurde vorbereitet',
      email_data: emailData 
    });

  } catch (err) {
    console.error('Fehler beim Senden der E-Mail:', err);
    res.status(500).json({ error: 'Fehler beim Senden der E-Mail' });
  }
});

// GET /api/milestones - Milestone-Definitionen abrufen
app.get('/api/milestones', async (req, res) => {
  const { transport_type, shipment_type } = req.query;

  try {
    const milestones = getMilestones(
      transport_type || 'AIR', 
      shipment_type || 'EXPORT'
    );
    
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Milestone-Definitionen' });
  }
});

// PUT /api/shipments/:id/partners - Partner zuweisen und kalkulieren
app.put('/api/shipments/:id/partners', async (req, res) => {
  const { id } = req.params;
  const {
    pickup_partner_id,
    mainrun_partner_id,
    delivery_partner_id,
    cost_pickup,
    cost_mainrun,
    cost_delivery,
    selling_price
  } = req.body;

  try {
    // Profit und Marge berechnen
    const totalCost = (cost_pickup || 0) + (cost_mainrun || 0) + (cost_delivery || 0);
    const profit = (selling_price || 0) - totalCost;
    const margin = selling_price > 0 ? (profit / selling_price * 100) : 0;

    const { data, error } = await supabase
      .from('shipments')
      .update({
        pickup_partner_id,
        mainrun_partner_id,
        delivery_partner_id,
        cost_pickup,
        cost_mainrun,
        cost_delivery,
        selling_price,
        profit,
        margin: margin.toFixed(2),
        status: 'assigned'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Historie-Eintrag
    await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: id,
        action: 'Partner zugewiesen',
        details: 'Partner wurden zugewiesen und Preise kalkuliert'
      }]);

    res.json(data);
  } catch (err) {
    console.error('Fehler bei Partner-Zuweisung:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/shipments/:id/history - Historie einer Sendung
app.get('/api/shipments/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('shipment_history')
      .select('*')
      .eq('shipment_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Abrufen der Historie' });
  }
});

// DELETE /api/shipments/:id - Sendung löschen
app.delete('/api/shipments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Sendung erfolgreich gelöscht' });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// --- QUOTATION ROUTES ---

// GET alle Anfragen mit Details
app.get('/api/quotations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Quotations Error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Fehler beim Abrufen der Anfragen:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Anfragen' });
  }
});

// POST neue Kalkulation erstellen
app.post('/api/quotations', async (req, res) => {
  try {
    const {
      shipment_id,
      pickup_partner_id,
      pickup_cost,
      pickup_status,
      main_partner_id,
      main_cost,
      main_status,
      delivery_partner_id,
      delivery_cost,
      delivery_status,
      total_cost,
      selling_price,
      profit,
      margin
    } = req.body;

    const { data, error } = await supabase
      .from('quotations')
      .insert([{
        shipment_id,
        pickup_partner_id,
        pickup_cost: pickup_cost || 0,
        pickup_status: pickup_status || 'pending',
        main_partner_id,
        main_cost: main_cost || 0,
        main_status: main_status || 'pending',
        delivery_partner_id,
        delivery_cost: delivery_cost || 0,
        delivery_status: delivery_status || 'pending',
        total_cost: total_cost || 0,
        selling_price: selling_price || 0,
        profit: profit || 0,
        margin: margin || 0,
        status: 'draft'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Fehler beim Erstellen der Kalkulation:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Kalkulation' });
  }
});

// PUT Kosten aktualisieren
app.put('/api/quotations/:id/update-cost', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, cost } = req.body;
    
    let updateData = {};
    if (type === 'pickup') {
      updateData = {
        pickup_cost: cost,
        pickup_status: 'received'
      };
    } else if (type === 'main') {
      updateData = {
        main_cost: cost,
        main_status: 'received'
      };
    } else if (type === 'delivery') {
      updateData = {
        delivery_cost: cost,
        delivery_status: 'received'
      };
    }
    
    const { data, error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    // Update total cost
    const totalCost = (data.pickup_cost || 0) + (data.main_cost || 0) + (data.delivery_cost || 0);
    const allReceived = ['calculated', 'received'].includes(data.pickup_status) &&
                       ['calculated', 'received'].includes(data.main_status) &&
                       ['calculated', 'received'].includes(data.delivery_status);

    const { error: updateError } = await supabase
      .from('quotations')
      .update({
        total_cost: totalCost,
        status: allReceived ? 'complete' : 'partial'
      })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Kosten:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Kosten' });
  }
});

// POST Anfrage senden
app.post('/api/quotations/:id/send-request', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    let updateData = {};
    if (type === 'pickup') {
      updateData = {
        pickup_status: 'requested',
        pickup_requested_at: new Date().toISOString()
      };
    } else if (type === 'main') {
      updateData = {
        main_status: 'requested',
        main_requested_at: new Date().toISOString()
      };
    } else if (type === 'delivery') {
      updateData = {
        delivery_status: 'requested',
        delivery_requested_at: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from('quotations')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Senden der Anfrage:', error);
    res.status(500).json({ error: 'Fehler beim Senden der Anfrage' });
  }
});


// --- AIRPORT ROUTES ---

// GET /api/airports - Flughäfen abrufen
app.get('/api/airports', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('airports')
      .select('*')
      .order('code');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error('Fehler beim Abrufen der Flughäfen:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// --- DASHBOARD ROUTES ---

// GET /api/dashboard/stats - Dashboard Statistiken
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    
    // Basis-Query
    let query = supabase.from('shipments').select('*');
    
    if (from_date) {
      query = query.gte('created_at', from_date);
    }
    if (to_date) {
      query = query.lte('created_at', to_date);
    }
    
    const { data: shipments, error } = await query;
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Statistiken berechnen
    const stats = {
      total_shipments: shipments.length,
      total_revenue: shipments.reduce((sum, s) => sum + (s.selling_price || 0), 0),
      total_profit: shipments.reduce((sum, s) => sum + (s.profit || 0), 0),
      total_weight: shipments.reduce((sum, s) => sum + (s.total_weight || 0), 0),
      average_margin: shipments.length > 0 
        ? (shipments.reduce((sum, s) => sum + (s.margin || 0), 0) / shipments.length).toFixed(2)
        : 0,
      status_breakdown: shipments.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Fehler beim Abrufen der Statistiken:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// GET /api/dashboard - Dashboard-Daten
app.get('/api/dashboard', async (req, res) => {
  try {
    // Aktive Sendungen
    const { count: activeCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '["zugestellt", "storniert"]');

    // Heute abzuholen
    const today = new Date().toISOString().split('T')[0];
    const { count: pickupToday } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('pickup_date', today);

    // In Transit
    const { count: inTransit } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_transit');

    // Kritische Sendungen
    const { count: critical } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .or('priority.eq.high,status.eq.delayed');

    res.json({
      activeShipments: activeCount || 0,
      pickupToday: pickupToday || 0,
      inTransit: inTransit || 0,
      criticalShipments: critical || 0
    });
  } catch (err) {
    console.error('Dashboard-Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Dashboard-Daten' });
  }
});

// GET /api/statistics - Erweiterte Statistiken
app.get('/api/statistics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = supabase.from('shipments').select('*');
    
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }
    
    const { data: shipments, error } = await query;
    
    if (error) throw error;

    // Statistiken berechnen
    const stats = {
      total_shipments: shipments.length,
      total_revenue: shipments.reduce((sum, s) => sum + (s.selling_price || 0), 0),
      total_profit: shipments.reduce((sum, s) => sum + (s.profit || 0), 0),
      total_weight: shipments.reduce((sum, s) => sum + (s.total_weight || 0), 0),
      average_margin: shipments.length > 0 
        ? (shipments.reduce((sum, s) => sum + (s.margin || 0), 0) / shipments.length).toFixed(2)
        : 0,
      status_breakdown: shipments.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {})
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Statistik-Fehler:', err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

// --- WEBCARGO ROUTES ---

// POST /api/webcargo/book - Flug über WebCargo buchen
app.post('/api/webcargo/book', async (req, res) => {
  const { rate, shipment_id, awb_prefix, contact_info } = req.body;
 
  try {
    // Mock Buchung - später durch echte API ersetzen
    const booking = {
      booking_id: `WC${Date.now()}`,
      status: 'confirmed',
      awb: `${awb_prefix || '020'}-${Math.floor(Math.random() * 99999999).toString().padStart(8, '0')}`,
      airline: rate.airline,
      flight: rate.flight_number,
      departure: rate.departure,
      arrival: rate.arrival,
      pieces: req.body.pieces,
      weight: req.body.weight,
      volume: req.body.volume,
      rate: rate.total,
      booking_reference: `${rate.airline_code}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      documents_required: ['AWB', 'Invoice', 'Packing List'],
      cut_off_time: new Date(new Date(rate.departure).getTime() - 3 * 60 * 60 * 1000).toISOString()
    };
   
    // Speichere Buchung in der Datenbank
    const { error: updateError } = await supabase
      .from('shipments')
      .update({
        awb_number: booking.awb,
        flight_number: booking.flight,
        mainrun_partner_id: 1, // WebCargo Partner ID - anpassen!
        booking_reference: booking.booking_reference,
        status: 'booked'
      })
      .eq('id', shipment_id);
     
    if (updateError) throw updateError;
   
    res.json(booking);
   
  } catch (err) {
    console.error('Buchungsfehler:', err);
    res.status(500).json({ error: 'Fehler bei der Buchung' });
  }
});

// --- ERROR HANDLING ---

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route nicht gefunden' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// === KOSTEN-MANAGEMENT ENDPOINTS ===

// GET /api/shipments/:id/costs - Kosten einer Sendung abrufen
app.get('/api/shipments/:id/costs', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select(`
        *,
        cost_requests(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error('Kosten abrufen Fehler:', error);
    res.status(500).json({ error: 'Serverfehler', message: error.message });
  }
});

// POST /api/shipments/:id/costs - Kosten für eine Sendung speichern
app.post('/api/shipments/:id/costs', async (req, res) => {
  try {
    const { id } = req.params;
    const { cost_type, amount, partner, notes, currency = 'EUR', method = 'manual' } = req.body;
    
    if (!cost_type || !['pickup', 'main', 'delivery'].includes(cost_type)) {
      return res.status(400).json({ error: 'Ungültiger cost_type' });
    }
    
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Ungültiger Betrag' });
    }
    
    // Kosten in Haupttabelle aktualisieren
    const costField = `${cost_type}_cost`;
    const statusField = `${cost_type}_cost_status`;
    const partnerField = `${cost_type}_cost_partner`;
    const notesField = `${cost_type}_cost_notes`;
    const receivedField = `${cost_type}_received_at`;
    
    const updateData = {
      [costField]: parseFloat(amount),
      [statusField]: 'received',
      [partnerField]: partner,
      [notesField]: notes,
      [receivedField]: new Date().toISOString()
    };
    
    const { data: shipment, error: updateError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Historie eintragen
    const { error: historyError } = await supabase
      .from('cost_requests')
      .insert({
        shipment_id: parseInt(id),
        cost_type,
        amount: parseFloat(amount),
        partner_name: partner,
        currency,
        status: 'received',
        request_method: method,
        notes,
        received_at: new Date().toISOString()
      });
    
    if (historyError) console.warn('Historie-Fehler:', historyError);
    
    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error('Kosten speichern Fehler:', error);
    res.status(500).json({ error: 'Serverfehler', message: error.message });
  }
});

// POST /api/shipments/:id/create-offer - Angebot aus Kosten erstellen
app.post('/api/shipments/:id/create-offer', async (req, res) => {
  try {
    const { id } = req.params;
    const { margin_amount, margin_percent, valid_days = 14, notes = '' } = req.body;
    
    // Aktuelle Kosten abrufen
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('pickup_cost, main_cost, delivery_cost, position')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    const total_cost = (shipment.pickup_cost || 0) + (shipment.main_cost || 0) + (shipment.delivery_cost || 0);
    
    if (total_cost <= 0) {
      return res.status(400).json({ error: 'Keine Kosten erfasst' });
    }
    
    // Marge berechnen
    let margin = 0;
    if (margin_amount) {
      margin = parseFloat(margin_amount);
    } else if (margin_percent) {
      margin = total_cost * (parseFloat(margin_percent) / 100);
    } else {
      return res.status(400).json({ error: 'Margin Amount oder Percent erforderlich' });
    }
    
    const offer_price = total_cost + margin;
    const calculated_margin_percent = (margin / offer_price) * 100;
    
    const valid_until = new Date();
    valid_until.setDate(valid_until.getDate() + valid_days);
    
    // Angebots-Nummer generieren
    const offer_number = `ANG-${new Date().getFullYear()}-${shipment.position?.replace('ANF-', '') || Date.now()}`;
    
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'ANGEBOT',
        total_cost,
        margin_amount: margin,
        margin_percent: calculated_margin_percent,
        offer_price,
        offer_created_at: new Date().toISOString(),
        offer_valid_until: valid_until.toISOString().split('T')[0]
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // Angebots-Historie erstellen
    const { error: historyError } = await supabase
      .from('offer_history')
      .insert({
        shipment_id: parseInt(id),
        offer_number,
        offer_price,
        margin_amount: margin,
        margin_percent: calculated_margin_percent,
        valid_until: valid_until.toISOString().split('T')[0],
        status: 'draft',
        created_by: 'System', // TODO: User aus Session
        notes
      });
    
    if (historyError) console.warn('Angebots-Historie Fehler:', historyError);
    
    res.json({ 
      success: true, 
      data: updatedShipment,
      offer: {
        offer_number,
        total_cost,
        margin,
        margin_percent: calculated_margin_percent,
        offer_price,
        valid_until
      }
    });
  } catch (error) {
    console.error('Angebot erstellen Fehler:', error);
    res.status(500).json({ error: 'Serverfehler', message: error.message });
  }
});

// POST /api/shipments/:id/convert-to-shipment - Angebot zu Sendung umwandeln
app.post('/api/shipments/:id/convert-to-shipment', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: shipment, error: updateError } = await supabase
      .from('shipments')
      .update({
        status: 'created',
        converted_to_shipment_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    // AWB-Nummer generieren wenn nicht vorhanden
    if (!shipment.awb_number) {
      const awb = `020-${Math.floor(Math.random() * 99999999).toString().padStart(8, '0')}`;
      await supabase
        .from('shipments')
        .update({ awb_number: awb })
        .eq('id', id);
    }
    
    // Historie-Eintrag
    await supabase
      .from('shipment_history')
      .insert([{
        shipment_id: parseInt(id),
        action: 'Angebot zu Sendung umgewandelt',
        details: `Status geändert von ANGEBOT zu created`,
        created_at: new Date().toISOString()
      }]);
    
    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error('Umwandlung Fehler:', error);
    res.status(500).json({ error: 'Serverfehler', message: error.message });
  }
});

// POST /api/shipments/:id/request-costs - Kosten-Anfrage an Partner senden
app.post('/api/shipments/:id/request-costs', async (req, res) => {
  try {
    const { id } = req.params;
    const { cost_type, partner_email, partner_name } = req.body;
    
    // Sendung laden
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Status auf 'requested' setzen
    const statusField = `${cost_type}_cost_status`;
    const requestedField = `${cost_type}_requested_at`;
    
    await supabase
      .from('shipments')
      .update({
        [statusField]: 'requested',
        [requestedField]: new Date().toISOString()
      })
      .eq('id', id);
    
    // Cost Request eintragen
    await supabase
      .from('cost_requests')
      .insert({
        shipment_id: parseInt(id),
        cost_type,
        partner_name,
        partner_email,
        status: 'requested',
        request_method: 'email'
      });
    
    // TODO: Hier würde normalerweise eine E-Mail gesendet
    const emailTemplate = generateCostRequestEmail(shipment, cost_type, partner_name);
    
    res.json({ 
      success: true, 
      message: 'Kosten-Anfrage wurde versendet',
      email_template: emailTemplate 
    });
  } catch (error) {
    console.error('Kosten-Anfrage Fehler:', error);
    res.status(500).json({ error: 'Serverfehler', message: error.message });
  }
});

// Helper function für E-Mail Templates
function generateCostRequestEmail(shipment, cost_type, partner_name) {
  const typeMap = {
    pickup: 'Abholung',
    main: 'Hauptlauf',
    delivery: 'Zustellung'
  };
  
  return {
    to: shipment[`${cost_type}_partner_email`] || '',
    subject: `Kosten-Anfrage ${typeMap[cost_type]} - Ref: ${shipment.reference || shipment.position}`,
    body: `
Sehr geehrtes Team von ${partner_name},

wir benötigen ein Kostenangebot für folgende Sendung:

Referenz: ${shipment.reference || shipment.position}
Service: ${typeMap[cost_type]}
Route: ${shipment.origin_airport || '-'} → ${shipment.destination_airport || '-'}
Gewicht: ${shipment.total_weight || 0} kg
Packstücke: ${shipment.total_pieces || 0}
Volumen: ${shipment.total_volume || 0} m³

${cost_type === 'pickup' ? `Abholadresse: ${shipment.pickup_address || 'Wird nachgereicht'}
Abholdatum: ${shipment.pickup_date || 'Flexible'}` : ''}

${cost_type === 'delivery' ? `Zieladresse: ${shipment.consignee_address || 'Wird nachgereicht'}
Zustelldatum: ${shipment.delivery_date || 'Nach Ankunft'}` : ''}

Bitte senden Sie uns Ihr Angebot mit allen anfallenden Kosten.

Mit freundlichen Grüßen
Ihr LogistikPro Team
    `
  };
}

// Server starten
app.listen(PORT, () => {
  console.log(`✅ LogistikPro Backend läuft auf Port ${PORT}`);
  console.log(`📊 API verfügbar unter: http://localhost:${PORT}/api`);
});

