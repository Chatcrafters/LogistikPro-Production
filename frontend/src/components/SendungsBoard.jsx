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
// States für das Milestone-Modal
const [showTrafficLightModal, setShowTrafficLightModal] = useState(false);
const [trafficLightData, setTrafficLightData] = useState(null);
const trafficLightRef = useRef(null);
const [showCreateOffer, setShowCreateOffer] = useState(false);
const [createOfferSendung, setCreateOfferSendung] = useState(null);

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
        const response = await fetch(`http://localhost:3001/api/shipments/${costInputSendung.id}`, {
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
        const response = await fetch(`http://localhost:3001/api/shipments/${createOfferSendung.id}`, {
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

    </div>
  );
};

export default SendungsBoard;