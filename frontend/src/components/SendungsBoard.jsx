// frontend/src/components/SendungsBoard.jsx
// ✅ FINALE, KOMPLETT NEU GESCHRIEBENE VERSION (V7.0)

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, FileQuestion, FileText, BarChart3, Plus } from 'lucide-react';

// Module und Komponenten importieren
import CreateOfferModal from './modals/CreateOfferModal';
import CostInputModal from './modals/CostInputModal';
import costParser from '../utils/costParser';
const { processMagicInput } = costParser;
import { useSendungsData } from '../hooks/useSendungsData';
import SendungsTable from './SendungsTable';
import NeueSendungSuper from './NeueSendungSuper';

const SendungsBoard = ({ user }) => {
  // ===============================================================
  //  1. ZENTRALER DATEN-HOOK ("Das Gehirn")
  // ===============================================================
  const {
    sendungen,
    customers,
    partners,
    trafficLights,
    loading,
    error,
    stats,
    updateTrafficLight,
    deleteSendung,
  } = useSendungsData();

// ===============================================================
//  2. UI-STATE MANAGEMENT (Zustand der Ansicht)
// ===============================================================
const [viewMode, setViewMode] = useState('sendungen');
const [searchTerm, setSearchTerm] = useState('');
const [selectedSendung, setSelectedSendung] = useState(null);
const [showNeueSendung, setShowNeueSendung] = useState(false);
const [showCostInput, setShowCostInput] = useState(false);
const [costInputSendung, setCostInputSendung] = useState(null);
// States für das Traffic Light System
const [showTrafficLightModal, setShowTrafficLightModal] = useState(false);
const [trafficLightData, setTrafficLightData] = useState(null);
const trafficLightRef = useRef(null);
const [showCreateOffer, setShowCreateOffer] = useState(false);
const [createOfferSendung, setCreateOfferSendung] = useState(null);
// Milestone Dropdown States (nur für E-Mail-Partner)
const [selectedMilestoneSendung, setSelectedMilestoneSendung] = useState(null);


  // ===============================================================
  //  3. DATENFILTERUNG
  // ===============================================================
  const filteredSendungen = sendungen.filter(sendung => {
    const viewFilter = 
      viewMode === 'anfragen' ? sendung.status === 'ANFRAGE' :
      viewMode === 'angebote' ? sendung.status === 'ANGEBOT' :
      viewMode === 'sendungen' ? !['ANFRAGE', 'ANGEBOT'].includes(sendung.status) :
      true;

    if (!viewFilter) return false;
    
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const customerName = customers.find(c => c.id === sendung.customer_id)?.name.toLowerCase() || '';

    return (
      sendung.position?.toLowerCase().includes(search) ||
      sendung.reference?.toLowerCase().includes(search) ||
      customerName.includes(search)
    );
  });

  // ===============================================================
  //  4. EVENT HANDLER
  // ===============================================================

  const handleEditClick = (sendung) => {
    setSelectedSendung(sendung);
    console.log('Edit clicked for:', sendung.position);
    // TODO: Edit Modal öffnen
  };

  const handleDeleteClick = (sendung) => {
    if (window.confirm(`Sendung ${sendung.position || sendung.id} wirklich löschen?`)) {
      deleteSendung(sendung.id);
    }
  };

 const handleCreateOffer = (sendung) => {
  console.log('Create offer for:', sendung.position);
  console.log('Sendung Daten:', sendung);
  console.log('Kosten:', {
    pickup: sendung.pickup_cost || sendung.cost_pickup,
    main: sendung.main_cost || sendung.cost_mainrun,
    delivery: sendung.delivery_cost || sendung.cost_delivery
  });
  
  // Öffne das Modal
  setCreateOfferSendung(sendung);
  setShowCreateOffer(true);
};

  const handleAcceptOffer = (sendung) => {
    console.log('Accept offer for:', sendung.position);
    // TODO: Accept Offer Logic
  };

  const handleRejectOffer = (sendung) => {
    console.log('Reject offer for:', sendung.position);
    // TODO: Reject Offer Logic
  };
  const handleCostInputClick = (sendung) => {
    console.log('Cost input for:', sendung.position);
    setCostInputSendung(sendung);
    setShowCostInput(true);
  };

  // Milestone Dropdown Handler (wie in Referenz)
  const handleMilestoneClick = (event, sendung, ampelType) => {
    event.stopPropagation();
    console.log('🎯 Milestone dropdown clicked:', sendung.position, ampelType);
    
    const popup = document.getElementById('milestonePopup');
    const optionsDiv = document.getElementById('milestoneOptions');
    
    // Position des Popups
    popup.style.left = event.pageX + 'px';
    popup.style.top = event.pageY + 'px';
    popup.style.display = 'block';
    
    // Milestone-Optionen für den Ampel-Typ
    const milestoneOptionen = getMilestoneOptionen(ampelType);
    const currentMilestone = sendung.current_milestone || 0;
    
    optionsDiv.innerHTML = milestoneOptionen.map(opt => `
      <div class="status-option ${isCurrentMilestone(opt.value, currentMilestone, ampelType) ? 'active' : ''}" 
           onclick="updateMilestone(${sendung.id}, ${opt.value})"
           style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; font-size: 14px; transition: background-color 0.2s;"
           onmouseover="this.style.backgroundColor='#f5f5f7'"
           onmouseout="this.style.backgroundColor='white'">
        <span style="margin-right: 8px;">${opt.value <= currentMilestone ? '✅' : '⭕'}</span>
        ${opt.text}
      </div>
    `).join('');
    
    // Partner-Info für E-Mail speichern
    setSelectedMilestoneSendung(sendung);
    window.currentMilestoneType = ampelType;
  };

  // Milestone-Optionen für jede Ampel (wie in Referenz)
  const getMilestoneOptionen = (ampelType) => {
    const optionen = {
      abholung: [
        { value: 1, text: 'Abholung beauftragt' },
        { value: 2, text: 'Sendung abgeholt' },
        { value: 3, text: 'Anlieferung im Lager' }
      ],
      carrier: [
        { value: 4, text: 'Sendung gebucht' },
        { value: 5, text: 'Zoll erledigt' },
        { value: 6, text: 'Anlieferung bei Airline' },
        { value: 7, text: 'Sendung abgeflogen' },
        { value: 8, text: 'Sendung angekommen' }
      ],
      zustellung: [
        { value: 9, text: 'Sendung verzollt' },
        { value: 10, text: 'Sendung zugestellt' }
      ]
    };
    return optionen[ampelType] || [];
  };

  // Prüfen ob Milestone aktuell aktiv ist
  const isCurrentMilestone = (milestoneValue, currentMilestone, ampelType) => {
    if (ampelType === 'abholung') return currentMilestone >= 1 && currentMilestone <= 3 && milestoneValue === currentMilestone;
    if (ampelType === 'carrier') return currentMilestone >= 4 && currentMilestone <= 8 && milestoneValue === currentMilestone;
    if (ampelType === 'zustellung') return currentMilestone >= 9 && currentMilestone <= 10 && milestoneValue === currentMilestone;
    return false;
  };

  // Milestone Update (wie in Referenz)
  window.updateMilestone = async (sendungId, newMilestone) => {
    console.log(`🎯 Milestone Update: Sendung ${sendungId} → Milestone ${newMilestone}`);
    
    try {
      const response = await fetch(`https://logistikpro-production.onrender.com/api/shipments/${sendungId}/milestone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ milestone: newMilestone })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log('✅ Milestone Update erfolgreich');
      
      // Popup schließen
      document.getElementById('milestonePopup').style.display = 'none';
      
      // Seite neu laden um aktuelle Daten zu zeigen
      window.location.reload();

    } catch (error) {
      console.error('❌ Fehler beim Milestone-Update:', error);
      alert('Fehler beim Milestone-Update: ' + error.message);
    }
  };

  // Partner E-Mail (wie in Referenz)
  const emailPartner = () => {
    if (selectedMilestoneSendung && window.currentMilestoneType) {
      const subject = 'Status Update Request - Sendung ' + selectedMilestoneSendung.position;
      const body = 'Sehr geehrte Damen und Herren,%0A%0ABitte um Status-Update für die Sendung ' + selectedMilestoneSendung.position + '.%0A%0AMit freundlichen Grüßen';
      
      // Partner-E-Mail basierend auf Ampel-Typ
      let partnerEmail = 'info@logistikpro.de'; // Fallback
      if (window.currentMilestoneType === 'abholung') partnerEmail = selectedMilestoneSendung.pickup_partner_email || partnerEmail;
      if (window.currentMilestoneType === 'carrier') partnerEmail = selectedMilestoneSendung.main_partner_email || partnerEmail;
      if (window.currentMilestoneType === 'zustellung') partnerEmail = selectedMilestoneSendung.delivery_partner_email || partnerEmail;
      
      window.open(`mailto:${partnerEmail}?subject=${subject}&body=${body}`);
    }
    document.getElementById('milestonePopup').style.display = 'none';
  };

  const handleMilestoneUpdate = async (sendungId, newMilestone) => {
  try {
    console.log(`🎯 Updating milestone for ${sendungId} to ${newMilestone}`);
    
    const response = await fetch(`https://logistikpro-production.onrender.com/api/shipments/${sendungId}/milestone`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ milestone: newMilestone })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Milestone Update erfolgreich:', result);

    // Modal schließen
    setShowMilestoneModal(false);
    setSelectedMilestoneSendung(null);
    
    // Seite neu laden um aktuelle Daten zu zeigen
    window.location.reload();

  } catch (error) {
    console.error('❌ Fehler beim Milestone-Update:', error);
    alert('Fehler beim Milestone-Update: ' + error.message);
    throw error;
  }
};
  
  const handleTrafficLightClick = (event, sendungId, milestoneType, data) => {
    event.stopPropagation();
    console.log('🚦 Traffic Light Click:', { sendungId, milestoneType, data });
    
    // Verwende updateTrafficLight aus useSendungsData
    const currentStatus = data?.currentStatus || 'grey';
    updateTrafficLight(sendungId, milestoneType, currentStatus);
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (trafficLightRef.current && !trafficLightRef.current.contains(event.target)) {
        setShowTrafficLightModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ===============================================================
  //  5. RENDER-METHODE
  // ===============================================================
  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px', backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#1d1d1f' }}>
              LogistikPro Dashboard
            </h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
              Willkommen zurück, {user?.email || 'Benutzer'}
            </p>
          </div>
          
          {/* Quick Stats */}
<div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
  <div style={{ display: 'flex', gap: '20px' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>{stats.sendungen}</div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>Sendungen</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>{stats.anfragen}</div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>Anfragen</div>
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{stats.angebote}</div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>Angebote</div>
    </div>
  </div>
  
  {/* Neue Sendung Button */}
  <button
    onClick={() => setShowNeueSendung(true)}
    style={{
      marginLeft: '20px',
      padding: '10px 20px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'background-color 0.2s ease'
    }}
    onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
    onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
  >
    <Plus style={{ width: '16px', height: '16px' }} />
    Neue Sendung
  </button>
</div>
</div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
          {[
            { key: 'sendungen', label: '📦 Sendungen', icon: Package },
            { key: 'anfragen', label: '❓ Anfragen', icon: FileQuestion },
            { key: 'angebote', label: '💼 Angebote', icon: FileText },
            { key: 'alle', label: '📊 Alle', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              style={{
                padding: '12px 20px',
                backgroundColor: viewMode === tab.key ? '#3b82f6' : 'transparent',
                color: viewMode === tab.key ? 'white' : '#6b7280',
                border: viewMode === tab.key ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <tab.icon style={{ width: '16px', height: '16px' }} />
              {tab.label}
              <span style={{
                backgroundColor: viewMode === tab.key ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                color: viewMode === tab.key ? 'white' : '#6b7280',
                fontSize: '12px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '12px',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {tab.key === 'sendungen' ? stats.sendungen :
                 tab.key === 'anfragen' ? stats.anfragen :
                 tab.key === 'angebote' ? stats.angebote :
                 stats.total}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ marginTop: '16px', position: 'relative' }}>
          <Search style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: '20px', 
            height: '20px', 
            color: '#9ca3af' 
          }} />
          <input
            type="text"
            placeholder="Suche nach Position, Referenz oder Kunde..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '16px',
              backgroundColor: '#f9fafb'
            }}
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: 'white', 
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>⏳ Daten werden geladen...</div>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: '8px', 
          color: '#dc2626',
          marginBottom: '20px'
        }}>
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {/* Main Table */}
      {!loading && !error && (
        <SendungsTable
          sendungen={filteredSendungen}
          customers={customers}
          partners={partners}
          trafficLights={trafficLights}
          viewMode={viewMode}
          searchTerm={searchTerm}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          onCreateOffer={handleCreateOffer}
          onAcceptOffer={handleAcceptOffer}
          onRejectOffer={handleRejectOffer}
          onCostInputClick={handleCostInputClick}
          onStatusMenuClick={handleTrafficLightClick}
          onMilestoneClick={handleMilestoneClick}
        />
      )}
      {/* Neue Sendung Modal */}
{showNeueSendung && (
  <NeueSendungSuper 
    onClose={() => setShowNeueSendung(false)}
    onSave={async (sendungData) => {
      console.log('Neue Sendung:', sendungData);
      setShowNeueSendung(false);
      // Reload data wenn nötig
    }}
  />
)}
{/* Cost Input Modal */}
{showCostInput && costInputSendung && (
  <CostInputModal
    sendung={costInputSendung}
    partners={partners}
    costParser={costParser}
    onClose={() => {
      setShowCostInput(false);
      setCostInputSendung(null);
    }}
    onSave={async (costs) => {
      console.log('=== KOSTEN SPEICHERN ===');
      console.log('Sendung ID:', costInputSendung.id);
      console.log('Kosten:', costs);
     
      try {
        // Payload vorbereiten
        const payload = {
          pickup_cost: costs.pickup_cost,
          main_cost: costs.main_cost,
          delivery_cost: costs.delivery_cost,
          cost_pickup: costs.pickup_cost,
          cost_mainrun: costs.main_cost,
          cost_delivery: costs.delivery_cost
        };
        console.log('Sende an Backend:', JSON.stringify(payload));
       
        // API Call
        const response = await fetch(`https://logistikpro-production.onrender.com/api/shipments/${costInputSendung.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
       
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server Response:', response.status, errorText);
          throw new Error(`Fehler beim Speichern: ${response.status} - ${errorText}`);
        }
       
        const result = await response.json();
        console.log('Kosten gespeichert:', result);
       
        // Modal schließen und Daten neu laden
        setShowCostInput(false);
        setCostInputSendung(null);
       
        // Seite neu laden um aktuelle Daten zu zeigen
        window.location.reload();
       
      } catch (error) {
        console.error('Fehler beim Speichern:', error);
        alert('Fehler beim Speichern der Kosten: ' + error.message);
      }
    }}
  />
)}

{/* Create Offer Modal */}
{showCreateOffer && createOfferSendung && (
  <CreateOfferModal
    sendung={createOfferSendung}
    onClose={() => {
      setShowCreateOffer(false);
      setCreateOfferSendung(null);
    }}
    onSave={async (offerData) => {
      try {
        const response = await fetch(`https://logistikpro-production.onrender.com/api/shipments/${createOfferSendung.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'ANGEBOT',
            offer_price: offerData.offer_price,
            offer_profit: offerData.margin_amount,
            offer_margin_percent: offerData.margin_percent,
            offer_created_at: new Date().toISOString(),
            total_cost: offerData.total_cost
          })
        });
       
        if (!response.ok) {
          throw new Error('Fehler beim Erstellen des Angebots');
        }
       
        alert('✅ Angebot erfolgreich erstellt!');
        setShowCreateOffer(false);
        setCreateOfferSendung(null);
        window.location.reload();
       
      } catch (error) {
        console.error('Fehler:', error);
        alert('Fehler beim Erstellen des Angebots: ' + error.message);
      }
    }}
  />
)}

{/* Milestone Dropdown Popup (wie in Referenz) */}
<div id="milestonePopup" style={{
  position: 'absolute',
  background: 'white',
  border: '1px solid #d2d2d7',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  zIndex: 1000,
  minWidth: '250px',
  display: 'none'
}}>
  <div style={{
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: '600',
    fontSize: '14px'
  }}>
    Milestone aktualisieren
  </div>
  <div id="milestoneOptions" style={{
    maxHeight: '300px',
    overflowY: 'auto'
  }}></div>
  <button
    onClick={emailPartner}
    style={{
      width: '100%',
      padding: '10px',
      border: 'none',
      borderTop: '1px solid #e5e7eb',
      background: '#f5f5f7',
      cursor: 'pointer',
      fontSize: '14px',
      textAlign: 'left',
      transition: 'background-color 0.2s'
    }}
    onMouseOver={(e) => e.target.style.background = '#e8e8ed'}
    onMouseOut={(e) => e.target.style.background = '#f5f5f7'}
  >
    📧 Partner per E-Mail kontaktieren
  </button>
</div>

    </div>
  );
};

export default SendungsBoard;
