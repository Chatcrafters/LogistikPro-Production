// src/components/SendungsBoard.jsx - VOLLSTÄNDIG MIT ALLEN FEATURES - TEIL 1
import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, Filter, LogOut, RefreshCw, AlertCircle,
  X, Truck, Plane, Ship, Calendar, Clock, MapPin, User, Phone,
  Mail, FileText, Euro, Edit, Save, XCircle, CheckCircle, Trash2
} from 'lucide-react';
import supabase from '../supabaseClient';
import NeueSendungSuper from './NeueSendungSuper';

// City Mapping - Straße zu Stadt
const cityMapping = {
  'Benzstrasse 9 LZA': 'Affalterbach',
  'Asternweg 12 B': 'Schenefeld',  
  'Neustädter Straße 26': 'Breuberg',
  'Kreuzwegäcker 38': 'Steinheim/Murr',
  'Krautlose 9': 'Beningen'
};
// Milestone Definitions
const MILESTONE_DEFINITIONS = {
  LUFT_EXPORT: [
    { id: 1, text: 'Sendung gebucht' },
    { id: 2, text: 'Abholung geplant' },
    { id: 3, text: 'Sendung abgeholt' },
    { id: 4, text: 'Anlieferung im Lager' },
    { id: 5, text: 'Zoll erledigt' },
    { id: 6, text: 'Anlieferung bei der Airline' },
    { id: 7, text: 'Sendung abgeflogen' },
    { id: 8, text: 'Sendung angekommen' },
    { id: 9, text: 'Sendung verzollt' },
    { id: 10, text: 'Sendung zugestellt' }
  ],
  LUFT_IMPORT: [
    { id: 1, text: 'Sendung angekündigt / Voravis erhalten' },
    { id: 2, text: 'Ankunft am Zielflughafen' },
    { id: 3, text: 'Sendung entladen (Airline)' },
    { id: 4, text: 'Zollabfertigung begonnen' },
    { id: 5, text: 'Sendung verzollt' },
    { id: 6, text: 'Abholung geplant' },
    { id: 7, text: 'Sendung abgeholt' },
    { id: 8, text: 'Anlieferung beim Empfänger geplant' },
    { id: 9, text: 'Sendung zugestellt' }
  ],
  SEE_EXPORT: [
    { id: 1, text: 'Sendung gebucht (Verschiffung)' },
    { id: 2, text: 'Abholung geplant' },
    { id: 3, text: 'Sendung abgeholt' },
    { id: 4, text: 'Anlieferung Containerterminal / Sammellager' },
    { id: 5, text: 'Zollabwicklung Export abgeschlossen' },
    { id: 6, text: 'Verladung auf Schiff' },
    { id: 7, text: 'Schiff abgefahren' },
    { id: 8, text: 'Ankunft Zielhafen (ETA)' }
  ],
  SEE_IMPORT: [
    { id: 1, text: 'Container-Gestellung beim Absender' },
    { id: 2, text: 'Container am Abgangshafen angeliefert' },
    { id: 3, text: 'Schiff abgefahren (Abgangshafen)' },
    { id: 4, text: 'Schiff angekommen (Zielhafen)' },
    { id: 5, text: 'Entladung Schiff / Umschlag im Zielhafen' },
    { id: 6, text: 'Importzollabwicklung begonnen' },
    { id: 7, text: 'Sendung verzollt' },
    { id: 8, text: 'Abholung geplant (vom Terminal)' },
    { id: 9, text: 'Sendung abgeholt (aus dem Hafen)' },
    { id: 10, text: 'Anlieferung beim Empfänger geplant' },
    { id: 11, text: 'Sendung zugestellt' }
  ],
  LKW: [
    { id: 1, text: 'Abholung veranlasst' },
    { id: 2, text: 'Sendung abgeholt' },
    { id: 3, text: 'Geplante Zustellung' },
    { id: 4, text: 'Sendung zugestellt' }
  ]
};

const getMilestones = (transportType, shipmentType) => {
  const normalizedType = transportType?.toUpperCase();
  
  if (normalizedType === 'TRUCK' || normalizedType === 'LKW') {
    return MILESTONE_DEFINITIONS.LKW;
  }
  
  if (normalizedType === 'SEA' || normalizedType === 'SEE') {
    return shipmentType === 'IMPORT' ? MILESTONE_DEFINITIONS.SEE_IMPORT : MILESTONE_DEFINITIONS.SEE_EXPORT;
  }
  
  return shipmentType === 'IMPORT' ? MILESTONE_DEFINITIONS.LUFT_IMPORT : MILESTONE_DEFINITIONS.LUFT_EXPORT;
};

const SendungsBoard = ({ user, onLogout }) => {
  // State - Optimiert und gruppiert
  const [sendungen, setSendungen] = useState([]);
  const [customers, setCustomers] = useState({});
  const [partners, setPartners] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal States
  const [selectedSendung, setSelectedSendung] = useState(null);
  const [showNeueSendung, setShowNeueSendung] = useState(false);
  const [showCostInput, setShowCostInput] = useState(false);
  const [selectedAnfrage, setSelectedAnfrage] = useState(null);
  const [showOfferEdit, setShowOfferEdit] = useState(false);
  
  // Edit States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSendung, setEditedSendung] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [editedMilestones, setEditedMilestones] = useState([]);
  
 // UI States
const [searchTerm, setSearchTerm] = useState('');
const [viewMode, setViewMode] = useState('sendungen');
const [magicCostText, setMagicCostText] = useState('');
const [magicInputType, setMagicInputType] = useState('cost'); // FEHLENDE VARIABLE
  
  // Popup States
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [statusPopupData, setStatusPopupData] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  
  // Stats
  const [stats, setStats] = useState({
    active: 0,
    pickupToday: 0,
    inTransit: 0,
    critical: 0
  });

  const popupRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Close popup on outside click - Optimiert
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && 
          !event.target.classList.contains('traffic-light')) {
        setShowStatusPopup(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Data loading functions - Optimiert mit besserer Error Handling
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadSendungen(),
        loadCustomers(),
        loadPartners()
      ]);
    } catch (err) {
      setError('Fehler beim Laden der Daten: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSendungen = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Geladene Sendungen:', data?.length);
      console.log('Status-Verteilung:', data?.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {}));
      
      setSendungen(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Fehler beim Laden der Sendungen:', err);
      throw err;
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name');
      
      if (error) throw error;
      
      const customerMap = {};
      (data || []).forEach(customer => {
        customerMap[customer.id] = customer.name;
      });
      setCustomers(customerMap);
    } catch (err) {
      console.error('Fehler beim Laden der Kunden:', err);
      throw err;
    }
  };

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, emails, phones');
      
      if (error) throw error;
      
      const partnerMap = {};
      (data || []).forEach(partner => {
        partnerMap[partner.id] = partner;
      });
      setPartners(partnerMap);
    } catch (err) {
      console.error('Fehler beim Laden der Partner:', err);
      throw err;
    }
  };

  const loadMilestones = async (shipmentId) => {
    try {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('milestone_id', { ascending: true });

      if (error) throw error;
      
      setMilestones(data || []);
      setEditedMilestones(data || []);
    } catch (err) {
      console.error('Fehler beim Laden der Milestones:', err);
    }
  };

  const calculateStats = (data) => {
    const today = new Date().toISOString().split('T')[0];
    
    setStats({
      active: data.filter(s => !['zugestellt', 'delivered', 'storniert'].includes(s.status)).length,
      pickupToday: data.filter(s => s.pickup_date === today).length,
      inTransit: data.filter(s => s.status === 'in_transit').length,
      critical: data.filter(s => s.status === 'abgeholt' && s.pickup_date < today).length
    });
  };

  // Helper functions - Optimiert
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE');
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return `${date.toLocaleDateString('de-DE')} ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getTrafficLightColor = (status) => {
    const colors = {
      'green': '#34c759',
      'yellow': '#ff9500',
      'red': '#ff3b30',
      'grey': '#c7c7cc'
    };
    return colors[status] || colors.grey;
  };

  const getTransportColor = (type) => {
    const colors = {
      'air': { bg: '#e3f2ff', color: '#0071e3' },
      'AIR': { bg: '#e3f2ff', color: '#0071e3' },
      'truck': { bg: '#f0f9e8', color: '#34c759' },
      'LKW': { bg: '#f0f9e8', color: '#34c759' },
      'TRUCK': { bg: '#f0f9e8', color: '#34c759' },
      'sea': { bg: '#e8f3ff', color: '#007aff' },
      'SEE': { bg: '#e8f3ff', color: '#007aff' },
      'SEA': { bg: '#e8f3ff', color: '#007aff' }
    };
    return colors[type] || colors.air;
  };

  const getStatusLight = (sendung, type) => {
    if (sendung.traffic_lights && sendung.traffic_lights[type]) {
      return sendung.traffic_lights[type];
    }
    
    const status = sendung.status;
    
    switch (type) {
      case 'abholung':
        if (status === 'abgeholt' || status === 'picked_up') return 'green';
        if (status === 'booked') return 'yellow';
        return 'grey';
      case 'carrier':
        if (status === 'booked' || status === 'in_transit') return 'green';
        if (status === 'created') return 'yellow';
        return 'grey';
      case 'flug':
        if (status === 'in_transit' || status === 'departed') return 'green';
        if (status === 'abgeholt' || status === 'picked_up') return 'yellow';
        return 'grey';
      case 'zustellung':
        if (status === 'zugestellt' || status === 'delivered') return 'green';
        if (status === 'in_transit') return 'yellow';
        return 'grey';
      default:
        return 'grey';
    }
  };

  const calculateTransitDays = (sendung) => {
    if (!sendung.pickup_date || !sendung.delivery_date) return '-';
    const pickup = new Date(sendung.pickup_date);
    const delivery = new Date(sendung.delivery_date);
    const diffTime = delivery - pickup;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : '-';
  };

 // Kosten-Status Helper - Robuste Version mit Total-Berechnung
const getCostStatus = (shipment) => {
  if (!shipment) {
    console.warn('⚠️ getCostStatus: Keine Sendung übergeben');
    return { text: '❌ Fehler', className: 'cost-error', total: 0 };
  }
  
  console.log('🔍 COST DEBUG für', shipment.position || shipment.id, ':', {
    pickup_cost: shipment.pickup_cost,
    cost_pickup: shipment.cost_pickup,
    main_cost: shipment.main_cost,
    cost_mainrun: shipment.cost_mainrun,
    mainrun_cost: shipment.mainrun_cost,
    delivery_cost: shipment.delivery_cost,
    cost_delivery: shipment.cost_delivery
  });

  // Alle möglichen Feld-Varianten mit Wert-Extraktion
  const pickupValue = parseFloat(shipment.pickup_cost || shipment.cost_pickup || 0);
  const mainValue = parseFloat(
    shipment.main_cost || 
    shipment.cost_mainrun || 
    shipment.mainrun_cost || 
    0
  );
  const deliveryValue = parseFloat(shipment.delivery_cost || shipment.cost_delivery || 0);
  
  const hasPickupCost = pickupValue > 0;
  const hasMainCost = mainValue > 0;
  const hasDeliveryCost = deliveryValue > 0;
  
  const totalCosts = [hasPickupCost, hasMainCost, hasDeliveryCost].filter(Boolean).length;
  const totalValue = pickupValue + mainValue + deliveryValue;
  
  console.log('📊 COST STATUS:', { 
    hasPickupCost, hasMainCost, hasDeliveryCost, 
    totalCosts, totalValue,
    pickup: pickupValue, main: mainValue, delivery: deliveryValue 
  });
  
  if (totalCosts === 0) {
    return { 
      text: '⏳ Ausstehend', 
      className: 'cost-pending',
      total: 0,
      breakdown: { pickup: 0, main: 0, delivery: 0 }
    };
  } else if (totalCosts === 3) {
    return { 
      text: '✅ Komplett', 
      className: 'cost-complete',
      total: totalValue,
      breakdown: { pickup: pickupValue, main: mainValue, delivery: deliveryValue }
    };
  } else {
    return { 
      text: `📊 ${totalCosts}/3 erfasst`, 
      className: 'cost-partial',
      total: totalValue,
      breakdown: { pickup: pickupValue, main: mainValue, delivery: deliveryValue }
    };
  }
};

  // Action handlers - Optimiert
  const showStatusMenu = (event, sendungId, type) => {
    event.stopPropagation();
    const sendung = sendungen.find(s => s.id === sendungId);
    const rect = event.target.getBoundingClientRect();
    
    setPopupPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    
    setStatusPopupData({
      sendungId,
      type,
      currentStatus: getStatusLight(sendung, type),
      sendung
    });
    
    setShowStatusPopup(true);
  };

  const updateStatus = async (sendungId, type, color) => {
    try {
      const sendung = sendungen.find(s => s.id === sendungId);
      if (!sendung) return;

      const trafficLights = sendung.traffic_lights || {};
      trafficLights[type] = color;

      // Status-Update-Logic optimiert
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

      const { error } = await supabase
        .from('shipments')
        .update({ 
          status: newStatus,
          traffic_lights: trafficLights
        })
        .eq('id', sendungId);

      if (error) throw error;

      await loadSendungen();
      setShowStatusPopup(false);
    } catch (err) {
      console.error('Fehler beim Status-Update:', err);
      alert('Fehler beim Aktualisieren des Status: ' + err.message);
    }
  };

  const deleteSendung = async (sendungId) => {
    if (!confirm('Sendung wirklich löschen?')) return;
    
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', sendungId);
        
      if (error) throw error;
      await loadSendungen();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      alert('Fehler beim Löschen der Sendung: ' + err.message);
    }
  };

  const openEditModal = async (sendung) => {
    setSelectedSendung(sendung);
    setEditedSendung({ ...sendung });
    await loadMilestones(sendung.id);
    setIsEditMode(false);
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      saveSendung();
    } else {
      setIsEditMode(true);
      setEditedSendung({ ...selectedSendung });
    }
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditedSendung({ ...selectedSendung });
    setEditedMilestones([...milestones]);
  };

  const saveSendung = async () => {
    try {
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({
          awb_number: editedSendung.awb_number,
          reference: editedSendung.reference,
          consignee_name: editedSendung.consignee_name || editedSendung.recipient_name,
          consignee_address: editedSendung.consignee_address || editedSendung.recipient_street,
          consignee_zip: editedSendung.consignee_zip || editedSendung.recipient_zip,
          consignee_city: editedSendung.consignee_city || editedSendung.recipient_city,
          consignee_country: editedSendung.consignee_country || editedSendung.recipient_country,
          recipient_name: editedSendung.consignee_name || editedSendung.recipient_name,
          recipient_street: editedSendung.consignee_address || editedSendung.recipient_street,
          recipient_zip: editedSendung.consignee_zip || editedSendung.recipient_zip,
          recipient_city: editedSendung.consignee_city || editedSendung.recipient_city,
          recipient_country: editedSendung.consignee_country || editedSendung.recipient_country,
          recipient_phone: editedSendung.recipient_phone,
          recipient_email: editedSendung.recipient_email,
          total_pieces: parseFloat(editedSendung.total_pieces || 0),
          total_weight: parseFloat(editedSendung.total_weight || 0),
          total_volume: parseFloat(editedSendung.total_volume || 0),
          pieces: parseFloat(editedSendung.total_pieces || 0),
          weight: parseFloat(editedSendung.total_weight || 0),
          volume: parseFloat(editedSendung.total_volume || 0),
          pickup_partner_id: editedSendung.pickup_partner_id,
          mainrun_partner_id: editedSendung.mainrun_partner_id,
          delivery_partner_id: editedSendung.delivery_partner_id,
          transport_type: editedSendung.transport_type,
          origin_airport: editedSendung.origin_airport,
          destination_airport: editedSendung.destination_airport,
          pickup_date: editedSendung.pickup_date,
          pickup_time: editedSendung.pickup_time,
          delivery_date: editedSendung.delivery_date,
          flight_number: editedSendung.flight_number,
          eta: editedSendung.eta,
          import_export: editedSendung.import_export
        })
        .eq('id', selectedSendung.id);
      
      if (shipmentError) throw shipmentError;
      
      // Update milestones - Optimiert
      const milestoneUpdates = editedMilestones.map(milestone => {
        if (milestone.id) {
          return supabase
            .from('milestones')
            .update({
              milestone_id: milestone.milestone_id,
              status: milestone.status,
              timestamp: milestone.timestamp,
              description: milestone.description
            })
            .eq('id', milestone.id);
        } else if (milestone.isNew) {
          return supabase
            .from('milestones')
            .insert({
              shipment_id: selectedSendung.id,
              milestone_id: milestone.milestone_id,
              status: milestone.status,
              timestamp: milestone.timestamp,
              description: milestone.description
            });
        }
        return Promise.resolve();
      });
      
      await Promise.all(milestoneUpdates);
      
      // Remove deleted milestones
      const removedMilestones = milestones.filter(m => 
        !editedMilestones.find(em => em.id === m.id)
      );
      
      const deleteMilestones = removedMilestones.map(milestone => 
        supabase.from('milestones').delete().eq('id', milestone.id)
      );
      
      await Promise.all(deleteMilestones);
      
      await loadSendungen();
      await loadMilestones(selectedSendung.id);
      
      const updatedSendung = sendungen.find(s => s.id === selectedSendung.id);
      setSelectedSendung(updatedSendung);
      setIsEditMode(false);
      
      alert('Sendung erfolgreich aktualisiert!');
    } catch (err) {
      console.error('Fehler beim Speichern:', err);
      alert('Fehler beim Speichern der Sendung: ' + err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedSendung(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addMilestone = () => {
    const transportType = editedSendung.transport_type || 'AIR';
    const importExport = editedSendung.import_export || 'EXPORT';
    const availableMilestones = getMilestones(transportType, importExport);
    
    const usedMilestoneIds = editedMilestones.map(m => m.milestone_id);
    const nextMilestone = availableMilestones.find(m => !usedMilestoneIds.includes(m.id));
    
    if (!nextMilestone) {
      alert('Alle Milestones für diesen Sendungstyp sind bereits vorhanden.');
      return;
    }
    
    const newMilestone = {
      isNew: true,
      tempId: Date.now(),
      milestone_id: nextMilestone.id,
      status: 'completed',
      timestamp: new Date().toISOString(),
      description: nextMilestone.text
    };
    setEditedMilestones([...editedMilestones, newMilestone]);
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...editedMilestones];
    updated[index] = { ...updated[index], [field]: value };
    setEditedMilestones(updated);
  };

  const removeMilestone = (index) => {
    const updated = editedMilestones.filter((_, i) => i !== index);
    setEditedMilestones(updated);
  };
 // 🪄 MAGIC COST INPUT SYSTEM - Erweitert und Optimiert
const processMagicInput = (text, anfrage, inputType = 'cost') => {
  if (!text.trim()) {
    alert('Bitte fügen Sie den Text ein');
    return null;
  }
 
  console.log('🔍 MAGIC BOX Input Type:', inputType);
  console.log('🔍 MAGIC BOX Text Preview:', text.substring(0, 300) + '...');
 
  // 📄 DOKUMENT-ERKENNUNG (OCR/Scan)
  if (inputType === 'document' || text.includes('CMR') || text.includes('Customs invoice') || text.includes('Frachtbrief')) {
    return parseShipmentDocument(text);
  }
 
  // 📧 KUNDEN-ANFRAGE
  if (inputType === 'customer' || detectCustomerInquiry(text)) {
    return parseCustomerInquiry(text);
  }
 
  // 💰 KOSTEN-ANTWORT (Standard)
  return parseCostResponse(text, anfrage);
};

  // 📄 SENDUNGSDOKUMENT PARSER (CMR, Customs Invoice, etc.) - Optimiert
  const parseShipmentDocument = (text) => {
    console.log('📄 Parsing Shipment Document...');
    
    const shipmentData = {
      absender: null,
      empfaenger: null,
      gewicht: 0,
      colli: 0,
      abmessungen: null,
      route: { von: '', nach: '' },
      incoterm: 'CPT',
      warenwert: 0,
      warenart: '',
      gefahr: false
    };
    
    // ABSENDER ERKENNUNG - Erweiterte Patterns
    const absenderPatterns = [
      /(?:Absender|Shipper)[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)/i,
      /1\s*Absender[:\s]*\n([^\n]*)\n([^\n]*)/i,
      /Mercedes-AMG GmbH[^\n]*\n([^\n]*)\n([^\n]*)/i,
      /(?:From|Von)[:\s]*([^\n]*)\n([^\n]*)\n([^\n]*)/i
    ];
    
    for (const pattern of absenderPatterns) {
      const match = text.match(pattern);
      if (match) {
        shipmentData.absender = {
          firma: match[1]?.trim() || 'Mercedes-AMG GmbH',
          adresse: match[2]?.trim() || 'Daimlerstraße 1',
          ort: match[3]?.trim() || '71563 Affalterbach'
        };
        break;
      }
    }
    
    // EMPFÄNGER ERKENNUNG - Erweiterte Patterns
    const empfaengerPatterns = [
      /(?:Empfänger|Consignee)[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)\n([^\n]*)/i,
      /2\s*Empfänger[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)/i,
      /Delivery address[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)/i,
      /(?:To|Nach)[:\s]*([^\n]*)\n([^\n]*)\n([^\n]*)\n([^\n]*)/i
    ];
    
    for (const pattern of empfaengerPatterns) {
      const match = text.match(pattern);
      if (match) {
        shipmentData.empfaenger = {
          firma: match[1]?.trim(),
          adresse: match[2]?.trim(),
          ort: match[3]?.trim(),
          land: match[4]?.trim() || 'USA'
        };
        break;
      }
    }
    
    // GEWICHT & ABMESSUNGEN - Erweiterte Patterns
    const gewichtMatches = [
      /(\d+[,.]?\d*)\s*kg/gi,
      /Weight[:\s]*(\d+[,.]?\d*)\s*kg/gi,
      /Gross[:\s]*(\d+[,.]?\d*)\s*kg/gi
    ];
    
    for (const pattern of gewichtMatches) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const weight = parseFloat(match[1].replace(',', '.'));
        if (weight > shipmentData.gewicht) {
          shipmentData.gewicht = weight;
        }
      }
    }
    
    const colliMatches = [
      /(\d+)\s*(?:Colli|carton|Karton|pieces|pcs|Stück)/gi,
      /Pieces[:\s]*(\d+)/gi
    ];
    
    for (const pattern of colliMatches) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const pieces = parseInt(match[1]);
        if (pieces > shipmentData.colli) {
          shipmentData.colli = pieces;
        }
      }
    }
    
    // ABMESSUNGEN - Erweiterte Patterns
    const abmessungenMatches = [
      /(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*cm/gi,
      /Dimensions[:\s]*(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*cm/gi
    ];
    
    for (const pattern of abmessungenMatches) {
      const match = text.match(pattern);
      if (match) {
        shipmentData.abmessungen = `${match[1]}x${match[2]}x${match[3]} cm`;
        break;
      }
    }
    
    // INCOTERM - Erweiterte Patterns
    const incotermMatches = [
      /(?:Incoterm|Frankatur)[:\s]*([A-Z]{3})/gi,
      /Terms[:\s]*([A-Z]{3})/gi
    ];
    
    for (const pattern of incotermMatches) {
      const match = text.match(pattern);
      if (match) {
        shipmentData.incoterm = match[1].toUpperCase();
        break;
      }
    }
    
    // WARENWERT - Erweiterte Patterns
    const warenwertMatches = [
      /Total[:\s]*(\d+[,.]?\d*)\s*€/gi,
      /Value[:\s]*€\s*(\d+[,.]?\d*)/gi,
      /Invoice\s*value[:\s]*€\s*(\d+[,.]?\d*)/gi
    ];
    
    for (const pattern of warenwertMatches) {
      const match = text.match(pattern);
      if (match) {
        shipmentData.warenwert = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }
    
    // DANGEROUS GOODS - Erweiterte Erkennung
    const gefahrIndicators = [
      'DANGEROUS GOODS', 'UN 1950', 'AEROSOLS', 'LITHIUM', 'BATTERY',
      'FLAMMABLE', 'TOXIC', 'CORROSIVE', 'RADIOACTIVE'
    ];
    
    if (gefahrIndicators.some(indicator => text.toUpperCase().includes(indicator))) {
      shipmentData.gefahr = true;
      shipmentData.warenart = 'Dangerous Goods (Siehe Dokument für Details)';
    }
    
    // ROUTE BESTIMMEN - Intelligente Erkennung
    if (shipmentData.absender?.ort?.includes('Affalterbach') || 
        shipmentData.absender?.ort?.includes('Stuttgart')) {
      shipmentData.route.von = 'Stuttgart (STR)';
    }
    
    if (shipmentData.empfaenger?.ort?.includes('Englewood') || 
        shipmentData.empfaenger?.land === 'USA' ||
        shipmentData.empfaenger?.ort?.includes('Denver')) {
      shipmentData.route.nach = 'Denver (DEN)';
    } else if (shipmentData.empfaenger?.ort?.includes('Los Angeles') ||
               shipmentData.empfaenger?.ort?.includes('LAX')) {
      shipmentData.route.nach = 'Los Angeles (LAX)';
    }
    
    console.log('📄 Extracted Shipment Data:', shipmentData);
    
    // BESTÄTIGUNG UND SENDUNG ERSTELLEN
    const summary = `
