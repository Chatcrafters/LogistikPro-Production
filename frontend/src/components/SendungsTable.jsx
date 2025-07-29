// C:\Users\Sergio Caro\LogistikApp\frontend\src\components\SendungsTable.jsx
// ✅ VOLLSTÄNDIGE VERSION MIT ALLEN FEATURES - TEIL 1

import React, { useState, useEffect } from 'react';
import {
  Package, User, MapPin, Edit, Trash2, Euro, Circle, Clock, Calendar, 
  FileText, Plane, MessageSquare, AlertCircle, Eye, EyeOff
} from 'lucide-react';

// ✅ KORREKTE IMPORTS VON EXISTIERENDEN DATEIEN
import { formatDate, formatDateTime, formatTime, getStatusColor, getTrafficLightColor } from '../utils/formatters';

const SendungsTable = ({
  sendungen,
  customers,
  partners,
  trafficLights,        // ← VERWENDET BEREITS BERECHNETE TRAFFIC LIGHTS
  viewMode,
  searchTerm,
  onEditClick,
  onDeleteClick,
  onCreateOffer,
  onAcceptOffer,
  onRejectOffer,
  onCostInputClick,
  onStatusMenuClick,
  onMilestoneClick
}) => {
  // ✅ NEUE SPALTEN-STRUKTUR
  const [visibleColumns, setVisibleColumns] = useState({
    abholung: true,        // Datum + Zeit + Ampel
    kunde: true,           // Kunde + Referenz
    colliGewicht: true,    // Gewicht + Colli + Ampel (bei Bedarf)
    route: true,           // Von → Nach + Ampel (Transit)
    awbCarrier: true,      // AWB + Carrier + Tracking
    flugETA: true,         // ETA + ETD + Cut-off
    zustellung: true,      // Zustelldatum + Empfänger + Ampel
    laufzeit: true,        // Berechnete Laufzeit
    aktionen: true         // Edit/Delete/etc.
  });

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // ✅ VEREINFACHTE TRAFFIC LIGHT STATUS FUNKTION
  const getTrafficLightStatus = (sendung, type) => {
    // Verwende BEREITS BERECHNETE Traffic Lights aus useSendungsData
    if (trafficLights && trafficLights[sendung.id]) {
      const status = trafficLights[sendung.id][type];
      console.log(`🚦 Using calculated traffic light for ${sendung.position} - ${type}:`, status);
      return status;
    }
    
    // Fallback wenn keine Traffic Light Daten vorhanden
    console.warn(`⚠️ No traffic light data for sendung ${sendung.position}, type ${type}`);
    return 'grey';
  };

  // ✅ VEREINFACHTE TRAFFIC LIGHT COMPONENT
  const TrafficLight = ({ sendung, type, onTrafficLightClick }) => {
    // Verwende nur bereits berechnete Werte - KEINE lokale Berechnung mehr!
    const currentStatus = getTrafficLightStatus(sendung, type);
    const color = getTrafficLightColor(currentStatus);
    
    console.log(`🚦 TrafficLight KRITIKALITÄTS-BASIERT: ${sendung.position} - ${type} = ${currentStatus}`);
    
    const getTooltipText = () => {
      const labels = {
        'abholung': 'Abholung',
        'carrier': 'Transport/Carrier', 
        'zustellung': 'Zustellung'
      };
      
      const statusTexts = {
        'grey': 'Nicht bereit/geplant',
        'yellow': 'Kritisch - 2h vor Cut-off!',
        'green': 'Abgeschlossen/Rechtzeitig',
        'red': 'Problem - Cut-off verpasst!'
      };
      
      // Zusätzliche Info basierend auf Flug-Daten
      let dateInfo = '';
      if (type === 'abholung' && sendung.cutoff_time) {
        dateInfo = `\n⏰ Cut-off: ${formatTime(sendung.cutoff_time)}`;
      } else if (type === 'carrier' && sendung.etd) {
        dateInfo = `\n✈️ ETD: ${formatDateTime(sendung.etd)}`;
      } else if (type === 'zustellung' && sendung.eta) {
        dateInfo = `\n🛬 ETA: ${formatDateTime(sendung.eta)}`;
      }
      
      return `${labels[type]}: ${statusTexts[currentStatus]}${dateInfo}\n\nKlicken zum Ändern`;
    };

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          console.log('🚦 Traffic Light clicked - KRITIKALITÄTS-BASIERT:', { 
            sendung: sendung.id, 
            type, 
            status: currentStatus
          });
          
          if (onTrafficLightClick) {
            onTrafficLightClick(e, sendung.id, type, {
              currentStatus: currentStatus,
              sendung: sendung
            });
          } else {
            console.warn('⚠️ onTrafficLightClick prop missing');
          }
        }}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: color,
          border: '2px solid white',
          boxShadow: `0 0 8px ${color}40`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          margin: '0 auto',
          position: 'relative'
        }}
        title={getTooltipText()}
        onMouseOver={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = `0 0 12px ${color}60`;
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = `0 0 8px ${color}40`;
        }}
      >
        {/* Status Indicator */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          fontSize: '8px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '1px 4px',
          borderRadius: '3px',
          fontWeight: 'bold',
          minWidth: '16px',
          textAlign: 'center'
        }}>
          {currentStatus === 'green' ? '✓' : 
           currentStatus === 'yellow' ? '!' : 
           currentStatus === 'red' ? '⚠' : '○'}
        </div>
      </div>
    );
  };

  const getCostStatus = (shipment) => {
    if (!shipment) {
      return { text: '❌ Fehler', className: 'cost-error', total: 0, breakdown: { pickup: 0, main: 0, delivery: 0 } };
    }
    
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
    
    const breakdown = {
      pickup: pickupValue,
      main: mainValue,
      delivery: deliveryValue
    };
    
    if (totalCosts === 0) {
      return { 
        text: '⏳ Ausstehend', 
        className: 'cost-pending',
        total: 0,
        breakdown
      };
    } else if (totalCosts === 3) {
      return { 
        text: '✅ Komplett', 
        className: 'cost-complete',
        total: totalValue,
        breakdown
      };
    } else {
      return { 
        text: `📊 ${totalCosts}/3 erfasst`, 
        className: 'cost-partial',
        total: totalValue,
        breakdown
      };
    }
  };

  // ✅ VEREINFACHTE STATUS-TEXT FUNKTIONEN
  const getAmpelStatusText = (sendung, type) => {
    const status = getTrafficLightStatus(sendung, type);
    
    const statusTexts = {
      'abholung': {
        'green': 'Abgeholt',
        'yellow': 'Cut-off bald!',
        'red': 'Cut-off verpasst!',
        'grey': 'Nicht geplant'
      },
      'carrier': {
        'green': 'In Transit',
        'yellow': 'Bereit/Bald',
        'red': 'Verspätet',
        'grey': 'Nicht bereit'
      },
      'zustellung': {
        'green': 'Zugestellt',
        'yellow': 'ETA heute',
        'red': 'ETA überschritten',
        'grey': 'Nicht geplant'
      }
    };
    
    return statusTexts[type]?.[status] || 'Unbekannt';
  };

  const getAmpelProgress = (sendung, type) => {
    // Vereinfacht - basiert nur auf Status
    const status = getTrafficLightStatus(sendung, type);
    
    if (status === 'green') return '✓';
    if (status === 'yellow') return '!';
    if (status === 'red') return '⚠';
    return '○';
  };

  // NEUE HELPER-FUNKTIONEN FÜR DIE VERBESSERTE STRUKTUR

  // 1. ABHOLUNG-INFO (Datum + Zeit + Status)
  const getAbholungInfo = (sendung) => {
    // Fallback-Logic wie gewünscht
    let date, type, status;
    
    if (sendung.pickup_date) {
      date = sendung.pickup_date;
      type = 'Abgeholt';
      status = 'completed';
    } else if (sendung.estimated_pickup_date) {
      date = sendung.estimated_pickup_date;
      type = 'Geplant';
      status = 'planned';
    } else if (sendung.created_at) {
      date = sendung.created_at;
      type = 'Erfasst';
      status = 'created';
    } else {
      return { date: '-', time: '-', type: 'Kein Datum', status: 'none', ampel: 'grey' };
    }

    // Ampel-Status basierend auf pickup_confirmed oder Status
    let ampel = 'grey';
    if (sendung.pickup_confirmed || status === 'completed') {
      ampel = 'green';
    } else if (status === 'planned') {
      ampel = 'yellow';
    }

    return {
      date: formatDate(date),
      time: formatTime(date),
      type: type,
      status: status,
      ampel: ampel,
      raw: date
    };
  };

  // 2. AWB/CARRIER-INFO
  const getAWBCarrierInfo = (sendung) => {
    const awb = sendung.awb_number || sendung.tracking_number || '-';
    const carrier = sendung.carrier_name || getPartnerName(sendung.main_partner_id) || 'N/A';
    
    // Tracking-URL generieren (falls AWB vorhanden)
    const hasTracking = awb !== '-' && awb.length > 5;
    const trackingUrl = hasTracking ? `https://www.lufthansa-cargo.com/tracking?awb=${awb}` : null;

    return {
      awb: awb,
      carrier: carrier,
      hasTracking: hasTracking,
      trackingUrl: trackingUrl,
      displayText: awb !== '-' ? awb : 'Kein AWB'
    };
  };

  // 3. ZUSTELLUNG-INFO (mit Empfänger)
  const getZustellungInfo = (sendung) => {
    let date, type, status, ampel = 'grey';
    
    if (sendung.actual_delivery_date || sendung.delivery_date) {
      date = sendung.actual_delivery_date || sendung.delivery_date;
      type = 'Zugestellt';
      status = 'delivered';
      ampel = 'green';
    } else if (sendung.estimated_delivery_date) {
      date = sendung.estimated_delivery_date;
      type = 'Geplant';
      status = 'planned';
      ampel = 'yellow';
    } else {
      return { 
        date: '-', 
        type: 'Offen', 
        empfaenger: sendung.recipient_city || 'Unbekannt',
        ampel: 'grey' 
      };
    }

    return {
      date: formatDate(date),
      time: formatTime(date),
      type: type,
      status: status,
      empfaenger: sendung.recipient_city || sendung.empfaenger?.ort || 'Unbekannt',
      ampel: ampel,
      raw: date
    };
  };

  // 4. LAUFZEIT BERECHNEN
  const getLaufzeit = (sendung) => {
    const abholung = getAbholungInfo(sendung);
    const zustellung = getZustellungInfo(sendung);
    
    if (!abholung.raw || !zustellung.raw) {
      // Fallback: Geplante Laufzeit aus Deadline
      if (sendung.deadline && abholung.raw) {
        const deadline = new Date(sendung.deadline);
        const pickup = new Date(abholung.raw);
        const diffDays = Math.ceil((deadline - pickup) / (1000 * 60 * 60 * 24));
        return {
          tage: diffDays > 0 ? diffDays : '-',
          type: 'Geplant',
          color: '#f59e0b'
        };
      }
      return { tage: '-', type: 'Offen', color: '#9ca3af' };
    }

    const pickup = new Date(abholung.raw);
    const delivery = new Date(zustellung.raw);
    const diffDays = Math.ceil((delivery - pickup) / (1000 * 60 * 60 * 24));
    
    return {
      tage: diffDays,
      type: zustellung.status === 'delivered' ? 'Tatsächlich' : 'Geplant',
      color: zustellung.status === 'delivered' ? '#10b981' : '#3b82f6'
    };
  };

  // 5. MINI-AMPEL COMPONENT
  const MiniAmpel = ({ status, size = 12 }) => {
    const colors = {
      'green': '#10b981',
      'yellow': '#f59e0b', 
      'red': '#ef4444',
      'grey': '#9ca3af'
    };

    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: colors[status] || colors.grey,
        border: '1px solid white',
        boxShadow: `0 0 4px ${colors[status] || colors.grey}40`,
        display: 'inline-block'
      }} />
    );
  };

  // SICHERE Customer-Name Funktion
  const getCustomerName = (customerId) => {
    if (!customerId || !customers) return 'Unbekannt';
    
    // Prüfe ob customers ein Array ist
    if (Array.isArray(customers)) {
      const customer = customers.find(c => c && c.id === customerId);
      return customer?.name || 'Unbekannt';
    }
    
    // Prüfe ob customers ein Object ist
    if (typeof customers === 'object') {
      const customer = customers[customerId];
      if (customer && typeof customer === 'object') {
        return customer.name || 'Unbekannt';
      }
      if (typeof customer === 'string') {
        return customer;
      }
    }
  };
    
  // SICHERE Partner-Name Funktion
  const getPartnerName = (partnerId) => {
    if (!partnerId || !partners) return 'Unbekannt';
    
    if (Array.isArray(partners)) {
      const partner = partners.find(p => p && p.id === partnerId);
      return partner?.name || 'Unbekannt';
    }
    
    if (partners && typeof partners === 'object') {
      const partner = partners[partnerId];
      if (partner && typeof partner === 'object') {
        return partner.name || 'Unbekannt';
      }
      if (typeof partner === 'string') {
        return partner;
      }
    }
    
    return 'Unbekannt';
  };

  // Empty State Component
  const EmptyState = () => (
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
         viewMode === 'anfragen' ? 'Erstellen Sie eine neue Sendung als Anfrage.' : 
         viewMode === 'angebote' ? 'Erstellen Sie Angebote aus Anfragen.' : 'Erstellen Sie Ihre erste Sendung.'}
      </p>
    </div>
  );

  // Table Row Component
  const TableRow = ({ sendung, index }) => {
    const statusColors = getStatusColor(sendung.status);
    const costStatus = getCostStatus(sendung);
    const isEvenRow = index % 2 === 0;
    const customerName = getCustomerName(sendung.customer_id);
    
    // ✅ NEUE HELPER-DATEN FÜR ERWEITERTE SPALTEN
    const abholungInfo = getAbholungInfo(sendung);
    const awbCarrierInfo = getAWBCarrierInfo(sendung);
    const zustellungInfo = getZustellungInfo(sendung);
    const laufzeitInfo = getLaufzeit(sendung);

    return (
      <tr
        key={sendung.id}
        style={{
          backgroundColor: isEvenRow ? '#fafafa' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          borderBottom: '1px solid #f1f5f9'
        }}
        onClick={() => onEditClick && onEditClick(sendung)}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f9ff';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = isEvenRow ? '#fafafa' : 'white';
        }}
      >
        {/* ✅ NEUE SPALTE: ABHOLUNG (Datum + Zeit + ECHTE Traffic Light Ampel) */}
        {visibleColumns.abholung && (
          <td style={{ padding: '16px 12px', minWidth: '180px', verticalAlign: 'top' }}>
            <div>
              {/* Oberer Bereich mit Ampel und Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TrafficLight 
                  sendung={sendung} 
                  type="abholung" 
                  onTrafficLightClick={onStatusMenuClick}
                />
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '2px'
                  }}>
                    {abholungInfo.date}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: getTrafficLightStatus(sendung, 'abholung') === 'green' ? '#059669' : 
                           getTrafficLightStatus(sendung, 'abholung') === 'yellow' ? '#d97706' : '#6b7280',
                    fontWeight: '500'
                  }}>
                    {getAmpelStatusText(sendung, 'abholung')}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    fontWeight: '500'
                  }}>
                    {getAmpelProgress(sendung, 'abholung')} - {abholungInfo.type}
                  </div>
                </div>
              </div>
              
              {/* Aktuelles Milestone für Ampel 1 (Vorlauf) - DROPDOWN */}
              <div style={{ 
                marginTop: '8px', 
                paddingLeft: '32px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('🎯 Milestone Dropdown - Ampel 1 (Abholung), Current:', sendung.current_milestone);
                onMilestoneClick && onMilestoneClick(e, sendung, 'abholung');
              }}
              >
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: sendung.current_milestone >= 1 && sendung.current_milestone <= 3 ? '#dcfce7' : '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: sendung.current_milestone >= 1 && sendung.current_milestone <= 3 ? '#166534' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = sendung.current_milestone >= 1 && sendung.current_milestone <= 3 ? '#dcfce7' : '#f3f4f6';
                }}
                >
                  <span>{sendung.current_milestone >= 1 ? '✓' : '○'}</span>
                  <span>
                    {sendung.current_milestone === 3 ? 'Anlieferung im Lager' :
                     sendung.current_milestone === 2 ? 'Sendung abgeholt' :
                     sendung.current_milestone >= 1 ? 'Abholung beauftragt' :
                     'Abholung beauftragt'}
                  </span>
                </div>
              </div>
            </div>
          </td>
        )}

        {/* ✅ ERWEITERTE SPALTE: KUNDE (Kunde + Referenz) */}
        {visibleColumns.kunde && (
          <td style={{ padding: '16px 12px' }}>
            <div style={{ 
              fontWeight: '600', 
              fontSize: '14px',
              color: '#1f2937',
              marginBottom: '2px'
            }}>
              {customerName}
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
                fontWeight: '500'
              }}>
                {sendung.position}
              </div>
            )}
          </td>
        )}

        {/* ✅ ERWEITERTE SPALTE: COLLI/GEWICHT (mit optionaler Ampel) */}
        {visibleColumns.colliGewicht && (
          <td style={{ padding: '16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '14px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Package style={{ width: '14px', height: '14px', color: '#6b7280' }} />
                  {parseFloat(sendung.total_weight || sendung.weight || 0).toFixed(1)} kg
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginTop: '2px'
                }}>
                  📦 {sendung.total_pieces || sendung.pieces || 0} Colli
                </div>
              </div>
              {/* Optionale Ampel für kritisches Gewicht */}
              {parseFloat(sendung.total_weight || sendung.weight || 0) > 500 && (
                <MiniAmpel status="yellow" size={12} />
              )}
            </div>
          </td>
        )}

       {/* ✅ ERWEITERTE SPALTE: ROUTE (Von → Nach + ECHTE Traffic Light Ampel für Transit) */}
        {visibleColumns.route && (
          <td style={{ padding: '16px 12px', minWidth: '220px', verticalAlign: 'top' }}>
            <div>
              {/* Oberer Bereich mit Route und Ampel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1f2937',
                    marginBottom: '2px'
                  }}>
                    {sendung.origin_airport || sendung.from_airport || 'N/A'} → {sendung.destination_airport || sendung.to_airport || 'N/A'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280'
                  }}>
                    {sendung.sender_city || sendung.from_city || 'Unbekannt'} → {sendung.recipient_city || sendung.to_city || 'Unbekannt'}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    fontWeight: '500'
                  }}>
                    {getAmpelProgress(sendung, 'carrier')} - {getAmpelStatusText(sendung, 'carrier')}
                  </div>
                </div>
                {/* ECHTE Traffic Light für Carrier/Transport */}
                <TrafficLight 
                  sendung={sendung} 
                  type="carrier" 
                  onTrafficLightClick={onStatusMenuClick}
                />
              </div>
              
              {/* Aktuelles Milestone für Ampel 2 (Hauptlauf) - DROPDOWN */}
              <div style={{ 
                marginTop: '8px', 
                paddingLeft: '8px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('🎯 Milestone Dropdown - Ampel 2 (Carrier), Current:', sendung.current_milestone);
                onMilestoneClick && onMilestoneClick(e, sendung, 'carrier');
              }}
              >
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: sendung.current_milestone >= 4 && sendung.current_milestone <= 8 ? '#dcfce7' : '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: sendung.current_milestone >= 4 && sendung.current_milestone <= 8 ? '#166534' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = sendung.current_milestone >= 4 && sendung.current_milestone <= 8 ? '#dcfce7' : '#f3f4f6';
                }}
                >
                  <span>{sendung.current_milestone >= 4 ? '✓' : '○'}</span>
                  <span>
                    {sendung.current_milestone === 8 ? 'Sendung angekommen' :
                     sendung.current_milestone === 7 ? 'Sendung abgeflogen' :
                     sendung.current_milestone === 6 ? 'Anlieferung bei Airline' :
                     sendung.current_milestone === 5 ? 'Zoll erledigt' :
                     sendung.current_milestone >= 4 ? 'Sendung gebucht' :
                     'Sendung gebucht'}
                  </span>
                </div>
              </div>
            </div>
          </td>
        )}

        {/* ✅ NEUE SPALTE: AWB/CARRIER (AWB + Carrier + Tracking) */}
        {visibleColumns.awbCarrier && (
          <td style={{ padding: '16px 12px' }}>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '2px',
                fontFamily: 'monospace'
              }}>
                {awbCarrierInfo.hasTracking ? (
                  <a 
                    href={awbCarrierInfo.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0071e3',
                      textDecoration: 'none'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    📋 {awbCarrierInfo.awb}
                  </a>
                ) : (
                  <span style={{ color: '#6b7280' }}>
                    📋 {awbCarrierInfo.displayText}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ✈️ {awbCarrierInfo.carrier}
              </div>
            </div>
          </td>
        )}

        {/* ✅ NEUE SPALTE: FLUG ETA (ETA + ETD + Cut-off) */}
        {visibleColumns.flugETA && (
          <td style={{ padding: '16px 12px', minWidth: '120px' }}>
            <div style={{ fontSize: '12px' }}>
              {sendung.eta && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '2px',
                  color: '#059669'
                }}>
                  🛬 <strong>ETA:</strong> {formatDateTime(sendung.eta)}
                </div>
              )}
              {sendung.etd && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '2px',
                  color: '#0ea5e9'
                }}>
                  🛫 <strong>ETD:</strong> {formatDateTime(sendung.etd)}
                </div>
              )}
              {sendung.cutoff_time && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#dc2626',
                  fontWeight: '600'
                }}>
                  ⏰ <strong>Cut-off:</strong> {formatTime(sendung.cutoff_time)}
                </div>
              )}
              {!sendung.eta && !sendung.etd && !sendung.cutoff_time && (
                <div style={{
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock style={{ width: '14px', height: '14px' }} />
                  Keine Zeiten
                </div>
              )}
            </div>
          </td>
        )}

        {/* ✅ NEUE SPALTE: ZUSTELLUNG (Zustelldatum + Empfänger + ECHTE Traffic Light Ampel) */}
        {visibleColumns.zustellung && (
          <td style={{ padding: '16px 12px', minWidth: '180px', verticalAlign: 'top' }}>
            <div>
              {/* Oberer Bereich mit Ampel und Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TrafficLight 
                  sendung={sendung} 
                  type="zustellung" 
                  onTrafficLightClick={onStatusMenuClick}
                />
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '2px'
                  }}>
                    {zustellungInfo.date}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: getTrafficLightStatus(sendung, 'zustellung') === 'green' ? '#059669' : 
                           getTrafficLightStatus(sendung, 'zustellung') === 'yellow' ? '#d97706' : '#6b7280',
                    fontWeight: '500'
                  }}>
                    {getAmpelStatusText(sendung, 'zustellung')}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#9ca3af'
                  }}>
                    {getAmpelProgress(sendung, 'zustellung')} - 📍 {zustellungInfo.empfaenger}
                  </div>
                </div>
              </div>
              
              {/* Aktuelles Milestone für Ampel 3 (Nachlauf) - DROPDOWN */}
              <div style={{ 
                marginTop: '8px', 
                paddingLeft: '32px',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('🎯 Milestone Dropdown - Ampel 3 (Zustellung), Current:', sendung.current_milestone);
                onMilestoneClick && onMilestoneClick(e, sendung, 'zustellung');
              }}
              >
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: sendung.current_milestone >= 9 ? '#dcfce7' : '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: sendung.current_milestone >= 9 ? '#166534' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#9ca3af';
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = sendung.current_milestone >= 9 ? '#dcfce7' : '#f3f4f6';
                }}
                >
                  <span>{sendung.current_milestone >= 9 ? '✓' : '○'}</span>
                  <span>
                    {sendung.current_milestone === 10 ? 'Sendung zugestellt' :
                     sendung.current_milestone >= 9 ? 'Sendung verzollt' :
                     'Sendung verzollt'}
                  </span>
                </div>
              </div>
            </div>
          </td>
        )}

        {/* ✅ NEUE SPALTE: LAUFZEIT (Berechnete Laufzeit) */}
        {visibleColumns.laufzeit && (
          <td style={{ padding: '16px 12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: laufzeitInfo.color,
                marginBottom: '2px'
              }}>
                {laufzeitInfo.tage === '-' ? '-' : `${laufzeitInfo.tage}d`}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {laufzeitInfo.type}
              </div>
            </div>
          </td>
        )}

        {/* ✅ AKTIONEN (Kompakt aber vollständig) */}
        {visibleColumns.aktionen && (
          <td style={{ padding: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              display: 'flex', 
              gap: '4px',
              flexWrap: 'wrap'
            }}>
              {/* Standard Aktionen */}
              <button 
                title="Details anzeigen/bearbeiten"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick && onEditClick(sendung);
                }}
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: '#0071e3',
                  border: '1px solid #0071e3',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '1'
                }}
              >
                ✏️
              </button>
              
              <button
                title="Sendung löschen"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('🗑️ DELETE BUTTON clicked with sendung:', sendung);
                  onDeleteClick && onDeleteClick(sendung);
                }}
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: '1'
                }}
              >
                🗑️
              </button>
              
              {/* KOSTEN-STATUS - NUR BEI ANFRAGEN (wieder hinzugefügt!) */}
              {viewMode === 'anfragen' && (
                <button 
                  title={`Kosten erfassen (${costStatus.text})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCostInputClick && onCostInputClick(sendung);
                  }}
                  style={{
                    padding: '6px',
                    backgroundColor: costStatus.className === 'cost-complete' ? '#dcfce7' : 'transparent',
                    color: costStatus.className === 'cost-complete' ? '#166534' : '#10b981',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  💰
                </button>
              )}

              {/* ANGEBOT ERSTELLEN - NUR BEI KOMPLETTEN KOSTEN (wieder hinzugefügt!) */}
              {sendung.status === 'ANFRAGE' && costStatus.className === 'cost-complete' && (
                <button 
                  title="Angebot erstellen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateOffer && onCreateOffer(sendung);
                  }}
                  style={{
                    padding: '6px',
                    backgroundColor: 'transparent',
                    color: '#f59e0b',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  📄
                </button>
              )}
              
              {/* Angebot-spezifische Aktionen */}
              {sendung.status === 'ANGEBOT' && (
                <>
                  <button 
                    title={`Angebot annehmen (€${sendung.offer_price || 'N/A'})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptOffer && onAcceptOffer(sendung);
                    }}
                    style={{
                      padding: '6px',
                      backgroundColor: 'transparent',
                      color: '#10b981',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: '1'
                    }}
                  >
                    ✅
                  </button>
                  
                  <button 
                    title="Angebot ablehnen"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectOffer && onRejectOffer(sendung);
                    }}
                    style={{
                      padding: '6px',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: '1'
                    }}
                  >
                    ❌
                  </button>
                </>
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
                💰 €{parseFloat(sendung.offer_price).toFixed(2)}
              </div>
            )}
          </td>
        )}
      </tr>
    );
  };

  // SICHERE Array-Behandlung für sendungen
  const safeSendungen = Array.isArray(sendungen) ? sendungen : [];

  // Main Render
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      {/* ✅ NEUE SPALTEN-TOGGLE HEADER */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          🔧 Spalten-Anzeige
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          {/* ✅ NEUE TOGGLE-BUTTONS ARRAY */}
          {[
            { key: 'abholung', label: 'Abholung', icon: '📅' },
            { key: 'kunde', label: 'Kunde', icon: '👤' },
            { key: 'colliGewicht', label: 'Colli/Gewicht', icon: '📦' },
            { key: 'route', label: 'Von → Nach', icon: '🗺️' },
            { key: 'awbCarrier', label: 'AWB/Carrier', icon: '✈️' },
            { key: 'flugETA', label: 'Flug ETA', icon: '⏰' },
            { key: 'zustellung', label: 'Zustellung', icon: '🚚' },
            { key: 'laufzeit', label: 'Laufzeit', icon: '⏱️' },
            { key: 'aktionen', label: 'Aktionen', icon: '⚙️' }
          ].map(column => (
            <button
              key={column.key}
              onClick={() => toggleColumn(column.key)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '500',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: visibleColumns[column.key] ? '#3b82f6' : '#e5e7eb',
                color: visibleColumns[column.key] ? 'white' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={`${column.label} ${visibleColumns[column.key] ? 'ausblenden' : 'einblenden'}`}
            >
              <span>{column.icon}</span>
              {column.label}
              {visibleColumns[column.key] ? (
                <Eye style={{ width: '12px', height: '12px' }} />
              ) : (
                <EyeOff style={{ width: '12px', height: '12px' }} />
              )}
            </button>
          ))}
        </div>
      </div>

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
            ({safeSendungen.length} {safeSendungen.length === 1 ? 'Eintrag' : 'Einträge'})
          </span>
        </div>
        
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

      {/* Main Table */}
      {safeSendungen.length === 0 ? (
        <EmptyState />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ 
            backgroundColor: '#f8fafc', 
            borderBottom: '2px solid #e2e8f0'
          }}>
            <tr>
              {/* ✅ NEUE TABLE HEADERS */}
              {visibleColumns.abholung && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📅 Abholung
                  </div>
                </th>
              )}
              
              {visibleColumns.kunde && (
                <th style={{ 
                  padding: '16px 12px', 
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
              )}

              {visibleColumns.colliGewicht && (
                <th style={{ 
                  padding: '16px 12px', 
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
              )}

              {visibleColumns.route && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px' }} />
                    Von → Nach
                  </div>
                </th>
              )}

              {visibleColumns.awbCarrier && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ✈️ AWB/Carrier
                  </div>
                </th>
              )}

              {visibleColumns.flugETA && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plane style={{ width: '14px', height: '14px' }} />
                    Flug ETA
                  </div>
                </th>
              )}

              {visibleColumns.zustellung && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚚 Zustellung
                  </div>
                </th>
              )}

              {visibleColumns.laufzeit && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⏱️ Laufzeit
                  </div>
                </th>
              )}

              {visibleColumns.aktionen && (
                <th style={{ 
                  padding: '16px 12px', 
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
              )}
            </tr>
          </thead>
          <tbody>
            {safeSendungen.map((sendung, index) => (
              <TableRow key={sendung.id || index} sendung={sendung} index={index} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SendungsTable;
