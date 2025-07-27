// SendungsBoard.jsx - VOLLVERSION mit integriertem Traffic Light System
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Download, Filter, RotateCcw, Package, FileQuestion, FileText, BarChart3 } from 'lucide-react';

// Import der Module
import useSendungsData from '../hooks/useSendungsData';
import SendungsTable from './SendungsTable';
import SendungsModals from './modals/SendungsModals.jsx';
import { processMagicInput, handleSaveCosts } from '../utils/costParser';
import { formatDate, formatDateTime, getStatusColor } from '../utils/formatters';

const SendungsBoard = ({ supabase, user, onNavigate }) => {
 // Hook für Datenmanagement - ERWEITERT für neue DB-Felder
const {
  sendungen,
  customers,
  partners,
  milestones,
  trafficLights,
  loading,
  error,
  stats,
  loadAllData,
  updateStatus,
  deleteSendung,          // ← NEU HINZUGEFÜGT
  saveSendung,
  saveCosts,
  createOffer,
  handleOffer,
  clearError
} = useSendungsData();

// NEUE HELPER-FUNKTIONEN für erweiterte Daten
const updateFlightTimes = async (shipmentId, flightData) => {
  try {
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
      .eq('id', shipmentId);

    if (error) throw error;
    await loadAllData(); // Daten neu laden
    return data;
  } catch (error) {
    console.error('❌ Flight times update error:', error);
    alert('Fehler beim Aktualisieren der Flugzeiten: ' + error.message);
  }
};

const updateNotes = async (shipmentId, notesData) => {
  try {
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
      .eq('id', shipmentId);

    if (error) throw error;
    await loadAllData();
    return data;
  } catch (error) {
    console.error('❌ Notes update error:', error);
    alert('Fehler beim Aktualisieren der Notizen: ' + error.message);
  }
};

  // UI State
  const [viewMode, setViewMode] = useState('sendungen');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [statusPopupData, setStatusPopupData] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showCostInput, setShowCostInput] = useState(false);
  const [selectedAnfrage, setSelectedAnfrage] = useState(null);
  const [magicCostText, setMagicCostText] = useState('');
  const [selectedSendung, setSelectedSendung] = useState(null);
  const [tempCosts, setTempCosts] = useState({});

  // Traffic Light States
  const [showTrafficLightModal, setShowTrafficLightModal] = useState(false);
  const [trafficLightData, setTrafficLightData] = useState(null);
  const [trafficLightPosition, setTrafficLightPosition] = useState({ x: 0, y: 0 });

  // Refs
  const popupRef = useRef(null);
  const trafficLightRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Click outside handler for status popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowStatusPopup(false);
      }
      if (trafficLightRef.current && !trafficLightRef.current.contains(event.target)) {
        setShowTrafficLightModal(false);
      }
    };

    if (showStatusPopup || showTrafficLightModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusPopup, showTrafficLightModal]);

  // Filterfunktion für verschiedene View Modes - MUSS VOR DER VERWENDUNG DEFINIERT WERDEN
  const getFilteredSendungen = () => {
    switch (viewMode) {
      case 'anfragen':
        return sendungen.filter(s => s.status === 'ANFRAGE');
      case 'angebote':
        return sendungen.filter(s => s.status === 'ANGEBOT');
      case 'sendungen':
        return sendungen.filter(s => 
          ['BEAUFTRAGT', 'created', 'booked', 'abgeholt', 'in_transit', 'zugestellt', 'delivered'].includes(s.status)
        );
      case 'alle':
      default:
        return sendungen;
    }
  };

  // Filter sendungen based on view mode and search
  const filteredSendungen = getFilteredSendungen().filter(sendung => {
    // Search Filter
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    const customerName = customers[sendung.customer_id]?.toLowerCase() || '';
    
    return (
      sendung.position?.toLowerCase().includes(search) ||
      sendung.reference?.toLowerCase().includes(search) ||
      sendung.awb_number?.toLowerCase().includes(search) ||
      customerName.includes(search) ||
      sendung.origin_airport?.toLowerCase().includes(search) ||
      sendung.destination_airport?.toLowerCase().includes(search)
    );
  });

 // Traffic Light Click Handler - CLEAN VERSION
  const handleTrafficLightClick = (event, sendungId, milestoneType, milestoneData) => {
  event.stopPropagation();
  
  console.log('🚦 Traffic Light clicked - BOARD:', sendungId, milestoneType, milestoneData);
  
  const rect = event.target.getBoundingClientRect();
  const sendung = sendungen.find(s => s.id === sendungId);
  
  if (!sendung) {
    console.error('❌ Sendung nicht gefunden:', sendungId);
    return;
  }

  console.log('🚦 Found sendung:', sendung.position, 'Traffic lights:', trafficLights[sendungId]);

  // ✅ MILESTONE-DEFINITIONEN aus useSendungsData
  const shipmentTrafficLights = trafficLights[sendungId];
  if (!shipmentTrafficLights) {
    console.error('❌ No traffic light data for sendung:', sendungId);
    return;
  }

  const { definitions, transportType, importExport } = shipmentTrafficLights;
  const allMilestones = definitions || [];
  const typeMilestones = allMilestones.filter(m => m.ampel === milestoneType);
  
  console.log('🚦 Milestones for', milestoneType, ':', typeMilestones);
  
  // ✅ COMPLETED IDS aus completed_milestones Array
  const completedIds = sendung.completed_milestones || [];
  
  console.log('🚦 Completed IDs:', completedIds);

  setTrafficLightData({
    sendungId,
    sendung,
    milestoneType,
    currentStatus: shipmentTrafficLights[milestoneType] || 'grey',
    milestones: typeMilestones,
    completedIds: completedIds
  });
  
  setTrafficLightPosition({
    x: rect.left,
    y: rect.bottom + 5
  });
  
  setShowTrafficLightModal(true);
  
  console.log('🚦 Modal should open with', typeMilestones.length, 'milestones');
};

