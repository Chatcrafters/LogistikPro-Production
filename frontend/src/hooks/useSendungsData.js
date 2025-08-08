// hooks/useSendungsData.js - REPARIERTE VERSION
import { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import { getMilestones, calculateTrafficLightStatus, getTransportKey } from '../utils/milestoneDefinitions';

export const useSendungsData = () => {
  // ============== STATE MANAGEMENT ==============
  const [sendungen, setSendungen] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============== MILESTONE STATE ==============
  const [milestones, setMilestones] = useState({});
  const [trafficLights, setTrafficLights] = useState({});

  // ============== COMPUTED STATS ==============
  const stats = {
    total: sendungen.length,
    anfragen: sendungen.filter(s => s.status === 'ANFRAGE').length,
    angebote: sendungen.filter(s => s.status === 'ANGEBOT').length,
    sendungen: sendungen.filter(s => s.status !== 'ANFRAGE' && s.status !== 'ANGEBOT').length
  };

  // ========================================
  // 🚦 NEUE ZEIT-BASIERTE AMPEL-BERECHNUNG
  // ========================================
  
  const calculateTimeBasedAmpel = (sendung, ampelType) => {
    console.log(`🚨 CRITICAL TEST: calculateTimeBasedAmpel WIRD AUFGERUFEN für ${sendung.position} - ${ampelType}`);
    console.log(`🚦 Zeit-basierte Ampel für ${sendung.position} - ${ampelType}:`, {
      pickup_date: sendung.pickup_date,
      flight_departure: sendung.flight_departure,
      delivery_date: sendung.delivery_date,
      completed_milestones: sendung.completed_milestones
    });

    // Heute als Datum (ohne Uhrzeit für Vergleich)
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);

    // Helper: Datum parsen (ohne Uhrzeit)
    const parseDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      date.setHours(0, 0, 0, 0);
      return date;
    };

   // Helper: Hat Ampel erledigte Milestones?
    const hasCompletedMilestones = (ampel) => {
      console.log(`🔍 DEBUG hasCompletedMilestones für ${sendung.position}, Ampel: ${ampel}`);
      console.log(`📊 completed_milestones Feld:`, sendung.completed_milestones);
      
      if (!sendung.completed_milestones) {
        console.log(`⚪ Keine completed_milestones für Sendung ${sendung.position}`);
        return false;
      }

      // Parse completed_milestones JSON
      let completedIds = [];
      try {
        if (typeof sendung.completed_milestones === 'string') {
          // Parse JSON string wie '"{1,4]}"' oder '"{1,2,3]}"'
          const cleanString = sendung.completed_milestones.replace(/["{}\[\]]/g, '');
          if (cleanString) {
            completedIds = cleanString.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          }
        } else if (Array.isArray(sendung.completed_milestones)) {
          completedIds = sendung.completed_milestones;
        }
      } catch (e) {
        console.warn('Fehler beim Parsen der completed_milestones:', e);
        return false;
      }

      console.log(`🎯 Parsed Milestone IDs:`, completedIds);

      // Milestone-Definitionen für Ampel-Zuordnung
      const milestoneDefinitions = {
        1: { ampel: 'abholung' },    // Abholung beauftragt
        2: { ampel: 'abholung' },    // Sendung abgeholt  
        3: { ampel: 'abholung' },    // Anlieferung im Lager
        4: { ampel: 'carrier' },     // Sendung gebucht
        5: { ampel: 'carrier' },     // Zoll erledigt
        6: { ampel: 'carrier' },     // Anlieferung bei Airline
        7: { ampel: 'carrier' },     // Sendung abgeflogen
        8: { ampel: 'carrier' },     // Sendung angekommen
        9: { ampel: 'zustellung' },  // Sendung verzollt
        10: { ampel: 'zustellung' }  // Sendung zugestellt
      };

      // Prüfe ob irgendein Milestone dieser Ampel erledigt ist
      const hasMatchingMilestone = completedIds.some(milestoneId => {
        const definition = milestoneDefinitions[milestoneId];
        const matches = definition && definition.ampel === ampel;
        
        console.log(`🎯 Prüfe Milestone ${milestoneId}: Definition=${JSON.stringify(definition)}, Matches=${matches}`);
        return matches;
      });

      console.log(`🚦 hasCompletedMilestones Result für ${ampel}: ${hasMatchingMilestone}`);
      return hasMatchingMilestone;
    };

    // Bestimme relevantes Datum und Milestone-Status
    let plannedDate = null;
    let hasCompleted = false;

    switch (ampelType) {
      case 'abholung':
        plannedDate = parseDate(sendung.pickup_date);
        hasCompleted = hasCompletedMilestones('abholung');
        break;
      case 'carrier':
        plannedDate = parseDate(sendung.flight_departure);
        hasCompleted = hasCompletedMilestones('carrier');
        break;
      case 'zustellung':
        plannedDate = parseDate(sendung.delivery_date);
        hasCompleted = hasCompletedMilestones('zustellung');
        break;
      default:
        return 'grey';
    }

    console.log(`🚦 Ampel ${ampelType}: plannedDate=${plannedDate}, hasCompleted=${hasCompleted}, heute=${heute}`);

    // SERGIO'S LOGIK:
    // 1. Kein Milestone erledigt → GRAU
    if (!hasCompleted) {
      console.log(`⚪ ${ampelType} GRAU: Kein Milestone erledigt`);
      return 'grey';
    }

    // 2. Milestone erledigt + kein Datum → GRÜN (kein ROT möglich)
    if (!plannedDate) {
      console.log(`🟢 ${ampelType} GRÜN: Milestone erledigt, kein Datum vorhanden`);
      return 'green';
    }

    // 3. Milestone erledigt + Verspätung (heute > geplantes Datum) → ROT
    if (heute > plannedDate) {
      console.log(`🔴 ${ampelType} ROT: Verspätet! Geplant: ${plannedDate.toDateString()}, Heute: ${heute.toDateString()}`);
      return 'red';
    }

    // 4. Milestone erledigt + im Zeitplan → GRÜN
    console.log(`🟢 ${ampelType} GRÜN: Milestone erledigt, im Zeitplan`);
    return 'green';
  };

  const calculateTrafficLightsFromMilestones = (sendung) => {
    if (!sendung || !sendung.id) {
      return { abholung: 'grey', carrier: 'grey', zustellung: 'grey' };
    }

    const trafficLights = {
      abholung: calculateTimeBasedAmpel(sendung, 'abholung'),
      carrier: calculateTimeBasedAmpel(sendung, 'carrier'),
      zustellung: calculateTimeBasedAmpel(sendung, 'zustellung')
    };

    console.log(`🚦 Zeit-basierte Traffic Lights für ${sendung.position}:`, trafficLights);
    
    return trafficLights;
  };

  // ============== LOAD ALL DATA ==============
  const loadAllData = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    console.log('🔄 Loading ALL data from Backend API...');

    // ✅ NUTZE BACKEND-API STATT SUPABASE DIREKT
    const response = await fetch('http://localhost:3001/api/shipments');
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const result = await response.json();
    const shipments = result.data || [];
    
    console.log('📊 Loaded shipments from backend:', shipments.length);
    
    // ✅ DEBUG: Zeige NEUE Milestone-Spalten
    shipments.forEach(s => {
      console.log(`📊 ${s.position}: Pickup-MS=${s.pickup_milestone}, Carrier-MS=${s.carrier_milestone}, Delivery-MS=${s.delivery_milestone}`);
    });

    // ✅ SET SHIPMENTS DATA
    setSendungen(shipments);
    
    // ✅ NEUE TRAFFIC LIGHTS basierend auf SEPARATEN Milestones
    const trafficLightData = {};
    shipments.forEach(shipment => {
      // Nutze die NEUEN separaten Milestone-Spalten!
      const pickupMs = shipment.pickup_milestone || 0;
      const carrierMs = shipment.carrier_milestone || 0;
      const deliveryMs = shipment.delivery_milestone || 0;
      
      trafficLightData[shipment.id] = {
        abholung: pickupMs > 0 ? 'green' : 'grey',
        carrier: carrierMs > 0 ? 'green' : 'grey',
        zustellung: deliveryMs > 0 ? 'green' : 'grey'
      };
      
      console.log(`🚦 Ampeln für ${shipment.position}: Abholung=${pickupMs > 0 ? 'green' : 'grey'}, Carrier=${carrierMs > 0 ? 'green' : 'grey'}, Zustellung=${deliveryMs > 0 ? 'green' : 'grey'}`);
    });
    
    setTrafficLights(trafficLightData);
    
    // ✅ LOAD CUSTOMERS & PARTNERS
    const [customersRes, partnersRes] = await Promise.all([
      fetch('http://localhost:3001/api/customers'),
      fetch('http://localhost:3001/api/partners')
    ]);
    
    if (customersRes.ok) {
      setCustomers(await customersRes.json());
    }
    
    if (partnersRes.ok) {
      setPartners(await partnersRes.json());
    }

    console.log('✅ ALL DATA LOADED via Backend API');

  } catch (error) {
    console.error('❌ Load data error:', error);
    setError(`Fehler beim Laden: ${error.message}`);
  } finally {
    setLoading(false);
  }
}, []);

  // ============== TRAFFIC LIGHT UPDATE ==============
  const updateTrafficLight = useCallback(async (shipmentId, lightType, currentColor) => {
    try {
      console.log(`🚦 Traffic Light Update: ${shipmentId}, ${lightType}, ${currentColor}`);

      // Neue Farbe bestimmen: grey → yellow → green → grey
      let newColor;
      switch (currentColor) {
        case 'grey': newColor = 'yellow'; break;
        case 'yellow': newColor = 'green'; break;
        case 'green': newColor = 'grey'; break;
        default: newColor = 'yellow'; break;
      }

      console.log(`🚦 Color change: ${currentColor} → ${newColor}`);

      // Traffic lights state lokal updaten
      setTrafficLights(prev => ({
        ...prev,
        [shipmentId]: {
          ...prev[shipmentId],
          [lightType]: newColor
        }
      }));

      console.log(`✅ Traffic light ${lightType} updated to ${newColor}`);

    } catch (error) {
      console.error('❌ Traffic light update error:', error);
      setError(`Traffic Light Update fehlgeschlagen: ${error.message}`);
    }
  }, [trafficLights, loadAllData]);

  // ============== SENDUNG STATUS UPDATE ==============
  const updateStatus = useCallback(async (shipmentId, newStatus) => {
    try {
      console.log(`📝 Updating status for shipment ${shipmentId} to ${newStatus}`);

      const { error } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      // Lokalen State updaten
      setSendungen(prev => 
        prev.map(s => 
          s.id === shipmentId 
            ? { ...s, status: newStatus }
            : s
        )
      );

      console.log(`✅ Status updated successfully`);

    } catch (error) {
      console.error('❌ Status update error:', error);
      setError(`Status Update fehlgeschlagen: ${error.message}`);
    }
  }, []);

  // ============== COST MANAGEMENT ==============
  const saveCosts = useCallback(async (shipmentId, costs) => {
    try {
      console.log(`💰 Saving costs for shipment ${shipmentId}:`, costs);

      const { error } = await supabase
        .from('shipments')
        .update({
          cost_pickup: costs.pickup_cost || 0,
          cost_mainrun: costs.main_cost || 0,
          cost_delivery: costs.delivery_cost || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      // Lokalen State updaten
      setSendungen(prev =>
        prev.map(s =>
          s.id === shipmentId
            ? {
                ...s,
                cost_pickup: costs.pickup_cost || 0,
                cost_mainrun: costs.main_cost || 0,
                cost_delivery: costs.delivery_cost || 0
              }
            : s
        )
      );

      console.log(`✅ Costs saved successfully`);

    } catch (error) {
      console.error('❌ Save costs error:', error);
      setError(`Kosten speichern fehlgeschlagen: ${error.message}`);
    }
  }, []);

  // ============== OFFER CREATION ==============
  const createOffer = useCallback(async (shipmentId, offerData) => {
    try {
      console.log(`💼 Creating offer for shipment ${shipmentId}:`, offerData);

      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'ANGEBOT',
          offer_price: offerData.price,
          offer_profit: offerData.profit,
          offer_margin_percent: offerData.marginPercent,
          offer_number: offerData.offerNumber,
          offer_created_at: new Date().toISOString(),
          offer_valid_until: offerData.validUntil,
          offer_notes: offerData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      // Lokalen State updaten
      setSendungen(prev =>
        prev.map(s =>
          s.id === shipmentId
            ? {
                ...s,
                status: 'ANGEBOT',
                offer_price: offerData.price,
                offer_profit: offerData.profit,
                offer_margin_percent: offerData.marginPercent,
                offer_number: offerData.offerNumber,
                offer_created_at: new Date().toISOString(),
                offer_valid_until: offerData.validUntil,
                offer_notes: offerData.notes
              }
            : s
        )
      );

      console.log(`✅ Offer created successfully`);

    } catch (error) {
      console.error('❌ Create offer error:', error);
      setError(`Angebot erstellen fehlgeschlagen: ${error.message}`);
    }
  }, []);

  // ============== OFFER HANDLING ==============
  const handleOffer = useCallback(async (shipmentId, action, reason = '') => {
    try {
      console.log(`💼 Handling offer ${action} for shipment ${shipmentId}`);

      let updateData = {
        updated_at: new Date().toISOString()
      };

      if (action === 'accept') {
        updateData.status = 'created';
        updateData.selling_price = sendungen.find(s => s.id === shipmentId)?.offer_price || 0;
        updateData.profit = sendungen.find(s => s.id === shipmentId)?.offer_profit || 0;
        updateData.margin = sendungen.find(s => s.id === shipmentId)?.offer_margin_percent || 0;
        
        const sendung = sendungen.find(s => s.id === shipmentId);
        if (!sendung?.awb_number) {
          updateData.awb_number = `AWB-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        }
      } else if (action === 'reject') {
        updateData.status = 'ABGELEHNT';
      }

      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (error) throw error;

      setSendungen(prev =>
        prev.map(s =>
          s.id === shipmentId
            ? { ...s, ...updateData }
            : s
        )
      );

      console.log(`✅ Offer ${action} handled successfully`);

    } catch (error) {
      console.error(`❌ Handle offer ${action} error:`, error);
      setError(`Angebot ${action} fehlgeschlagen: ${error.message}`);
    }
  }, [sendungen]);

  // ============== DELETE SENDUNG FUNKTION ==============
  const deleteSendung = async (sendungId) => {
    console.log('🗑️ DELETE FUNCTION CALLED:', sendungId);
    
    if (!sendungId) {
      console.error('🗑️ ERROR: Keine Sendung-ID übergeben');
      setError('Fehler: Keine gültige Sendung-ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🗑️ SENDING DELETE REQUEST to Supabase...');
      
      const { error: supabaseError } = await supabase
        .from('shipments')
        .delete()
        .eq('id', sendungId);

      if (supabaseError) {
        console.error('🗑️ SUPABASE DELETE ERROR:', supabaseError);
        throw new Error(`Supabase Fehler: ${supabaseError.message}`);
      }

      console.log('🗑️ SUPABASE DELETE SUCCESS');
      
      await loadAllData();
      console.log('🗑️ DELETE COMPLETE');
      
    } catch (error) {
      console.error('🗑️ DELETE ERROR:', error);
      setError(`Fehler beim Löschen der Sendung: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============== INITIALIZE DATA ==============
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============== RETURN HOOK INTERFACE ==============
  return {
    // Data
    sendungen,
    customers,
    partners,
    milestones,
    trafficLights,
   
    // States
    loading,
    error,
    stats,
   
    // Methods
    loadAllData,
    updateStatus,
    deleteSendung,
    updateTrafficLight,
    saveCosts,
    createOffer,
    handleOffer,
   
    // Utilities
    clearError: () => setError(null)
  };
};

export default useSendungsData;