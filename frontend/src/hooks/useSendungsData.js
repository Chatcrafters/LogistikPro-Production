// frontend/src/hooks/useSendungsData.js
import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client Setup
// Supabase Client Setup - Vite nutzt import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vjehwwmhtzqilvwtppcc.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZWh3d21odHpxaWx2d3RwcGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDYwMDIsImV4cCI6MjA2NzQ4MjAwMn0.wkFyJHFi2mAb_FRsbjrrBTqX75vqV_4nsfWQLWm8QjI';
const supabase = createClient(supabaseUrl, supabaseKey);

export const useSendungsData = () => {
  // State Management
  const [sendungen, setSendungen] = useState([]);
  const [customers, setCustomers] = useState({});
  const [partners, setPartners] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    active: 0,
    pickupToday: 0,
    inTransit: 0,
    critical: 0
  });

  // Error Handler
  const handleError = useCallback((error, context) => {
    console.error(`Fehler in ${context}:`, error);
    setError(`${context}: ${error.message}`);
    setLoading(false);
  }, []);

  // Load All Data
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadSendungen(),
        loadCustomers(),
        loadPartners()
      ]);
    } catch (err) {
      handleError(err, 'Daten laden');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Sendungen from API
  const loadSendungen = useCallback(async () => {
    try {
      // Option 1: Direkt über Supabase (wie bisher)
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('📦 Sendungen geladen:', data?.length);
      setSendungen(data || []);
      calculateStats(data || []);

      return data;
    } catch (err) {
      handleError(err, 'Sendungen laden');
      throw err;
    }
  }, [handleError]);

  // Load Customers
  const loadCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');
      
      if (error) throw error;
      
      const customerMap = {};
      (data || []).forEach(customer => {
        customerMap[customer.id] = customer.name;
      });
      
      console.log('👥 Kunden geladen:', Object.keys(customerMap).length);
      setCustomers(customerMap);
      
      return customerMap;
    } catch (err) {
      handleError(err, 'Kunden laden');
      throw err;
    }
  }, [handleError]);

  // Load Partners
  const loadPartners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, emails, phones');
      
      if (error) throw error;
      
      const partnerMap = {};
      (data || []).forEach(partner => {
        partnerMap[partner.id] = partner;
      });
      
      console.log('🤝 Partner geladen:', Object.keys(partnerMap).length);
      setPartners(partnerMap);
      
      return partnerMap;
    } catch (err) {
      handleError(err, 'Partner laden');
      throw err;
    }
  }, [handleError]);

  // Calculate Statistics
  const calculateStats = useCallback((data) => {
    const today = new Date().toISOString().split('T')[0];
    
    const newStats = {
      active: data.filter(s => !['zugestellt', 'delivered', 'storniert', 'ABGELEHNT'].includes(s.status)).length,
      pickupToday: data.filter(s => s.pickup_date === today).length,
      inTransit: data.filter(s => s.status === 'in_transit').length,
      critical: data.filter(s => {
        // Kritisch: Abgeholt aber überfällig, oder hohe Priorität
        const isOverdue = s.status === 'abgeholt' && s.pickup_date < today;
        const isHighPriority = s.priority === 'high';
        const isDelayed = s.status === 'delayed';
        return isOverdue || isHighPriority || isDelayed;
      }).length
    };
    
    console.log('📊 Stats berechnet:', newStats);
    setStats(newStats);
  }, []);

  // Update Status via API
  const updateStatus = useCallback(async (sendungId, type, color) => {
    try {
      const sendung = sendungen.find(s => s.id === sendungId);
      if (!sendung) throw new Error('Sendung nicht gefunden');

      // Traffic Lights Update
      const trafficLights = sendung.traffic_lights || {};
      trafficLights[type] = color;

      // Status Logic basierend auf Traffic Light
      let newStatus = sendung.status;
      if (type === 'zustellung' && color === 'green') {
        newStatus = 'zugestellt';
      } else if (type === 'flug' && color === 'green') {
        newStatus = 'in_transit';
      } else if (type === 'abholung' && color === 'green') {
        newStatus = 'abgeholt';
      } else if (type === 'abholung' && color === 'yellow') {
        newStatus = 'booked';
      }

      // Update via Supabase
      const { error } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          traffic_lights: trafficLights,
          updated_at: new Date().toISOString()
        })
        .eq('id', sendungId);

      if (error) throw error;

      console.log(`✅ Status updated: ${sendungId} → ${newStatus}`);
      
      // Reload data to reflect changes
      await loadSendungen();
      
      return { success: true, newStatus };
    } catch (err) {
      handleError(err, 'Status Update');
      throw err;
    }
  }, [sendungen, loadSendungen, handleError]);

  // Delete Sendung
  const deleteSendung = useCallback(async (sendungId) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', sendungId);
        
      if (error) throw error;
      
      console.log(`🗑️ Sendung gelöscht: ${sendungId}`);
      await loadSendungen();
      
      return { success: true };
    } catch (err) {
      handleError(err, 'Sendung löschen');
      throw err;
    }
  }, [loadSendungen, handleError]);

  // Save/Update Sendung
  const saveSendung = useCallback(async (sendungData, isNew = false) => {
    try {
      let result;
      
      if (isNew) {
        // Create new shipment
        const { data, error } = await supabase
          .from('shipments')
          .insert([{
            ...sendungData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        console.log('➕ Neue Sendung erstellt:', result.id);
      } else {
        // Update existing shipment
        const { data, error } = await supabase
          .from('shipments')
          .update({
            ...sendungData,
            updated_at: new Date().toISOString()
          })
          .eq('id', sendungData.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
        
        console.log('💾 Sendung aktualisiert:', result.id);
      }
      
      await loadSendungen();
      return { success: true, data: result };
    } catch (err) {
      handleError(err, 'Sendung speichern');
      throw err;
    }
  }, [loadSendungen, handleError]);

  // Save Costs via Backend API
  const saveCosts = useCallback(async (shipmentId, costs) => {
    try {
      console.log('💰 Speichere Kosten für Shipment:', shipmentId, costs);
      
      // Validate costs object
      const validCosts = {
        pickup_cost: parseFloat(costs.pickup_cost || 0),
        main_cost: parseFloat(costs.main_cost || costs.mainrun_cost || 0),
        delivery_cost: parseFloat(costs.delivery_cost || 0)
      };

      // Use Backend API endpoint
      const response = await fetch(`http://localhost:3001/api/shipments/${shipmentId}/costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cost_type: 'bulk', // Bulk update alle Kosten
          costs: validCosts,
          method: 'magic_input'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API Fehler');
      }

      const result = await response.json();
      console.log('✅ Kosten gespeichert:', result);
      
      // Reload data
      await loadSendungen();
      
      return { success: true, data: result };
    } catch (err) {
      // Fallback: Direct Supabase update
      console.warn('API Fehler, verwende Supabase fallback:', err);
      
      try {
        const { data, error } = await supabase
          .from('shipments')
          .update({
            pickup_cost: parseFloat(costs.pickup_cost || 0),
            main_cost: parseFloat(costs.main_cost || costs.mainrun_cost || 0),
            delivery_cost: parseFloat(costs.delivery_cost || 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', shipmentId)
          .select()
          .single();

        if (error) throw error;
        
        await loadSendungen();
        return { success: true, data };
      } catch (fallbackErr) {
        handleError(fallbackErr, 'Kosten speichern (Fallback)');
        throw fallbackErr;
      }
    }
  }, [loadSendungen, handleError]);

 // Create Offer via Backend API mit Supabase Fallback
  const createOffer = useCallback(async (shipmentId, offerData) => {
    try {
      console.log('💼 Erstelle Angebot für:', shipmentId, offerData);
      
      // Angebots-Nummer generieren
      const offerNumber = `ANG-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Erweiterte Angebots-Daten
      const extendedOfferData = {
        ...offerData,
        offer_number: offerNumber,
        offer_created_at: new Date().toISOString(),
        status: 'ANGEBOT'
      };

      // Direkt Supabase verwenden (Backend hat keinen create-offer endpoint)
      console.log('💼 Verwende Supabase für Angebot-Erstellung');
        
       // Supabase Angebot-Erstellung
      const updateData = {
        status: 'ANGEBOT',
        offer_number: offerNumber,
        offer_price: parseFloat(offerData.offer_price || 0),
        offer_profit: parseFloat(offerData.offer_profit || 0),
        offer_margin_percent: parseFloat(offerData.offer_margin_percent || 0),
        offer_created_at: offerData.offer_created_at || new Date().toISOString(),
        offer_valid_until: offerData.offer_valid_until || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        offer_notes: generateOfferText(shipmentId, offerData),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Supabase Update Data:', updateData);

      const { data, error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase Error Details:', error);
        throw new Error(`Supabase Fehler: ${error.message}`);
      }

      console.log('✅ Angebot erfolgreich erstellt:', data);
      
      await loadSendungen();
      return { success: true, data: data };
      
    } catch (err) {
      console.error('❌ Angebot erstellen fehlgeschlagen:', err);
      handleError(err, 'Angebot erstellen');
      throw err;
    }
  }, [loadSendungen, handleError]);

  // Angebots-Text Generator
  const generateOfferText = useCallback((shipmentId, offerData) => {
    const currentSendung = sendungen.find(s => s.id === shipmentId);
    if (!currentSendung) return 'Angebot erstellt';

    const customerName = customers[currentSendung.customer_id] || 'Wertgeschätzter Kunde';
    
    return `Sehr geehrte Damen und Herren,

gerne unterbreiten wir Ihnen folgendes Angebot für Ihre Luftfrachtsendung:

SENDUNGSDETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Von: ${currentSendung.origin_airport || 'N/A'}
Nach: ${currentSendung.destination_airport || 'N/A'}
Frankatur: ${currentSendung.incoterm || 'CPT'} ${currentSendung.destination_airport || 'Zielort'}

Gewicht: ${currentSendung.total_weight || 0} kg
Packstücke: ${currentSendung.total_pieces || 0} Colli
Ware: ${currentSendung.commodity || 'Allgemeine Fracht'}

PREISANGABE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transportpreis: EUR ${offerData.offer_price?.toFixed(2) || '0.00'}
Frankatur: ${currentSendung.incoterm || 'CPT'} ${currentSendung.destination_airport || 'Zielort'}

Das Angebot ist gültig bis ${new Date(offerData.offer_valid_until).toLocaleDateString('de-DE')}.

Mit freundlichen Grüßen
Ihr LogistikPro Team`;
  }, [sendungen, customers]);

  // Accept/Reject Offer
  const handleOffer = useCallback(async (shipmentId, action, reason = '') => {
    try {
      let newStatus;
      let updateData = {
        updated_at: new Date().toISOString()
      };

      if (action === 'accept') {
        newStatus = 'created';
        updateData.status = newStatus;
        updateData.offer_accepted_at = new Date().toISOString();
        updateData.converted_to_shipment_at = new Date().toISOString();
        
        // Generate AWB if not exists
        if (!updateData.awb_number) {
          updateData.awb_number = `020-${Math.floor(Math.random() * 99999999).toString().padStart(8, '0')}`;
        }
      } else if (action === 'reject') {
        newStatus = 'ABGELEHNT';
        updateData.status = newStatus;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', shipmentId);

      if (error) throw error;

      console.log(`📋 Angebot ${action}ed:`, shipmentId);
      await loadSendungen();
      
      return { success: true, newStatus };
    } catch (err) {
      handleError(err, `Angebot ${action}`);
      throw err;
    }
  }, [loadSendungen, handleError]);

  // Return Hook Interface
  return {
    // State
    sendungen,
    customers,
    partners,
    loading,
    error,
    stats,
    
    // Methods
    loadAllData,
    loadSendungen,
    loadCustomers,
    loadPartners,
    updateStatus,
    deleteSendung,
    saveSendung,
    saveCosts,
    createOffer,
    handleOffer,
    
    // Utilities
    calculateStats,
    clearError: () => setError(null)
  };
};

export default useSendungsData;