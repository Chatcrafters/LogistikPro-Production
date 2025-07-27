// hooks/useSendungsData.js - KOMPLETT MIT MILESTONE-INTEGRATION
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

  // ============== LOAD ALL DATA ==============
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading all data...');

      // Parallel laden für bessere Performance - ERWEITERT mit neuer View
      const [
        sendungenResult,
        customersResult,
        partnersResult,
        milestonesResult
      ] = await Promise.all([
        // NEUE Dashboard-View nutzen für erweiterte Felder
        supabase.from('shipments_dashboard').select(`
          *,
          relevant_date,
          date_type,
          all_notes,
          customer_name,
          departure_time,
          arrival_time,
          etd,
          eta,
          cutoff_time,
          flight_number,
          pickup_confirmed,
          flight_confirmed,
          delivery_confirmed,
          awb_number,
          tracking_number,
          notes,
          special_instructions,
          customer_notes,
          internal_notes
        `).order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
        supabase.from('partners').select('*'),
        supabase.from('milestones').select('*')
      ]);

      // Error Handling für jeden Request
      if (sendungenResult.error) throw new Error(`Sendungen: ${sendungenResult.error.message}`);
      if (customersResult.error) throw new Error(`Kunden: ${customersResult.error.message}`);
      if (partnersResult.error) throw new Error(`Partner: ${partnersResult.error.message}`);
      if (milestonesResult.error) throw new Error(`Milestones: ${milestonesResult.error.message}`);

      // Data Setting
      setSendungen(sendungenResult.data || []);
      setCustomers(customersResult.data || []);
      setPartners(partnersResult.data || []);

      // ============== MILESTONE PROCESSING ==============
      const milestonesData = milestonesResult.data || [];
      console.log('📊 Loaded milestones:', milestonesData.length);

      // Group milestones by shipment_id
      const milestonesByShipment = {};
      milestonesData.forEach(milestone => {
        const shipmentId = milestone.shipment_id;
        if (!milestonesByShipment[shipmentId]) {
          milestonesByShipment[shipmentId] = [];
        }
        milestonesByShipment[shipmentId].push(milestone);
      });
      setMilestones(milestonesByShipment);

      // ============== TRAFFIC LIGHTS CALCULATION ==============
      const trafficLightData = {};
      sendungenResult.data.forEach(sendung => {
        try {
          const shipmentMilestones = milestonesByShipment[sendung.id] || [];
          
          // Transport type detection mit Fallback
          let transportType = 'AIR'; // Default
          if (sendung.transport_type) {
            transportType = sendung.transport_type.toUpperCase();
          } else if (sendung.transportArt) {
            const typeMapping = {
              'luftfracht': 'AIR',
              'seefracht': 'SEA', 
              'lkw': 'TRUCK'
            };
            transportType = typeMapping[sendung.transportArt.toLowerCase()] || 'AIR';
          }

          // Import/Export detection mit Fallback
          let importExport = 'EXPORT'; // Default
          if (sendung.import_export) {
            importExport = sendung.import_export.toUpperCase();
          } else if (sendung.transportrichtung) {
            importExport = sendung.transportrichtung.toUpperCase();
          }

          console.log(`🚦 Traffic Light für Sendung ${sendung.position}: ${transportType}/${importExport}`);

          // Milestone definitions abrufen
          const key = getTransportKey(transportType, importExport);
          const definitions = getMilestones(transportType, importExport);
          
          // Traffic lights berechnen (alle Milestones für diese Sendung)
          const completedMilestoneIds = shipmentMilestones.map(m => m.milestone_id || m.id);
          const lights = calculateTrafficLightStatus(definitions, completedMilestoneIds);
          
          trafficLightData[sendung.id] = {
            abholung: lights.abholung,
            carrier: lights.carrier, 
            zustellung: lights.zustellung,
            transportType,
            importExport,
            definitions
          };

          console.log(`🚦 Traffic Lights für ${sendung.position}:`, lights);

        } catch (error) {
          console.error(`🚦 Traffic Light Error für Sendung ${sendung.id}:`, error);
          // Fallback: Alle grau
          trafficLightData[sendung.id] = {
            abholung: 'grey',
            carrier: 'grey',
            zustellung: 'grey',
            transportType: 'AIR',
            importExport: 'EXPORT',
            definitions: getMilestones('AIR', 'EXPORT')
          };
        }
      });

      setTrafficLights(trafficLightData);
      console.log('✅ All data loaded successfully');

    } catch (error) {
      console.error('❌ Load data error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============== TRAFFIC LIGHT UPDATE ==============
  const updateTrafficLight = useCallback(async (shipmentId, lightType, currentColor) => {
    try {
      console.log(`🚦 Traffic Light Update: ${shipmentId}, ${lightType}, ${currentColor}`);

      const shipmentTrafficLights = trafficLights[shipmentId];
      if (!shipmentTrafficLights) {
        throw new Error('Traffic light data not found for shipment');
      }

      const { definitions, transportType, importExport } = shipmentTrafficLights;
      const allMilestones = definitions;
      const lightMilestones = allMilestones.filter(m => m.ampel === lightType);

      if (!lightMilestones || lightMilestones.length === 0) {
        throw new Error(`No milestone definitions found for ${lightType}`);
      }

      // Neue Farbe bestimmen: grey → yellow → green → grey
      let newColor;
      switch (currentColor) {
        case 'grey': newColor = 'yellow'; break;
        case 'yellow': newColor = 'green'; break;
        case 'green': newColor = 'grey'; break;
        default: newColor = 'yellow'; break;
      }

      console.log(`🚦 Color change: ${currentColor} → ${newColor}`);

      // Milestone-Updates basierend auf neuer Farbe
      if (newColor === 'grey') {
        // GRAU: Alle Milestones dieser Ampel entfernen
        console.log(`🗑️ Removing all ${lightType} milestones`);
        
        for (const milestone of lightMilestones) {
          const { error } = await supabase
            .from('milestones')
            .delete()
            .eq('shipment_id', shipmentId)
            .eq('milestone_id', milestone.id);

          if (error) {
            console.error(`Error removing milestone ${milestone.id}:`, error);
          } else {
            console.log(`✅ Removed milestone: ${milestone.text}`);
          }
        }

      } else if (newColor === 'yellow') {
        // GELB: Erstes Milestone setzen, andere entfernen
        console.log(`🟡 Setting first ${lightType} milestone`);
        
        const firstMilestone = lightMilestones[0];
        
        // Andere Milestones dieser Ampel entfernen
        for (let i = 1; i < lightMilestones.length; i++) {
          await supabase
            .from('milestones')
            .delete()
            .eq('shipment_id', shipmentId)
            .eq('milestone_id', lightMilestones[i].id);
        }

        // Erstes Milestone setzen (upsert für Duplikat-Schutz)
        const { error } = await supabase
          .from('milestones')
          .upsert({
            shipment_id: shipmentId,
            milestone_id: firstMilestone.id,
            status: firstMilestone.text,
            timestamp: new Date().toISOString(),
            notes: `Automatisch gesetzt: ${firstMilestone.text}`,
            created_by: 'system'
          }, {
            onConflict: 'shipment_id,milestone_id'
          });

        if (error) {
          console.error(`Error setting milestone ${firstMilestone.id}:`, error);
        } else {
          console.log(`✅ Set milestone: ${firstMilestone.text}`);
        }

      } else if (newColor === 'green') {
        // GRÜN: Alle Milestones dieser Ampel setzen
        console.log(`🟢 Setting all ${lightType} milestones`);
        
        for (const milestone of lightMilestones) {
          const { error } = await supabase
            .from('milestones')
            .upsert({
              shipment_id: shipmentId,
              milestone_id: milestone.id,
              status: milestone.text,
              timestamp: new Date().toISOString(),
              notes: `Automatisch gesetzt: ${milestone.text}`,
              created_by: 'system'
            }, {
              onConflict: 'shipment_id,milestone_id'
            });

          if (error) {
            console.error(`Error setting milestone ${milestone.id}:`, error);
          } else {
            console.log(`✅ Set milestone: ${milestone.text}`);
          }
        }
      }

      // Traffic lights state lokal updaten
      setTrafficLights(prev => ({
        ...prev,
        [shipmentId]: {
          ...prev[shipmentId],
          [lightType]: newColor
        }
      }));

      // Daten neu laden um DB-Änderungen zu reflektieren
      await loadAllData();

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
        // Verwende existierende DB-Spalten
        updateData.selling_price = sendungen.find(s => s.id === shipmentId)?.offer_price || 0;
        updateData.profit = sendungen.find(s => s.id === shipmentId)?.offer_profit || 0;
        updateData.margin = sendungen.find(s => s.id === shipmentId)?.offer_margin_percent || 0;
        
        // AWB generieren wenn nicht vorhanden
        const sendung = sendungen.find(s => s.id === shipmentId);
        if (!sendung?.awb_number) {
          updateData.awb_number = `AWB-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        }
      } else if (action === 'reject') {
        updateData.status = 'ABGELEHNT';
        // Keine nicht-existierenden Spalten mehr verwenden
      }

      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (error) throw error;

      // Lokalen State updaten
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

  // ============== INITIALIZE DATA ==============
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ============== ERWEITERTE FUNKTIONEN ==============
  const updateFlightTimes = useCallback(async (shipmentId, flightData) => {
    try {
      console.log('✈️ Updating flight times:', shipmentId, flightData);
      
      const { data, error } = await supabase
        .from('shipments')
        .update({
          departure_time: flightData.departure || null,
          arrival_time: flightData.arrival || null,
          etd: flightData.etd || null,
          eta: flightData.eta || null,
          cutoff_time: flightData.cutoff || null,
          flight_number: flightData.flightNumber || null,
          flight_confirmed: Boolean(flightData.confirmed),
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Flight times updated');
      await loadAllData(); // Daten neu laden
      return data;
      
    } catch (error) {
      console.error('❌ updateFlightTimes error:', error);
      setError(`Fehler beim Aktualisieren der Flugzeiten: ${error.message}`);
    }
  }, [loadAllData]);

  const updateNotes = useCallback(async (shipmentId, notesData) => {
    try {
      console.log('📝 Updating notes:', shipmentId, notesData);
      
      const { data, error } = await supabase
        .from('shipments')
        .update({
          notes: notesData.general || null,
          special_instructions: notesData.instructions || null,
          customer_notes: notesData.customer || null,
          internal_notes: notesData.internal || null,
          remarks: notesData.remarks || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Notes updated');
      await loadAllData();
      return data;
      
    } catch (error) {
      console.error('❌ updateNotes error:', error);
      setError(`Fehler beim Aktualisieren der Notizen: ${error.message}`);
    }
  }, [loadAllData]);

  const updateStatusConfirmations = useCallback(async (shipmentId, confirmations) => {
    try {
      console.log('🚦 Updating status confirmations:', shipmentId, confirmations);
      
      const { data, error } = await supabase
        .from('shipments')
        .update({
          pickup_confirmed: Boolean(confirmations.pickup),
          flight_confirmed: Boolean(confirmations.flight),
          delivery_confirmed: Boolean(confirmations.delivery),
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Status confirmations updated');
      await loadAllData();
      return data;
      
    } catch (error) {
      console.error('❌ updateStatusConfirmations error:', error);
      setError(`Fehler beim Aktualisieren der Bestätigungen: ${error.message}`);
    }
  }, [loadAllData]);

// DELETE SENDUNG FUNKTION
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
    
    // Supabase Delete
    const { error: supabaseError } = await supabase
      .from('shipments')
      .delete()
      .eq('id', sendungId);

    if (supabaseError) {
      console.error('🗑️ SUPABASE DELETE ERROR:', supabaseError);
      throw new Error(`Supabase Fehler: ${supabaseError.message}`);
    }

    console.log('🗑️ SUPABASE DELETE SUCCESS');
    
    // Nach erfolgreichem Löschen alle Daten neu laden
    await loadAllData();
    console.log('🗑️ DELETE COMPLETE');
    
  } catch (error) {
    console.error('🗑️ DELETE ERROR:', error);
    setError(`Fehler beim Löschen der Sendung: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // ============== RETURN HOOK INTERFACE - ERWEITERT ==============
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
   
    // Methods - Original
    loadAllData,
    updateStatus,
    deleteSendung,          // ← NEU HINZUGEFÜGT
    updateTrafficLight,
    saveCosts,
    createOffer,
    handleOffer,
   
    // Methods - NEU für erweiterte DB-Felder
    updateFlightTimes,
    updateNotes,
    updateStatusConfirmations,
   
    // Utilities
    clearError: () => setError(null)
  };
};
// Default Export für Kompatibilität
export default useSendungsData;