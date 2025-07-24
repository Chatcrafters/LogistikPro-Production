import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronRight,
  Package,
  Truck,
  Plane,
  Calculator,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Wand2,
  FileText,
  RefreshCw,
  Globe,
  ArrowRight,
  TrendingUp,
  Send,
  Save
} from 'lucide-react';
import WebCargoRates from './WebCargoRates';
import supabase from '../supabaseClient';

const PartnerKalkulation = ({ sendungData, onClose, onComplete }) => {
  console.log('=== PartnerKalkulation Debug ===');
  console.log('sendungData:', sendungData);
  console.log('Von:', sendungData.vonFlughafen);
  console.log('Nach:', sendungData.nachFlughafen);
  console.log('GEWICHT:', sendungData.gesamtGewicht);
  console.log('VOLUMEN:', sendungData.gesamtVolumen);
  console.log('COLLI:', sendungData.gesamtColli);
  const [step, setStep] = useState(1); // 1: Partner, 2: Kalkulation, 3: Aktionen
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWebCargo, setShowWebCargo] = useState(false);
  const [selectedWebCargoRate, setSelectedWebCargoRate] = useState(null);
  const [showMagicCostInput, setShowMagicCostInput] = useState(false);
  const [magicCostText, setMagicCostText] = useState('');
 
  const [partners, setPartners] = useState({
    abholung: null,
    hauptlauf: null,
    zustellung: null
  });

  const [kosten, setKosten] = useState({
    abholung: { status: 'pending', betrag: 0 },
    hauptlauf: { status: 'pending', betrag: 0 },
    zustellung: { status: 'pending', betrag: 0 }
  });
 
  const [vkKalkulation, setVkKalkulation] = useState({
    historischeMargen: [],
    empfohlenerVK: 0,
    gewaehlterVK: 0,
    profit: 0,
    marge: 0
  });

  // 🧠 INTELLIGENTE PARTNER-DEFAULTS (Basierend auf Real Data Analysis)
  const getIntelligentDefaults = useCallback((sendungsData) => {
    if (!sendungsData || !availablePartners.length) return {};

    const { 
      vonFlughafen, 
      nachFlughafen, 
      transportArt, 
      empfaenger,
      abholAdresse 
    } = sendungsData;

    let suggestions = {
      pickup: null,
      mainrun: [],
      delivery: null,
      confidence: {}
    };

    console.log('🧠 Calculating intelligent defaults for:', { vonFlughafen, nachFlughafen, transportArt });

    // 1. ABHOLUNG-DEFAULTS (Basierend auf 25 Sendungen Analyse)
    if (transportArt === 'luftfracht-teile' || transportArt === 'luftfracht') {
      if (vonFlughafen === 'STR') {
        // Stuttgart → HuT (95% Confidence - 20/25 Sendungen)
        const hutPartner = availablePartners.find(p => p.id === 1 || p.name === 'HuT');
        if (hutPartner) {
          suggestions.pickup = hutPartner.id;
          suggestions.confidence.pickup = 95;
          console.log('✅ Auto-selected HuT for STR (95% confidence)');
        }
      } else if (vonFlughafen === 'FRA') {
        // Frankfurt → BAT (85% Confidence - 5/8 FRA Sendungen)
        const batPartner = availablePartners.find(p => p.id === 23 || p.name.includes('BAT') || p.name.includes('Blue Transport'));
        if (batPartner) {
          suggestions.pickup = batPartner.id;
          suggestions.confidence.pickup = 85;
          console.log('✅ Auto-selected BAT for FRA (85% confidence)');
        }
      }
    } else if (transportArt === 'luftfracht-fahrzeuge') {
      // Fahrzeuge → Böpple (100% Confidence - Einziger Spezialist)
      const boepplePartner = availablePartners.find(p => p.id === 2 || p.name.includes('Böpple'));
      if (boepplePartner) {
        suggestions.pickup = boepplePartner.id;
        suggestions.confidence.pickup = 100;
        console.log('✅ Auto-selected Böpple for vehicles (100% confidence)');
      }
    }

    // 2. HAUPTLAUF-DEFAULTS (Basierend auf 25 Sendungen)
    const zielLand = empfaenger?.land || getCountryFromAirport(nachFlughafen);
    
    if (transportArt?.includes('luftfracht')) {
      // Lufthansa primär (18/25 Sendungen), Air France sekundär (3/25)
      const lufthansaPartner = availablePartners.find(p => p.id === 7 || p.name.includes('Lufthansa'));
      const airFrancePartner = availablePartners.find(p => p.id === 8 || p.name.includes('Air France'));
      const webCargoPartner = availablePartners.find(p => p.id === 27 || p.name.includes('WebCargo'));
      
      if (lufthansaPartner) suggestions.mainrun.push(lufthansaPartner.id);
      if (airFrancePartner) suggestions.mainrun.push(airFrancePartner.id);
      if (webCargoPartner) suggestions.mainrun.push(webCargoPartner.id);
      
      suggestions.confidence.mainrun = 85;
      console.log('✅ Auto-selected primary airlines based on usage data');
    }

    // 3. ZUSTELLUNG-DEFAULTS (Basierend auf Destination Analysis)
    if (zielLand === 'US' || ['LAX', 'ATL', 'JFK', 'MIA', 'ORD', 'DEN', 'DTW'].includes(nachFlughafen)) {
      // USA → Schaefer-Gruppe (verschiedene Hubs)
      let schaeferPartner = null;
      let confidence = 80;

      if (nachFlughafen === 'LAX') {
        schaeferPartner = availablePartners.find(p => p.id === 11 || (p.name.includes('Schaefer') && p.name.includes('LAX')));
        confidence = 90;
      } else if (nachFlughafen === 'ATL') {
        schaeferPartner = availablePartners.find(p => p.id === 28 || (p.name.includes('Schaefer') && p.name.includes('ATL')));
        confidence = 85;
      } else if (nachFlughafen === 'JFK') {
        schaeferPartner = availablePartners.find(p => p.id === 30 || (p.name.includes('Schaefer') && p.name.includes('JFK')));
        confidence = 85;
      } else if (nachFlughafen === 'MIA') {
        schaeferPartner = availablePartners.find(p => p.id === 29 || (p.name.includes('Schaefer') && p.name.includes('MIA')));
        confidence = 80;
      } else {
        // Fallback: Generischer Schaefer
        schaeferPartner = availablePartners.find(p => p.name.includes('Schaefer'));
        confidence = 70;
      }

      if (schaeferPartner) {
        suggestions.delivery = schaeferPartner.id;
        suggestions.confidence.delivery = confidence;
        console.log(`✅ Auto-selected ${schaeferPartner.name} for ${nachFlughafen} (${confidence}% confidence)`);
      }
    } else if (zielLand === 'AU' || nachFlughafen === 'MEL') {
      // Australien → CARS (95% Confidence - 6/6 MEL Sendungen)
      const carsPartner = availablePartners.find(p => p.id === 12 || p.name.includes('CARS'));
      if (carsPartner) {
        suggestions.delivery = carsPartner.id;
        suggestions.confidence.delivery = 95;
        console.log('✅ Auto-selected CARS for Australia (95% confidence)');
      }
    } else if (zielLand === 'AE' || nachFlughafen === 'DXB') {
      // Dubai → CARS (100% Confidence)
      const carsPartner = availablePartners.find(p => p.id === 12 || p.name.includes('CARS'));
      if (carsPartner) {
        suggestions.delivery = carsPartner.id;
        suggestions.confidence.delivery = 100;
        console.log('✅ Auto-selected CARS for Dubai (100% confidence)');
      }
    }

    return suggestions;
  }, [availablePartners]);

  // Helper function: Airport zu Land Mapping
  const getCountryFromAirport = (airportCode) => {
    const airportCountries = {
      // USA
      'LAX': 'US', 'JFK': 'US', 'ORD': 'US', 'ATL': 'US', 'MIA': 'US', 
      'DEN': 'US', 'DTW': 'US', 'SAN': 'US',
      // Australien  
      'MEL': 'AU', 'SYD': 'AU', 'BNE': 'AU',
      // UAE
      'DXB': 'AE', 'AUH': 'AE',
      // Europa
      'LHR': 'GB', 'CDG': 'FR', 'AMS': 'NL', 'ZUR': 'CH',
      // Deutschland
      'FRA': 'DE', 'MUC': 'DE', 'STR': 'DE', 'HAM': 'DE', 'CGN': 'DE'
    };
    return airportCountries[airportCode] || 'Unknown';
  };

  // 🎯 INTELLIGENTE DEFAULTS ANWENDEN
  const applyIntelligentDefaults = useCallback(() => {
    if (!sendungData) return;

    const defaults = getIntelligentDefaults(sendungData);
    
    // Wende nur Defaults an, wenn noch keine Partner ausgewählt sind
    if (defaults.pickup && !partners.abholung) {
      setPartners(prev => ({
        ...prev,
        abholung: defaults.pickup
      }));
      // Automatisch Kosten abrufen
      kostenAbrufen('abholung', defaults.pickup);
      console.log('🎯 Applied pickup default:', defaults.pickup);
    }

    if (defaults.mainrun.length > 0 && !partners.hauptlauf) {
      // Nehme den ersten (primären) Partner
      const primaryMainrun = defaults.mainrun[0];
      setPartners(prev => ({
        ...prev,
        hauptlauf: primaryMainrun
      }));
      console.log('🎯 Applied mainrun default:', primaryMainrun);
    }

    if (defaults.delivery && !partners.zustellung) {
      setPartners(prev => ({
        ...prev,
        zustellung: defaults.delivery
      }));
      // Automatisch Kosten abrufen
      kostenAbrufen('zustellung', defaults.delivery);
      console.log('🎯 Applied delivery default:', defaults.delivery);
    }

    // Confidence-Scores für UI anzeigen
    if (Object.keys(defaults.confidence).length > 0) {
      console.log('📊 Confidence scores:', defaults.confidence);
    }
  }, [sendungData, getIntelligentDefaults, partners]);

  // Auto-apply defaults when sendungsData and partners are loaded
  useEffect(() => {
    if (sendungData && availablePartners.length > 0) {
      // Kleine Verzögerung um sicherzustellen, dass alle Partner geladen sind
      setTimeout(() => {
        applyIntelligentDefaults();
      }, 500);
    }
  }, [sendungData, availablePartners, applyIntelligentDefaults]);

  // Magic Cost Input Handler
  const handleMagicCostInput = (text) => {
    console.log('Magic Cost Input:', text);
    
    // Kosten-Pattern für verschiedene Services
    const costPatterns = [
      // Vorlauf/Pickup Kosten
      { regex: /pick\s*up[^:$]*:\s*\$?([\d,]+)/i, type: 'pickup', name: 'Pickup' },
      { regex: /transfer to [A-Z]{3}[^:$]*:\s*\$?([\d,]+)/i, type: 'pickup', name: 'Transfer to Airport' },
      
      // Hauptlauf/Air Freight
      { regex: /air freight[^:$]*:\s*\$?([\d.]+)\/kg/i, type: 'airfreight', name: 'Air Freight', unit: '/kg' },
      { regex: /fuel surcharge[^:$]*:\s*\$?([\d.]+)/i, type: 'airfreight', name: 'FSC' },
      { regex: /security[^:$]*:\s*\$?([\d.]+)/i, type: 'airfreight', name: 'Security' },
      
      // Nachlauf/Delivery Kosten  
      { regex: /customs clearance[^:$]*:\s*\$?([\d,]+)/i, type: 'customs', name: 'Customs Clearance' },
      { regex: /ISF[^:$]*:\s*\$?([\d,]+)(?:\/awb)?/i, type: 'customs', name: 'ISF' },
      { regex: /trucking[^:$]*:\s*\$?([\d,]+)/i, type: 'delivery', name: 'Trucking' },
      { regex: /handling[^:$]*:\s*\$?([\d,]+)(?:\/awb)?/i, type: 'handling', name: 'Handling' },
      { regex: /messenger[^:$]*:\s*\$?([\d,]+)/i, type: 'delivery', name: 'Messenger' },
      { regex: /carnet[^:$]*:\s*\$?([\d,]+)/i, type: 'customs', name: 'Carnet' },
      { regex: /wait(?:ing)? time[^:$]*:\s*\$?([\d,]+)\/hr/i, type: 'delivery', name: 'Waiting Time', unit: '/hr' },
      { regex: /overnight[^:$]*:\s*\$?([\d,]+)/i, type: 'delivery', name: 'Overnight' },
      
      // Combined/Total
      { regex: /combined[^:$]*:\s*\$?([\d,]+)/i, type: 'combined', name: 'Combined Transport' },
      { regex: /together[^:$]*:\s*\$?([\d,]+)/i, type: 'combined', name: 'Combined Rate' }
    ];
    
    const erkannteKosten = [];
    const erkannteOptionen = {};
    
    // Prüfe ob es verschiedene Optionen gibt (Denver Option, LA Option etc.)
    const optionMatches = text.matchAll(/\*\*([^*]+Option)[^*]*\*\*/gi);
    const hasOptions = Array.from(optionMatches).length > 0;
    
    if (hasOptions) {
      // Parse nach Optionen getrennt
      const optionBlocks = text.split(/\*\*[^*]+Option[^*]*\*\*/i);
      optionBlocks.forEach((block, index) => {
        if (index === 0) return; // Skip text vor erster Option
        
        const optionName = text.match(new RegExp(`\\*\\*([^*]+Option)[^*]*\\*\\*`, 'gi'))?.[index-1]?.replace(/\*/g, '').trim() || `Option ${index}`;
        erkannteOptionen[optionName] = [];
        
        costPatterns.forEach(pattern => {
          const matches = block.matchAll(new RegExp(pattern.regex, 'gi'));
          for (const match of matches) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            erkannteOptionen[optionName].push({
              name: pattern.name,
              amount: amount,
              type: pattern.type,
              unit: pattern.unit || null
            });
          }
        });
      });
    } else {
      // Normale Erkennung ohne Optionen
      costPatterns.forEach(pattern => {
        const matches = text.matchAll(new RegExp(pattern.regex, 'gi'));
        for (const match of matches) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          erkannteKosten.push({
            name: pattern.name,
            amount: amount,
            type: pattern.type,
            unit: pattern.unit || null
          });
        }
      });
    }
    
    // Zeige erkannte Kosten
    if (Object.keys(erkannteOptionen).length > 0) {
      console.log('Erkannte Optionen:', erkannteOptionen);
      
      // Zeige Optionen zur Auswahl
      let optionText = '✅ Mehrere Optionen erkannt:\n\n';
      Object.entries(erkannteOptionen).forEach(([option, costs]) => {
        const total = costs.reduce((sum, c) => sum + (c.unit === '/kg' ? c.amount * (sendungData.gesamtGewicht || 1) : c.amount), 0);
        optionText += `${option}:\n`;
        costs.forEach(c => {
          optionText += `  - ${c.name}: $${c.amount}${c.unit || ''}\n`;
        });
        optionText += `  Gesamt: $${total.toFixed(2)}\n\n`;
      });
      
      alert(optionText + 'Bitte wählen Sie eine Option für die Kalkulation.');
      
      // TODO: Option-Auswahl UI implementieren
      
    } else if (erkannteKosten.length > 0) {
      console.log('Erkannte Kosten:', erkannteKosten);
      
      // Berechne Gesamtkosten nach Typ
      const nachTyp = {
        abholung: 0,
        hauptlauf: 0,
        zustellung: 0
      };
      
      erkannteKosten.forEach(k => {
        let betrag = k.amount;
        
        // Bei /kg mit Gewicht multiplizieren
        if (k.unit === '/kg' && sendungData.gesamtGewicht) {
          betrag = k.amount * sendungData.gesamtGewicht;
        }
        
        // Zuordnung zu Kostentypen
        if (k.type === 'pickup') {
          nachTyp.abholung += betrag;
        } else if (k.type === 'airfreight') {
          nachTyp.hauptlauf += betrag;
        } else if (['customs', 'delivery', 'handling'].includes(k.type)) {
          nachTyp.zustellung += betrag;
        }
      });
      
      // Aktualisiere Kosten wenn gewünscht
      if (confirm(`Erkannte Kosten übernehmen?\n\nAbholung: $${nachTyp.abholung.toFixed(2)}\nHauptlauf: $${nachTyp.hauptlauf.toFixed(2)}\nZustellung: $${nachTyp.zustellung.toFixed(2)}`)) {
        if (nachTyp.abholung > 0) {
          setKosten(prev => ({
            ...prev,
            abholung: { status: 'manual', betrag: nachTyp.abholung }
          }));
        }
        if (nachTyp.hauptlauf > 0) {
          setKosten(prev => ({
            ...prev,
            hauptlauf: { status: 'manual', betrag: nachTyp.hauptlauf }
          }));
        }
        if (nachTyp.zustellung > 0) {
          setKosten(prev => ({
            ...prev,
            zustellung: { status: 'manual', betrag: nachTyp.zustellung }
          }));
        }
      }
    } else {
      alert('Keine Kosten erkannt. Bitte prüfen Sie das Format.');
    }
    
    setShowMagicCostInput(false);
    setMagicCostText('');
  };

  // Debug useEffect
  useEffect(() => {
    console.log('showWebCargo State geändert zu:', showWebCargo);
  }, [showWebCargo]);

  // Lade echte Partner aus der Datenbank
  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      console.log('Lade Partner...');
      
      // SUPABASE statt Express API
      const { data: partners, error } = await supabase
        .from('partners')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      console.log('Partner geladen:', partners);
      console.log('Agent-Partner:', partners?.filter(p => p.type === 'agent'));
      setAvailablePartners(partners || []);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Partner:', error);
      
      // FALLBACK: Mock-Partner falls Supabase nicht verfügbar
      const mockPartners = [
        { id: 1, name: 'HuT', type: 'carrier' },
        { id: 2, name: 'Böpple Automotive GmbH', type: 'carrier' },
        { id: 23, name: 'BT Blue Transport UG', type: 'carrier' },
        { id: 7, name: 'Lufthansa Cargo', type: 'airline' },
        { id: 8, name: 'Air France Cargo', type: 'airline' },
        { id: 27, name: 'WebCargo', type: 'platform' },
        { id: 11, name: 'Schaefer Trans LAX', type: 'agent' },
        { id: 12, name: 'CARS Melbourne', type: 'agent' },
        { id: 28, name: 'Schaefer Trans ATL', type: 'agent' },
        { id: 29, name: 'Schaefer Trans MIA', type: 'agent' },
        { id: 30, name: 'Schaefer Trans JFK', type: 'agent' }
      ];
      
      setAvailablePartners(mockPartners);
      setLoading(false);
    }
  };