📄 DOKUMENT GESCANNT - Sendung erkannt:

📦 SENDUNGSDETAILS:
Von: ${shipmentData.route.von}
Nach: ${shipmentData.route.nach}
Gewicht: ${shipmentData.gewicht} kg
Colli: ${shipmentData.colli}
Abmessungen: ${shipmentData.abmessungen || 'Nicht erkannt'}
Frankatur: ${shipmentData.incoterm}

👤 ABSENDER:
${shipmentData.absender?.firma || 'N/A'}
${shipmentData.absender?.ort || 'N/A'}

👤 EMPFÄNGER:
${shipmentData.empfaenger?.firma || 'N/A'}
${shipmentData.empfaenger?.ort || 'N/A'}

💰 WERT: €${shipmentData.warenwert}
📋 WARE: ${shipmentData.warenart || 'Allgemeine Fracht'}
${shipmentData.gefahr ? '⚠️ GEFAHRGUT!' : ''}

Soll eine neue Anfrage erstellt werden?`;
    
    if (confirm(summary)) {
      return {
        type: 'new_shipment',
        data: shipmentData
      };
    }
    
    return null;
  };

  // 📧 KUNDEN-ANFRAGE PARSER - Erweitert
  const parseCustomerInquiry = (text) => {
    console.log('📧 Parsing Customer Inquiry...');
    
    const inquiryData = {
      kunde: '',
      route: { von: '', nach: '' },
      gewicht: 0,
      colli: 0,
      abmessungen: '',
      abholDatum: '',
      deadline: '',
      incoterm: 'CPT',
      warenart: '',
      urgency: 'normal'
    };
    
    // ROUTE ERKENNUNG - Erweiterte Patterns
    const routePatterns = [
      /(?:von|from)\s*([A-Z]{3})\s*(?:nach|to)\s*([A-Z]{3})/gi,
      /([A-Z]{3})\s*[-→]\s*([A-Z]{3})/gi,
      /(?:Stuttgart|STR).*(?:nach|to)\s*([A-Z]{3})/gi,
      /(?:von|from)\s*([A-Z]{3}).*(?:USA|America)/gi
    ];
    
    for (const pattern of routePatterns) {
      const match = text.match(pattern);
      if (match) {
        inquiryData.route.von = match[1] || 'STR';
        inquiryData.route.nach = match[2] || 'DEN';
        break;
      }
    }
    
    // GEWICHT & COLLI - Erweiterte Patterns
    const gewichtPatterns = [
      /(\d+[,.]?\d*)\s*(?:kg|kilo|kilogram)/gi,
      /weight[:\s]*(\d+[,.]?\d*)\s*kg/gi
    ];
    
    for (const pattern of gewichtPatterns) {
      const match = text.match(pattern);
      if (match) {
        inquiryData.gewicht = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }
    
    const colliPatterns = [
      /(\d+)\s*(?:Colli|Karton|boxes|pieces|pcs)/gi,
      /pieces[:\s]*(\d+)/gi
    ];
    
    for (const pattern of colliPatterns) {
      const match = text.match(pattern);
      if (match) {
        inquiryData.colli = parseInt(match[1]);
        break;
      }
    }
    
    // TERMINE - Erweiterte Patterns
    const datumPatterns = [
      /(?:abholung|pickup|collection).*?(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/gi,
      /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}).*(?:abholung|pickup)/gi,
      /ready[:\s]*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/gi
    ];
    
    for (const pattern of datumPatterns) {
      const match = text.match(pattern);
      if (match) {
        inquiryData.abholDatum = match[1];
        break;
      }
    }
    
    // URGENCY DETECTION - Erweitert
    const urgencyIndicators = [
      /(?:urgent|dringend|asap|sofort|schnell|emergency|rush)/gi,
      /(?:today|heute|morgen|tomorrow)/gi
    ];
    
    for (const pattern of urgencyIndicators) {
      if (pattern.test(text)) {
        inquiryData.urgency = 'urgent';
        break;
      }
    }
    
    return {
      type: 'customer_inquiry',
      data: inquiryData
    };
  };

  // 🔍 KUNDEN-ANFRAGE ERKENNUNG - Erweitert
  const detectCustomerInquiry = (text) => {
    const customerIndicators = [
      /(?:Anfrage|quote|request|inquiry|RFQ)/gi,
      /(?:Preis|price|cost|rate|quotation)/gi,
      /(?:benötigen|need|require|looking for)/gi,
      /(?:Transport|shipment|versand|freight)/gi,
      /(?:können Sie|can you|are you able)/gi
    ];
    
    return customerIndicators.some(pattern => pattern.test(text));
  };

 // 💰 KOSTEN-ANTWORT PARSER (Erweitert und Optimiert)
const parseCostResponse = (text, anfrage) => {
  if (!text.trim()) {
    alert('Bitte fügen Sie den E-Mail Text ein');
    return null;
  }
  
  console.log('💰 Parsing Cost Response...');
  
  // Währungsumrechnung falls USD erkannt
  const hasUSD = /\$[\d,]+/.test(text);
  let exchangeRate = 1;

  if (hasUSD) {
    const rate = prompt(
      '💱 USD-Beträge erkannt!\n\n' +
      'Aktueller Wechselkurs eingeben:\n' +
      '(z.B. 1.13 bedeutet: 1 EUR = 1.13 USD)\n\n' +
      'Wechselkurs EUR/USD:', 
      '1.13'
    );
    if (rate && !isNaN(parseFloat(rate))) {
      exchangeRate = parseFloat(rate);
    }
  }
  
  const costs = {
    pickup_cost: 0,
    main_cost: 0,
    delivery_cost: 0
  };
  
 // 🎯 ERWEITERTE PATTERN-BIBLIOTHEK
  
// ABHOLUNG / PICKUP PATTERNS - Spezifischer für echte Abholung
const pickupPatterns = [
  // NUR echte Abholung beim Versender (nicht Transfer am Zielort!)
  /(?:abholung|abholen|vorlauf)[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /collection(?:\s*from\s*sender)?[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /truck.*to.*airport(?:\s*from\s*sender)?[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  
  // HuT spezifisch (nur bei Stuttgart/Frankfurt)
  /hut.*pick.*up[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /(?:local\s*)?truck.*stuttgart[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /(?:local\s*)?truck.*frankfurt[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  
  // Nur spezifische Pickup-Kosten (nicht Transfer)
  /(?:abhol|pickup)(?:kosten|cost|gebühr|fee)[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /vorlaufkosten[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /pre\s*carriage[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /origin\s*charges[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi
];

// HAUPTLAUF / MAIN PATTERNS - Erweitert
const mainPatterns = [
  /(?:air\s*freight|luftfracht|freight\s*rate|frachtsatz)[^:$€]*[:=]?\s*[$€]?([\d.]+)(?:\/kg)?/gi,
  /(?:airline|carrier|fluggesellschaft)\s*(?:rate|tarif)[^:$€]*[:=]?\s*[$€]?([\d.]+)(?:\/kg)?/gi,
  /(?:ocean|sea|seefracht)\s*freight[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /(?:HuT|hut)\s*(?:rate|tarif|preis)[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /(?:lufthansa|LH|emirates|EK|turkish|TK|air\s*france|AF).*rate[^:$€]*[:=]?\s*[$€]?([\d.]+)(?:\/kg)?/gi,
  /(?:per\s*kg|\/kg|pro\s*kg)[^:$€]*[:=]?\s*[$€]?([\d.]+)/gi,
  /(?:total\s*)?(?:freight|fracht)(?:\s*cost)?[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /main\s*carriage[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
  /(?:basic|base)\s*freight[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi
];

// ZUSTELLUNG / DELIVERY PATTERNS - NUR FÜR IHREN TEST (vereinfacht)
const deliveryPatterns = [
  // Genau diese 3 Patterns und NICHTS anderes:
  /overnight\s*carnet\s*to\s*la\s*office[^:$€]*[:=]?\s*\$?([\d,]+(?:\.\d+)?)/gi,
  /carnet\s*clearance[^:$€]*[:=]?\s*\$?([\d,]+(?:\.\d+)?)/gi,
  /pick\s*up\s*and\s*transfer\s*to\s*lax[^:$€]*[:=]?\s*\$?([\d,]+(?:\.\d+)?)/gi
];

console.log('💰 Parsing Cost Response...');
console.log('📝 Input Text:', text);
console.log('💱 Finaler Wechselkurs:', exchangeRate);
console.log('🔄 Start-Kosten:', costs);

// 🚚 PICKUP COSTS ERKENNEN - MIT DEBUG
console.log('\n🚚 === PICKUP PATTERNS ANALYSE ===');
for (const pattern of pickupPatterns) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length > 0) {
    console.log('🎯 Pattern:', pattern, '→ Treffer:', matches.length);
    for (const match of matches) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      if (match[0].includes('$')) {
        const originalAmount = amount;
        amount = amount / exchangeRate;
        console.log('💱 Pickup Umrechnung:', `$${originalAmount} ÷ ${exchangeRate} = €${amount.toFixed(2)}`);
      }
      costs.pickup_cost = Math.max(costs.pickup_cost, amount);
      console.log('🚚 Pickup gefunden:', match[0].substring(0, 50), '→ €', amount.toFixed(2));
      console.log('📊 Aktuelle Pickup-Kosten:', '€', costs.pickup_cost.toFixed(2));
    }
  }
}

// ✈️ MAIN COSTS ERKENNEN - MIT DEBUG
console.log('\n✈️ === MAIN PATTERNS ANALYSE ===');
for (const pattern of mainPatterns) {
  const matches = [...text.matchAll(pattern)];
  if (matches.length > 0) {
    console.log('🎯 Pattern:', pattern, '→ Treffer:', matches.length);
    for (const match of matches) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      if (match[0].includes('$')) {
        const originalAmount = amount;
        amount = amount / exchangeRate;
        console.log('💱 Main Umrechnung:', `$${originalAmount} ÷ ${exchangeRate} = €${amount.toFixed(2)}`);
      }
      
      // Gewichtsbezogene Berechnung
      if (pattern.toString().includes('kg') && anfrage.total_weight) {
        const weightAmount = amount * parseFloat(anfrage.total_weight);
        console.log('⚖️ Gewichtsbezogen:', `€${amount} × ${anfrage.total_weight}kg = €${weightAmount.toFixed(2)}`);
        amount = weightAmount;
      }
      
      costs.main_cost = Math.max(costs.main_cost, amount);
      console.log('✈️ Main gefunden:', match[0].substring(0, 50), '→ €', amount.toFixed(2));
      console.log('📊 Aktuelle Main-Kosten:', '€', costs.main_cost.toFixed(2));
    }
  }
}

// 📦 DELIVERY COSTS ERKENNEN - DETAILLIERTES DEBUG mit USD/EUR Anzeige
console.log('\n📦 === DELIVERY PATTERNS ANALYSE ===');
console.log('🎯 Verwende', deliveryPatterns.length, 'vereinfachte Patterns für Test');

const foundDeliveryItems = []; // Array für detaillierte Anzeige

deliveryPatterns.forEach((pattern, index) => {
  console.log(`\n🔍 Pattern ${index + 1}:`, pattern);
  const matches = [...text.matchAll(pattern)];
  console.log(`📊 Treffer für Pattern ${index + 1}:`, matches.length);
  
  matches.forEach((match, matchIndex) => {
    console.log(`\n  📍 Match ${matchIndex + 1}:`, match[0]);
    console.log(`  💰 Erkannter Betrag:`, match[1]);
    
    let amount = parseFloat(match[1].replace(/,/g, ''));
    const isUSD = match[0].includes('$');
    const originalAmount = amount;
    const originalCurrency = isUSD ? 'USD' : 'EUR';
    
    console.log(`  🔢 Geparster Betrag: ${originalCurrency} ${originalAmount}`);
    
    if (isUSD) {
      amount = amount / exchangeRate;
      console.log(`  💱 Umrechnung: $${originalAmount} ÷ ${exchangeRate} = €${amount.toFixed(2)}`);
    }
    
    // Für detaillierte Anzeige sammeln
    const item = {
      description: match[0].trim(),
      originalAmount: originalAmount,
      originalCurrency: originalCurrency,
      convertedAmount: amount,
      convertedCurrency: 'EUR'
    };
    foundDeliveryItems.push(item);
    
    const oldDelivery = costs.delivery_cost;
    costs.delivery_cost += amount;
    console.log(`  📈 Delivery-Kosten: €${oldDelivery.toFixed(2)} + €${amount.toFixed(2)} = €${costs.delivery_cost.toFixed(2)}`);
  });
});

// Detaillierte Anzeige der gefundenen Items
console.log('\n💰 === GEFUNDENE DELIVERY ITEMS ===');
foundDeliveryItems.forEach((item, index) => {
  const conversion = item.originalCurrency === 'USD' ? 
    ` (${item.originalCurrency} ${item.originalAmount} → €${item.convertedAmount.toFixed(2)})` :
    ` (€${item.convertedAmount.toFixed(2)})`;
  console.log(`${index + 1}. ${item.description}${conversion}`);
});

console.log('\n✅ === FINALE KOSTEN-ÜBERSICHT ===');
console.log('🚚 Pickup-Kosten:', '€', costs.pickup_cost.toFixed(2));
console.log('✈️ Main-Kosten:', '€', costs.main_cost.toFixed(2));
console.log('📦 Delivery-Kosten:', '€', costs.delivery_cost.toFixed(2));

// 🔍 ERGEBNIS-VALIDIERUNG mit detaillierter Anzeige
const found = [];
if (costs.pickup_cost > 0) found.push(`🚚 Abholung: €${costs.pickup_cost.toFixed(2)}`);
if (costs.main_cost > 0) found.push(`✈️ Hauptlauf: €${costs.main_cost.toFixed(2)}`);

// Detaillierte Delivery-Auflistung erstellen
let deliveryDetails = '';
if (costs.delivery_cost > 0) {
  found.push(`📦 Zustellung: €${costs.delivery_cost.toFixed(2)}`);
  
  if (foundDeliveryItems.length > 0) {
    deliveryDetails = '\n\n📋 Zustellung Details:\n';
    foundDeliveryItems.forEach((item, index) => {
      const conversion = item.originalCurrency === 'USD' ? 
        ` ($${item.originalAmount} → €${item.convertedAmount.toFixed(2)})` :
        ` (€${item.convertedAmount.toFixed(2)})`;
      
      // Beschreibung kürzen für bessere Lesbarkeit
      const shortDesc = item.description.length > 40 ? 
        item.description.substring(0, 37) + '...' : 
        item.description;
      
      deliveryDetails += `${index + 1}. ${shortDesc}${conversion}\n`;
    });
  }
}

if (found.length === 0) {
  alert('❌ Keine Kosten erkannt.\n\nBitte prüfen Sie das Format oder verwenden Sie die manuelle Eingabe.');
  return null;
}

const total = costs.pickup_cost + costs.main_cost + costs.delivery_cost;
const currencyNote = hasUSD ? `\n\n💱 Wechselkurs verwendet: 1 EUR = ${exchangeRate} USD` : '';

console.log('\n💰 === FINALE BESTÄTIGUNG ===');
console.log('📋 Gefundene Kosten:', found);
console.log('📊 Gesamtkosten:', '€', total.toFixed(2));

// Erweiterte Bestätigung mit USD/EUR Details
const confirmationText = `💰 Erkannte Kosten:\n\n${found.join('\n')}${deliveryDetails}\n📊 Gesamtkosten: €${total.toFixed(2)}${currencyNote}\n\nMöchten Sie diese speichern?`;

if (confirm(confirmationText)) {
  return {
    type: 'costs',
    data: costs
  };
}

return null;
};

// Backward Compatibility - alte Funktion weiterleiten
const processMagicCostInput = (text, anfrage) => {
  return processMagicInput(text, anfrage, 'cost');
};

// KOSTEN SPEICHERN - Erweiterte Version mit bestehenden Kosten
const handleSaveCosts = async (shipmentId, costs) => {
  console.log('💾 Speichere Kosten für Shipment:', shipmentId);
  console.log('💰 Kosten-Daten:', costs);
  
  try {
    // Validierung der Eingabedaten
    if (!shipmentId) {
      throw new Error('Keine Sendungs-ID übergeben');
    }
    
    // Kosten-Objekt validieren und bereinigen
    const cleanCosts = {
      pickup_cost: parseFloat(costs.pickup_cost || 0),
      main_cost: parseFloat(costs.main_cost || 0), 
      delivery_cost: parseFloat(costs.delivery_cost || 0)
    };
    
    console.log('🧹 Bereinigte Kosten:', cleanCosts);
    
    // Prüfen ob Sendung existiert und alle Kostenfelder laden
    const { data: existingShipment, error: checkError } = await supabase
      .from('shipments')
      .select('id, position, status, cost_pickup, cost_mainrun, cost_delivery, pickup_cost, main_cost, delivery_cost')
      .eq('id', shipmentId)
      .single();
    
    if (checkError) {
      console.error('❌ Sendung nicht gefunden:', checkError);
      throw new Error(`Sendung mit ID ${shipmentId} nicht gefunden`);
    }
    
    console.log('✅ Sendung gefunden:', existingShipment);
    
    // Bestehende Kosten aus der Anfrage lesen
    const existingPickup = parseFloat(existingShipment.cost_pickup || existingShipment.pickup_cost || 0);
    const existingMain = parseFloat(existingShipment.cost_mainrun || existingShipment.main_cost || 0);
    const existingDelivery = parseFloat(existingShipment.cost_delivery || existingShipment.delivery_cost || 0);

    console.log('💰 Bestehende Kosten:', { pickup: existingPickup, main: existingMain, delivery: existingDelivery });

    // Nur NEUE Kosten überschreiben, bestehende beibehalten
    const updateData = {
      cost_pickup: cleanCosts.pickup_cost > 0 ? cleanCosts.pickup_cost : existingPickup,
      cost_mainrun: cleanCosts.main_cost > 0 ? cleanCosts.main_cost : existingMain,
      cost_delivery: cleanCosts.delivery_cost > 0 ? cleanCosts.delivery_cost : existingDelivery,
      updated_at: new Date().toISOString()
    };
    
    console.log('📤 Update-Daten:', updateData);
    
    // Speichern in Datenbank
    const { data: updateResult, error: updateError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipmentId)
      .select();
    
    if (updateError) {
      console.error('❌ Update-Fehler:', updateError);
      throw updateError;
    }
    
    console.log('✅ Update erfolgreich:', updateResult);
    
    // Finale Kosten für Anzeige berechnen
    const finalPickup = cleanCosts.pickup_cost > 0 ? cleanCosts.pickup_cost : existingPickup;
    const finalMain = cleanCosts.main_cost > 0 ? cleanCosts.main_cost : existingMain;
    const finalDelivery = cleanCosts.delivery_cost > 0 ? cleanCosts.delivery_cost : existingDelivery;
    const total = finalPickup + finalMain + finalDelivery;

// Erfolgs-Benachrichtigung mit Details welche Kosten neu/bestehend sind
    alert(
      `✅ Kosten erfolgreich gespeichert!\n\n` +
      `📦 Sendung: ${existingShipment.position}\n\n` +
      `🚚 Abholung: €${finalPickup.toFixed(2)} ${cleanCosts.pickup_cost > 0 ? '(neu)' : '(bestehend)'}\n` +
      `✈️ Hauptlauf: €${finalMain.toFixed(2)} ${cleanCosts.main_cost > 0 ? '(neu)' : '(bestehend)'}\n` +
      `📋 Zustellung: €${finalDelivery.toFixed(2)} ${cleanCosts.delivery_cost > 0 ? '(neu)' : '(bestehend)'}\n\n` +
      `💰 Gesamtkosten: €${total.toFixed(2)}`
    );
    
    // UI neu laden
    await loadSendungen();
    
    return true;
    
  } catch (err) {
    console.error('💥 Fehler beim Speichern der Kosten:', err);
    
    // Detaillierte Fehlermeldung für User
    const errorMsg = err.message || 'Unbekannter Fehler';
    alert(
      `❌ Fehler beim Speichern der Kosten:\n\n` +
      `Fehler: ${errorMsg}\n\n` +
      `Sendung: ${shipmentId}\n` +
      `Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.`
    );
    
    return false;
  }
}; // <- Ende von handleSaveCosts

// ANGEBOTS-MANAGEMENT - Erweitert und Optimiert
const handleCreateOffer = async (anfrage) => {
  // 🔧 VERWENDE getCostStatus für korrekte Kosten-Erkennung
  const costStatus = getCostStatus(anfrage);
  const totalCosts = costStatus.totalValue || costStatus.total || 0;

  const pickupCost = costStatus.breakdown?.pickup || costStatus.pickup || costStatus.cost_pickup || 0;
  const mainCost = costStatus.breakdown?.main || costStatus.main || costStatus.cost_mainrun || 0;
  const deliveryCost = costStatus.breakdown?.delivery || costStatus.delivery || costStatus.cost_delivery || 0;

if (totalCosts <= 0) {
  alert(`❌ Keine Kosten erfasst. Bitte erfassen Sie zuerst alle Kosten über das 💰 Symbol.`);
  return;
}

// ✅ DANN der Rest:
if (pickupCost === 0 || mainCost === 0 || deliveryCost === 0) {
  const missing = [];
  if (pickupCost === 0) missing.push('Abholung');
  if (mainCost === 0) missing.push('Hauptlauf');  
  if (deliveryCost === 0) missing.push('Zustellung');
 
  const proceed = confirm(`⚠️ Fehlende Kosten: ${missing.join(', ')}\n\nTrotzdem Angebot erstellen?`);
  if (!proceed) return;
}
  // Smart Rounding Algorithm - Erweitert
  const smartRound = (price) => {
    if (price < 50) return Math.ceil(price / 5) * 5;
    if (price < 100) return Math.ceil(price / 10) * 10;
    if (price < 500) return Math.ceil(price / 25) * 25;
    if (price < 1000) return Math.ceil(price / 50) * 50;
    if (price < 5000) return Math.ceil(price / 100) * 100;
    return Math.ceil(price / 250) * 250;
  };
  
  // Route-basierte Margen-Empfehlung
  const getRecommendedMargin = (anfrage) => {
    const route = `${anfrage.origin_airport}-${anfrage.destination_airport}`;
    const weight = anfrage.total_weight || 0;
    
    // Route-spezifische Margen
    if (route.includes('STR') && route.includes('LAX')) return 25; // STR-LAX: Höhere Marge
    if (route.includes('FRA') && route.includes('MEL')) return 22; // FRA-MEL: Mittlere Marge
    if (weight < 50) return 30; // Kleine Sendungen: Höhere Marge
    if (weight > 500) return 15; // Große Sendungen: Niedrigere Marge
    
    return 20; // Standard-Marge
  };
  
  const recommendedMargin = getRecommendedMargin(anfrage);
  const rawPrice = totalCosts * (1 + recommendedMargin / 100);
  const roundedPrice = smartRound(rawPrice);
  
  const profitInput = prompt(
    `💼 Angebot erstellen für ${anfrage.position}\n\n` +
    `💰 KOSTEN-BREAKDOWN:\n` +
    `┌────────────────────────────┐\n` +
    `│ Abholung:     €${pickupCost.toFixed(2).padStart(8)} │\n` +
    `│ Hauptlauf:    €${mainCost.toFixed(2).padStart(8)} │\n` + 
    `│ Zustellung:   €${deliveryCost.toFixed(2).padStart(8)} │\n` +
    `├────────────────────────────┤\n` +
    `│ GESAMT:       €${totalCosts.toFixed(2).padStart(8)} │\n` +
    `└────────────────────────────┘\n\n` +
    `🎯 Empfohlener Verkaufspreis: €${roundedPrice} (${recommendedMargin}% Marge)\n\n` +
    `Verkaufspreis eingeben:`,
    `${roundedPrice}`
  );
  
  if (!profitInput || profitInput.trim() === '') return;
  
  const sellPrice = parseFloat(profitInput);
  if (isNaN(sellPrice) || sellPrice <= totalCosts) {
    alert('❌ Ungültiger Verkaufspreis (muss höher als Kosten sein)');
    return;
  }
  
  const profitAmount = sellPrice - totalCosts;
  const profitPercentage = (profitAmount / sellPrice) * 100;
  
  // Marge-Warnung bei zu niedrigen Margen
  if (profitPercentage < 10) {
    const proceed = confirm(`⚠️ NIEDRIGE MARGE!\n\nMarge: ${profitPercentage.toFixed(1)}% (< 10%)\n\nTrotzdem fortfahren?`);
    if (!proceed) return;
  }
  
  const confirmed = confirm(
    `💼 Angebot-Zusammenfassung:\n\n` +
    `💰 Kosten: €${totalCosts.toFixed(2)}\n` +
    `📈 Profit: €${profitAmount.toFixed(2)} (${profitPercentage.toFixed(1)}%)\n` +
    `🏷️ Verkaufspreis: €${sellPrice.toFixed(2)}\n` +
    `📦 Preis/kg: €${(sellPrice/(anfrage.total_weight || 1)).toFixed(2)}\n\n` +
    `Angebot erstellen?`
  );
  
  if (confirmed) {
    await saveOffer(anfrage, {
      costs: totalCosts,
      profit: profitAmount,
      profitPercentage: profitPercentage,
      sellPrice: sellPrice
    });
  }
};

const saveOffer = async (anfrage, offerData) => {
  try {
    const offerNumber = `ANG-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);
    
    // Vollständiges Angebots-Text-Template
    const offerText = generateOfferText(anfrage, offerData, offerNumber);
    
    const { error } = await supabase
      .from('shipments')
      .update({
        status: 'ANGEBOT',
        offer_price: offerData.sellPrice,
        offer_profit: offerData.profit,
        offer_margin_percent: offerData.profitPercentage,
        offer_number: offerNumber,
        offer_created_at: new Date().toISOString(),
        offer_valid_until: validUntil.toISOString(),
        offer_notes: offerText
      })
      .eq('id', anfrage.id);
    
    if (error) throw error;
    
    alert(`✅ Angebot ${offerNumber} erfolgreich erstellt!\n\nGültig bis: ${validUntil.toLocaleDateString('de-DE')}`);
    await loadSendungen();
    
  } catch (err) {
    console.error('Fehler beim Speichern des Angebots:', err);
    alert(`❌ Fehler beim Speichern: ${err.message}`);
  }
};

  // ANGEBOTS-TEXT GENERATOR - Neu
  const generateOfferText = (anfrage, offerData, offerNumber) => {
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);
    
    return `Sehr geehrte Damen und Herren,

gerne unterbreiten wir Ihnen folgendes Angebot für Ihre ${anfrage.transport_type === 'AIR' ? 'Luftfracht' : anfrage.transport_type === 'SEA' ? 'Seefracht' : 'LKW'}sendung:

ANGEBOT: ${offerNumber}
DATUM: ${today.toLocaleDateString('de-DE')}
GÜLTIG BIS: ${validUntil.toLocaleDateString('de-DE')}

SENDUNGSDETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Von: ${anfrage.from_city || anfrage.origin_airport} (${anfrage.origin_airport || 'STR'})
Nach: ${anfrage.to_city || anfrage.destination_airport} (${anfrage.destination_airport || 'LAX'})  
Frankatur: ${anfrage.incoterm || 'CPT'} ${anfrage.to_city || anfrage.destination_airport}

Gewicht: ${anfrage.total_weight || 0} kg
Packstücke: ${anfrage.total_pieces || 0} Colli
Ware: ${anfrage.commodity || 'Allgemeine Fracht'}

TERMINE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Abholdatum: ${formatDate(anfrage.pickup_date) || 'Nach Vereinbarung'}
Geplanter Transport: ${anfrage.transport_type === 'AIR' ? 'Luftfracht' : 'LKW'}
Geplante Zustellung: ${formatDate(anfrage.delivery_date) || 'Nach Vereinbarung'}
Laufzeit: ${anfrage.transport_type === 'AIR' ? '3-5 Werktage' : '1-2 Werktage'}

PREISANGABE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transportpreis: EUR ${offerData.sellPrice.toFixed(2)}
Frankatur: ${anfrage.incoterm || 'CPT'} ${anfrage.to_city || 'Destination'}
Preis/kg: EUR ${(offerData.sellPrice/(anfrage.total_weight || 1)).toFixed(2)}

LEISTUNGEN INKLUSIVE:
• ${anfrage.transport_type === 'AIR' ? 'Abholung und Transport zum Flughafen' : 'Direkttransport'}
• Export-Zollabfertigung Deutschland
• ${anfrage.transport_type === 'AIR' ? 'Luftfrachtbeförderung' : 'Straßentransport'}
• ${anfrage.incoterm === 'DDP' ? 'Import-Zollabfertigung und Zustellung' : 'Standard-Zustellung'}
• Sendungsverfolgung
• Versicherungsschutz

BESONDERE HINWEISE:
• Alle Preise verstehen sich zuzüglich gesetzlicher Mehrwertsteuer
• Gültigkeit des Angebots: 14 Tage ab Datum
• Änderungen vorbehalten bei Gewichts-/Volumenabweichungen
• ${anfrage.transport_type === 'AIR' ? 'Gefährliche Güter nach Vereinbarung' : 'ADR-Güter nach Vereinbarung'}

Für Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr LogistikPro Team

${offerNumber} | ${today.toLocaleDateString('de-DE')} | Gültig bis ${validUntil.toLocaleDateString('de-DE')}`;
  };

  // ANGEBOT ANNEHMEN/ABLEHNEN - Erweitert
  const handleOfferAccepted = async (sendung) => {
    const confirmed = confirm(`✅ Angebot ${sendung.offer_number || sendung.position} annehmen?\n\nVerkaufspreis: €${sendung.offer_price}\nProfit: €${sendung.offer_profit} (${sendung.offer_margin_percent?.toFixed(1)}%)`);
    if (!confirmed) return;
    
    try {
      const awbNumber = sendung.awb_number || `AWB-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'created',
          final_price: sendung.offer_price,
          //agreed_price: sendung.offer_price,
          profit_calculated: sendung.offer_profit,
          margin_achieved: sendung.offer_margin_percent,
          offer_accepted_at: new Date().toISOString(),
          offer_acceptance_reason: 'Kunde hat Angebot angenommen',
          awb_number: awbNumber,
          booking_status: 'ready_to_book'
        })
        .eq('id', sendung.id);
      
      if (error) throw error;
      
      alert(`🎉 Angebot ${sendung.offer_number || sendung.position} erfolgreich angenommen!\n\nAWB: ${awbNumber}\nStatus: Bereit zur Buchung`);
      await loadSendungen();
    } catch (err) {
      console.error('Fehler beim Angebot annehmen:', err);
      alert(`❌ Fehler: ${err.message}`);
    }
  };

  const handleOfferRejected = async (sendung) => {
    const reasons = [
      'Preis zu hoch',
      'Laufzeit zu lang', 
      'Andere Konditionen',
      'Kunde hat storniert',
      'Konkurrenz günstiger',
      'Sonstiges'
    ];
    
    const reasonIndex = prompt(`❌ Angebot ${sendung.offer_number || sendung.position} ablehnen\n\nBitte wählen Sie einen Grund:\n\n${reasons.map((r, i) => `${i+1}. ${r}`).join('\n')}\n\nNummer eingeben (1-${reasons.length}) oder eigenen Text:`);
    
    if (reasonIndex === null) return;
    
    let reason;
    const index = parseInt(reasonIndex) - 1;
    if (index >= 0 && index < reasons.length) {
      reason = reasons[index];
    } else {
      reason = reasonIndex.trim() || 'Keine Angabe';
    }
    
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          status: 'ABGELEHNT',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejection_category: reasons.includes(reason) ? reason : 'Sonstiges'
        })
        .eq('id', sendung.id);
      
      if (error) throw error;
      
      alert(`📝 Angebot abgelehnt\n\nGrund: ${reason}`);
      await loadSendungen();
    } catch (err) {
      console.error('Fehler beim Ablehnen:', err);
      alert(`❌ Fehler: ${err.message}`);
    }
  };
  // Filter sendungen - Optimiert mit besserer Performance
  const filteredSendungen = React.useMemo(() => {
    return sendungen.filter(sendung => {
      const matchesViewMode = 
        viewMode === 'alle' || 
        (viewMode === 'sendungen' && sendung.status !== 'ANFRAGE' && sendung.status !== 'ANGEBOT') ||
        (viewMode === 'anfragen' && sendung.status === 'ANFRAGE') ||
        (viewMode === 'angebote' && sendung.status === 'ANGEBOT');
      
      if (!matchesViewMode) return false;
      
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        sendung.awb_number?.toLowerCase().includes(searchLower) ||
        sendung.reference?.toLowerCase().includes(searchLower) ||
        customers[sendung.customer_id]?.toLowerCase().includes(searchLower) ||
        sendung.origin_airport?.toLowerCase().includes(searchLower) ||
        sendung.destination_airport?.toLowerCase().includes(searchLower) ||
        sendung.position?.toLowerCase().includes(searchLower) ||
        sendung.from_city?.toLowerCase().includes(searchLower) ||
        sendung.to_city?.toLowerCase().includes(searchLower) ||
        partners[sendung.pickup_partner_id]?.name?.toLowerCase().includes(searchLower) ||
        partners[sendung.mainrun_partner_id]?.name?.toLowerCase().includes(searchLower) ||
        partners[sendung.delivery_partner_id]?.name?.toLowerCase().includes(searchLower)
      );
    });
  }, [sendungen, viewMode, searchTerm, customers, partners]);

  // Status options - Erweitert mit mehr Optionen
  const statusOptionen = {
    abholung: [
      { value: 'grey', text: 'Nicht geplant', color: '#c7c7cc', description: 'Abholung noch nicht organisiert' },
      { value: 'yellow', text: 'Geplant', color: '#ff9500', description: 'Abholtermin steht fest' },
      { value: 'green', text: 'Bestätigt', color: '#34c759', description: 'Abholung bestätigt/durchgeführt' },
      { value: 'red', text: 'Problem/Verspätung', color: '#ff3b30', description: 'Verzögerung oder Problem' }
    ],
    carrier: [
      { value: 'grey', text: 'Nicht gebucht', color: '#c7c7cc', description: 'Noch keine Carrier-Buchung' },
      { value: 'yellow', text: 'Angefragt', color: '#ff9500', description: 'Anfrage beim Carrier gestellt' },
      { value: 'green', text: 'Gebucht', color: '#34c759', description: 'Carrier gebucht und bestätigt' },
      { value: 'red', text: 'Storniert', color: '#ff3b30', description: 'Buchung storniert' }
    ],
    flug: [
      { value: 'grey', text: 'Nicht abgeflogen', color: '#c7c7cc', description: 'Noch am Boden' },
      { value: 'yellow', text: 'Check-in', color: '#ff9500', description: 'Sendung zum Check-in' },
      { value: 'green', text: 'Abgeflogen', color: '#34c759', description: 'Flug gestartet' },
      { value: 'red', text: 'Verspätet/Cancelled', color: '#ff3b30', description: 'Flugproblem' }
    ],
    zustellung: [
      { value: 'grey', text: 'Nicht geplant', color: '#c7c7cc', description: 'Zustellung noch nicht organisiert' },
      { value: 'yellow', text: 'In Zustellung', color: '#ff9500', description: 'Auf dem Weg zum Empfänger' },
      { value: 'green', text: 'Zugestellt', color: '#34c759', description: 'Erfolgreich zugestellt' },
      { value: 'red', text: 'Zustellproblem', color: '#ff3b30', description: 'Problem bei Zustellung' }
    ]
  };

  // Tab Configuration - Erweitert mit Icons und Beschreibungen
  const tabConfig = [
    { 
      key: 'sendungen', 
      label: 'Sendungen', 
      icon: '📦',
      description: 'Aktive und abgeschlossene Sendungen',
      count: sendungen.filter(s => s.status !== 'ANFRAGE' && s.status !== 'ANGEBOT').length 
    },
    { 
      key: 'anfragen', 
      label: 'Anfragen', 
      icon: '❓',
      description: 'Unbearbeitete Kundenanfragen',
      count: sendungen.filter(s => s.status === 'ANFRAGE').length 
    },
    { 
      key: 'angebote', 
      label: 'Angebote', 
      icon: '💼',
      description: 'Erstellte Angebote warten auf Antwort',
      count: sendungen.filter(s => s.status === 'ANGEBOT').length 
    },
    { 
      key: 'alle', 
      label: 'Alle', 
      icon: '📊',
      description: 'Komplette Übersicht aller Einträge',
      count: sendungen.length 
    }
  ];

  // Stats Configuration - Erweitert mit mehr Details
  const statsConfig = [
    {
      title: 'Aktive Sendungen',
      value: stats.active,
      change: '↑ 12% diese Woche',
      color: '#34c759',
      icon: '📈',
      detail: `${stats.active} von ${sendungen.length} Sendungen aktiv`
    },
    {
      title: 'Heute abzuholen',
      value: stats.pickupToday,
      change: stats.pickupToday > 0 ? `${stats.pickupToday} bei HuT` : 'Keine Abholungen',
      color: '#34c759',
      icon: '🚚',
      detail: `Abholungen für ${new Date().toLocaleDateString('de-DE')}`
    },
    {
      title: 'In Transit',
      value: stats.inTransit,
      change: '⌀ 2,3 Tage Laufzeit',
      color: '#34c759',
      icon: '✈️',
      detail: `${stats.inTransit} Sendungen unterwegs`
    },
    {
      title: 'Kritische Sendungen',
      value: stats.critical,
      change: stats.critical > 0 ? 'Aktion erforderlich' : 'Alles im grünen Bereich',
      color: stats.critical > 0 ? '#ff3b30' : '#34c759',
      icon: stats.critical > 0 ? '⚠️' : '✅',
      detail: stats.critical > 0 ? `${stats.critical} Sendungen benötigen Aufmerksamkeit` : 'Keine kritischen Sendungen'
    }
  ];

  // Loading state - Erweitert mit besserer UX
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f7'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <RefreshCw style={{
            width: '48px',
            height: '48px',
            animation: 'spin 1s linear infinite',
            color: '#0071e3',
            marginBottom: '20px'
          }} />
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>
            Lade Sendungsboard...
          </h3>
          <p style={{ margin: 0, color: '#86868b', fontSize: '14px' }}>
            Sendungen, Kunden und Partner werden geladen
          </p>
        </div>
      </div>
    );
  }

  // Error state - Neu hinzugefügt
  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f7'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <AlertCircle style={{
            width: '48px',
            height: '48px',
            color: '#ff3b30',
            marginBottom: '20px'
          }} />
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600', color: '#ff3b30' }}>
            Fehler beim Laden
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#86868b', fontSize: '14px' }}>
            {error}
          </p>
          <button
            onClick={loadAllData}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0071e3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7' }}>
      {/* Header - Erweitert mit besserer UX */}
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package style={{ width: '28px', height: '28px', color: '#0071e3' }} />
          <div>
            <span style={{ fontSize: '24px', fontWeight: '600' }}>Sendungsboard</span>
            <div style={{ fontSize: '12px', color: '#86868b' }}>
              {filteredSendungen.length} von {sendungen.length} Sendungen
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Erweiterte Suchfunktion */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: '#86868b'
            }} />
            <input
              type="text"
              placeholder="Suche nach AWB, Referenz, Kunde, Route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #d2d2d7',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
                backgroundColor: searchTerm ? '#f0f9ff' : 'white'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0071e3'}
              onBlur={(e) => e.target.style.borderColor = '#d2d2d7'}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <X style={{ width: '14px', height: '14px', color: '#86868b' }} />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadAllData}
            disabled={loading}
            title="Daten neu laden"
            style={{
              padding: '10px',
              backgroundColor: 'transparent',
              border: '1px solid #d2d2d7',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw style={{ 
              width: '16px', 
              height: '16px',
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }} />
          </button>

          {/* Neue Sendung Button */}
          <button 
            onClick={() => setShowNeueSendung(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#0071e3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#005bb5'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#0071e3'}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            Neue Sendung
          </button>

          {/* User Menu */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            backgroundColor: '#f5f5f7',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <div style={{ fontWeight: '500' }}>{user?.email?.split('@')[0]}</div>
              <div style={{ fontSize: '12px', color: '#86868b' }}>
                Angemeldet seit {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Abmelden"
              style={{ 
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <LogOut style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '24px' }}>
        {/* Tab Navigation - Erweitert mit besserer UX */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          {tabConfig.map(tab => (
            <button 
              key={tab.key}
              title={tab.description}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: viewMode === tab.key ? '#0071e3' : 'transparent',
                color: viewMode === tab.key ? 'white' : '#666',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
              onClick={() => setViewMode(tab.key)}
              onMouseOver={(e) => {
                if (viewMode !== tab.key) {
                  e.target.style.backgroundColor = '#f5f5f7';
                }
              }}
              onMouseOut={(e) => {
                if (viewMode !== tab.key) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span style={{
                backgroundColor: viewMode === tab.key ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                color: viewMode === tab.key ? 'white' : '#666',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {tab.count}
              </span>
              {tab.count > 0 && viewMode !== tab.key && (
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: tab.key === 'anfragen' ? '#ff9500' : tab.key === 'angebote' ? '#34c759' : '#0071e3',
                  borderRadius: '50%'
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Stats Grid - Erweitert mit besserer UX */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {statsConfig.map((stat, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}
              title={stat.detail}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '13px', color: '#86868b', fontWeight: '500' }}>
                  {stat.title}
                </div>
                <span style={{ fontSize: '20px' }}>{stat.icon}</span>
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700',
                color: stat.title === 'Kritische Sendungen' && stats.critical > 0 ? '#ff3b30' : '#1d1d1f',
                marginBottom: '8px',
                lineHeight: '1'
              }}>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: '13px', 
                color: stat.color, 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Bar - Neu hinzugefügt */}
        {filteredSendungen.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
                Schnellaktionen:
              </span>
              <button 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayPickups = filteredSendungen.filter(s => s.pickup_date === today);
                  if (todayPickups.length > 0) {
                    alert(`📦 ${todayPickups.length} Abholungen heute:\n\n${todayPickups.map(s => `• ${s.position} - ${customers[s.customer_id]}`).join('\n')}`);
                  } else {
                    alert('✅ Keine Abholungen für heute geplant');
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: '#0071e3',
                  border: '1px solid #0071e3',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🚚 Heute abholen ({stats.pickupToday})
              </button>
              
              <button 
                onClick={() => {
                  const critical = filteredSendungen.filter(s => 
                    s.status === 'abgeholt' && s.pickup_date < new Date().toISOString().split('T')[0]
                  );
                  if (critical.length > 0) {
                    alert(`⚠️ ${critical.length} kritische Sendungen:\n\n${critical.map(s => `• ${s.position} - ${customers[s.customer_id]} (seit ${formatDate(s.pickup_date)})`).join('\n')}`);
                  } else {
                    alert('✅ Keine kritischen Sendungen');
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: stats.critical > 0 ? '#fff5f5' : 'transparent',
                  color: stats.critical > 0 ? '#ff3b30' : '#86868b',
                  border: `1px solid ${stats.critical > 0 ? '#ff3b30' : '#d2d2d7'}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                ⚠️ Kritisch ({stats.critical})
              </button>

              {viewMode === 'anfragen' && (
                <button 
                  onClick={() => {
                    const completeRequests = filteredSendungen.filter(s => 
                      s.status === 'ANFRAGE' && getCostStatus(s).className === 'cost-complete'
                    );
                    if (completeRequests.length > 0) {
                      alert(`💼 ${completeRequests.length} Anfragen bereit für Angebot:\n\n${completeRequests.map(s => `• ${s.position} - ${customers[s.customer_id]}`).join('\n')}`);
                    } else {
                      alert('📋 Keine Anfragen mit vollständigen Kosten');
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: '#34c759',
                    border: '1px solid #34c759',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  📄 Angebot erstellen ({filteredSendungen.filter(s => s.status === 'ANFRAGE' && getCostStatus(s).className === 'cost-complete').length})
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#86868b' }}>
                Letztes Update: {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {searchTerm && (
                <span style={{
                  fontSize: '12px',
                  backgroundColor: '#f0f9ff',
                  color: '#0071e3',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}>
                  Suche: "{searchTerm}"
                </span>
              )}
            </div>
          </div>
        )}

        {/* Table Container - Erweitert mit besserer UX */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          {/* Table Header Info */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f' }}>
              {viewMode === 'sendungen' && '📦 Sendungen'}
              {viewMode === 'anfragen' && '❓ Anfragen'}
              {viewMode === 'angebote' && '💼 Angebote'}
              {viewMode === 'alle' && '📊 Alle Einträge'}
              <span style={{ fontSize: '14px', fontWeight: '400', color: '#86868b', marginLeft: '8px' }}>
                ({filteredSendungen.length} {filteredSendungen.length === 1 ? 'Eintrag' : 'Einträge'})
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Export Button */}
              <button
                onClick={() => {
                  const csvContent = [
                    ['Position', 'Kunde', 'Von', 'Nach', 'Gewicht', 'Status', 'Abholdatum'].join(','),
                    ...filteredSendungen.map(s => [
                      s.position || '',
                      customers[s.customer_id] || '',
                      s.origin_airport || '',
                      s.destination_airport || '',
                      s.total_weight || '',
                      s.status || '',
                      formatDate(s.pickup_date) || ''
                    ].join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `sendungen_${viewMode}_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                title="Als CSV exportieren"
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  color: '#666',
                  border: '1px solid #d2d2d7',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📊 CSV Export
              </button>

              {/* View Options */}
              <div style={{ 
                fontSize: '12px', 
                color: '#86868b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>Sortiert nach:</span>
                <select 
                  style={{
                    padding: '4px 8px',
                    border: '1px solid #d2d2d7',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  defaultValue="created_at"
                >
                  <option value="created_at">Erstelldatum</option>
                  <option value="pickup_date">Abholdatum</option>
                  <option value="customer_id">Kunde</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ 
              backgroundColor: '#f8fafc', 
              borderBottom: '2px solid #e2e8f0',
              position: 'sticky',
              top: '0',
              zIndex: '10'
            }}>
              <tr>
                {/* Dynamic columns based on view mode */}
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar style={{ width: '14px', height: '14px' }} />
                    Abholung
                  </div>
                </th>
                
                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User style={{ width: '14px', height: '14px' }} />
                    Kunde
                  </div>
                </th>

                {viewMode === 'anfragen' && (
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderRight: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Euro style={{ width: '14px', height: '14px' }} />
                      Kosten-Status
                    </div>
                  </th>
                )}

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package style={{ width: '14px', height: '14px' }} />
                    Colli/Gewicht
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px' }} />
                    Von
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px' }} />
                    Nach
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'center', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Truck style={{ width: '14px', height: '14px' }} />
                    Transport
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText style={{ width: '14px', height: '14px' }} />
                    AWB/Carrier
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plane style={{ width: '14px', height: '14px' }} />
                    Flug/ETA
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck style={{ width: '14px', height: '14px' }} />
                    Zustellung
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'center', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Clock style={{ width: '14px', height: '14px' }} />
                    Laufzeit
                  </div>
                </th>

                <th style={{ 
                  padding: '16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit style={{ width: '14px', height: '14px' }} />
                    Aktionen
                  </div>
                </th>
              </tr>
            </thead>
<tbody>
              {filteredSendungen.map((sendung, index) => {
                const isDelayed = sendung.pickup_date && 
                  new Date(sendung.pickup_date) < new Date() && 
                  sendung.status === 'created';
                const transportColors = getTransportColor(sendung.transport_type);
                const costStatus = getCostStatus(sendung);
                const isEvenRow = index % 2 === 0;
                
                return (
                  <tr
                    key={sendung.id}
                    style={{
                      backgroundColor: isDelayed ? '#fef2f2' : isEvenRow ? '#fafafa' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                    onClick={() => openEditModal(sendung)}
                    onMouseOver={(e) => {
                      if (!isDelayed) {
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = isDelayed ? '#fef2f2' : isEvenRow ? '#fafafa' : 'white';
                    }}
                  >
                    {/* Abholung Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span 
                          className="traffic-light"
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            cursor: 'pointer',
                            backgroundColor: getTrafficLightColor(getStatusLight(sendung, 'abholung')),
                            boxShadow: `0 0 8px ${getTrafficLightColor(getStatusLight(sendung, 'abholung'))}40`,
                            transition: 'all 0.2s ease',
                            border: '2px solid white'
                          }}
                          onClick={(e) => showStatusMenu(e, sendung.id, 'abholung')}
                          title={`Status: ${getStatusLight(sendung, 'abholung')} - Klicken zum Ändern`}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'scale(1.2)';
                            e.target.style.boxShadow = `0 0 12px ${getTrafficLightColor(getStatusLight(sendung, 'abholung'))}60`;
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = `0 0 8px ${getTrafficLightColor(getStatusLight(sendung, 'abholung'))}40`;
                          }}
                        />
                        <div>
                          <div style={{ 
                            fontWeight: '500',
                            fontSize: '14px',
                            color: isDelayed ? '#dc2626' : '#1f2937'
                          }}>
                            {formatDate(sendung.pickup_date) || 'Nicht geplant'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {sendung.pickup_time && `${sendung.pickup_time} Uhr`}
                            {partners[sendung.pickup_partner_id]?.name && (
                              <span style={{ color: '#0071e3', fontWeight: '500' }}>
                                {` • ${partners[sendung.pickup_partner_id].name}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {sendung.status === 'ANFRAGE' && (
                        <div style={{ marginTop: '8px' }}>
                          <span style={{
                            fontSize: '11px',
                            color: '#92400e',
                            backgroundColor: '#fef3c7',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            ❓ Anfrage
                          </span>
                        </div>
                      )}
                      {isDelayed && (
                        <div style={{ marginTop: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            color: '#dc2626',
                            backgroundColor: '#fee2e2',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '600'
                          }}>
                            ⚠️ Verspätet
                          </span>
                        </div>
                      )}
                    </td>
                    
                    {/* Kunde Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '14px',
                          color: '#1f2937',
                          marginBottom: '2px'
                        }}>
                          {customers[sendung.customer_id] || 'N/A'}
                        </div>
                        {sendung.reference && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#6b7280',
                            fontFamily: 'monospace'
                          }}>
                            Ref: {sendung.reference}
                          </div>
                        )}
                        {sendung.position && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#9ca3af',
                            marginTop: '2px'
                          }}>
                            {sendung.position}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Kosten-Status Column (nur bei Anfragen) */}
                    {viewMode === 'anfragen' && (
                      <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            className={`cost-status ${costStatus.className}`}
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: 
                                costStatus.className === 'cost-complete' ? '#dcfce7' :
                                costStatus.className === 'cost-partial' ? '#fef3c7' : '#fee2e2',
                              color:
                                costStatus.className === 'cost-complete' ? '#166534' :
                                costStatus.className === 'cost-partial' ? '#92400e' : '#dc2626',
                              border: `1px solid ${
                                costStatus.className === 'cost-complete' ? '#bbf7d0' :
                                costStatus.className === 'cost-partial' ? '#fde68a' : '#fecaca'
                              }`
                            }}
                          >
                            {costStatus.text}
                          </span>
                          {costStatus.className === 'cost-partial' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnfrage(sendung);
                                setShowCostInput(true);
                              }}
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              Vervollständigen
                            </button>
                          )}
                        </div>
                        {sendung.pickup_cost > 0 || sendung.main_cost > 0 || sendung.delivery_cost > 0 ? (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                            Total: €{((sendung.pickup_cost || 0) + (sendung.main_cost || 0) + (sendung.delivery_cost || 0)).toFixed(2)}
                          </div>
                        ) : null}
                      </td>
                    )}
                    
                    {/* Colli/Gewicht Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '14px',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Package style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                          {parseFloat(sendung.total_weight || sendung.weight || 0).toFixed(1)} kg
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6b7280',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          📦 {sendung.total_pieces || sendung.pieces || 0} Colli
                          {sendung.total_volume && sendung.total_volume > 0 && (
                            <span>• {parseFloat(sendung.total_volume).toFixed(2)} m³</span>
                          )}
                        </div>
                        {sendung.commodity && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#9ca3af',
                            marginTop: '2px',
                            fontStyle: 'italic'
                          }}>
                            {sendung.commodity.length > 20 ? sendung.commodity.substring(0, 20) + '...' : sendung.commodity}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Von Column - Erweitert */}
<td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }}>
  <div>
    <div style={{
      fontWeight: '500',
      fontSize: '14px',
      color: '#1f2937'
    }}>
      {cityMapping[sendung.from_city] || sendung.pickup_city || sendung.from_city || 'N/A'}
    </div>
                        {sendung.origin_airport && (
                          <span style={{
                            fontSize: '12px',
                            color: '#0071e3',
                            fontWeight: '600',
                            backgroundColor: '#eff6ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginTop: '4px',
                            display: 'inline-block'
                          }}>
                            ✈️ {sendung.origin_airport}
                          </span>
                        )}
                        {sendung.import_export && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            {sendung.import_export === 'EXPORT' ? '📤 Export' : '📥 Import'}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Nach Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }}>
                      <div>
                        {sendung.destination_airport && (
                          <span style={{
                            fontSize: '12px',
                            color: '#0071e3',
                            fontWeight: '600',
                            backgroundColor: '#eff6ff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            display: 'inline-block'
                          }}>
                            ✈️ {sendung.destination_airport}
                          </span>
                        )}
                        <div style={{ 
                          fontWeight: '500',
                          fontSize: '14px',
                          color: '#1f2937',
                          marginTop: sendung.destination_airport ? '4px' : '0'
                        }}>
                          {sendung.to_city || sendung.recipient_city || 'N/A'}
                        </div>
                        {sendung.recipient_name && sendung.recipient_name !== sendung.to_city && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            c/o {sendung.recipient_name.length > 25 ? sendung.recipient_name.substring(0, 25) + '...' : sendung.recipient_name}
                          </div>
                        )}
                        {sendung.incoterm && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#059669',
                            backgroundColor: '#d1fae5',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            marginTop: '2px',
                            display: 'inline-block',
                            fontWeight: '600'
                          }}>
                            {sendung.incoterm}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Transport Column - Erweitert */}
                    <td style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: transportColors.bg,
                          color: transportColors.color,
                          border: `1px solid ${transportColors.color}20`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {sendung.transport_type === 'AIR' && '✈️'}
                          {sendung.transport_type === 'TRUCK' && '🚚'}
                          {sendung.transport_type === 'SEA' && '🚢'}
                          {sendung.transport_type === 'air' || sendung.transport_type === 'AIR' ? 'LUFT' :
                           sendung.transport_type === 'truck' || sendung.transport_type === 'TRUCK' ? 'LKW' :
                           sendung.transport_type === 'sea' || sendung.transport_type === 'SEA' ? 'SEE' : 
                           sendung.transport_type || 'N/A'}
                        </span>
                        {sendung.total_weight > 0 && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: '#6b7280',
                            textAlign: 'center'
                          }}>
                            {(sendung.offer_price && sendung.total_weight) ? 
                              `€${(sendung.offer_price / sendung.total_weight).toFixed(2)}/kg` :
                              `${sendung.total_weight} kg`
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* AWB/Carrier Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span 
                          className="traffic-light"
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            cursor: 'pointer',
                            backgroundColor: getTrafficLightColor(getStatusLight(sendung, 'carrier')),
                            boxShadow: `0 0 6px ${getTrafficLightColor(getStatusLight(sendung, 'carrier'))}40`,
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                          onClick={(e) => showStatusMenu(e, sendung.id, 'carrier')}
                          title={`Carrier Status: ${getStatusLight(sendung, 'carrier')}`}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: '500',
                            fontSize: '13px',
                            color: '#1f2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {partners[sendung.mainrun_partner_id]?.name || sendung.airline || 'N/A'}
                          </div>
                          {(sendung.awb_number || sendung.awb) && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#0071e3', 
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                              fontWeight: '600',
                              marginTop: '2px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(sendung.awb_number || sendung.awb);
                              // Temporary visual feedback
                              const element = e.target;
                              const original = element.textContent;
                              element.textContent = '✓ Kopiert';
                              setTimeout(() => element.textContent = original, 1000);
                            }}
                            title="Klicken zum Kopieren">
                              {sendung.awb_number || sendung.awb}
                            </div>
                          )}
                          {!sendung.awb_number && !sendung.awb && sendung.status !== 'ANFRAGE' && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#ef4444',
                              marginTop: '2px'
                            }}>
                              AWB fehlt
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Flug/ETA Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span 
                          className="traffic-light"
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            cursor: 'pointer',
                            backgroundColor: getTrafficLightColor(getStatusLight(sendung, 'flug')),
                            boxShadow: `0 0 6px ${getTrafficLightColor(getStatusLight(sendung, 'flug'))}40`,
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                          onClick={(e) => showStatusMenu(e, sendung.id, 'flug')}
                          title={`Flug Status: ${getStatusLight(sendung, 'flug')}`}
                        />
                        <div>
                          <div style={{ 
                            fontWeight: '500',
                            fontSize: '13px',
                            color: '#1f2937'
                          }}>
                            {sendung.flight_number || 'TBD'}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            {sendung.eta ? (
                              <>
                                ETA: {formatDateTime(sendung.eta)}
                              </>
                            ) : (
                              'ETA: Noch nicht bekannt'
                            )}
                          </div>
                          {sendung.flight_number && sendung.flight_number !== 'TBD' && (
                            <div style={{ 
                              fontSize: '10px', 
                              color: '#059669',
                              marginTop: '2px'
                            }}>
                              ✈️ Bestätigt
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Zustellung Column - Erweitert */}
                    <td style={{ padding: '16px', borderRight: '1px solid #f1f5f9' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span 
                          className="traffic-light"
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            display: 'inline-block',
                            cursor: 'pointer',
                            backgroundColor: getTrafficLightColor(getStatusLight(sendung, 'zustellung')),
                            boxShadow: `0 0 6px ${getTrafficLightColor(getStatusLight(sendung, 'zustellung'))}40`,
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                          }}
                          onClick={(e) => showStatusMenu(e, sendung.id, 'zustellung')}
                          title={`Zustellung Status: ${getStatusLight(sendung, 'zustellung')}`}
                        />
                        <div>
                          <div style={{ 
                            fontWeight: '500',
                            fontSize: '13px',
                            color: '#1f2937'
                          }}>
                            {formatDate(sendung.delivery_date) || 'Nicht geplant'}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#6b7280',
                            marginTop: '2px'
                          }}>
                            {sendung.status === 'ANFRAGE' ? '❓ Anfrage' :
                             sendung.status === 'ANGEBOT' ? '💼 Angebot' :
                             sendung.status === 'zugestellt' ? '✅ Zugestellt' :
                             sendung.status === 'in_transit' ? '🚛 Unterwegs' :
                             sendung.status === 'created' ? '📋 Geplant' :
                             sendung.status}
                          </div>
                          {partners[sendung.delivery_partner_id]?.name && (
                            <div style={{ 
                              fontSize: '10px', 
                              color: '#0071e3',
                              marginTop: '2px'
                            }}>
                              via {partners[sendung.delivery_partner_id].name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Laufzeit Column - Erweitert */}
                    <td style={{ padding: '16px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '16px',
                          color: isDelayed ? '#dc2626' : '#1f2937'
                        }}>
                          {sendung.transit_days || calculateTransitDays(sendung)}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6b7280',
                          textAlign: 'center'
                        }}>
                          {sendung.transit_days || calculateTransitDays(sendung) !== '-' ? 'Tage' : 'Unbekannt'}
                        </div>
                        {sendung.pickup_date && sendung.delivery_date && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: isDelayed ? '#dc2626' : '#059669',
                            fontWeight: '500',
                            textAlign: 'center'
                          }}>
                            {isDelayed ? '⚠️ Verspätet' : '✅ Pünktlich'}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Aktionen Column - Massiv erweitert */}
                    <td style={{ padding: '12px' }}>
                      <div style={{ 
                        display: 'flex', 
                        gap: '4px',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start'
                      }}>
                        {/* Standard Aktionen - Immer sichtbar */}
                        <button 
                          title="Details anzeigen/bearbeiten"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(sendung);
                          }}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            color: '#0071e3',
                            border: '1px solid #0071e3',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            lineHeight: '1',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#0071e3';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#0071e3';
                          }}
                        >
                          ✏️
                        </button>
                        
                        <button 
                          title="Sendung löschen"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSendung(sendung.id);
                          }}
                          style={{
                            padding: '6px',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            lineHeight: '1',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#ef4444';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#ef4444';
                          }}
                        >
                          🗑️
                        </button>
                        
                        {/* Anfrage-spezifische Aktionen */}
                        {sendung.status === 'ANFRAGE' && (
                          <>
                            <button 
                              title={`Kosten erfassen (${costStatus.text})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnfrage(sendung);
                                setShowCostInput(true);
                              }}
                              style={{
                                padding: '6px',
                                backgroundColor: costStatus.className === 'cost-complete' ? '#dcfce7' : 'transparent',
                                color: costStatus.className === 'cost-complete' ? '#166534' : '#10b981',
                                border: '1px solid #10b981',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                lineHeight: '1',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                if (costStatus.className !== 'cost-complete') {
                                  e.target.style.backgroundColor = '#10b981';
                                  e.target.style.color = 'white';
                                }
                              }}
                              onMouseOut={(e) => {
                                if (costStatus.className !== 'cost-complete') {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = '#10b981';
                                }
                              }}
                            >
                              💰
                            </button>
                            
                            {costStatus.className === 'cost-complete' && (
                              <button 
                                title="Angebot erstellen"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateOffer(sendung);
                                }}
                                style={{
                                  padding: '6px',
                                  backgroundColor: 'transparent',
                                  color: '#f59e0b',
                                  border: '1px solid #f59e0b',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  lineHeight: '1',
                                  transition: 'all 0.2s',
                                  animation: 'pulse 2s infinite'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.backgroundColor = '#f59e0b';
                                  e.target.style.color = 'white';
                                  e.target.style.animation = 'none';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = '#f59e0b';
                                  e.target.style.animation = 'pulse 2s infinite';
                                }}
                              >
                                📄
                              </button>
                            )}
                          </>
                        )}
                        
                        {/* Angebot-spezifische Aktionen */}
                        {sendung.status === 'ANGEBOT' && (
                          <>
                            <button 
                              title={`Angebot annehmen (€${sendung.offer_price})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOfferAccepted(sendung);
                              }}
                              style={{
                                padding: '6px',
                                backgroundColor: 'transparent',
                                color: '#10b981',
                                border: '1px solid #10b981',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                lineHeight: '1',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#10b981';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#10b981';
                              }}
                            >
                              ✅
                            </button>
                            
                            <button 
                              title="Angebot ablehnen"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOfferRejected(sendung);
                              }}
                              style={{
                                padding: '6px',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                border: '1px solid #ef4444',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                lineHeight: '1',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#ef4444';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#ef4444';
                              }}
                            >
                              ❌
                            </button>
                            
                            <button 
                              title="Angebot bearbeiten"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSendung(sendung);
                                setShowOfferEdit(true);
                              }}
                              style={{
                                padding: '6px',
                                backgroundColor: 'transparent',
                                color: '#f59e0b',
                                border: '1px solid #f59e0b',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                lineHeight: '1',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#f59e0b';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#f59e0b';
                              }}
                            >
                              📝
                            </button>
                          </>
                        )}
                        
                        {/* Erweiterte Aktionen für alle Status */}
                        {sendung.awb_number && (
                          <button 
                            title={`AWB kopieren: ${sendung.awb_number}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(sendung.awb_number);
                              // Visual Feedback
                              const originalText = e.target.textContent;
                              e.target.textContent = '✓';
                              e.target.style.backgroundColor = '#10b981';
                              e.target.style.color = 'white';
                              setTimeout(() => {
                                e.target.textContent = originalText;
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#6b7280';
                              }, 1000);
                            }}
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              color: '#6b7280',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              lineHeight: '1',
                              transition: 'all 0.2s'
                            }}
                          >
                            📋
                          </button>
                        )}
                        
                        {/* Quick Status Actions */}
                        {sendung.status !== 'ANFRAGE' && sendung.status !== 'ANGEBOT' && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {sendung.status !== 'zugestellt' && (
                              <button 
                                title="Als zugestellt markieren"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(sendung.id, 'zustellung', 'green');
                                }}
                                style={{
                                  padding: '4px 6px',
                                  backgroundColor: 'transparent',
                                  color: '#10b981',
                                  border: '1px solid #10b981',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '10px',
                                  lineHeight: '1',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.backgroundColor = '#10b981';
                                  e.target.style.color = 'white';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = '#10b981';
                                }}
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Offer Price Display */}
                      {sendung.status === 'ANGEBOT' && sendung.offer_price && (
                        <div style={{ 
                          marginTop: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#059669',
                          textAlign: 'center'
                        }}>
                          💰 €{sendung.offer_price}
                          {sendung.offer_margin_percent && (
                            <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                              ({sendung.offer_margin_percent.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Empty State - Erweitert */}
          {filteredSendungen.length === 0 && (
            <div style={{ 
              padding: '60px 40px', 
              textAlign: 'center', 
              color: '#6b7280',
              backgroundColor: '#fafafa'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {searchTerm ? '🔍' : 
                 viewMode === 'anfragen' ? '❓' : 
                 viewMode === 'angebote' ? '💼' : '📦'}
              </div>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '18px', 
                fontWeight: '600',
                color: '#374151'
              }}>
                {searchTerm ? 'Keine Suchergebnisse' : 
                 viewMode === 'anfragen' ? 'Keine Anfragen' : 
                 viewMode === 'angebote' ? 'Keine Angebote' : 'Keine Sendungen'}
              </h3>
              <p style={{ 
                margin: '0 0 20px 0', 
                color: '#6b7280',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {searchTerm ? `Keine Einträge gefunden für "${searchTerm}"` : 
                 viewMode === 'anfragen' ? 'Erstellen Sie eine neue Sendung als Anfrage, um Kosten zu kalkulieren.' : 
                 viewMode === 'angebote' ? 'Erstellen Sie Angebote aus vollständigen Anfragen.' : 'Erstellen Sie Ihre erste Sendung.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowNeueSendung(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#0071e3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#005bb5'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#0071e3'}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  Neue Sendung erstellen
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <X style={{ width: '14px', height: '14px' }} />
                  Suche zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSS Animation Styles - Inline für bessere Kompatibilität */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .traffic-light:hover {
          transform: scale(1.1);
        }
        
        .cost-status {
          transition: all 0.2s ease;
        }
        
        .cost-status:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        table {
          border-spacing: 0;
        }
        
        tr:hover .traffic-light {
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
        }
        
        /* Scrollbar Styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      {/* Status Popup - Erweitert mit besserer UX */}
      {showStatusPopup && statusPopupData && (
        <div 
          ref={popupRef}
          style={{
            position: 'fixed',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '280px',
            left: `${Math.max(10, Math.min(popupPosition.x, window.innerWidth - 300))}px`,
            top: `${Math.max(10, Math.min(popupPosition.y, window.innerHeight - 200))}px`,
            animation: 'fadeInScale 0.2s ease-out'
          }}
        >
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#fafafa',
            borderRadius: '12px 12px 0 0'
          }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '15px', 
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: getTrafficLightColor(statusPopupData.currentStatus),
                display: 'inline-block'
              }} />
              Status aktualisieren
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#6b7280', 
              marginTop: '4px' 
            }}>
              {statusPopupData.sendung.position || 'Sendung'} - {
                statusPopupData.type === 'abholung' ? 'Abholung' :
                statusPopupData.type === 'carrier' ? 'Carrier' :
                statusPopupData.type === 'flug' ? 'Flug/Transport' :
                statusPopupData.type === 'zustellung' ? 'Zustellung' : 'Status'
              }
            </div>
          </div>
          
          <div style={{ padding: '8px 0' }}>
            {statusOptionen[statusPopupData.type].map(opt => (
              <div
                key={opt.value}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  backgroundColor: opt.value === statusPopupData.currentStatus ? '#eff6ff' : 'transparent',
                  borderLeft: opt.value === statusPopupData.currentStatus ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => updateStatus(statusPopupData.sendungId, statusPopupData.type, opt.value)}
                onMouseOver={(e) => {
                  if (opt.value !== statusPopupData.currentStatus) {
                    e.target.style.backgroundColor = '#f9fafb';
                  }
                }}
                onMouseOut={(e) => {
                  if (opt.value !== statusPopupData.currentStatus) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginRight: '12px',
                  backgroundColor: opt.color,
                  border: '2px solid white',
                  boxShadow: `0 0 8px ${opt.color}40`
                }} />
                <div>
                  <div style={{ fontWeight: opt.value === statusPopupData.currentStatus ? '600' : '500' }}>
                    {opt.text}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {opt.description}
                  </div>
                </div>
                {opt.value === statusPopupData.currentStatus && (
                  <div style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '16px' }}>
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#fafafa',
            borderRadius: '0 0 12px 12px',
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            💡 Klicken Sie auf eine Option zum Ändern
          </div>
        </div>
      )}

      {/* Detail Modal - Massiv erweitert mit vollständiger Edit-Funktionalität */}
      {selectedSendung && !showOfferEdit && (
        <div style={{
          position: 'fixed',
          zIndex: 2000,
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '95%',
            maxWidth: '1400px',
            maxHeight: '95vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            animation: 'slideInUp 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              borderRadius: '16px 16px 0 0',
              zIndex: 10
            }}>
              <button 
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '8px',
                  zIndex: 11,
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setSelectedSendung(null);
                  setIsEditMode(false);
                  setEditedSendung(null);
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                <X style={{ width: '24px', height: '24px' }} />
              </button>
              
              <div style={{ padding: '24px 32px' }}>
                {/* Header Content */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h2 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '28px', 
                      fontWeight: '700',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Package style={{ width: '32px', height: '32px', color: '#3b82f6' }} />
                      {selectedSendung.awb_number || selectedSendung.position || 'Neue Sendung'}
                    </h2>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      <span style={{
                        backgroundColor: getTransportColor(selectedSendung.transport_type).bg,
                        color: getTransportColor(selectedSendung.transport_type).color,
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '12px'
                      }}>
                        {selectedSendung.transport_type || 'AIR'} • {selectedSendung.import_export || 'EXPORT'}
                      </span>
                      <span>
                        Erstellt: {formatDateTime(selectedSendung.created_at)}
                      </span>
                      {selectedSendung.offer_number && (
                        <span style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '12px'
                        }}>
                          {selectedSendung.offer_number}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      style={{
                        padding: '12px 20px',
                        background: isEditMode ? '#10b981' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={toggleEditMode}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {isEditMode ? (
                        <>
                          <Save style={{ width: '16px', height: '16px' }} />
                          Speichern
                        </>
                      ) : (
                        <>
                          <Edit style={{ width: '16px', height: '16px' }} />
                          Bearbeiten
                        </>
                      )}
                    </button>
                    
                    {isEditMode && (
                      <button 
                        style={{
                          padding: '12px 20px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={cancelEdit}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(239,68,68,0.25)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <XCircle style={{ width: '16px', height: '16px' }} />
                        Abbrechen
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Overview */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginTop: '20px'
                }}>
                  {['abholung', 'carrier', 'flug', 'zustellung'].map(type => (
                    <div key={type} style={{
                      backgroundColor: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: getTrafficLightColor(getStatusLight(selectedSendung, type)),
                        margin: '0 auto 8px auto',
                        boxShadow: `0 0 12px ${getTrafficLightColor(getStatusLight(selectedSendung, type))}40`
                      }} />
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>
                        {type === 'abholung' ? 'Abholung' :
                         type === 'carrier' ? 'Carrier' :
                         type === 'flug' ? 'Transport' : 'Zustellung'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                        {getStatusLight(selectedSendung, type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '32px' }}>
              {/* Main Content Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '32px', 
                marginBottom: '32px' 
              }}>
                {/* Sendungsinformationen */}
                <div style={{
                  backgroundColor: '#fafafa',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    color: '#1f2937',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FileText style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                    Sendungsinformationen
                  </h3>
                  
                  {/* Form Grid */}
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {[
                      { label: 'Kunde', value: customers[selectedSendung.customer_id] || 'N/A', readonly: true },
                      { label: 'Position', field: 'position', value: selectedSendung.position },
                      { label: 'Referenz', field: 'reference', value: selectedSendung.reference },
                      { label: 'AWB', field: 'awb_number', value: selectedSendung.awb_number },
                      { label: 'Transport', field: 'transport_type', value: selectedSendung.transport_type, type: 'select', options: [
                        { value: 'AIR', label: '✈️ Luftfracht' },
                        { value: 'TRUCK', label: '🚚 LKW' },
                        { value: 'SEA', label: '🚢 Seefracht' }
                      ]},
                      { label: 'Import/Export', field: 'import_export', value: selectedSendung.import_export, type: 'select', options: [
                        { value: 'EXPORT', label: '📤 Export' },
                        { value: 'IMPORT', label: '📥 Import' }
                      ]}
                    ].map(item => (
                      <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                          {item.label}:
                        </label>
                        {isEditMode && !item.readonly ? (
                          item.type === 'select' ? (
                            <select
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'white'
                              }}
                              value={editedSendung[item.field] || ''}
                              onChange={(e) => handleInputChange(item.field, e.target.value)}
                            >
                              {item.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                              }}
                              value={editedSendung[item.field] || ''}
                              onChange={(e) => handleInputChange(item.field, e.target.value)}
                              placeholder={`${item.label} eingeben...`}
                            />
                          )
                        ) : (
                          <span style={{ fontSize: '14px', color: '#1f2937' }}>
                            {item.type === 'select' && item.options ? 
                              item.options.find(opt => opt.value === item.value)?.label || item.value :
                              item.value || '-'
                            }
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Route Section */}
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                      🛣️ Route
                    </h4>
                    {isEditMode ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                        <input
                          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}
                          value={editedSendung.origin_airport || ''}
                          onChange={(e) => handleInputChange('origin_airport', e.target.value)}
                          placeholder="Von (Airport)"
                        />
                        <div style={{ fontSize: '20px', color: '#6b7280' }}>→</div>
                        <input
                          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}
                          value={editedSendung.destination_airport || ''}
                          onChange={(e) => handleInputChange('destination_airport', e.target.value)}
                          placeholder="Nach (Airport)"
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        textAlign: 'center', 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#1f2937',
                        padding: '16px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <span style={{ color: '#3b82f6' }}>{selectedSendung.origin_airport || 'N/A'}</span>
                        <span style={{ margin: '0 16px', color: '#6b7280' }}>✈️</span>
                        <span style={{ color: '#3b82f6' }}>{selectedSendung.destination_airport || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Empfänger */}
                <div style={{
                  backgroundColor: '#fafafa',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    color: '#1f2937',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #e5e7eb',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <User style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                    Empfänger
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {[
                      { label: 'Firma', field: 'consignee_name', value: selectedSendung.consignee_name || selectedSendung.recipient_name },
                      { label: 'Adresse', field: 'consignee_address', value: selectedSendung.consignee_address || selectedSendung.recipient_street },
                      { label: 'PLZ', field: 'consignee_zip', value: selectedSendung.consignee_zip || selectedSendung.recipient_zip },
                      { label: 'Stadt', field: 'consignee_city', value: selectedSendung.consignee_city || selectedSendung.recipient_city },
                      { label: 'Land', field: 'consignee_country', value: selectedSendung.consignee_country || selectedSendung.recipient_country },
                      { label: 'Telefon', field: 'recipient_phone', value: selectedSendung.recipient_phone },
                      { label: 'E-Mail', field: 'recipient_email', value: selectedSendung.recipient_email }
                    ].map(item => (
                      <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                          {item.label}:
                        </label>
                        {isEditMode ? (
                          <input
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                            value={editedSendung[item.field] || ''}
                            onChange={(e) => handleInputChange(item.field, e.target.value)}
                            placeholder={`${item.label} eingeben...`}
                          />
                        ) : (
                          <span style={{ fontSize: '14px', color: '#1f2937' }}>
                            {item.value || '-'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Packstücke */}
              <div style={{
                backgroundColor: '#fafafa',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                marginBottom: '32px'
              }}>
                <h3 style={{
                  color: '#1f2937',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #e5e7eb',
                  fontSize: '18px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Package style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                  Packstücke & Abmessungen
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  {[
                    { label: 'Anzahl Packstücke', field: 'total_pieces', value: selectedSendung.total_pieces || selectedSendung.pieces, unit: 'Stück', icon: '📦' },
                    { label: 'Gesamtgewicht', field: 'total_weight', value: selectedSendung.total_weight || selectedSendung.weight, unit: 'kg', icon: '⚖️' },
                    { label: 'Gesamtvolumen', field: 'total_volume', value: selectedSendung.total_volume || selectedSendung.volume, unit: 'm³', icon: '📏' }
                  ].map(item => (
                    <div key={item.label} style={{
                      backgroundColor: 'white',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                        {item.label}
                      </div>
                      {isEditMode ? (
                        <input
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}
                          type="number"
                          step={item.field === 'total_pieces' ? '1' : '0.01'}
                          value={editedSendung[item.field] || ''}
                          onChange={(e) => handleInputChange(item.field, e.target.value)}
                          placeholder="0"
                        />
                      ) : (
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                          {parseFloat(item.value || 0).toFixed(item.field === 'total_pieces' ? 0 : item.field === 'total_volume' ? 3 : 1)}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {item.unit}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commodity */}
                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', fontSize: '14px', marginBottom: '8px' }}>
                    📋 Warenbeschreibung:
                  </label>
                  {isEditMode ? (
                    <textarea
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        minHeight: '80px',
                        resize: 'vertical'
                      }}
                      value={editedSendung.commodity || ''}
                      onChange={(e) => handleInputChange('commodity', e.target.value)}
                      placeholder="Beschreibung der Waren..."
                    />
                  ) : (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '60px',
                      color: selectedSendung.commodity ? '#1f2937' : '#6b7280'
                    }}>
                      {selectedSendung.commodity || 'Keine Warenbeschreibung verfügbar'}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sendungsverlauf / Milestones - Erweitert */}
              <div style={{
                backgroundColor: '#fafafa',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <h3 style={{
                    color: '#1f2937',
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Truck style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                    Sendungsverlauf
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '400', 
                      color: '#6b7280',
                      backgroundColor: 'white',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {selectedSendung.transport_type || 'AIR'} - {selectedSendung.import_export || 'EXPORT'}
                    </span>
                  </h3>
                  {isEditMode && (
                    <button
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onClick={addMilestone}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                    >
                      <Plus style={{ width: '14px', height: '14px' }} />
                      Milestone hinzufügen
                    </button>
                  )}
                </div>
                
                <div style={{ position: 'relative', paddingLeft: '40px' }}>
                  {/* Timeline Line */}
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: 'linear-gradient(to bottom, #3b82f6, #10b981)',
                    borderRadius: '2px'
                  }} />
                  
                  {/* Created Milestone */}
                  <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-32px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: '3px solid white',
                      boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
                    }} />
                    <div style={{
                      backgroundColor: 'white',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        {formatDateTime(selectedSendung.created_at)}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                        🎯 Sendung erstellt
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                        Anfrage im System erfasst
                      </div>
                    </div>
                  </div>
                  
                  {/* Dynamic Milestones */}
                  {(isEditMode ? editedMilestones : milestones).map((milestone, index) => {
                    const transportType = (isEditMode ? editedSendung : selectedSendung).transport_type || 'AIR';
                    const importExport = (isEditMode ? editedSendung : selectedSendung).import_export || 'EXPORT';
                    const availableMilestones = getMilestones(transportType, importExport);
                    const milestoneDefinition = availableMilestones.find(m => m.id === milestone.milestone_id);
                    
                    return (
                      <div key={milestone.id || milestone.tempId} style={{ position: 'relative', marginBottom: '24px' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-32px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          border: '3px solid white',
                          boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
                        }} />
                        
                        <div style={{
                          backgroundColor: 'white',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {isEditMode ? (
                            <div>
                              <div style={{ 
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '6px',
                                marginBottom: '12px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                  <select
                                    style={{ 
                                      flex: 1,
                                      padding: '8px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      backgroundColor: 'white'
                                    }}
                                    value={milestone.milestone_id || ''}
                                    onChange={(e) => {
                                      const selectedMilestone = availableMilestones.find(m => m.id === parseInt(e.target.value));
                                      if (selectedMilestone) {
                                        updateMilestone(index, 'milestone_id', selectedMilestone.id);
                                        updateMilestone(index, 'description', selectedMilestone.text);
                                      }
                                    }}
                                  >
                                    <option value="">-- Milestone wählen --</option>
                                    {availableMilestones.map(m => (
                                      <option key={m.id} value={m.id}>
                                        {m.id}. {m.text}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: '12px',
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontWeight: '600'
                                    }}
                                    onClick={() => removeMilestone(index)}
                                  >
                                    Löschen
                                  </button>
                                </div>
                                <input
                                  style={{ 
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                  }}
                                  type="datetime-local"
                                  value={milestone.timestamp ? milestone.timestamp.slice(0, 16) : ''}
                                  onChange={(e) => updateMilestone(index, 'timestamp', e.target.value)}
                                />
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                                {milestone.description}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                {formatDateTime(milestone.timestamp)}
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                                {milestone.milestone_id}. {milestone.description || milestoneDefinition?.text || `Milestone ${milestone.milestone_id}`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Magic Cost Input Modal - Massiv erweitert und modernisiert */}
      {showCostInput && selectedAnfrage && (
        <div style={{
          position: 'fixed',
          zIndex: 2001,
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '95%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            animation: 'slideInUp 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '24px 32px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <button 
                onClick={() => {
                  setShowCostInput(false);
                  setSelectedAnfrage(null);
                  setMagicCostText('');
                }}
                style={{ 
                  position: 'absolute',
                  right: '20px',
                  top: '20px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px'
                }}>
                  💰
                </div>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700'
                  }}>
                    Magic Cost Input
                  </h2>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    opacity: 0.9 
                  }}>
                    Kosten erfassen für {selectedAnfrage.position}
                  </p>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    opacity: 0.8
                  }}>
                    Route: {selectedAnfrage.origin_airport} → {selectedAnfrage.destination_airport} • {selectedAnfrage.total_weight || 0} kg
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Enhanced Magic Input Section */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                borderRadius: '16px',
                padding: '24px',
                border: '2px dashed #667eea',
                marginBottom: '24px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '20px',
                  backgroundColor: 'white',
                  padding: '0 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#667eea'
                }}>
                  🪄 Magic AI Parser
                </div>

                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#667eea',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px'
                  }}>
                    🤖
                  </div>
                  <div>
                    <strong style={{ fontSize: '18px', color: '#1f2937' }}>
                      KI-Kostenerkennung
                    </strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                      E-Mail, Angebot oder Dokument einfügen - KI erkennt automatisch alle Kostenpositionen
                    </p>
                  </div>
                </div>

                {/* Input Type Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px', color: '#374151' }}>
                    📄 Eingabe-Typ:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { value: 'cost', label: '💰 Kosten-E-Mail', desc: 'Antwort mit Preisen' },
                      { value: 'document', label: '📋 Dokument/CMR', desc: 'Frachtbrief, CMR, etc.' },
                      { value: 'customer', label: '📧 Kundenanfrage', desc: 'Anfrage-E-Mail' }
                    ].map(type => (
                      <button
                        key={type.value}
                        onClick={() => setMagicInputType ? setMagicInputType(type.value) : null}
                        style={{
                          flex: 1,
                          padding: '12px',
                          border: `2px solid ${(magicInputType || 'cost') === type.value ? '#667eea' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          backgroundColor: (magicInputType || 'cost') === type.value ? '#eff6ff' : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                          {type.label}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>
                          {type.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <textarea
                  placeholder="📧 E-Mail-Text hier einfügen...

Beispiele was erkannt wird:
• Pickup: €185 / Collection: $200
• Air freight: €2.45/kg / Freight rate: $2.80/kg  
• Delivery: €125 / Local delivery: $150
• Customs clearance: €85 / Documentation: $50
• Terminal handling: €45 / Trucking: €90

🤖 KI erkennt automatisch:
✓ Währungen (EUR/USD mit Umrechnung)
✓ Gewichtsbezogene Preise (/kg)
✓ Alle Kostenkategorien (Pickup, Main, Delivery)
✓ Verschiedene Sprachen (DE/EN)"
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    padding: '16px',
                    border: '2px solid #667eea',
                    borderRadius: '12px',
                    fontFamily: 'SF Mono, Monaco, monospace',
                    fontSize: '13px',
                    resize: 'vertical',
                    backgroundColor: 'white',
                    transition: 'all 0.2s'
                  }}
                  value={magicCostText}
                  onChange={(e) => setMagicCostText(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = 'none';
                  }}
                />

                {/* Processing Info */}
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600', marginBottom: '4px' }}>
                    🔍 KI-Analyse läuft automatisch:
                  </div>
                  <div style={{ fontSize: '12px', color: '#1e40af', lineHeight: '1.4' }}>
                    • Texterkennung in Deutsch und Englisch • Währungsumrechnung USD→EUR • Automatische Kategorisierung • Gewichtsbezogene Berechnungen
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const result = processMagicInput(magicCostText, selectedAnfrage, magicInputType || 'cost');
                    if (result && result.type === 'costs') {
                      handleSaveCosts(selectedAnfrage.id, result.data).then(success => {
                        if (success) {
                          setShowCostInput(false);
                          setSelectedAnfrage(null);
                          setMagicCostText('');
                        }
                      });
                    } else if (result) {
                      alert('Funktion wird in zukünftiger Version implementiert!');
                    }
                  }}
                  disabled={!magicCostText.trim()}
                  style={{
                    marginTop: '20px',
                    width: '100%',
                    padding: '16px',
                    background: magicCostText.trim() ? 
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: magicCostText.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (magicCostText.trim()) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🎯</span>
                  KI-Analyse starten
                </button>
              </div>

              {/* Manual Input Section */}
              <div style={{ 
                textAlign: 'center',
                margin: '24px 0',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  backgroundColor: '#e5e7eb'
                }} />
                <span style={{
                  backgroundColor: 'white',
                  padding: '0 16px',
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  oder manuelle Eingabe
                </span>
              </div>
              
              <div style={{
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '20px',
                  marginBottom: '20px'
                }}>
                  {[
                    {
                      key: 'pickup',
                      label: 'Abholung',
                      icon: '🚚',
                      field: 'pickup_cost',
                      color: '#10b981',
                      current: selectedAnfrage.pickup_cost || selectedAnfrage.cost_pickup || 0
                    },
                    {
                      key: 'main',
                      label: 'Hauptlauf',
                      icon: '✈️',
                      field: 'main_cost',
                      color: '#3b82f6',
                      current: selectedAnfrage.main_cost || selectedAnfrage.cost_mainrun || selectedAnfrage.mainrun_cost || 0
                    },
                    {
                      key: 'delivery',
                      label: 'Zustellung',
                      icon: '📦',
                      field: 'delivery_cost',
                      color: '#f59e0b',
                      current: selectedAnfrage.delivery_cost || selectedAnfrage.cost_delivery || 0
                    }
                  ].map(item => (
                    <div key={item.key} style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '20px',
                      border: '2px solid #e5e7eb',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
                      <label style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        display: 'block', 
                        marginBottom: '8px',
                        color: '#374151'
                      }}>
                        {item.label}
                      </label>
                      
                      {item.current > 0 && (
                        <div style={{
                          fontSize: '12px',
                          color: item.color,
                          fontWeight: '600',
                          marginBottom: '8px',
                          padding: '4px 8px',
                          backgroundColor: `${item.color}15`,
                          borderRadius: '6px'
                        }}>
                          Aktuell: €{parseFloat(item.current).toFixed(2)}
                        </div>
                      )}
                      
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        defaultValue={item.current || ''}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: `2px solid ${item.current > 0 ? item.color : '#d1d5db'}`,
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          textAlign: 'center',
                          backgroundColor: item.current > 0 ? `${item.color}10` : 'white',
                          transition: 'all 0.2s'
                        }}
                        id={`${item.field}_manual`}
                        onFocus={(e) => {
                          e.target.style.borderColor = item.color;
                          e.target.style.boxShadow = `0 0 0 3px ${item.color}20`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = item.current > 0 ? item.color : '#d1d5db';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280', 
                        marginTop: '8px',
                        fontWeight: '500'
                      }}>
                        Euro (€)
                      </div>
                    </div>
                  ))}
                </div>

                {/* Current Status Display */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                    📊 Aktueller Status:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {getCostStatus(selectedAnfrage).text}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                      Total: €{((selectedAnfrage.pickup_cost || 0) + (selectedAnfrage.main_cost || 0) + (selectedAnfrage.delivery_cost || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={async () => {
                    const pickupCost = parseFloat(document.getElementById('pickup_cost_manual').value) || 0;
                    const mainCost = parseFloat(document.getElementById('main_cost_manual').value) || 0;
                    const deliveryCost = parseFloat(document.getElementById('delivery_cost_manual').value) || 0;
                    
                    const success = await handleSaveCosts(selectedAnfrage.id, {
                      pickup_cost: pickupCost,
                      main_cost: mainCost,
                      delivery_cost: deliveryCost
                    });
                    
                    if (success) {
                      setShowCostInput(false);
                      setSelectedAnfrage(null);
                      setMagicCostText('');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#059669';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#10b981';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <Save style={{ width: '18px', height: '18px' }} />
                  Manuelle Kosten speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offer Edit Modal - Vollständig neu */}
      {showOfferEdit && selectedSendung && (
        <div style={{
          position: 'fixed',
          zIndex: 2002,
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '95%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            animation: 'slideInUp 0.3s ease-out'
          }}>
            {/* Offer Modal Header */}
            <div style={{ 
              padding: '24px 32px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              position: 'relative'
            }}>
              <button 
                onClick={() => {
                  setShowOfferEdit(false);
                  setSelectedSendung(null);
                }}
                style={{ 
                  position: 'absolute',
                  right: '20px',
                  top: '20px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px'
                }}>
                  💼
                </div>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '24px', 
                    fontWeight: '700'
                  }}>
                    Angebot bearbeiten
                  </h2>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    opacity: 0.9 
                  }}>
                    {selectedSendung.offer_number || selectedSendung.position}
                  </p>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    opacity: 0.8
                  }}>
                    Erstellt: {formatDateTime(selectedSendung.offer_created_at)} • Gültig bis: {formatDate(selectedSendung.offer_valid_until)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Offer Summary */}
              <div style={{
                backgroundColor: '#fef3c7',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid #fbbf24'
              }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#92400e', marginBottom: '12px' }}>
                  📋 Angebots-Übersicht
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                      €{selectedSendung.offer_price?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>Angebotspreis</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                      €{selectedSendung.offer_profit?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>Gewinn</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                      {selectedSendung.offer_margin_percent?.toFixed(1) || '0.0'}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>Marge</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
                      €{(selectedSendung.offer_price && selectedSendung.total_weight) ? 
                        (selectedSendung.offer_price / selectedSendung.total_weight).toFixed(2) : '0.00'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>Pro kg</div>
                  </div>
                </div>
              </div>

              {/* Offer Text Display */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  📄 Angebots-Text
                </div>
                <div style={{
                  backgroundColor: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'SF Mono, Monaco, monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedSendung.offer_notes || 'Kein Angebots-Text verfügbar'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <button
                  onClick={() => {
                    const newPrice = prompt(`Neuen Preis eingeben:\n\nAktuell: €${selectedSendung.offer_price}`, selectedSendung.offer_price);
                    if (newPrice && !isNaN(parseFloat(newPrice))) {
                      // Update offer price logic here
                      alert('Preisänderung wird implementiert!');
                    }
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#2563eb';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <Edit style={{ width: '16px', height: '16px' }} />
                  Preis ändern
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedSendung.offer_notes || '');
                    alert('Angebots-Text in Zwischenablage kopiert!');
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#059669';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#10b981';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <FileText style={{ width: '16px', height: '16px' }} />
                  Text kopieren
                </button>

                <button
                  onClick={() => {
                    const validDays = prompt('Gültigkeit verlängern um Tage:', '7');
                    if (validDays && !isNaN(parseInt(validDays))) {
                      alert('Gültigkeitsverlängerung wird implementiert!');
                    }
                  }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#d97706';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#f59e0b';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <Calendar style={{ width: '16px', height: '16px' }} />
                  Verlängern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Neue Sendung Modal Integration */}
      {showNeueSendung && (
        <NeueSendungSuper
          onClose={() => {
            setShowNeueSendung(false);
            loadSendungen();
          }}
          onSave={async (sendungData) => {
            try {
              console.log('💾 Speichere neue Sendung:', sendungData);
              
              const position = sendungData.position || `SND-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
              
              const { data, error } = await supabase
                .from('shipments')
                .insert({
                  position: position,
                  customer_id: sendungData.customer_id || sendungData.kunde_id,
                  status: sendungData.status || 'created',
                  pickup_partner_id: sendungData.pickup_partner_id || sendungData.abholPartner_id,
                  mainrun_partner_id: sendungData.mainrun_partner_id || sendungData.hauptlaufPartner_id,
                  delivery_partner_id: sendungData.delivery_partner_id || sendungData.zustellPartner_id,
                  reference: sendungData.reference || sendungData.referenz,
                  transport_type: sendungData.transport_type || (
                    sendungData.transportArt === 'luftfracht' ? 'AIR' : 
                    sendungData.transportArt === 'seefracht' ? 'SEA' : 
                    sendungData.transportArt === 'lkw' ? 'TRUCK' : 'AIR'
                  ),
                  import_export: sendungData.import_export?.toUpperCase() || 'EXPORT',
                  origin_airport: sendungData.origin_airport || sendungData.vonFlughafen,
                  destination_airport: sendungData.destination_airport || sendungData.nachFlughafen,
                  from_city: sendungData.from_city || sendungData.abholort?.split(',')[0]?.trim(),
                  to_city: sendungData.to_city || sendungData.empfaenger?.ort,
                  pickup_date: sendungData.pickup_date || sendungData.abholDatum,
                  delivery_date: sendungData.delivery_date || sendungData.deadline,
                  total_pieces: parseInt(sendungData.total_pieces || sendungData.gesamtColli || 0),
                  total_weight: parseFloat(sendungData.total_weight || sendungData.gesamtGewicht || 0),
                  total_volume: parseFloat(sendungData.total_volume || sendungData.gesamtVolumen || 0),
                  consignee_name: sendungData.empfaenger?.name || sendungData.consignee?.name || '',
                  consignee_city: sendungData.empfaenger?.ort || sendungData.consignee?.city || '',
                  consignee_country: sendungData.empfaenger?.land || sendungData.consignee?.country || '',
                  recipient_name: sendungData.consignee?.name || sendungData.empfaenger?.name,
                  recipient_city: sendungData.consignee?.city || sendungData.empfaenger?.ort,
                  recipient_country: sendungData.consignee?.country || sendungData.empfaenger?.land,
                  incoterm: sendungData.incoterm || sendungData.frankatur || 'CPT',
                  commodity: sendungData.commodity || sendungData.warenbeschreibung,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
              
              if (error) {
                console.error('❌ Supabase Fehler:', error);
                throw error;
              }
              
              console.log('✅ Sendung erfolgreich gespeichert:', data);
              
              // Success notification
              alert(`🎉 Sendung erfolgreich erstellt!\n\nPosition: ${position}\nStatus: ${data.status}\nRoute: ${data.origin_airport} → ${data.destination_airport}`);
              
              await loadSendungen();
              setShowNeueSendung(false);
            } catch (err) {
              console.error('❌ Fehler beim Speichern:', err);
              alert(`❌ Fehler beim Speichern der Sendung:\n\n${err.message}\n\nBitte versuchen Sie es erneut.`);
            }
          }}
        />
      )}

      {/* Enhanced CSS Animations */}
<style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
        
        /* Enhanced hover effects */
        .traffic-light:hover {
          transform: scale(1.2);
          transition: all 0.2s ease;
        }
        
        .cost-status {
          transition: all 0.2s ease;
        }
        
        .cost-status:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        /* Smooth scrollbars */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Modal backdrop blur */
        .modal-backdrop {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        
        /* Button hover effects */
        button:not(:disabled):hover {
          transition: all 0.2s ease;
        }
        
        /* Input focus effects */
        input:focus, textarea:focus, select:focus {
          outline: none;
          transition: all 0.2s ease;
        }
        
        /* Table row hover effects */
        tr:hover {
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        /* Enhanced gradient animations */
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .gradient-animate {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }
        
        /* Loading spinner improvements */
        .loading-spinner {
          animation: spin 1.5s linear infinite;
        }
        
        /* Success/Error state transitions */
        .state-success {
          animation: bounce 0.6s ease;
        }
        
        .state-error {
          animation: shake 0.5s ease;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div> 
  );
};

export default SendungsBoard;