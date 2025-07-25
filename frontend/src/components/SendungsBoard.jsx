// Ersetze SendungsBoard.jsx mit der VOLLVERSION:
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Download, Filter, RotateCcw, Package, FileQuestion, FileText, BarChart3 } from 'lucide-react';

// Import der Module
import useSendungsData from '../hooks/useSendungsData';
import SendungsTable from './SendungsTable';
import SendungsModals from './modals/SendungsModals.jsx';
import { processMagicInput, handleSaveCosts } from '../utils/costParser';
import { formatDate, formatDateTime, getStatusColor } from '../utils/formatters';

const SendungsBoard = ({ supabase, user, onNavigate }) => {
  // Hook für Datenmanagement
  const {
    sendungen,
    customers,
    partners,
    loading,
    error,
    stats,
    loadAllData,
    updateStatus,
    deleteSendung,
    saveSendung,
    saveCosts,
    createOffer,
    handleOffer,
    clearError
  } = useSendungsData();

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

  // Refs
  const popupRef = useRef(null);

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
    };

    if (showStatusPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusPopup]);

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

  // Event Handlers
  const handleStatusMenuClick = (event, sendungId, type) => {
    event.stopPropagation();
    
    const rect = event.target.getBoundingClientRect();
    const sendung = sendungen.find(s => s.id === sendungId);
    
    if (!sendung) return;

    setStatusPopupData({
      sendungId,
      sendung,
      type,
      currentStatus: 'grey' // Default
    });
    
    setPopupPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    
    setShowStatusPopup(true);
  };

  const handleStatusUpdate = async (sendungId, type, newStatus) => {
    try {
      await updateStatus(sendungId, type, newStatus);
      console.log(`✅ Status updated: ${sendungId} ${type} → ${newStatus}`);
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Fehler beim Status-Update: ' + error.message);
    }
  };

  const handleEditClick = (sendung) => {
    setSelectedSendung(sendung);
  };

  const handleDeleteClick = async (sendungId) => {
    const sendung = sendungen.find(s => s.id === sendungId);
    if (!sendung) return;

    const confirmText = `Sendung "${sendung.position || sendung.id}" wirklich löschen?`;
    
    if (confirm(confirmText)) {
      try {
        await deleteSendung(sendungId);
        alert('✅ Sendung erfolgreich gelöscht');
      } catch (error) {
        alert('❌ Fehler beim Löschen: ' + error.message);
      }
    }
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
        Module: ✅ useSendungsData, ✅ SendungsTable, ✅ costParser, ❓ SendungsModals
      </div>

      {/* SendungsTable Component */}
      <SendungsTable
        sendungen={filteredSendungen}
        customers={customers}
        partners={partners}
        viewMode={viewMode}
        searchTerm={searchTerm}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onCreateOffer={handleCreateOffer}
        onAcceptOffer={handleAcceptOffer}
        onRejectOffer={handleRejectOffer}
        onCostInputClick={handleCostInputClick}
      />

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