// ==// ============== TRAFFIC LIGHT STATUS SYSTEM ==============

// 🚦 HELPER FUNCTION: Status-Text für Ampel berechnen
// 📁 SendungsBoard.jsx - Event Handlers Collection
// ✅ Komplett neu geschrieben für bessere Performance und Fehlerbehandlung

// ====================================================================
// 🚦 TRAFFIC LIGHT STATUS TEXT GENERATOR
// ====================================================================

/**
 * Generiert Status-Text für Traffic Light Anzeige unter den Ampeln
 * @param {Object} sendung - Sendungsobjekt
 * @param {string} ampelType - 'abholung', 'carrier', 'zustellung'
 * @param {Object} trafficLightData - Milestone-Definitionen
 * @returns {string} - Formatierter Status-Text
 */
const getTrafficLightStatusText = (sendung, ampelType, trafficLightData) => {
  console.log(`📊 Generating status text for ${sendung?.position} ${ampelType}`);
  
  // Validierung der Input-Parameter
  if (!sendung) {
    console.warn('⚠️ Keine Sendung für Status-Text');
    return 'Keine Daten';
  }
  
  if (!trafficLightData?.definitions) {
    console.warn('⚠️ Keine Traffic Light Definitionen verfügbar');
    return 'Definitionen fehlen';
  }

  const { definitions } = trafficLightData;
  const completedIds = sendung.completed_milestones || [];
  
  console.log(`📊 Completed Milestone IDs für ${sendung.position}:`, completedIds);
  
  // Alle Milestones für diese spezifische Ampel filtern
  const ampelMilestones = definitions.filter(milestone => milestone.ampel === ampelType);
  
  if (ampelMilestones.length === 0) {
    console.warn(`⚠️ Keine Milestones für Ampel-Typ: ${ampelType}`);
    return `${ampelType} - Nicht konfiguriert`;
  }

  // Abgeschlossene Milestones für diese Ampel ermitteln
  const completedAmpelMilestones = ampelMilestones.filter(milestone => 
    completedIds.includes(milestone.id)
  );
  
  const completedCount = completedAmpelMilestones.length;
  const totalCount = ampelMilestones.length;
  
  console.log(`📊 Milestone Count für ${ampelType}: ${completedCount}/${totalCount}`);
  
  // Letzten abgeschlossenen Milestone finden (höchste ID oder Reihenfolge)
  let lastCompletedMilestone = null;
  
  // Rückwärts durch die Milestones gehen um den letzten abgeschlossenen zu finden
  for (let i = ampelMilestones.length - 1; i >= 0; i--) {
    const milestone = ampelMilestones[i];
    if (completedIds.includes(milestone.id)) {
      lastCompletedMilestone = milestone;
      break;
    }
  }
  
  // Status-Text basierend auf Fortschritt generieren
  if (completedCount === 0) {
    return `0/${totalCount} - Nicht begonnen`;
  } 
  
  if (completedCount === totalCount) {
    return `${completedCount}/${totalCount} - Abgeschlossen`;
  }
  
  if (lastCompletedMilestone) {
    const shortText = lastCompletedMilestone.text?.substring(0, 30) || 'Milestone';
    return `${completedCount}/${totalCount} - ${shortText}`;
  }
  
  return `${completedCount}/${totalCount} - In Bearbeitung`;
};

// ====================================================================
// 🚦 MILESTONE TOGGLE HANDLER (Optimiert)
// ====================================================================

/**
 * Behandelt das Umschalten von Milestone-Status im Modal
 * @param {number} sendungId - ID der Sendung
 * @param {number} milestoneId - ID des Milestones
 * @param {boolean} isCompleted - Neuer Completed-Status
 * @param {Array} newCompletedIds - Aktualisierte Liste aller completed IDs
 */