// Hole passende Partner basierend auf Typ und Service
  const getPartnersByType = (type) => {
    if (type === 'abholung') {
      // Filter nach Flughafen für Abholung
      const airport = sendungData.vonFlughafen || 'STR';
      return availablePartners.filter(p => {
        // HuT nur für STR
        if (p.name === 'HuT' && airport !== 'STR') return false;
        // BT Blue nur für FRA
        if (p.name === 'BT Blue Transport UG' && airport !== 'FRA') return false;
        // Böpple für beide
        return ['HuT', 'Böpple Automotive GmbH', 'BT Blue Transport UG'].includes(p.name);
      });
    } else if (type === 'hauptlauf') {
      return availablePartners.filter(p =>
        ['Lufthansa Cargo', 'Air France Cargo', 'Turkish Cargo', 'WebCargo'].includes(p.name)
      );
    } else if (type === 'zustellung') {
      // Zeige einfach alle Agents an, da es nur wenige gibt
      return availablePartners.filter(p => p.type === 'agent');
    }
    return [];
  };

  // Kosten abrufen (API oder manuell)
  const kostenAbrufen = async (typ, partnerId) => {
    setKosten(prev => ({
      ...prev,
      [typ]: { status: 'loading', betrag: 0 }
    }));

    const partner = availablePartners.find(p => p.id === partnerId);
    
    try {
      // Nur für Abholung: Nutze echte Tarife
      if (typ === 'abholung') {
        let pickupPLZ = '70173'; // Fallback Stuttgart
        
        // Hole PLZ aus sendungData wenn vorhanden
        if (sendungData.pickup_address && sendungData.pickup_address.zip) {
          pickupPLZ = sendungData.pickup_address.zip;
          console.log('PLZ aus pickup_address:', pickupPLZ);
        } else if (sendungData.abholort_plz) {
          pickupPLZ = sendungData.abholort_plz;
          console.log('PLZ aus abholort_plz:', pickupPLZ);
        } else if (sendungData.abholort) {
          // Fallback: Versuche aus String zu extrahieren
          const plzMatch = sendungData.abholort.match(/\b(\d{5})\b/);
          if (plzMatch) {
            pickupPLZ = plzMatch[1];
          } else {
            // Ortsnamen-Fallback
            const ortLower = sendungData.abholort.toLowerCase();
            if (ortLower.includes('affalterbach')) {
              pickupPLZ = '71563';
            }
          }
        }
        
        console.log('Finale PLZ für Tarifberechnung:', pickupPLZ);
        
        // SUPABASE: Versuche Zone-Lookup
        try {
          const { data: zoneData, error: zoneError } = await supabase
            .from('hut_postal_zones')
            .select('zone')
            .eq('plz', pickupPLZ)
            .single();
          
          if (!zoneError && zoneData) {
            // Zone gefunden, jetzt Tarif suchen
            const { data: rateData, error: rateError } = await supabase
              .from('partner_base_rates')
              .select('price')
              .eq('partner_id', partnerId)
              .eq('zone', zoneData.zone)
              .lte('weight_from', sendungData.gesamtGewicht || 0)
              .gte('weight_to', sendungData.gesamtGewicht || 0)
              .single();
            
            if (!rateError && rateData) {
              setKosten(prev => ({
                ...prev,
                [typ]: { 
                  status: 'calculated', 
                  betrag: parseFloat(rateData.price),
                  partner_id: partnerId,
                  partner_name: partner.name,
                  details: { zone: zoneData.zone, plz: pickupPLZ },
                  source: 'database'
                }
              }));
              return;
            }
          }
        } catch (dbError) {
          console.log('Database-Tarif nicht verfügbar:', dbError.message);
        }
      }
      
      // Fallback für andere Typen oder wenn keine Tarife gefunden
      setKosten(prev => ({
        ...prev,
        [typ]: { 
          status: 'manual', 
          betrag: 0,
          partner_id: partnerId,
          partner_name: partner?.name || 'Unbekannt',
          message: typ === 'abholung' ? 'Keine Tarife für diese Route' : 'Manuelle Anfrage erforderlich'
        }
      }));
      
    } catch (error) {
      console.error('Fehler beim Abrufen der Kosten:', error);
      setKosten(prev => ({
        ...prev,
        [typ]: { 
          status: 'manual', 
          betrag: 0,
          partner_id: partnerId,
          partner_name: partner?.name || 'Unbekannt',
          message: 'Fehler bei der Tarifabfrage: ' + error.message
        }
      }));
    }
  };

  // VK berechnen mit historischen Daten
  const berechneVK = () => {
    const gesamtKosten = Object.values(kosten).reduce((sum, k) => sum + k.betrag, 0);
    
    // Mock historische Daten
    const historisch = [
      { kunde: sendungData.kunde, route: `${sendungData.vonFlughafen}-${sendungData.nachFlughafen}`, marge: 22 },
      { kunde: sendungData.kunde, route: 'Andere', marge: 19 },
      { kunde: 'Alle', route: `${sendungData.vonFlughafen}-${sendungData.nachFlughafen}`, marge: 21 }
    ];
    
    const durchschnittsMarge = historisch.reduce((sum, h) => sum + h.marge, 0) / historisch.length;
    const empfohlenerVK = Math.round(gesamtKosten * (1 + durchschnittsMarge / 100));
    
    setVkKalkulation({
      historischeMargen: historisch,
      empfohlenerVK: empfohlenerVK,
      gewaehlterVK: empfohlenerVK,
      profit: empfohlenerVK - gesamtKosten,
      marge: durchschnittsMarge
    });
  };

  useEffect(() => {
    if (Object.values(kosten).every(k => k.status !== 'pending' && k.status !== 'loading')) {
      berechneVK();
    }
  }, [kosten]);

  const handleVKChange = (neuerVK) => {
    const gesamtKosten = Object.values(kosten).reduce((sum, k) => sum + k.betrag, 0);
    const profit = neuerVK - gesamtKosten;
    const marge = gesamtKosten > 0 ? ((profit / neuerVK) * 100) : 0;
    
    setVkKalkulation(prev => ({
      ...prev,
      gewaehlterVK: neuerVK,
      profit: profit,
      marge: marge
    }));
  };

 const handleSaveAsAnfrage = async () => {
  // ✅ VALIDIERUNG: Prüfe ob mindestens ein Partner ausgewählt wurde
  const hasPartners = partners.abholung || partners.hauptlauf || partners.zustellung;
  
  if (!hasPartners) {
    alert('⚠️ Bitte wählen Sie mindestens einen Partner aus bevor Sie die Anfrage speichern.\n\n📋 Workflow:\n1. Partner für Abholung/Hauptlauf/Zustellung auswählen\n2. Kosten abrufen lassen\n3. Als Anfrage speichern');
    return;
  }

  // 🔧 DEBUG: Zeige aktuelle Partner und Kosten
  console.log('=== ANFRAGE SPEICHERN DEBUG ===');
  console.log('Partners:', partners);
  console.log('Kosten:', kosten);
  console.log('selectedWebCargoRate:', selectedWebCargoRate);

  try {
    // Finde die customer_id
    let customerId = sendungData.kunde_id || sendungData.customer_id;
    
    // Falls keine ID vorhanden, versuche über den Namen zu finden
    if (!customerId && sendungData.kunde) {
      // Hier müssten wir eigentlich die Kunden aus der DB laden
      // Für jetzt verwenden wir eine Fallback-ID
      customerId = 1; // Fallback
    }
    
    // Erstelle Anfrage-Objekt mit allen erforderlichen Feldern
    const anfrageData = {
      // Pflichtfelder - KÜRZER für 20 Zeichen Limit!
      position: `ANF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      customer_id: parseInt(customerId) || 1,
      status: 'ANFRAGE',
      
      // Basis-Daten
      reference: sendungData.referenz || null,
      import_export: (sendungData.importExport || 'export').toUpperCase(),
      transport_type: sendungData.transportArt === 'luftfracht' ? 'AIR' : 
                      sendungData.transportArt === 'seefracht' ? 'SEA' : 'TRUCK',
      
      // Route
      origin_airport: sendungData.vonFlughafen || null,
      destination_airport: sendungData.nachFlughafen || null,
      from_city: sendungData.from_city || sendungData.abholort?.split(',')[0]?.trim() || null,
      to_city: sendungData.empfaenger?.ort || sendungData.to_city || null,
      
      // Termine
      pickup_date: sendungData.abholDatum || null,
      pickup_time: sendungData.abholZeit || null,
      delivery_date: sendungData.deadline || null,
      
      // Partner IDs (als Zahlen!)
      pickup_partner_id: partners.abholung ? parseInt(partners.abholung) : null,
      mainrun_partner_id: partners.hauptlauf ? parseInt(partners.hauptlauf) : null,
      delivery_partner_id: partners.zustellung ? parseInt(partners.zustellung) : null,
      
      // 💰 KOSTEN AUS KALKULATION ÜBERNEHMEN - MIT DEBUG
      pickup_cost: (() => {
        const cost = kosten.abholung?.betrag || 0;
        console.log('🚚 DEBUG Pickup Cost:', cost, 'aus kosten.abholung:', kosten.abholung);
        return cost;
      })(),
      main_cost: (() => {
        const hauptlaufCost = kosten.hauptlauf?.betrag || 0;
        const webCargoCost = selectedWebCargoRate?.total || 0;
        const total = hauptlaufCost + webCargoCost;
        console.log('✈️ DEBUG Main Cost:', total, '= hauptlauf:', hauptlaufCost, '+ webCargo:', webCargoCost);
        console.log('selectedWebCargoRate:', selectedWebCargoRate);
        return total;
      })(),
      delivery_cost: (() => {
        const cost = kosten.zustellung?.betrag || 0;
        console.log('📦 DEBUG Delivery Cost:', cost, 'aus kosten.zustellung:', kosten.zustellung);
        return cost;
      })(),

  // Gewichte & Packstücke
  total_weight: parseFloat(sendungData.gesamtGewicht) || 0,
  total_pieces: parseInt(sendungData.gesamtColli) || 0,
  total_volume: parseFloat(sendungData.gesamtVolumen) || 0,
  
  // Alias-Felder für Kompatibilität
  weight: parseFloat(sendungData.gesamtGewicht) || 0,
  volume: parseFloat(sendungData.gesamtVolumen) || 0,
  
  // Empfänger
  consignee_name: sendungData.empfaenger?.name || null,
  consignee_address: sendungData.empfaenger?.strasse || null,
  consignee_zip: sendungData.empfaenger?.plz || null,
  consignee_city: sendungData.empfaenger?.ort || null,
  consignee_country: sendungData.empfaenger?.land || null,
  
  // Doppelte Felder für Kompatibilität
  recipient_name: sendungData.empfaenger?.name || null,
  recipient_street: sendungData.empfaenger?.strasse || null,
  recipient_zip: sendungData.empfaenger?.plz || null,
  recipient_city: sendungData.empfaenger?.ort || null,
  recipient_country: sendungData.empfaenger?.land || null,
  
  // Standard-Werte
  incoterm: 'CPT',
  commodity: sendungData.warenbeschreibung || null,
  
  // Partner-Namen für Anzeige
  pickup_partner: availablePartners.find(p => p.id === partners.abholung)?.name || null,
  mainrun_partner: availablePartners.find(p => p.id === partners.hauptlauf)?.name || null,
  delivery_partner: availablePartners.find(p => p.id === partners.zustellung)?.name || null,
  
  // PIECES ARRAY
  pieces: sendungData.colli?.map(c => ({
    quantity: parseInt(c.anzahl) || 1,
    weight_per_piece: parseFloat(c.gewichtProStueck) || 0,
    length: parseFloat(c.laenge) || 0,
    width: parseFloat(c.breite) || 0,
    height: parseFloat(c.hoehe) || 0,
    volume: parseFloat(c.volumen) || 0
  })) || [{
    quantity: parseInt(sendungData.gesamtColli) || 1,
    weight_per_piece: (parseFloat(sendungData.gesamtGewicht) || 0) / (parseInt(sendungData.gesamtColli) || 1),
    length: 0,
    width: 0,
    height: 0,
    volume: (parseFloat(sendungData.gesamtVolumen) || 0) / (parseInt(sendungData.gesamtColli) || 1)
  }],
};
    
    // HIER DIE DEBUG-AUSGABEN - NACH anfrageData!
    console.log('=== ANFRAGE DATEN DEBUG ===');
    console.log('pieces:', anfrageData.pieces);
    console.log('typeof pieces:', typeof anfrageData.pieces);
    console.log('is Array?:', Array.isArray(anfrageData.pieces));
    console.log('Sende Anfrage-Daten:', JSON.stringify(anfrageData, null, 2));
    
    // Speichere in Datenbank
    // SUPABASE statt Express API
      const { data, error } = await supabase
        .from('shipments')
        .insert(anfrageData)
        .select()
        .single();

      if (error) {
        console.error('Supabase-Fehler:', error);
        throw error;
      }

      const savedShipment = data;
      console.log('Anfrage gespeichert:', savedShipment);

      // Zeige Erfolg
      alert(`✅ Anfrage wurde gespeichert!\n\nSendungs-Nr: ${savedShipment.id}\nStatus: ANFRAGE\n\nOffene Anfragen:\n${
        kosten.abholung.status !== 'calculated' ? `- ${availablePartners.find(p => p.id === partners.abholung)?.name} (Abholung)\n` : ''
      }${
        !selectedWebCargoRate ? `- ${availablePartners.find(p => p.id === partners.hauptlauf)?.name} (Hauptlauf)\n` : ''
      }- ${availablePartners.find(p => p.id === partners.zustellung)?.name} (Zustellung)`);

      // Schließe Modal und lade Seite neu
      onClose();
      
      // Warte kurz, dann Seite neu laden
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Fehler beim Speichern der Anfrage:', error);
      alert('Fehler beim Speichern der Anfrage: ' + error.message);
    }
  };
  const handleComplete = async () => {
    // Speichere die Kalkulation in der Datenbank
    try {
      const quotationData = {
        shipment_id: sendungData.id,
        pickup_partner_id: partners.abholung,
        pickup_cost: kosten.abholung.betrag,
        pickup_status: kosten.abholung.status === 'calculated' ? 'calculated' : 'requested',
        main_partner_id: partners.hauptlauf,
        main_cost: kosten.hauptlauf.betrag,
        main_status: kosten.hauptlauf.status === 'calculated' || kosten.hauptlauf.status === 'api' ? 'calculated' : 'requested',
        delivery_partner_id: partners.zustellung,
        delivery_cost: kosten.zustellung.betrag,
        delivery_status: kosten.zustellung.status === 'calculated' ? 'calculated' : 'requested',
        total_cost: Object.values(kosten).reduce((sum, k) => sum + k.betrag, 0),
        selling_price: vkKalkulation.gewaehlterVK,
        profit: vkKalkulation.profit,
        margin: vkKalkulation.marge
      };
      
      const response = await fetch('http://localhost:3001/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Speichern der Kalkulation');
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Kalkulation:', error);
    }
    
    // WICHTIG: Erstelle das komplette Shipment-Objekt mit allen notwendigen Feldern
    const completeShipmentData = {
      // Kunde und Basis-Infos
      customer_id: sendungData.kunde_id || sendungData.customer_id, // ID, nicht Name!
      reference: sendungData.referenz,
      import_export: sendungData.importExport,
      transport_type: sendungData.transportArt === 'luftfracht' ? 'AIR' : 
                      sendungData.transportArt === 'seefracht' ? 'SEA' : 'TRUCK',
      
      // Flughäfen/Orte - WICHTIG: Alle Varianten für Kompatibilität
      from_airport: sendungData.vonFlughafen,
      to_airport: sendungData.nachFlughafen,
      origin_airport: sendungData.vonFlughafen,
      destination_airport: sendungData.nachFlughafen,
      
      // Städte
      from_city: sendungData.from_city || sendungData.abholort?.split(',')[1]?.trim() || 'N/A',
      to_city: sendungData.empfaenger?.ort || sendungData.to_city || 'N/A',
      
      // Abholung
      pickup_date: sendungData.abholDatum,
      pickup_address_id: sendungData.abholAdresseId || sendungData.abholort_id,
      
      // Partner
      pickup_partner_id: partners.abholung,
      mainrun_partner_id: partners.hauptlauf,
      delivery_partner_id: partners.zustellung,
      
      // Kosten
      cost_pickup: kosten.abholung.betrag || 0,
      cost_mainrun: kosten.hauptlauf.betrag || 0,
      cost_delivery: kosten.zustellung.betrag || 0,
      selling_price: vkKalkulation.gewaehlterVK || 0,
      profit: vkKalkulation.profit || 0,
      margin: vkKalkulation.marge || 0,
      
      // Packstücke - WICHTIG: Das richtige Format!
      pieces: sendungData.colli?.map(c => ({
        quantity: parseInt(c.anzahl) || 1,
        weight_per_piece: parseFloat(c.gewichtProStueck) || 0,
        length: parseFloat(c.laenge) || 0,
        width: parseFloat(c.breite) || 0,
        height: parseFloat(c.hoehe) || 0,
        volume: parseFloat(c.volumen) || 0,
        description: sendungData.warenbeschreibung || '',
        packaging_type: 'box'
      })) || [],
      
      // Weitere Felder
      incoterm: sendungData.frankatur || sendungData.incoterm || 'CPT',
      airline: selectedWebCargoRate?.airline || availablePartners.find(p => p.id === partners.hauptlauf)?.name,
      flight_number: selectedWebCargoRate?.flight_number,
      awb_number: selectedWebCargoRate?.awb,
      eta: selectedWebCargoRate?.arrival || sendungData.deadline,
      delivery_date: sendungData.deadline,
      
      // Gewicht und Volumen Totale
      total_weight: sendungData.gesamtGewicht || 0,
      total_pieces: sendungData.gesamtColli || 0,
      total_volume: sendungData.gesamtVolumen || 0,
      
      // Empfänger (für spätere Verwendung)
      consignee_name: sendungData.empfaenger?.name,
      consignee_address: sendungData.empfaenger?.strasse,
      consignee_zip: sendungData.empfaenger?.plz,
      consignee_city: sendungData.empfaenger?.ort,
      consignee_country: sendungData.empfaenger?.land
    };
    
    console.log('=== COMPLETE SHIPMENT DATA ===', completeShipmentData);
    console.log('Customer ID:', completeShipmentData.customer_id);
    console.log('From Airport:', completeShipmentData.from_airport);
    console.log('To Airport:', completeShipmentData.to_airport);
    console.log('Total Weight:', completeShipmentData.total_weight);
    console.log('Pieces:', completeShipmentData.pieces);
    
    // Übergebe die Daten an das Parent
    if (onComplete) {
      onComplete(completeShipmentData);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 60 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Lade Partner...</div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Partner werden aus der Datenbank geladen</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem', 
      zIndex: 60 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
        maxWidth: '60rem', 
        width: '100%', 
        maxHeight: '95vh', 
        overflow: 'hidden' 
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', 
          borderBottom: '1px solid #e5e7eb', 
          backgroundColor: '#f9fafb', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
              <Calculator style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Partnerzuweisung & Kalkulation
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              {sendungData.position} • {sendungData.kunde} • {sendungData.vonFlughafen} → {sendungData.nachFlughafen}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: '8px', cursor: 'pointer', border: 'none', background: 'none' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Progress Steps */}
        <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: step >= 1 ? '#2563eb' : '#e5e7eb',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px'
              }}>1</div>
              <span style={{ fontSize: '0.875rem', fontWeight: step === 1 ? '600' : '400' }}>Partner</span>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: step >= 2 ? '#2563eb' : '#e5e7eb',
                color: step >= 2 ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px'
              }}>2</div>
              <span style={{ fontSize: '0.875rem', fontWeight: step === 2 ? '600' : '400' }}>Kalkulation</span>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                backgroundColor: step >= 3 ? '#2563eb' : '#e5e7eb',
                color: step >= 3 ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px'
              }}>3</div>
              <span style={{ fontSize: '0.875rem', fontWeight: step === 3 ? '600' : '400' }}>Aktionen</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(85vh - 180px)' }}>
          
          {/* Step 1: Partner Auswahl */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Schritt 1: Partner auswählen
              </h3>
              
              {/* Abholung */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <Truck style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
                 <h4 style={{ fontWeight: '600' }}>
                    Abholung
                    {partners.abholung && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '0.75rem', 
                        color: '#10b981', 
                        backgroundColor: '#d1fae5', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        🧠 Intelligent ausgewählt
                      </span>
                    )}
                  </h4>
                </div>
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                    {sendungData.abholort} • {sendungData.abholDatum} {sendungData.abholZeit}
                  </div>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={partners.abholung || ''}
                    onChange={(e) => {
                      const partnerId = parseInt(e.target.value);
                      setPartners(prev => ({ ...prev, abholung: partnerId }));
                      if (partnerId) kostenAbrufen('abholung', partnerId);
                    }}
                  >
                    <option value="">Partner wählen...</option>
                    {getPartnersByType('abholung').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {kosten.abholung.status === 'calculated' && (
                    <div style={{ marginTop: '8px', fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: '600', color: '#059669' }}>
                        Gesamt: {kosten.abholung.betrag.toFixed(2)}€
                      </div>
                      {kosten.abholung.details && (
                        <div style={{ marginTop: '4px', color: '#6b7280', fontSize: '0.75rem' }}>
                          <div>Transport: {kosten.abholung.details.transport}</div>
                          <div>X-Ray: {kosten.abholung.details.xray}</div>
                          {kosten.abholung.zone && <div>Zone: {kosten.abholung.zone}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Hauptlauf */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <Plane style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
                  <h4 style={{ fontWeight: '600' }}>
                    Hauptlauf ({sendungData.transportArt})
                    {partners.hauptlauf && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '0.75rem', 
                        color: '#10b981', 
                        backgroundColor: '#d1fae5', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        🧠 Intelligent ausgewählt
                      </span>
                    )}
                  </h4>
                </div>
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                    {sendungData.vonFlughafen} → {sendungData.nachFlughafen} • {sendungData.gesamtGewicht}kg • {sendungData.gesamtVolumen}m³
                  </div>
                  
                  {/* Option 1: Normale Partner-Auswahl */}
                  <select
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '8px' }}
                    value={partners.hauptlauf || ''}
                    onChange={(e) => {
                      const partnerId = parseInt(e.target.value);
                      setPartners(prev => ({ ...prev, hauptlauf: partnerId }));
                      if (partnerId) kostenAbrufen('hauptlauf', partnerId);
                    }}
                  >
                    <option value="">Partner wählen...</option>
                    {getPartnersByType('hauptlauf').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  {/* Kosten-Anzeige für normalen Partner */}
                  {kosten.hauptlauf.status === 'loading' && (
                    <div style={{ marginTop: '8px', color: '#3b82f6', fontSize: '0.875rem' }}>
                      <RefreshCw style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} />
                      Kosten werden angefragt...
                    </div>
                  )}
                  {kosten.hauptlauf.status === 'manual' && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', fontSize: '0.875rem' }}>
                      <AlertCircle style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px', color: '#f59e0b' }} />
                      Manuelle Anfrage erforderlich bei {kosten.hauptlauf.partner_name}
                      <button style={{ marginLeft: '8px', color: '#2563eb', textDecoration: 'underline' }}>
                        Anfrage senden
                      </button>
                    </div>
                  )}
                  {kosten.hauptlauf.status === 'api' && kosten.hauptlauf.betrag > 0 && !selectedWebCargoRate && (
                    <div style={{ marginTop: '8px', fontWeight: '600', color: '#059669' }}>
                      Kosten: {kosten.hauptlauf.betrag}€
                    </div>
                  )}
                 
                  {/* Option 2: WebCargo Button */}
                  <div style={{ textAlign: 'center', padding: '8px 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    — oder —
                  </div>
                 
                  <button
                    onClick={() => {
                      console.log('WebCargo Button geklickt!');
                      console.log('showWebCargo vorher:', showWebCargo);
                      setShowWebCargo(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    <Globe style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                    Flugraten über WebCargo abrufen
                  </button>

                  {/* WebCargo Rate Anzeige */}
                  {selectedWebCargoRate && (
                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#dbeafe', borderRadius: '4px' }}>
                      <div style={{ fontSize: '0.875rem' }}>
                        <strong>{selectedWebCargoRate.airline}</strong> - Flug {selectedWebCargoRate.flight_number}
                        <br />
                        Abflug: {new Date(selectedWebCargoRate.departure).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        <br />
                        <span style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e40af' }}>
                          €{selectedWebCargoRate.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Zustellung */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                  <Truck style={{ width: '20px', height: '20px', marginRight: '8px', color: '#2563eb' }} />
                  <h4 style={{ fontWeight: '600' }}>
                    Zustellung
                    {partners.zustellung && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '0.75rem', 
                        color: '#10b981', 
                        backgroundColor: '#d1fae5', 
                        padding: '2px 6px', 
                        borderRadius: '4px' 
                      }}>
                        🧠 Intelligent ausgewählt
                      </span>
                    )}
                  </h4>
                </div>
                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                    {sendungData.empfaenger.ort}, {sendungData.empfaenger.land}
                    {sendungData.deadline && ` • Deadline: ${sendungData.deadline}`}
                  </div>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={partners.zustellung || ''}
                    onChange={(e) => {
                      const partnerId = parseInt(e.target.value);
                      setPartners(prev => ({ ...prev, zustellung: partnerId }));
                      if (partnerId) kostenAbrufen('zustellung', partnerId);
                    }}
                  >
                    <option value="">Partner wählen...</option>
                    {getPartnersByType('zustellung').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {kosten.zustellung.status === 'loading' && (
                    <div style={{ marginTop: '8px', color: '#3b82f6', fontSize: '0.875rem' }}>
                      <RefreshCw style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} />
                      Kosten werden abgerufen...
                    </div>
                  )}
                  {kosten.zustellung.status === 'manual' && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', fontSize: '0.875rem' }}>
                      <AlertCircle style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px', color: '#f59e0b' }} />
                      Manuelle Anfrage erforderlich bei {kosten.zustellung.partner_name}
                      <button style={{ marginLeft: '8px', color: '#2563eb', textDecoration: 'underline' }}>
                        Anfrage senden
                      </button>
                    </div>
                  )}
                  {kosten.zustellung.status === 'api' && kosten.zustellung.betrag > 0 && (
                    <div style={{ marginTop: '8px', fontWeight: '600', color: '#059669' }}>
                      Kosten: {kosten.zustellung.betrag}€ (via API)
                    </div>
                  )}
                </div>
              </div>

              {/* Buttons am Ende von Step 1 */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                <button 
                  onClick={() => handleSaveAsAnfrage()}
                  style={{ 
                    flex: 1,
                    padding: '12px 16px', 
                    backgroundColor: '#10b981', 
                    color: 'white', 
                    borderRadius: '6px', 
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Save style={{ width: '20px', height: '20px' }} />
                  Als Anfrage speichern
                </button>
                
                <button 
                  onClick={() => setStep(2)}
                  disabled={Object.values(kosten).some(k => k.status === 'pending')}
                  style={{ 
                    flex: 1,
                    padding: '12px 16px', 
                    backgroundColor: Object.values(kosten).some(k => k.status === 'pending') ? '#e5e7eb' : '#2563eb', 
                    color: Object.values(kosten).some(k => k.status === 'pending') ? '#9ca3af' : 'white', 
                    borderRadius: '6px', 
                    border: 'none',
                    cursor: Object.values(kosten).some(k => k.status === 'pending') ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Weiter zur Kalkulation →
                </button>
              </div>

            </div>
          )}

          {/* Step 2: Kalkulation */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Schritt 2: Preiskalkulation
              </h3>

              {/* Kostenübersicht */}
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '1rem' }}>Kostenübersicht</h4>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Abholung ({availablePartners.find(p => p.id === partners.abholung)?.name || '-'})</span>
                    <span style={{ fontWeight: '600' }}>{kosten.abholung.betrag}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Hauptlauf ({availablePartners.find(p => p.id === partners.hauptlauf)?.name || '-'})</span>
                    <span style={{ fontWeight: '600' }}>{kosten.hauptlauf.betrag}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    <span>Zustellung ({availablePartners.find(p => p.id === partners.zustellung)?.name || '-'})</span>
                    <span style={{ fontWeight: '600' }}>{kosten.zustellung.betrag}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 8px', fontWeight: '600', fontSize: '1rem' }}>
                    <span>Gesamtkosten</span>
                    <span style={{ color: '#dc2626' }}>
                      {Object.values(kosten).reduce((sum, k) => sum + k.betrag, 0)}€
                    </span>
                  </div>
                </div>
              </div>

              {/* Historische Daten */}
              <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                  <TrendingUp style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Historische Margen
                </h4>
                <div style={{ fontSize: '0.875rem' }}>
                  {vkKalkulation.historischeMargen.map((h, idx) => (
                    <div key={idx} style={{ padding: '4px 0' }}>
                      {h.kunde} • {h.route}: <strong>{h.marge}%</strong>
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fbbf24' }}>
                    Durchschnitt: <strong>{vkKalkulation.marge.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              {/* VK Eingabe */}
              <div style={{ backgroundColor: '#dbeafe', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '1rem' }}>Verkaufspreis festlegen</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Empfohlener VK</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e40af' }}>
                      {vkKalkulation.empfohlenerVK}€
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Ihr VK</label>
                    <input 
                      type="number"
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: '2px solid #3b82f6', 
                        borderRadius: '4px',
                        fontSize: '1.25rem',
                        fontWeight: '600'
                      }}
                      value={vkKalkulation.gewaehlterVK}
                      onChange={(e) => handleVKChange(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Profit</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: vkKalkulation.profit > 0 ? '#059669' : '#dc2626' }}>
                      {vkKalkulation.profit}€
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {vkKalkulation.marge.toFixed(1)}% Marge
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setStep(1)}
                  style={{ 
                    flex: 1,
                    padding: '12px', 
                    backgroundColor: 'white', 
                    color: '#374151', 
                    borderRadius: '6px', 
                    border: '1px solid #d1d5db',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Zurück
                </button>
                <button 
                  onClick={() => setStep(3)}
                  style={{ 
                    flex: 2,
                    padding: '12px', 
                    backgroundColor: '#2563eb', 
                    color: 'white', 
                    borderRadius: '6px', 
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Weiter zu Aktionen
                  <ArrowRight style={{ width: '20px', height: '20px', marginLeft: '8px' }} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Aktionen */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Schritt 3: Aktionen auslösen
              </h3>

              {/* Zusammenfassung */}
              <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: '#15803d' }}>
                  Sendung bereit zur Verarbeitung
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <strong>Sendung:</strong> {sendungData.position}<br />
                    <strong>Route:</strong> {sendungData.vonFlughafen} → {sendungData.nachFlughafen}<br />
                    <strong>Gewicht:</strong> {sendungData.gesamtGewicht}kg / {sendungData.gesamtVolumen}m³
                  </div>
                  <div>
                    <strong>VK-Preis:</strong> {vkKalkulation.gewaehlterVK}€<br />
                    <strong>Profit:</strong> {vkKalkulation.profit}€ ({vkKalkulation.marge.toFixed(1)}%)<br />
                    <strong>Deadline:</strong> {sendungData.deadline || 'Keine'}
                  </div>
                </div>
              </div>

              {/* Verfügbare Aktionen */}
              <h4 style={{ fontWeight: '600', marginBottom: '1rem' }}>Verfügbare Aktionen</h4>
              <div style={{ display: 'grid', gap: '1rem' }}>
                
                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem', 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Truck style={{ width: '20px', height: '20px', marginRight: '12px', color: '#2563eb' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600' }}>Abholung beauftragen</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        E-Mail an {availablePartners.find(p => p.id === partners.abholung)?.name} (Deutsch)
                      </div>
                    </div>
                  </div>
                  <Send style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                </button>

                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem', 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Plane style={{ width: '20px', height: '20px', marginRight: '12px', color: '#2563eb' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600' }}>Luftfracht buchen</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {availablePartners.find(p => p.id === partners.hauptlauf)?.api_enabled 
                          ? 'Via API' 
                          : `Anfrage an ${availablePartners.find(p => p.id === partners.hauptlauf)?.name}`
                        }
                      </div>
                    </div>
                  </div>
                  <Send style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                </button>

                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem', 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <FileText style={{ width: '20px', height: '20px', marginRight: '12px', color: '#2563eb' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600' }}>Dokumente hochladen</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        AWB, Rechnung, Packliste
                      </div>
                    </div>
                  </div>
                  <ArrowRight style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                </button>

                <button style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem', 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Globe style={{ width: '20px', height: '20px', marginRight: '12px', color: '#2563eb' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600' }}>Pre-Alert senden</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        E-Mail an {availablePartners.find(p => p.id === partners.zustellung)?.name} (Englisch)
                      </div>
                    </div>
                  </div>
                  <Send style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                </button>

              </div>

              {/* Abschluss */}
              <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <AlertCircle style={{ width: '16px', height: '16px', marginRight: '8px', color: '#2563eb' }} />
                  <strong style={{ fontSize: '0.875rem' }}>Nach dem Speichern:</strong>
                </div>
                <ul style={{ fontSize: '0.875rem', marginLeft: '24px', color: '#6b7280' }}>
                  <li>Sendung erscheint im Sendungsboard</li>
                  <li>Kosten werden an Finanzen übertragen</li>
                  <li>AWB-Instruktionen für Kollegen verfügbar</li>
                  <li>Status-Updates können getrackt werden</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  onClick={() => setStep(2)}
                  style={{ 
                    flex: 1,
                    padding: '12px', 
                    backgroundColor: 'white', 
                    color: '#374151', 
                    borderRadius: '6px', 
                    border: '1px solid #d1d5db',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  Zurück
                </button>
                <button 
                  onClick={handleComplete}
                  style={{ 
                    flex: 2,
                    padding: '12px', 
                    backgroundColor: '#059669', 
                    color: 'white', 
                    borderRadius: '6px', 
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Save style={{ width: '20px', height: '20px', marginRight: '8px' }} />
                  Sendung ins Board übernehmen
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* WebCargo Modal */}
      {showWebCargo && (
        <WebCargoRates
          shipmentData={sendungData}
          onSelectRate={(rate) => {
            setSelectedWebCargoRate(rate);
            setKosten(prev => ({
              ...prev,
              hauptlauf: {
                status: 'api',
                betrag: rate.total,
                partner_name: 'WebCargo',
                rate_details: rate
              }
            }));
            setPartners(prev => ({ ...prev, hauptlauf: 1 })); // WebCargo Partner ID
            setShowWebCargo(false);
          }}
          onClose={() => setShowWebCargo(false)}
        />
      )}
    </div>
  );
};

export default PartnerKalkulation;