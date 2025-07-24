// frontend/src/services/shipmentService.js - Supabase Version
import supabase from '../supabaseClient';

const shipmentService = {
  // Alle Sendungen abrufen
  async getShipments() {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Sendungen:', error);
      throw new Error('Fehler beim Abrufen der Sendungen');
    }
  },

  // Einzelne Sendung
  async getShipment(id) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sendung nicht gefunden:', error);
      throw new Error('Sendung nicht gefunden');
    }
  },

  // Neue Sendung erstellen
  async createShipment(shipmentData) {
    try {
      console.log('📤 Creating shipment with data:', shipmentData);
      
      // Bereite Daten für Supabase vor
      const supabaseData = {
        position: shipmentData.position,
        customer_id: shipmentData.kunde_id || shipmentData.customer_id,
        pickup_address_id: shipmentData.abholort_id || shipmentData.pickup_address_id,
        reference: shipmentData.referenz || shipmentData.reference,
        status: shipmentData.status || 'ANFRAGE',
        
        // Transport Details
        transport_type: shipmentData.transportArt === 'luftfracht' ? 'AIR' : 
                       shipmentData.transportArt === 'seefracht' ? 'SEA' : 
                       shipmentData.transportArt === 'lkw' ? 'TRUCK' : 'AIR',
        import_export: (shipmentData.importExport || 'export').toUpperCase(),
        origin_airport: shipmentData.vonFlughafen || shipmentData.origin_airport,
        destination_airport: shipmentData.nachFlughafen || shipmentData.destination_airport,
        
        // Termine
        pickup_date: shipmentData.abholDatum || shipmentData.pickup_date,
        pickup_time: shipmentData.abholZeit || shipmentData.pickup_time,
        delivery_date: shipmentData.deadline || shipmentData.delivery_date,
        
        // Packstücke
        total_pieces: parseInt(shipmentData.gesamtColli || shipmentData.total_pieces || 0),
        total_weight: parseFloat(shipmentData.gesamtGewicht || shipmentData.total_weight || 0),
        total_volume: parseFloat(shipmentData.gesamtVolumen || shipmentData.total_volume || 0),
        
        // Empfänger
        recipient_name: shipmentData.empfaenger?.name || shipmentData.recipient_name,
        recipient_street: shipmentData.empfaenger?.strasse || shipmentData.recipient_street,
        recipient_zip: shipmentData.empfaenger?.plz || shipmentData.recipient_zip,
        recipient_city: shipmentData.empfaenger?.ort || shipmentData.recipient_city,
        recipient_country: shipmentData.empfaenger?.land || shipmentData.recipient_country,
        
        // Zusatz
        incoterm: shipmentData.frankatur || shipmentData.incoterm || 'CPT',
        commodity: shipmentData.warenbeschreibung || shipmentData.commodity,
        special_instructions: shipmentData.sonderanweisungen || shipmentData.special_instructions,
        declared_value: parseFloat(shipmentData.warenwert || shipmentData.declared_value || 0),
        
        // Partner
        pickup_partner_id: shipmentData.pickup_partner_id,
        mainrun_partner_id: shipmentData.mainrun_partner_id,
        delivery_partner_id: shipmentData.delivery_partner_id,
        
        // Metadaten
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('📦 Supabase data prepared:', supabaseData);
      
      const { data, error } = await supabase
        .from('shipments')
        .insert(supabaseData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Shipment created:', data);
      return data;
      
    } catch (error) {
      console.error('💥 Create shipment error:', error);
      throw new Error(`Fehler beim Erstellen: ${error.message}`);
    }
  },

  // Kunden abrufen
  async getCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          emails,
          phones,
          pickup_addresses (
            id,
            street,
            zip,
            city,
            country,
            pickup_times (
              day_of_week,
              time_from,
              time_to
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      
      console.log('👥 Loaded customers:', data?.length);
      return data || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Kunden:', error);
      
      // Fallback: Vereinfachte Abfrage ohne Relations
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, emails, phones')
          .order('name');
        
        if (error) throw error;
        
        return data?.map(customer => ({
          ...customer,
          pickup_addresses: [] // Leerer Array als Fallback
        })) || [];
      } catch (fallbackError) {
        console.error('Auch Fallback fehlgeschlagen:', fallbackError);
        throw new Error('Fehler beim Abrufen der Kunden');
      }
    }
  },

  // Partner abrufen
  async getPartners() {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      console.log('🤝 Loaded partners:', data?.length);
      return data || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Partner:', error);
      throw new Error('Fehler beim Abrufen der Partner');
    }
  },

  // Flughäfen abrufen
  async getAirports() {
    try {
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .order('code');
      
      if (error) throw error;
      
      console.log('✈️ Loaded airports:', data?.length);
      return data || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Flughäfen:', error);
      
      // Fallback: Standard-Flughäfen
      return [
        { code: 'STR', name: 'Stuttgart', city: 'Stuttgart', country: 'DE' },
        { code: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'DE' },
        { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles', country: 'US' },
        { code: 'JFK', name: 'New York JFK', city: 'New York', country: 'US' },
        { code: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', country: 'FR' },
        { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'GB' }
      ];
    }
  },

  // Status aktualisieren
  async updateShipmentStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      throw new Error('Fehler beim Aktualisieren des Status');
    }
  },

  // Sendung aktualisieren
  async updateShipment(id, updateData) {
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
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Sendung:', error);
      throw new Error('Fehler beim Aktualisieren der Sendung');
    }
  },

  // Sendung löschen
  async deleteShipment(id) {
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Fehler beim Löschen der Sendung:', error);
      throw new Error('Fehler beim Löschen der Sendung');
    }
  },

  // Partner zuweisen
  async assignPartners(id, partnerData) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .update({
          pickup_partner_id: partnerData.pickup_partner_id,
          mainrun_partner_id: partnerData.mainrun_partner_id,
          delivery_partner_id: partnerData.delivery_partner_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Zuweisen der Partner:', error);
      throw new Error('Fehler beim Zuweisen der Partner');
    }
  },

  // Milestone Update
  async updateMilestone(shipmentId, milestoneData) {
    try {
      // Prüfe ob Milestone bereits existiert
      const { data: existingMilestone, error: checkError } = await supabase
        .from('milestones')
        .select('*')
        .eq('shipment_id', shipmentId)
        .eq('milestone_id', milestoneData.milestone_id)
        .single();
      
      if (existingMilestone) {
        // Update existing milestone
        const { data, error } = await supabase
          .from('milestones')
          .update({
            status: milestoneData.status || 'completed',
            timestamp: milestoneData.timestamp || new Date().toISOString(),
            description: milestoneData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMilestone.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new milestone
        const { data, error } = await supabase
          .from('milestones')
          .insert({
            shipment_id: shipmentId,
            milestone_id: milestoneData.milestone_id,
            status: milestoneData.status || 'completed',
            timestamp: milestoneData.timestamp || new Date().toISOString(),
            description: milestoneData.description,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Fehler beim Milestone Update:', error);
      throw new Error('Fehler beim Aktualisieren des Milestones');
    }
  },

  // Milestones für Sendung abrufen
  async getShipmentMilestones(shipmentId) {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('milestone_id');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Fehler beim Abrufen der Milestones:', error);
      throw new Error('Fehler beim Abrufen der Milestones');
    }
  },

  // Statistiken abrufen
  async getDashboardData() {
    try {
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('status, pickup_date, created_at');
      
      if (error) throw error;
      
      const today = new Date().toISOString().split('T')[0];
      
      return {
        total: shipments?.length || 0,
        active: shipments?.filter(s => !['zugestellt', 'delivered', 'storniert'].includes(s.status)).length || 0,
        pickupToday: shipments?.filter(s => s.pickup_date === today).length || 0,
        inTransit: shipments?.filter(s => s.status === 'in_transit').length || 0,
        critical: shipments?.filter(s => s.status === 'abgeholt' && s.pickup_date < today).length || 0
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
      return {
        total: 0,
        active: 0,
        pickupToday: 0,
        inTransit: 0,
        critical: 0
      };
    }
  },

  // Suche
  async searchShipments(query) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .or(`position.ilike.%${query}%,reference.ilike.%${query}%,awb_number.ilike.%${query}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Fehler bei der Suche:', error);
      throw new Error('Fehler bei der Suche');
    }
  },

  // Kosten aktualisieren
  async updateCosts(shipmentId, costs) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .update({
          cost_pickup: costs.pickup_cost || costs.cost_pickup,
          cost_mainrun: costs.main_cost || costs.cost_mainrun,
          cost_delivery: costs.delivery_cost || costs.cost_delivery,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kosten:', error);
      throw new Error('Fehler beim Aktualisieren der Kosten');
    }
  }
};

export default shipmentService;