const handleMilestoneToggle = async (sendungId, milestoneId, isCompleted, newCompletedIds) => {
  console.log('🚦 === MILESTONE TOGGLE START ===');
  console.log('🚦 Parameters:', { sendungId, milestoneId, isCompleted, newCompletedIds });
  
  try {
    // Eingabe-Validierung
    if (!sendungId || !milestoneId) {
      throw new Error('Ungültige Parameter: sendungId oder milestoneId fehlt');
    }
    
    if (!Array.isArray(newCompletedIds)) {
      throw new Error('newCompletedIds muss ein Array sein');
    }
    
    // Optimistische UI-Update (sofortige Anzeige)
    if (setTrafficLightData && typeof setTrafficLightData === 'function') {
      setTrafficLightData(prev => ({
        ...prev,
        completedIds: newCompletedIds
      }));
      console.log('🚦 ✅ Optimistic UI update completed');
    }
    
    // Datenbank-Update (nur existierende Felder)
    const updateData = {
      completed_milestones: newCompletedIds,
      updated_at: new Date().toISOString()
    };
    
    console.log('🚦 Updating database with data:', updateData);
    
    const { error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', sendungId);

    if (error) {
      console.error('🚦 ❌ Database update error:', error);
      throw new Error(`Datenbank-Fehler: ${error.message}`);
    }

    console.log('🚦 ✅ Database update successful');

    // Vollständige Daten-Neuladen für Konsistenz
    if (loadAllData && typeof loadAllData === 'function') {
      await loadAllData();
      console.log('🚦 ✅ Data reload completed');
    } else {
      console.warn('🚦 ⚠️ loadAllData function not available');
    }
    
    // Erfolgs-Feedback
    console.log('🚦 ✅ Milestone toggle completed successfully');
    
    // Optional: Toast-Notification
    if (window.showToast) {
      window.showToast('Milestone erfolgreich aktualisiert', 'success');
    }

  } catch (error) {
    console.error('🚦 ❌ Milestone toggle failed:', error);
    
    // Rollback der optimistischen UI-Updates
    if (setTrafficLightData && typeof setTrafficLightData === 'function') {
      setTrafficLightData(prev => ({
        ...prev,
        completedIds: prev.originalCompletedIds || []
      }));
    }
    
    // User-freundliche Fehlermeldung
    const userMessage = error.message.includes('Database') 
      ? 'Fehler beim Speichern in der Datenbank. Bitte versuchen Sie es erneut.'
      : `Fehler beim Milestone-Update: ${error.message}`;
    
    alert(`❌ ${userMessage}`);
    
    // Error-Tracking für Debugging
    if (window.logError) {
      window.logError('milestone_toggle_failed', {
        sendungId,
        milestoneId,
        isCompleted,
        error: error.message
      });
    }
  }
  
  console.log('🚦 === MILESTONE TOGGLE END ===');
};

// ====================================================================
// 🚦 TRAFFIC LIGHT UPDATE HANDLER (Erweitert)
// ====================================================================

/**
 * Behandelt manuelle Traffic Light Status-Updates
 * @param {number} sendungId - ID der Sendung
 * @param {string} milestoneType - 'abholung', 'carrier', 'zustellung'
 * @param {string} newStatus - 'green', 'yellow', 'red', 'grey'
 */
const handleTrafficLightUpdate = async (sendungId, milestoneType, newStatus) => {
  console.log('🚦 === TRAFFIC LIGHT UPDATE START ===');
  console.log('🚦 Parameters:', { sendungId, milestoneType, newStatus });
  
  try {
    // Eingabe-Validierung
    if (!sendungId || !milestoneType || !newStatus) {
      throw new Error('Alle Parameter sind erforderlich');
    }
    
    const validStatuses = ['green', 'yellow', 'red', 'grey'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Ungültiger Status: ${newStatus}. Erlaubt: ${validStatuses.join(', ')}`);
    }
    
    const validTypes = ['abholung', 'carrier', 'zustellung'];
    if (!validTypes.includes(milestoneType)) {
      throw new Error(`Ungültiger Milestone-Typ: ${milestoneType}. Erlaubt: ${validTypes.join(', ')}`);
    }
    
    // Datenbank-Update (nur existierende Felder)
    const updateData = {
      [`${milestoneType}_status`]: newStatus,
      updated_at: new Date().toISOString()
    };
    
    console.log('🚦 Updating traffic light in database:', updateData);

    const { error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', sendungId);

    if (error) {
      console.error('🚦 ❌ Traffic light database error:', error);
      throw new Error(`Datenbank-Fehler: ${error.message}`);
    }

    console.log('🚦 ✅ Traffic light update successful');
    
    // Daten neu laden
    if (loadAllData && typeof loadAllData === 'function') {
      await loadAllData();
      console.log('🚦 ✅ Data refreshed after traffic light update');
    }
    
    // Modal schließen
    if (setShowTrafficLightModal && typeof setShowTrafficLightModal === 'function') {
      setShowTrafficLightModal(false);
      console.log('🚦 ✅ Traffic light modal closed');
    }
    
    // Erfolgs-Feedback
    if (window.showToast) {
      window.showToast(`Traffic Light für ${milestoneType} auf ${newStatus} gesetzt`, 'success');
    }

  } catch (error) {
    console.error('🚦 ❌ Traffic light update failed:', error);
    
    // User-freundliche Fehlermeldung
    const userMessage = error.message.includes('Database')
      ? 'Fehler beim Speichern des Traffic Light Status. Bitte versuchen Sie es erneut.'
      : error.message;
    
    alert(`❌ ${userMessage}`);
    
    // Error-Tracking
    if (window.logError) {
      window.logError('traffic_light_update_failed', {
        sendungId,
        milestoneType,
        newStatus,
        error: error.message
      });
    }
  }
  
  console.log('🚦 === TRAFFIC LIGHT UPDATE END ===');
};

// ====================================================================
// 📋 STATUS MENU CLICK HANDLER (Überarbeitet)
// ====================================================================

/**
 * Öffnet das Status-Update Popup an der korrekten Position
 * @param {Event} event - Click Event für Position
 * @param {number} sendungId - ID der Sendung
 * @param {string} type - Status-Typ
 */
const handleStatusMenuClick = (event, sendungId, type) => {
  console.log('📋 === STATUS MENU CLICK ===');
  console.log('📋 Parameters:', { sendungId, type });
  
  try {
    // Event-Propagation stoppen
    event.stopPropagation();
    event.preventDefault();
    
    // Validierung
    if (!sendungId || !type) {
      throw new Error('SendungId und Type sind erforderlich');
    }
    
    // Sendung finden
    const sendung = sendungen?.find(s => s.id === sendungId);
    if (!sendung) {
      throw new Error(`Sendung mit ID ${sendungId} nicht gefunden`);
    }
    
    // Position des Click-Events ermitteln
    const rect = event.target.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    const position = {
      x: rect.left + scrollLeft,
      y: rect.bottom + scrollTop + 5 // 5px Abstand unter dem Element
    };
    
    // Bildschirm-Grenzen prüfen und Position anpassen
    const popupWidth = 200; // Geschätzte Popup-Breite
    const popupHeight = 150; // Geschätzte Popup-Höhe
    
    if (position.x + popupWidth > window.innerWidth) {
      position.x = window.innerWidth - popupWidth - 10;
    }
    
    if (position.y + popupHeight > window.innerHeight + scrollTop) {
      position.y = rect.top + scrollTop - popupHeight - 5; // Oberhalb des Elements
    }
    
    console.log('📋 Popup position calculated:', position);
    
    // Aktueller Status ermitteln
    const currentStatus = sendung[`${type}_status`] || 'grey';
    
    // Status-Popup-Daten setzen
    const popupData = {
      sendungId,
      sendung,
      type,
      currentStatus,
      availableStatuses: ['green', 'yellow', 'red', 'grey'],
      timestamp: new Date().toISOString()
    };
    
    // State Updates
    if (setStatusPopupData && typeof setStatusPopupData === 'function') {
      setStatusPopupData(popupData);
      console.log('📋 ✅ Status popup data set');
    }
    
    if (setPopupPosition && typeof setPopupPosition === 'function') {
      setPopupPosition(position);
      console.log('📋 ✅ Popup position set');
    }
    
    if (setShowStatusPopup && typeof setShowStatusPopup === 'function') {
      setShowStatusPopup(true);
      console.log('📋 ✅ Status popup opened');
    }

  } catch (error) {
    console.error('📋 ❌ Status menu click failed:', error);
    alert(`❌ Fehler beim Öffnen des Status-Menüs: ${error.message}`);
  }
  
  console.log('📋 === STATUS MENU CLICK END ===');
};

// ====================================================================
// 📋 STATUS UPDATE HANDLER (Verbessert)
// ====================================================================

/**
 * Führt Status-Update für eine Sendung durch
 * @param {number} sendungId - ID der Sendung
 * @param {string} type - Status-Typ
 * @param {string} newStatus - Neuer Status-Wert
 */
const handleStatusUpdate = async (sendungId, type, newStatus) => {
  console.log('📋 === STATUS UPDATE START ===');
  console.log('📋 Parameters:', { sendungId, type, newStatus });
  
  try {
    // Validierung
    if (!sendungId || !type || !newStatus) {
      throw new Error('Alle Parameter sind erforderlich');
    }
    
    // Status-Update über Custom Hook
    if (updateStatus && typeof updateStatus === 'function') {
      await updateStatus(sendungId, type, newStatus);
      console.log('📋 ✅ Status update via hook successful');
    } else {
      // Fallback: Direkter Datenbank-Update
      console.log('📋 Using fallback database update');
      
      const updateData = {
        [`${type}_status`]: newStatus,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('shipments')
        .update(updateData)
        .eq('id', sendungId);
      
      if (error) {
        throw new Error(`Datenbank-Fehler: ${error.message}`);
      }
      
      // Daten neu laden
      if (loadAllData && typeof loadAllData === 'function') {
        await loadAllData();
      }
    }
    
    console.log('📋 ✅ Status update completed successfully');
    
    // Popup schließen
    if (setShowStatusPopup && typeof setShowStatusPopup === 'function') {
      setShowStatusPopup(false);
      console.log('📋 ✅ Status popup closed');
    }
    
    // Erfolgs-Feedback
    if (window.showToast) {
      window.showToast(`Status ${type} auf ${newStatus} aktualisiert`, 'success');
    }
    
  } catch (error) {
    console.error('📋 ❌ Status update failed:', error);
    
    const userMessage = error.message.includes('Database')
      ? 'Fehler beim Speichern des Status. Bitte versuchen Sie es erneut.'
      : error.message;
    
    alert(`❌ Fehler beim Status-Update: ${userMessage}`);
    
    // Error-Tracking
    if (window.logError) {
      window.logError('status_update_failed', {
        sendungId,
        type,
        newStatus,
        error: error.message
      });
    }
  }
  
  console.log('📋 === STATUS UPDATE END ===');
};

// ====================================================================
// ✏️ EDIT CLICK HANDLER (Robuster)
// ====================================================================

/**
 * Behandelt das Öffnen einer Sendung zum Bearbeiten
 * @param {Object} sendung - Sendungsobjekt
 */
const handleEditClick = (sendung) => {
  console.log('✏️ === EDIT CLICK START ===');
  console.log('✏️ Sendung:', sendung?.position || sendung?.id);
  
  try {
    // Eingabe-Validierung
    if (!sendung) {
      throw new Error('Keine Sendung übergeben');
    }
    
    if (!sendung.id) {
      throw new Error('Sendung hat keine gültige ID');
    }
    
    // Sendung für Bearbeitung setzen
    if (setSelectedSendung && typeof setSelectedSendung === 'function') {
      setSelectedSendung(sendung);
      console.log('✏️ ✅ Sendung für Bearbeitung ausgewählt:', sendung.position);
    } else {
      throw new Error('setSelectedSendung Funktion nicht verfügbar');
    }
    
    // Edit-Modal öffnen (falls verfügbar)
    if (typeof setShowEditModal === 'function') {
      setShowEditModal(true);
      console.log('✏️ ✅ Edit-Modal geöffnet');
    } else {
      console.log('✏️ ℹ️ setShowEditModal nicht verfügbar - Sendung nur selected');
    }
    
    // Analytics-Tracking
    if (window.trackEvent) {
      window.trackEvent('sendung_edit_opened', {
        sendungId: sendung.id,
        position: sendung.position,
        status: sendung.status
      });
    }
    
  } catch (error) {
    console.error('✏️ ❌ Edit click failed:', error);
    alert(`❌ Fehler beim Öffnen der Sendung: ${error.message}`);
    
    // Error-Tracking
    if (window.logError) {
      window.logError('edit_click_failed', {
        sendung: sendung?.id || 'unknown',
        error: error.message
      });
    }
  }
  
  console.log('✏️ === EDIT CLICK END ===');
};

// ====================================================================
// 🗑️ DELETE CLICK HANDLER (Sicherheitsoptimiert)
// ====================================================================

/**
 * Behandelt das Löschen einer Sendung mit Sicherheitsabfragen
 * @param {Object} sendung - Sendungsobjekt
 */
const handleDeleteClick = (sendung) => {
  console.log('🗑️ === DELETE CLICK START ===');
  console.log('🗑️ Sendung:', sendung?.position || sendung?.id);
  
  try {
    // Eingabe-Validierung
    if (!sendung || !sendung.id) {
      throw new Error('Ungültige Sendung: Keine ID vorhanden');
    }
    
    // Sicherheitsprüfungen
    const isProductionSendung = sendung.status !== 'ANFRAGE' && sendung.status !== 'draft';
    const hasAwb = sendung.awb_number && sendung.awb_number.length > 0;
    const hasDeliveryDate = sendung.delivery_date && sendung.delivery_date.length > 0;
    
    // Erweiterte Bestätigungsnachrichten
    let confirmMessage = `Sendung ${sendung.position} wirklich löschen?\n\n`;
    
    if (isProductionSendung) {
      confirmMessage += '⚠️ WARNUNG: Dies ist eine aktive Sendung!\n';
    }
    
    if (hasAwb) {
      confirmMessage += '⚠️ WARNUNG: Sendung hat bereits eine AWB-Nummer!\n';
    }
    
    if (hasDeliveryDate) {
      confirmMessage += '⚠️ WARNUNG: Sendung wurde bereits zugestellt!\n';
    }
    
    confirmMessage += '\nDiese Aktion kann NICHT rückgängig gemacht werden!\n\n';
    confirmMessage += 'Zum Bestätigen tippen Sie "LÖSCHEN":';
    
    // Doppelte Bestätigung für kritische Sendungen
    if (isProductionSendung || hasAwb || hasDeliveryDate) {
      const userInput = prompt(confirmMessage);
      
      if (userInput !== 'LÖSCHEN') {
        console.log('🗑️ ⏹️ Delete cancelled - incorrect confirmation');
        alert('Löschvorgang abgebrochen. Bestätigung war nicht korrekt.');
        return;
      }
    } else {
      // Einfache Bestätigung für Anfragen/Drafts
      if (!window.confirm(confirmMessage)) {
        console.log('🗑️ ⏹️ Delete cancelled by user');
        return;
      }
    }
    
    console.log('🗑️ ✅ Delete confirmed for:', sendung.id, sendung.position);
    
    // Löschfunktion ausführen
    if (deleteSendung && typeof deleteSendung === 'function') {
      deleteSendung(sendung.id)
        .then(() => {
          console.log('🗑️ ✅ Delete successful');
          
          // Erfolgs-Feedback
          alert(`✅ Sendung ${sendung.position} erfolgreich gelöscht`);
          
          // Analytics-Tracking
          if (window.trackEvent) {
            window.trackEvent('sendung_deleted', {
              sendungId: sendung.id,
              position: sendung.position,
              status: sendung.status,
              wasProduction: isProductionSendung
            });
          }
        })
        .catch((error) => {
          console.error('🗑️ ❌ Delete failed:', error);
          
          const userMessage = error.message.includes('constraint')
            ? 'Sendung kann nicht gelöscht werden da sie mit anderen Daten verknüpft ist.'
            : `Fehler beim Löschen: ${error.message}`;
          
          alert(`❌ ${userMessage}`);
          
          // Error-Tracking
          if (window.logError) {
            window.logError('delete_failed', {
              sendungId: sendung.id,
              error: error.message
            });
          }
        });
    } else {
      throw new Error('Löschfunktion nicht verfügbar. Bitte Seite neu laden.');
    }
    
  } catch (error) {
    console.error('🗑️ ❌ Delete click failed:', error);
    alert(`❌ Fehler beim Löschen: ${error.message}`);
  }
  
  console.log('🗑️ === DELETE CLICK END ===');
};


  const handleCostInputClick = (anfrage) => {
    setSelectedAnfrage(anfrage);
    setMagicCostText('');
    setShowCostInput(true);
  };

  const handleProcessMagicInput = async (text, anfrage) => {
    try {
      const result = processMagicInput(text, anfrage, 'cost');
      
      if (result && result.type === 'costs') {
        console.log('💰 Processed costs:', result.data);
        
        const success = await handleSaveCosts(anfrage.id, result.data);
        
        if (success) {
          setShowCostInput(false);
          setMagicCostText('');
          setSelectedAnfrage(null);
          // Daten neu laden
          loadAllData();
        }
      }
    } catch (error) {
      console.error('Magic input error:', error);
      alert('❌ Fehler beim Verarbeiten: ' + error.message);
    }
  };

  const handleCreateOffer = async (anfrage) => {
    try {
      const totalCosts = (anfrage.pickup_cost || 0) + (anfrage.main_cost || 0) + (anfrage.delivery_cost || 0);
      
      if (totalCosts === 0) {
        alert('❌ Keine Kosten erfasst!\n\nBitte erfassen Sie zuerst alle Kosten über den 💰 Button.');
        return;
      }

      console.log('📄 Creating offer for:', anfrage.position, 'Total costs:', totalCosts);

      // Smart-Rounding Algorithm
      const getSmartRoundedPrice = (basePrice) => {
        if (basePrice < 50) return Math.ceil(basePrice / 5) * 5;        // 5€ Schritte
        if (basePrice < 100) return Math.ceil(basePrice / 10) * 10;     // 10€ Schritte  
        if (basePrice < 500) return Math.ceil(basePrice / 25) * 25;     // 25€ Schritte
        if (basePrice < 1000) return Math.ceil(basePrice / 50) * 50;    // 50€ Schritte
        if (basePrice < 5000) return Math.ceil(basePrice / 100) * 100;  // 100€ Schritte
        return Math.ceil(basePrice / 250) * 250;                        // 250€ Schritte
      };

      // DEBUGGE ZUERST DIE KOSTEN
      console.log('🔍 DEBUG Kosten-Werte:');
      console.log('pickup_cost:', anfrage.pickup_cost);
      console.log('main_cost:', anfrage.main_cost);
      console.log('delivery_cost:', anfrage.delivery_cost);
      console.log('totalCosts:', totalCosts);

      // SICHERE Kosten-Validierung
      if (totalCosts > 100000) {
        alert('❌ Unrealistische Kosten erkannt!\n\nGesamtkosten: €' + totalCosts.toFixed(2) + '\n\nBitte prüfen Sie die Kosteneingabe.');
        return;
      }

      if (totalCosts <= 0) {
        alert('❌ Keine gültigen Kosten gefunden!');
        return;
      }

      // EINFACHE Route-basierte Margen (ohne komplexe Logik)
      const getSimpleMargin = (origin, destination) => {
        const route = `${origin}-${destination}`;
        
        // Einfache Route-Margen
        const routeMargins = {
          'STR-LAX': 25,
          'STR-MIA': 25,  
          'FRA-MEL': 22,
          'STR-JFK': 20,
          'FRA-JFK': 18
        };
        
        return routeMargins[route] || 20; // Default 20%
      };

      const suggestedMargin = getSimpleMargin(anfrage.origin_airport, anfrage.destination_airport);
      const basePrice = totalCosts * (1 + suggestedMargin / 100);
      const smartPrice = getSmartRoundedPrice(basePrice);

      console.log('🔍 DEBUG Berechnung:');
      console.log('suggestedMargin:', suggestedMargin + '%');
      console.log('basePrice:', basePrice);
      console.log('smartPrice:', smartPrice);

      // Kosten-Breakdown für Benutzer
      const costBreakdown = `💰 KOSTEN-BREAKDOWN:

🚚 Abholung: €${(anfrage.pickup_cost || 0).toFixed(2)}
✈️ Hauptlauf: €${(anfrage.main_cost || 0).toFixed(2)}  
📦 Zustellung: €${(anfrage.delivery_cost || 0).toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━
💸 Gesamtkosten: €${totalCosts.toFixed(2)}

🎯 EMPFOHLENER VERKAUFSPREIS:
Route: ${anfrage.origin_airport} → ${anfrage.destination_airport}
Gewicht: ${anfrage.total_weight}kg
Empfohlene Marge: ${suggestedMargin}%
Verkaufspreis: €${smartPrice}
Profit: €${(smartPrice - totalCosts).toFixed(2)} (${((smartPrice - totalCosts) / smartPrice * 100).toFixed(1)}%)

━━━━━━━━━━━━━━━━━━━━━
Finalen Verkaufspreis eingeben:`;

      const priceInput = prompt(costBreakdown, smartPrice.toString());
      
      if (!priceInput) return;

      const finalPrice = parseFloat(priceInput);
      if (isNaN(finalPrice) || finalPrice <= 0) {
        alert('❌ Ungültiger Preis');
        return;
      }

      if (finalPrice <= totalCosts) {
        const confirmLoss = confirm(`⚠️ WARNUNG: Verkaufspreis unter den Kosten!\n\nKosten: €${totalCosts.toFixed(2)}\nVerkaufspreis: €${finalPrice.toFixed(2)}\nVerlust: €${(totalCosts - finalPrice).toFixed(2)}\n\nTrotzdem fortfahren?`);
        if (!confirmLoss) return;
      }

      const finalProfit = finalPrice - totalCosts;
      const finalMargin = finalPrice > 0 ? (finalProfit / finalPrice) * 100 : 0;

      console.log('🔍 DEBUG Kosten-Werte:');
      console.log('pickup_cost:', anfrage.pickup_cost);
      console.log('main_cost:', anfrage.main_cost);
      console.log('delivery_cost:', anfrage.delivery_cost);
      console.log('totalCosts:', totalCosts);

      // FÜGE DIESE ZEILEN HINZU:
      console.log('🔍 DEBUG Sendung Details:');
      console.log('Position:', anfrage.position);
      console.log('Gewicht:', anfrage.total_weight, 'kg');
      console.log('Route:', anfrage.origin_airport, '→', anfrage.destination_airport);
      console.log('Kunde:', customers[anfrage.customer_id]);

      // SICHERE Validierung
      if (finalMargin < -100 || finalMargin > 1000) {
        alert('❌ Unrealistische Marge berechnet!\n\nBitte prüfen Sie die Eingaben.');
        return;
      }

      if (finalMargin < 10 && finalMargin > -50) {
        const confirmLowMargin = confirm(`⚠️ Niedrige Marge: ${finalMargin.toFixed(1)}%\n\nEmpfohlen sind mindestens 15%.\nTrotzdem fortfahren?`);
        if (!confirmLowMargin) return;
      }

      // Angebot erstellen
      console.log('💼 Creating offer with data:', {
        finalPrice,
        finalProfit,
        finalMargin,
        totalCosts
      });

      const offerResult = await createOffer(anfrage.id, {
        offer_price: finalPrice,
        offer_profit: finalProfit,
        offer_margin_percent: finalMargin,
        offer_valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // +14 Tage
        offer_created_at: new Date().toISOString(),
        total_costs: totalCosts,
        cost_breakdown: {
          pickup: anfrage.pickup_cost || 0,
          main: anfrage.main_cost || 0,
          delivery: anfrage.delivery_cost || 0
        }
      });

      if (offerResult) {
        alert(`✅ Angebot erfolgreich erstellt!\n\n💰 Verkaufspreis: €${finalPrice.toFixed(2)}\n💸 Profit: €${finalProfit.toFixed(2)} (${finalMargin.toFixed(1)}%)\n📅 Gültig bis: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')}`);
        
        // Daten neu laden
        loadAllData();
      }

    } catch (error) {
      console.error('❌ Create offer error:', error);
      alert('❌ Fehler beim Erstellen des Angebots:\n\n' + error.message);
    }
  };

  const handleAcceptOffer = async (angebot) => {
    const confirmText = `Angebot annehmen? Preis: €${angebot.offer_price}`;

    if (confirm(confirmText)) {
      try {
        await handleOffer(angebot.id, 'accept');
        alert('✅ Angebot angenommen!');
      } catch (error) {
        alert('❌ Fehler: ' + error.message);
      }
    }
  };

  const handleRejectOffer = async (angebot) => {
    const reason = prompt('Grund für Ablehnung (optional):');
    
    try {
      await handleOffer(angebot.id, 'reject', reason);
      alert('✅ Angebot abgelehnt');
    } catch (error) {
      alert('❌ Fehler: ' + error.message);
    }
  };

  const handleSaveSendung = async (sendungData, isNew) => {
    try {
      await saveSendung(sendungData, isNew);
      setSelectedSendung(null);
      alert('✅ Sendung erfolgreich gespeichert!');
    } catch (error) {
      throw error;
    }
  };


// View Mode Buttons Configuration
  const viewModes = [
    { 
      key: 'sendungen', 
      label: 'Sendungen', 
      icon: Package, 
      color: '#3b82f6',
      count: sendungen.filter(s => ['BEAUFTRAGT', 'created', 'booked', 'abgeholt', 'in_transit', 'zugestellt', 'delivered'].includes(s.status)).length
    },
    { 
      key: 'anfragen', 
      label: 'Anfragen', 
      icon: FileQuestion, 
      color: '#f59e0b',
      count: sendungen.filter(s => s.status === 'ANFRAGE').length
    },
    { 
      key: 'angebote', 
      label: 'Angebote', 
      icon: FileText, 
      color: '#10b981',
      count: sendungen.filter(s => s.status === 'ANGEBOT').length
    },
    { 
      key: 'alle', 
      label: 'Alle', 
      icon: BarChart3, 
      color: '#6b7280',
      count: sendungen.length
    }
  ];

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px 32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '28px', 
              fontWeight: '700',
              color: '#1f2937'
            }}>
              📦 SendungsBoard v2.0
            </h1>
            <p style={{ 
              margin: 0, 
              color: '#6b7280', 
              fontSize: '16px' 
            }}>
              Modulares System - {user?.email}
            </p>
          </div>

          <button onClick={() => {
            supabase.auth.signOut();
            window.location.href = '/';
          }} style={{
            padding: '12px 24px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            🚪 Logout
          </button>
        </div>

        {/* View Mode Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          marginBottom: '20px'
        }}>
          {viewModes.map(mode => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.key;
            
            return (
              <button
                key={mode.key}
                onClick={() => setViewMode(mode.key)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: isActive ? mode.color : 'transparent',
                  color: isActive ? 'white' : mode.color,
                  border: `2px solid ${mode.color}`,
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                {mode.label}
                {mode.count > 0 && (
                  <span style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : mode.color + '20',
                    color: isActive ? 'white' : mode.color,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {mode.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: '16px', 
            height: '16px', 
            color: '#9ca3af' 
          }} />
          <input
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          color: '#dc2626',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>❌ {error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Debug Info */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#0284c7'
      }}>
        <strong>🔧 Status:</strong> {filteredSendungen.length} {viewMode}, 
        Module: ✅ useSendungsData, ✅ SendungsTable, ✅ costParser, ❓ SendungsModals, 🚦 Traffic Light System
      </div>

      {/* SendungsTable Component */}
      <SendungsTable
  sendungen={filteredSendungen}
  customers={customers}
  partners={partners}
  milestones={milestones}         // ← SICHERSTELLEN DASS DA IST
  trafficLights={trafficLights}   // ← SICHERSTELLEN DASS DA IST
  viewMode={viewMode}
  searchTerm={searchTerm}
  onEditClick={handleEditClick}
  onDeleteClick={handleDeleteClick}  // ← SICHERSTELLEN DASS ÜBERGEBEN
  onCreateOffer={handleCreateOffer}
  onAcceptOffer={handleAcceptOffer}
  onRejectOffer={handleRejectOffer}
  onCostInputClick={handleCostInputClick}
  onStatusMenuClick={handleTrafficLightClick}
/>

      {/* MILESTONE MODAL - Mit echten Milestones */}
      {showTrafficLightModal && trafficLightData && (
        <div 
          ref={trafficLightRef}
          style={{
            position: 'fixed',
            top: `${trafficLightPosition.y}px`,
            left: `${trafficLightPosition.x}px`,
            backgroundColor: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '300px',
            maxWidth: '400px'
          }}
        >
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
            🚦 {trafficLightData.milestoneType === 'abholung' ? 'Abholung' :
                 trafficLightData.milestoneType === 'carrier' ? 'Carrier/Transport' : 'Zustellung'} - Milestones
          </div>
          <div style={{ marginBottom: '16px', fontSize: '12px', color: '#6b7280' }}>
            {trafficLightData.sendung.position} | {trafficLightData.sendung.transport_type || 'AIR'} {trafficLightData.sendung.import_export || 'EXPORT'}
          </div>
          
          {/* MILESTONE-LISTE */}
          <div style={{ marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
            {trafficLightData.milestones && trafficLightData.milestones.length > 0 ? trafficLightData.milestones.map(milestone => {
              const isCompleted = trafficLightData.completedIds.includes(milestone.id);
              return (
                <div
                  key={milestone.id}
                  onClick={() => {
                    // Toggle Milestone-Status
                    const newCompletedIds = isCompleted 
                      ? trafficLightData.completedIds.filter(id => id !== milestone.id)
                      : [...trafficLightData.completedIds, milestone.id];
                    
                    handleMilestoneToggle(
                      trafficLightData.sendungId,
                      milestone.id,
                      !isCompleted,
                      newCompletedIds
                    );
                  }}
                  style={{
                    padding: '8px 12px',
                    margin: '4px 0',
                    backgroundColor: isCompleted ? '#dcfce7' : '#f8fafc',
                    border: `1px solid ${isCompleted ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = isCompleted ? '#bbf7d0' : '#f0f9ff';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = isCompleted ? '#dcfce7' : '#f8fafc';
                  }}
                >
                  <span style={{ 
                    fontSize: '16px',
                    minWidth: '20px' 
                  }}>
                    {isCompleted ? '✅' : '⏳'}
                  </span>
                  <span style={{ 
                    color: isCompleted ? '#166534' : '#374151',
                    fontWeight: isCompleted ? '600' : '400'
                  }}>
                    {milestone.text}
                  </span>
                </div>
              );
            }) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Keine Milestones verfügbar
              </div>
            )}
          </div>
          
          {/* STATUS-ÜBERSICHT */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>
              Status: {trafficLightData.currentStatus === 'green' ? '✅ Abgeschlossen' :
                      trafficLightData.currentStatus === 'yellow' ? '🟡 In Bearbeitung' :
                      trafficLightData.currentStatus === 'red' ? '🔴 Problem' : '⚫ Nicht begonnen'}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              {trafficLightData.milestones ? 
                `${trafficLightData.completedIds.length}/${trafficLightData.milestones.length} Milestones erledigt` : 
                'Keine Milestones verfügbar'
              }
            </div>
          </div>
          
          {/* SCHLIESSEN BUTTON */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowTrafficLightModal(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              ✅ Fertig
            </button>
          </div>
        </div>
      )}

     {/* Verbessertes Kosten-Input Modal mit 3 Feldern */}
{showCostInput && selectedAnfrage && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    <div style={{
      backgroundColor: 'white',
      padding: '32px',
      borderRadius: '16px',
      boxShadow: '0 20px 25px rgba(0, 0, 0, 0.25)',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: '600',
          color: '#1f2937'
        }}>
          💰 Kosten erfassen
        </h2>
        <button
          onClick={() => {
            setShowCostInput(false);
            setSelectedAnfrage(null);
            setMagicCostText('');
            setTempCosts({});
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '14px',
          color: '#374151',
          marginBottom: '16px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <strong>📦 Anfrage:</strong> {selectedAnfrage.position}<br />
          <strong>📍 Route:</strong> {selectedAnfrage.origin_airport} → {selectedAnfrage.destination_airport}<br />
          <strong>⚖️ Gewicht:</strong> {selectedAnfrage.total_weight} kg | {selectedAnfrage.total_pieces} Colli
        </div>

        {/* 3 KOSTEN-FELDER */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* VORLAUF */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              🚚 Vorlauf/Abholung
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tempCosts.pickup || selectedAnfrage.pickup_cost || selectedAnfrage.cost_pickup || ''}
              onChange={(e) => setTempCosts({...tempCosts, pickup: e.target.value})}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            />
            {(selectedAnfrage.pickup_cost > 0 || selectedAnfrage.cost_pickup > 0) && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                ✅ Bereits erfasst
              </div>
            )}
          </div>

          {/* HAUPTLAUF */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              ✈️ Hauptlauf
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tempCosts.main || selectedAnfrage.main_cost || selectedAnfrage.cost_mainrun || ''}
              onChange={(e) => setTempCosts({...tempCosts, main: e.target.value})}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            />
            {(selectedAnfrage.main_cost > 0 || selectedAnfrage.cost_mainrun > 0) && (
              <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                ✅ Bereits erfasst
              </div>
            )}
          </div>

          {/* NACHLAUF */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              📦 Nachlauf/Zustellung
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tempCosts.delivery || selectedAnfrage.delivery_cost || selectedAnfrage.cost_delivery || ''}
              onChange={(e) => setTempCosts({...tempCosts, delivery: e.target.value})}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            />
          </div>
        </div>

        {/* GESAMT */}
        <div style={{
          padding: '16px',
          backgroundColor: '#dbeafe',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>
            💰 Gesamtkosten
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
            €{(
              parseFloat(tempCosts.pickup || selectedAnfrage.pickup_cost || 0) +
              parseFloat(tempCosts.main || selectedAnfrage.main_cost || 0) +
              parseFloat(tempCosts.delivery || 0)
            ).toFixed(2)}
          </div>
        </div>

        {/* MAGIC INPUT OPTION */}
        <details style={{ marginBottom: '16px' }}>
          <summary style={{
            cursor: 'pointer',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            🧠 E-Mail Text auslesen (Optional)
          </summary>
          
          <div style={{ marginTop: '12px' }}>
            <textarea
              value={magicCostText}
              onChange={(e) => setMagicCostText(e.target.value)}
              placeholder={`Fügen Sie hier den E-Mail-Text ein...`}
              style={{
                width: '100%',
                height: '150px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />
            <button
              onClick={() => {
                if (!magicCostText.trim()) {
                  alert('Bitte Text eingeben!');
                  return;
                }
                handleProcessMagicInput(magicCostText, selectedAnfrage);
              }}
              style={{
                marginTop: '8px',
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              🧠 Text analysieren
            </button>
          </div>
        </details>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => {
            setShowCostInput(false);
            setSelectedAnfrage(null);
            setMagicCostText('');
            setTempCosts({});
          }}
          style={{
            padding: '12px 20px',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Abbrechen
        </button>

        <button
          onClick={async () => {
            const finalCosts = {
              pickup_cost: parseFloat(tempCosts.pickup || selectedAnfrage.pickup_cost || 0),
              main_cost: parseFloat(tempCosts.main || selectedAnfrage.main_cost || 0),
              delivery_cost: parseFloat(tempCosts.delivery || 0)
            };
            
            const success = await handleSaveCosts(selectedAnfrage.id, finalCosts);
            if (success) {
              setShowCostInput(false);
              setSelectedAnfrage(null);
              setMagicCostText('');
              setTempCosts({});
              loadAllData();
            }
          }}
          style={{
            padding: '12px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          💾 Kosten speichern
        </button>
      </div>
    </div>
  </div>
)}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px 32px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <span>Daten werden geladen...</span>
          </div>
        </div>
      )}

      {/* SendungsModals Integration - ALLE MODALS HIER */}
      <SendungsModals
        // Status Popup Props
        showStatusPopup={showStatusPopup}
        statusPopupData={statusPopupData}
        popupPosition={popupPosition}
        popupRef={popupRef}
        onStatusUpdate={handleStatusUpdate}
        onCloseStatusPopup={() => setShowStatusPopup(false)}
        
        // Cost Input Props
        showCostInput={showCostInput}
        selectedAnfrage={selectedAnfrage}
        magicCostText={magicCostText}
        onMagicCostTextChange={setMagicCostText}
        onCloseCostInput={() => {
          setShowCostInput(false);
          setSelectedAnfrage(null);
          setMagicCostText('');
        }}
        onProcessMagicInput={handleProcessMagicInput}
        
        // Edit Modal Props
        selectedSendung={selectedSendung}
        onCloseEdit={() => setSelectedSendung(null)}
        onSaveSendung={handleSaveSendung}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SendungsBoard;