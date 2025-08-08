// frontend/src/components/SendungsBoard.jsx
// ✅ KOMPLETT NEU GESCHRIEBEN - Alle Features + Milestone-Updates

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, RefreshCw, Filter, Download, Upload, 
  Package, AlertCircle, CheckCircle, Clock, TrendingUp,
  Eye, EyeOff, X, Calendar, Euro, FileText
} from 'lucide-react';

// ✅ IMPORTS
import SendungsTable from './SendungsTable';
import NeueSendungSuper from './NeueSendungSuper';
import CostInputModal from './modals/CostInputModal';
import CreateOfferModal from './modals/CreateOfferModal';
import MilestoneHistory from './modals/MilestoneHistory';
import useSendungsData from '../hooks/useSendungsData';

const SendungsBoard = () => {
  // ✅ CUSTOM HOOK für Datenmanagement
  const {
    sendungen,
    customers,
    partners,
    trafficLights,
    loading,
    error,
    stats,
    loadAllData,
    updateStatus,
    deleteSendung,
    saveCosts,
    createOffer,
    handleOffer,
    clearError
  } = useSendungsData();

  // ✅ UI STATE
  const [activeTab, setActiveTab] = useState('alle');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSendung, setSelectedSendung] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ INITIAL DATA LOAD
  useEffect(() => {
    loadAllData();
  }, []);

  // ✅ FILTERED DATA
  const filteredSendungen = sendungen.filter(sendung => {
    if (!sendung) return false;

    // Tab-Filter
    const tabFilter = () => {
      switch (activeTab) {
        case 'sendungen':
          return sendung.status && !['ANFRAGE', 'ANGEBOT'].includes(sendung.status);
        case 'anfragen':
          return sendung.status === 'ANFRAGE';
        case 'angebote':
          return sendung.status === 'ANGEBOT';
        case 'alle':
        default:
          return true;
      }
    };

    // Such-Filter
    const searchFilter = () => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      
      return (
        (sendung.position && sendung.position.toLowerCase().includes(term)) ||
        (sendung.reference && sendung.reference.toLowerCase().includes(term)) ||
        (sendung.awb_number && sendung.awb_number.toLowerCase().includes(term)) ||
        (sendung.customer_name && sendung.customer_name.toLowerCase().includes(term)) ||
        (sendung.origin_airport && sendung.origin_airport.toLowerCase().includes(term)) ||
        (sendung.destination_airport && sendung.destination_airport.toLowerCase().includes(term))
      );
    };

    return tabFilter() && searchFilter();
  });

  // ✅ TAB COUNTS
  const tabCounts = {
    alle: sendungen.length,
    sendungen: sendungen.filter(s => s.status && !['ANFRAGE', 'ANGEBOT'].includes(s.status)).length,
    anfragen: sendungen.filter(s => s.status === 'ANFRAGE').length,
    angebote: sendungen.filter(s => s.status === 'ANGEBOT').length
  };

  // ===== HANDLER FUNKTIONEN =====

  // ✅ REFRESH HANDLER
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadAllData();
      console.log('✅ Data refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ CREATE SENDUNG HANDLER
  const handleCreateClick = () => {
    setShowCreateForm(true);
  };

  const handleCreateClose = () => {
    setShowCreateForm(false);
    loadAllData(); // Daten neu laden nach Erstellung
  };

  // ✅ EDIT SENDUNG HANDLER
  const handleEditClick = (sendung) => {
    console.log('📝 Edit clicked for sendung:', sendung);
    setSelectedSendung(sendung);
    setShowCreateForm(true);
  };

  // ✅ DELETE SENDUNG HANDLER
  const handleDeleteClick = (sendung) => {
    console.log('🗑️ Delete clicked for sendung:', sendung);
    
    if (!sendung || !sendung.id) {
      alert('❌ Fehler: Keine gültige Sendung ausgewählt');
      return;
    }

    const confirmMessage = `Sendung "${sendung.position || sendung.id}" wirklich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`;
    
    if (window.confirm(confirmMessage)) {
      console.log('🗑️ User confirmed deletion, calling deleteSendung...');
      deleteSendung(sendung.id);
    } else {
      console.log('🗑️ User cancelled deletion');
    }
  };

  // ✅ COST INPUT HANDLER
  const handleCostInputClick = (sendung) => {
    console.log('💰 Cost input clicked for sendung:', sendung);
    setSelectedSendung(sendung);
    setShowCostModal(true);
  };

  const handleCostSave = async (costs) => {
    if (!selectedSendung) return;
    
    try {
      await saveCosts(selectedSendung.id, costs);
      setShowCostModal(false);
      setSelectedSendung(null);
      await loadAllData(); // Daten neu laden
    } catch (error) {
      console.error('❌ Error saving costs:', error);
      alert('❌ Fehler beim Speichern der Kosten');
    }
  };

  // ✅ OFFER HANDLERS
  const handleCreateOffer = (sendung) => {
    console.log('📄 Create offer clicked for sendung:', sendung);
    setSelectedSendung(sendung);
    setShowOfferModal(true);
  };

  const handleOfferSave = async (offerData) => {
    if (!selectedSendung) return;
    
    try {
      await createOffer(selectedSendung.id, offerData);
      setShowOfferModal(false);
      setSelectedSendung(null);
      await loadAllData(); // Daten neu laden
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      alert('❌ Fehler beim Erstellen des Angebots');
    }
  };

  const handleAcceptOffer = async (sendung) => {
    console.log('✅ Accept offer clicked for sendung:', sendung);
    
    const confirmMessage = `Angebot für "${sendung.position}" annehmen?\n\nPreis: €${sendung.offer_price}\nStatus wird zu "Sendung" geändert.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await handleOffer(sendung.id, 'accept');
        await loadAllData(); // Daten neu laden
      } catch (error) {
        console.error('❌ Error accepting offer:', error);
        alert('❌ Fehler beim Annehmen des Angebots');
      }
    }
  };

  const handleRejectOffer = async (sendung) => {
    console.log('❌ Reject offer clicked for sendung:', sendung);
    
    const reason = prompt('Grund für Ablehnung (optional):');
    
    if (reason !== null) { // User didn't cancel
      try {
        await handleOffer(sendung.id, 'reject', reason);
        await loadAllData(); // Daten neu laden
      } catch (error) {
        console.error('❌ Error rejecting offer:', error);
        alert('❌ Fehler beim Ablehnen des Angebots');
      }
    }
  };

  // ✅ STATUS MENU HANDLER (für Traffic Lights)
  const handleStatusMenuClick = (event, sendungId, lightType, data) => {
    event.stopPropagation();
    console.log('🚦 Status menu clicked:', { sendungId, lightType, data });
    
    // Hier könnten weitere Status-Aktionen implementiert werden
    // Aktuell wird das über handleMilestoneClick gehandelt
  };

  // ✅ NEUE MILESTONE-UPDATE FUNKTION
  const updateMilestone = async (sendungId, newMilestone) => {
  try {
    console.log(`🎯 Frontend: Updating milestone ${sendungId} → ${newMilestone}`);
    
    const response = await fetch(`http://localhost:3001/api/shipments/${sendungId}/milestone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone: newMilestone })
    });

    const result = await response.json();
    console.log('📡 Backend response:', result);

    if (response.ok && result.success) {
      console.log('🔄 FORCING COMPLETE RELOAD...');
      
      // ✅ ERZWINGE KOMPLETTEN RELOAD
      await loadAllData();
      
      // ✅ WARTE UND RELOAD NOCHMAL
      setTimeout(async () => {
        console.log('🔄 Second safety reload...');
        await loadAllData();
      }, 1000);
      
      alert(`✅ Milestone gespeichert: ${result.milestone_text}`);
      
    } else {
      alert(`❌ Fehler: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Network error:', error);
    alert(`❌ Netzwerk-Fehler: ${error.message}`);
  }
};

  // ✅ MILESTONE DROPDOWN HANDLER
  const handleMilestoneClick = (event, sendung, ampelType) => {
    event.stopPropagation();
    console.log('🎯 Milestone dropdown clicked:', sendung.position, ampelType);
    
    // Erstelle Dropdown-Optionen basierend auf Ampel-Typ
    const milestoneOptions = {
      'abholung': [
        { value: 1, text: 'Abholung beauftragt' },
        { value: 2, text: 'Sendung abgeholt' },
        { value: 3, text: 'Anlieferung im Lager' }
      ],
      'carrier': [
        { value: 4, text: 'Sendung gebucht' },
        { value: 5, text: 'Zoll erledigt' },
        { value: 6, text: 'Anlieferung bei Airline' },
        { value: 7, text: 'Sendung abgeflogen' },
        { value: 8, text: 'Sendung angekommen' }
      ],
      'zustellung': [
        { value: 9, text: 'Sendung verzollt' },
        { value: 10, text: 'Sendung zugestellt' }
      ]
    };
    
    const options = milestoneOptions[ampelType] || [];
    const currentMilestone = sendung.current_milestone || 1;
    
    // Zeige Auswahl-Dialog
    const selection = prompt(
      `Milestone für ${sendung.position} (${ampelType}) ändern:\n\n` +
      `Aktuell: ${currentMilestone}\n\n` +
      options.map(opt => `${opt.value}: ${opt.text}`).join('\n') +
      '\n\nNeuen Milestone eingeben (Zahl):'
    );
    
    if (selection) {
      const newMilestone = parseInt(selection);
      if (newMilestone >= 1 && newMilestone <= 10) {
        updateMilestone(sendung.id, newMilestone);
      } else {
        alert('❌ Ungültiger Milestone! Bitte eine Zahl zwischen 1 und 10 eingeben.');
      }
    }
  };

  // ✅ HISTORY HANDLER
  const handleShowHistory = (sendung) => {
  console.log('📊 Show history clicked for sendung:', sendung);
  console.log('📊 Setting selectedSendung:', sendung.id);
  console.log('📊 Setting showHistoryModal: true');
  
  setSelectedSendung(sendung);
  setShowHistoryModal(true);
  
  // Debug: State nach Update prüfen
  setTimeout(() => {
    console.log('📊 State after update - showHistoryModal should be true');
  }, 100);
};

  // ✅ GLOBAL WINDOW FUNCTION (für HTML onclick)
  window.updateMilestone = updateMilestone;

  // ✅ ERROR DISPLAY
  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#fee',
        color: '#c53030',
        borderRadius: '8px',
        margin: '20px',
        border: '1px solid #feb2b2'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <AlertCircle style={{ width: '20px', height: '20px' }} />
          <strong>Fehler beim Laden der Daten</strong>
        </div>
        <p style={{ margin: '0 0 12px 0' }}>{error}</p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={clearError}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Fehler schließen
          </button>
          <button
            onClick={handleRefresh}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // ✅ MAIN RENDER
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f7'
    }}>
      {/* HEADER */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 32px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: '#1d1d1f'
            }}>
              📦 Sendungsboard
            </h1>
            <p style={{
              margin: 0,
              color: '#86868b',
              fontSize: '16px'
            }}>
              Verwalte alle deine Sendungen, Anfragen und Angebote
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              style={{
                padding: '12px 16px',
                backgroundColor: isRefreshing ? '#f3f4f6' : '#f8fafc',
                color: isRefreshing ? '#9ca3af' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw style={{ 
                width: '16px', 
                height: '16px',
                transform: isRefreshing ? 'rotate(360deg)' : 'none',
                transition: 'transform 1s ease'
              }} />
              {isRefreshing ? 'Lädt...' : 'Aktualisieren'}
            </button>
            
            <button
              onClick={handleCreateClick}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0071e3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#0071e3'}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              Neue Sendung
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{
        padding: '24px 32px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Package style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  {tabCounts.alle}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Gesamt
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  {tabCounts.anfragen}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Anfragen
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileText style={{ width: '24px', height: '24px', color: '#8b5cf6' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  {tabCounts.angebote}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Angebote
                </div>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle style={{ width: '24px', height: '24px', color: '#10b981' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  {tabCounts.sendungen}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Sendungen
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* TABS */}
          <div style={{
            display: 'flex',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '4px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            {[
              { key: 'alle', label: 'Alle', icon: '📊' },
              { key: 'anfragen', label: 'Anfragen', icon: '❓' },
              { key: 'angebote', label: 'Angebote', icon: '💼' },
              { key: 'sendungen', label: 'Sendungen', icon: '📦' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: activeTab === tab.key ? '#0071e3' : 'transparent',
                  color: activeTab === tab.key ? 'white' : '#374151',
                  border: 'none',
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
                <span>{tab.icon}</span>
                {tab.label}
                <span style={{
                  backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                  color: activeTab === tab.key ? 'white' : '#6b7280',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  minWidth: '20px',
                  textAlign: 'center'
                }}>
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div style={{ position: 'relative', minWidth: '300px' }}>
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
              placeholder="Suchen... (Position, Referenz, AWB, Kunde, Route)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#0071e3'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                  color: '#9ca3af',
                  padding: '4px'
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            )}
          </div>
        </div>

        {/* MAIN TABLE */}
        {loading ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <RefreshCw style={{ 
              width: '32px', 
              height: '32px', 
              color: '#9ca3af',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ 
              marginTop: '16px', 
              color: '#6b7280',
              fontSize: '16px'
            }}>
              Lade Sendungen...
            </p>
          </div>
        ) : (
          <SendungsTable
            sendungen={filteredSendungen}
            customers={customers}
            partners={partners}
            trafficLights={trafficLights}
            viewMode={activeTab}
            searchTerm={searchTerm}
            onEditClick={handleEditClick}
            onDeleteClick={handleDeleteClick}
            onCreateOffer={handleCreateOffer}
            onAcceptOffer={handleAcceptOffer}
            onRejectOffer={handleRejectOffer}
            onCostInputClick={handleCostInputClick}
            onStatusMenuClick={handleStatusMenuClick}
            onMilestoneClick={handleMilestoneClick}
            onShowHistory={handleShowHistory}
          />
        )}
      </div>

      {/* MODALS */}
      {showCreateForm && (
        <NeueSendungSuper
          isOpen={showCreateForm}
          onClose={handleCreateClose}
          editData={selectedSendung}
          customers={customers}
          partners={partners}
        />
      )}

      {showCostModal && selectedSendung && (
        <CostInputModal
          isOpen={showCostModal}
          onClose={() => {
            setShowCostModal(false);
            setSelectedSendung(null);
          }}
          onSave={handleCostSave}
          sendung={selectedSendung}
          partners={partners}
        />
      )}

      {showOfferModal && selectedSendung && (
        <CreateOfferModal
          isOpen={showOfferModal}
          onClose={() => {
            setShowOfferModal(false);
            setSelectedSendung(null);
          }}
          onSave={handleOfferSave}
          sendung={selectedSendung}
        />
      )}

    {/* ✅ MILESTONE HISTORY MODAL - Mit richtiger Komponente */}
      {showHistoryModal && selectedSendung && (
        <MilestoneHistory
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedSendung(null);
          }}
          sendung={selectedSendung}
        />
      )}

</div>
);
};

export default SendungsBoard;