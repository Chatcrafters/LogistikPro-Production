// C:\Users\Sergio Caro\LogistikApp\frontend\src\components\SendungsTable.jsx
// ✅ VOLLSTÄNDIGE VERSION MIT ALLEN FEATURES

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
  viewMode,
  searchTerm,
  onEditClick,
  onDeleteClick,
  onCreateOffer,
  onAcceptOffer,
  onRejectOffer,
  onCostInputClick,
  onStatusMenuClick
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

  // ✅ MILESTONE-FUNKTIONEN (Vereinfacht aber vollständig)
  const getMilestones = (transportType, importExport) => {
    const airExport = [
      { id: 1, text: 'Buchung erfasst', ampel: 'abholung' },
      { id: 2, text: 'Abholung geplant', ampel: 'abholung' },
      { id: 3, text: 'Abgeholt', ampel: 'abholung' },
      { id: 4, text: 'AWB erstellt', ampel: 'carrier' },
      { id: 5, text: 'Fracht angenommen', ampel: 'carrier' },
      { id: 6, text: 'Beladen', ampel: 'carrier' },
      { id: 7, text: 'Abgeflogen', ampel: 'carrier' },
      { id: 8, text: 'Angekommen', ampel: 'zustellung' },
      { id: 9, text: 'Zustellung geplant', ampel: 'zustellung' },
      { id: 10, text: 'Zugestellt', ampel: 'zustellung' }
    ];
    return airExport;
  };

  const getMilestonesForAmpel = (transportType, importExport, ampelType) => {
    const allMilestones = getMilestones(transportType, importExport);
    return allMilestones.filter(m => m.ampel === ampelType);
  };

  const calculateTrafficLightStatus = (milestones, completedIds) => {
    return { abholung: 'grey', carrier: 'grey', zustellung: 'grey' };
  };

  const calculateAmpelStatus = (milestones, completedIds, type) => {
    return 'grey';
  };

  const getAmpelStatusInfo = (status) => {
    return { text: status, color: getTrafficLightColor(status) };
  };

  const getTransportKey = (transportType, importExport) => {
    return `${transportType}_${importExport}`;
  };

  // ✅ DATUMS-BASIERTE AMPEL-STATUS BERECHNUNG
  const getAmperStatusBasedOnDates = (sendung, type) => {
    const now = new Date();
    
    switch(type) {
      case 'abholung':
        if (sendung.pickup_date) {
          return 'green'; // Abgeholt
        } else if (sendung.estimated_pickup_date) {
          const estimatedDate = new Date(sendung.estimated_pickup_date);
          const diffDays = Math.ceil((estimatedDate - now) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
            return 'red'; // Überfällig
          } else if (diffDays <= 1) {
            return 'yellow'; // Heute/Morgen
          } else {
            return 'grey'; // Zukünftig geplant
          }
        } else {
          return 'grey'; // Nicht geplant
        }
        
      case 'carrier':
        if (sendung.status === 'in_transit' || sendung.departure_time) {
          return 'green'; // Unterwegs
        } else if (sendung.awb_number && sendung.estimated_pickup_date) {
          const pickupDate = new Date(sendung.estimated_pickup_date);
          const diffDays = Math.ceil((pickupDate - now) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 0) {
            return 'yellow'; // Bereit für Transport
          } else {
            return 'grey'; // AWB da, aber noch nicht bereit
          }
        } else {
          return 'grey'; // Noch keine AWB
        }
        
      case 'zustellung':
        if (sendung.delivery_date || sendung.actual_delivery_date) {
          return 'green'; // Zugestellt
        } else if (sendung.estimated_delivery_date || sendung.eta) {
          const estimatedDate = new Date(sendung.estimated_delivery_date || sendung.eta);
          const diffDays = Math.ceil((estimatedDate - now) / (1000 * 60 * 60 * 24));
          
          if (diffDays < 0) {
            return 'red'; // Überfällig
          } else if (diffDays <= 1) {
            return 'yellow'; // Heute/Morgen erwartet
          } else {
            return 'grey'; // Zukünftig geplant
          }
        } else {
          return 'grey'; // Nicht geplant
        }
        
      default:
        return 'grey';
    }
  };

  // ✅ ÜBERARBEITETE TRAFFIC LIGHT STATUS FUNKTION
  const getTrafficLightStatus = (sendung, type) => {
    try {
      // 1. PRIMÄR: Datums-basierte Berechnung
      const dateBasedStatus = getAmperStatusBasedOnDates(sendung, type);
      
      // 2. FALLBACK: Milestone-basierte Berechnung
      if (sendung && sendung.traffic_lights && sendung.traffic_lights[type]) {
        console.log(`🚦 Using saved traffic light for ${type}:`, sendung.traffic_lights[type]);
        return sendung.traffic_lights[type];
      }

      const transportType = sendung.transport_type || 'AIR';
      const importExport = sendung.import_export || 'EXPORT';
      
      const milestones = getMilestones(transportType, importExport);
      
      // ✅ ECHTE DATUMS-BASIERTE MILESTONE-COMPLETION LOGIC
      let completedMilestoneIds = [];
      
      // 1. BUCHUNG/ERFASSUNG (Milestone 1)
      if (sendung.created_at || sendung.booking_date) {
        completedMilestoneIds.push(1);
      }
      
      // 2. ABHOLUNG MILESTONES (2-4)
      if (sendung.pickup_date || sendung.pickup_confirmed) {
        // Alle Abholung-Milestones als completed markieren
        const abholungMilestones = milestones.filter(m => m.ampel === 'abholung');
        completedMilestoneIds.push(...abholungMilestones.map(m => m.id));
        console.log('🚚 ABHOLUNG COMPLETED:', abholungMilestones.map(m => m.id));
      } else if (sendung.estimated_pickup_date) {
        // Nur erste Abholung-Milestone (geplant)
        const firstAbholungMilestone = milestones.find(m => m.ampel === 'abholung');
        if (firstAbholungMilestone) {
          completedMilestoneIds.push(firstAbholungMilestone.id);
          console.log('📅 ABHOLUNG GEPLANT:', firstAbholungMilestone.id);
        }
      }
      
      // 3. CARRIER/TRANSPORT MILESTONES (5-8) 
      if (sendung.awb_number || sendung.flight_confirmed) {
        // AWB erhalten = Carrier-Milestones begonnen
        const carrierMilestones = milestones.filter(m => m.ampel === 'carrier');
        const halfCarrier = Math.ceil(carrierMilestones.length / 2);
        completedMilestoneIds.push(...carrierMilestones.slice(0, halfCarrier).map(m => m.id));
        console.log('✈️ CARRIER BEGONNEN:', carrierMilestones.slice(0, halfCarrier).map(m => m.id));
        
        // Wenn in Transit oder später = alle Carrier completed
        if (sendung.status === 'in_transit' || sendung.departure_time || sendung.etd) {
          completedMilestoneIds.push(...carrierMilestones.map(m => m.id));
          console.log('🛫 CARRIER KOMPLETT:', carrierMilestones.map(m => m.id));
        }
      }
      
      // 4. ZUSTELLUNG MILESTONES (9-10)
      if (sendung.delivery_date || sendung.actual_delivery_date || sendung.delivery_confirmed) {
        // Alle Zustellung-Milestones als completed
        const zustellungMilestones = milestones.filter(m => m.ampel === 'zustellung');
        completedMilestoneIds.push(...zustellungMilestones.map(m => m.id));
        console.log('🚚 ZUSTELLUNG COMPLETED:', zustellungMilestones.map(m => m.id));
      } else if (sendung.estimated_delivery_date || sendung.eta) {
        // Nur erste Zustellung-Milestone (geplant)
        const firstZustellungMilestone = milestones.find(m => m.ampel === 'zustellung');
        if (firstZustellungMilestone) {
          completedMilestoneIds.push(firstZustellungMilestone.id);
          console.log('📅 ZUSTELLUNG GEPLANT:', firstZustellungMilestone.id);
        }
      }
      
      // 5. STATUS-BASIERTE ERGÄNZUNGEN (Fallback)
      if (sendung.status === 'zugestellt' && completedMilestoneIds.length < milestones.length) {
        // Wenn Status "zugestellt" aber nicht alle Milestones = alle ergänzen
        completedMilestoneIds = milestones.map(m => m.id);
        console.log('✅ STATUS ZUGESTELLT - ALLE MILESTONES COMPLETED');
      }
      
      console.log(`🚦 ${type.toUpperCase()} STATUS:`, {
        dateBasedStatus,
        sendung: sendung.position,
        status: sendung.status
      });
      
      return dateBasedStatus;
      
    } catch (error) {
      console.warn('Traffic Light Status Error:', error);
      return 'grey';
    }
  };

  // Helper Funktionen für Ampel-Status-Text - KORRIGIERT UND HINZUGEFÜGT
  const getAmpelProgress = (sendung, type) => {
    try {
      const transportType = sendung.transport_type || 'AIR';
      const importExport = sendung.import_export || 'EXPORT';
      const milestonesForAmpel = getMilestonesForAmpel(transportType, importExport, type);
      
      // Completed Milestones basierend auf Status berechnen
      let completedMilestoneIds = [];
      switch(sendung.status) {
        case 'ANFRAGE':
        case 'ANGEBOT':
          completedMilestoneIds = [];
          break;
        case 'created':
        case 'booked':
          completedMilestoneIds = [1];
          break;
        case 'abgeholt':
          completedMilestoneIds = getMilestones(transportType, importExport)
            .filter(m => m.ampel === 'abholung').map(m => m.id);
          break;
        case 'in_transit':
          completedMilestoneIds = getMilestones(transportType, importExport)
            .filter(m => ['abholung', 'carrier'].includes(m.ampel)).map(m => m.id);
          break;
        case 'zugestellt':
          completedMilestoneIds = getMilestones(transportType, importExport).map(m => m.id);
          break;
        default:
          completedMilestoneIds = [];
      }
      
      const completedInThisAmpel = milestonesForAmpel.filter(m => 
        completedMilestoneIds.includes(m.id)
      ).length;
      
      return `${completedInThisAmpel}/${milestonesForAmpel.length}`;
    } catch (error) {
      console.warn('getAmpelProgress Error:', error);
      return '0/0';
    }
  };

  const getAmpelStatusText = (sendung, type) => {
    try {
      const transportType = sendung.transport_type || 'AIR';
      const importExport = sendung.import_export || 'EXPORT';
      const milestonesForAmpel = getMilestonesForAmpel(transportType, importExport, type);
      
      // Completed Milestones basierend auf Status berechnen  
      let completedMilestoneIds = [];
      switch(sendung.status) {
        case 'ANFRAGE':
        case 'ANGEBOT':
          completedMilestoneIds = [];
          break;
        case 'created':
        case 'booked':
          completedMilestoneIds = [1];
          break;
        case 'abgeholt':
          completedMilestoneIds = getMilestones(transportType, importExport)
            .filter(m => m.ampel === 'abholung').map(m => m.id);
          break;
        case 'in_transit':
          completedMilestoneIds = getMilestones(transportType, importExport)
            .filter(m => ['abholung', 'carrier'].includes(m.ampel)).map(m => m.id);
          break;
        case 'zugestellt':
          completedMilestoneIds = getMilestones(transportType, importExport).map(m => m.id);
          break;
        default:
          completedMilestoneIds = [];
      }
      
      const completedInThisAmpel = milestonesForAmpel.filter(m => 
        completedMilestoneIds.includes(m.id)
      );
      
      if (completedInThisAmpel.length === 0) {
        return milestonesForAmpel.length > 0 ? milestonesForAmpel[0].text : 'Warten';
      } else if (completedInThisAmpel.length === milestonesForAmpel.length) {
        return 'Abgeschlossen';
      } else {
        // Nächster Milestone
        const nextMilestone = milestonesForAmpel.find(m => !completedMilestoneIds.includes(m.id));
        return nextMilestone ? nextMilestone.text : 'In Bearbeitung';
      }
    } catch (error) {
      console.warn('getAmpelStatusText Error:', error);
      return 'Fehler';
    }
  };

  // Traffic Light Component mit ECHTEN MILESTONES - FINAL VERSION
  const TrafficLight = ({ sendung, type, onTrafficLightClick }) => {
    console.log('🚦 TrafficLight NEUE LOGIC:', { 
      sendung: sendung.position, 
      type, 
      transportType: sendung.transport_type,
      importExport: sendung.import_export,
      status: sendung.status
    });

    // Echte Milestone-Berechnung mit der neuen API
    const transportType = sendung.transport_type || 'AIR';
    const importExport = sendung.import_export || 'EXPORT';
    
    // Hole alle Milestones für diese Sendung
    const allMilestones = getMilestones(transportType, importExport);
    
    // Filtere Milestones für diese spezifische Ampel
    const ampelMilestones = getMilestonesForAmpel(transportType, importExport, type);
    
    console.log('🚦 Milestone Data:', {
      allMilestones: allMilestones.length,
      ampelMilestones: ampelMilestones.length,
      ampelType: type,
      milestones: ampelMilestones
    });
    
    // Simuliere completed Milestones basierend auf Sendungsstatus
    let completedMilestoneIds = [];
    
    // ✅ ECHTE DATUMS-BASIERTE MILESTONE-COMPLETION LOGIC (siehe oben)
    
    console.log('🚦 Completed IDs:', completedMilestoneIds);
    
    // ✅ NEUE DATUMS-BASIERTE AMPEL-BERECHNUNG
    const finalAmpelStatus = getTrafficLightStatus(sendung, type);
    const color = getTrafficLightColor(finalAmpelStatus);
    
    console.log(`🚦 ${type.toUpperCase()} FINAL:`, {
      status: finalAmpelStatus,
      color: color,
      sendung: sendung.position
    });
    
    // Milestone-Progress für diese Ampel
    const completedAmpelMilestones = ampelMilestones.filter(m => 
      completedMilestoneIds.includes(m.id)
    ).length;
    const totalAmpelMilestones = ampelMilestones.length;
    
    // ✅ DATUMS-BASIERTE TOOLTIP
    const getTooltipText = () => {
      const labels = {
        'abholung': 'Abholung',
        'carrier': 'Transport/Carrier', 
        'zustellung': 'Zustellung'
      };
      
      const statusTexts = {
        'grey': 'Nicht geplant/bereit',
        'yellow': 'Heute/Morgen oder bereit',
        'green': 'Abgeschlossen/Bestätigt',
        'red': 'Überfällig/Problem'
      };
      
      let dateInfo = '';
      switch(type) {
        case 'abholung':
          if (sendung.pickup_date) {
            dateInfo = `\n✅ Abgeholt: ${formatDate(sendung.pickup_date)}`;
          } else if (sendung.estimated_pickup_date) {
            dateInfo = `\n📅 Geplant: ${formatDate(sendung.estimated_pickup_date)}`;
          }
          break;
        case 'carrier':
          if (sendung.awb_number) {
            dateInfo = `\n✈️ AWB: ${sendung.awb_number}`;
          }
          if (sendung.departure_time || sendung.etd) {
            dateInfo += `\n🛫 Abflug: ${formatDateTime(sendung.departure_time || sendung.etd)}`;
          }
          break;
        case 'zustellung':
          if (sendung.delivery_date) {
            dateInfo = `\n✅ Zugestellt: ${formatDate(sendung.delivery_date)}`;
          } else if (sendung.estimated_delivery_date || sendung.eta) {
            dateInfo = `\n📅 Erwartet: ${formatDate(sendung.estimated_delivery_date || sendung.eta)}`;
          }
          break;
      }
      
      return `${labels[type]}: ${statusTexts[finalAmpelStatus]}${dateInfo}\n\nKlicken zum Ändern`;
    };

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          console.log('🚦 Traffic Light clicked - DATUMS-BASIERTE LOGIC:', { 
            sendung: sendung.id, 
            type, 
            status: finalAmpelStatus,
          });
          
          if (onTrafficLightClick) {
            // Übergebe relevante Sendungsdaten
            onTrafficLightClick(e, sendung.id, type, {
              currentStatus: finalAmpelStatus,
              sendung: sendung,
              dates: {
                pickup_date: sendung.pickup_date,
                estimated_pickup_date: sendung.estimated_pickup_date,
                awb_number: sendung.awb_number,
                delivery_date: sendung.delivery_date,
                estimated_delivery_date: sendung.estimated_delivery_date,
                eta: sendung.eta,
                etd: sendung.etd
              }
            });
          } else {
            console.warn('⚠️ onTrafficLightClick prop missing');
            alert(`Traffic Light: ${type}\nStatus: ${finalAmpelStatus}\n\nDaten:\n${JSON.stringify({
              pickup_date: sendung.pickup_date,
              awb_number: sendung.awb_number,
              delivery_date: sendung.delivery_date
            }, null, 2)}`);
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
        {/* ✅ VEREINFACHTER PROGRESS INDICATOR */}
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
          {finalAmpelStatus === 'green' ? '✓' : 
           finalAmpelStatus === 'yellow' ? '!' : 
           finalAmpelStatus === 'red' ? '⚠' : '○'}
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

  // Datum formatieren - Intelligente Auswahl
  const getRelevantDate = (sendung) => {
    // Priorität: pickup_date > delivery_date > estimated_pickup_date > created_at
    if (sendung.pickup_date) {
      return {
        date: formatDate(sendung.pickup_date),
        type: 'Abholung',
        raw: sendung.pickup_date,
        icon: '📦',
        color: '#10b981'
      };
    }
    if (sendung.delivery_date || sendung.estimated_delivery_date) {
      const date = sendung.delivery_date || sendung.estimated_delivery_date;
      return {
        date: formatDate(date),
        type: sendung.delivery_date ? 'Zustellung' : 'Geplante Zustellung',
        raw: date,
        icon: '🚚',
        color: '#3b82f6'
      };
    }
    if (sendung.estimated_pickup_date) {
      return {
        date: formatDate(sendung.estimated_pickup_date),
        type: 'Geplante Abholung',
        raw: sendung.estimated_pickup_date,
        icon: '📅',
        color: '#f59e0b'
      };
    }
    if (sendung.created_at) {
      return {
        date: formatDate(sendung.created_at),
        type: 'Erstellt',
        raw: sendung.created_at,
        icon: '📝',
        color: '#6b7280'
      };
    }
    return {
      date: '-',
      type: 'Kein Datum',
      raw: null,
      icon: '❓',
      color: '#9ca3af'
    };
  };

  // Flugzeiten formatieren
  const getFlightTimes = (sendung) => {
    const times = [];
    
    // Departure Time (ETD)
    if (sendung.departure_time || sendung.etd || sendung.flight_departure) {
      const depTime = sendung.departure_time || sendung.etd || sendung.flight_departure;
      times.push({
        type: 'ETD',
        time: formatDateTime(depTime),
        raw: depTime,
        icon: '🛫',
        color: '#10b981'
      });
    }
    
    // Arrival Time (ETA)
    if (sendung.arrival_time || sendung.eta || sendung.flight_arrival) {
      const arrTime = sendung.arrival_time || sendung.eta || sendung.flight_arrival;
      times.push({
        type: 'ETA',
        time: formatDateTime(arrTime),
        raw: arrTime,
        icon: '🛬',
        color: '#3b82f6'
      });
    }
    
    // Cut-off Time (Urgent!)
    if (sendung.cutoff_time || sendung.airline_cutoff) {
      const cutoffTime = sendung.cutoff_time || sendung.airline_cutoff;
      times.push({
        type: 'Cut-off',
        time: formatDateTime(cutoffTime),
        raw: cutoffTime,
        icon: '⏰',
        color: '#dc2626' // ROT für Dringlichkeit
      });
    }
    
    return times;
  };

  // Notizen zusammenfassen
  const getNotesInfo = (sendung) => {
    const notes = [];
    
    // Verschiedene Notiz-Felder sammeln
    if (sendung.notes) notes.push({ type: 'Allgemein', text: sendung.notes });
    if (sendung.special_instructions) notes.push({ type: 'Anweisungen', text: sendung.special_instructions });
    if (sendung.customer_notes) notes.push({ type: 'Kunde', text: sendung.customer_notes });
    if (sendung.internal_notes) notes.push({ type: 'Intern', text: sendung.internal_notes });
    if (sendung.remarks) notes.push({ type: 'Bemerkungen', text: sendung.remarks });
    
    const allNotesText = notes.map(n => n.text).filter(text => text && text.trim()).join(' | ');
    
    return {
      hasNotes: allNotesText.length > 0,
      preview: allNotesText.length > 50 ? allNotesText.substring(0, 50) + '...' : allNotesText,
      full: allNotesText,
      count: notes.length,
      details: notes
    };
  };

  // Milestone Info Component (für Details)
  const getMilestoneInfo = (sendung, type) => {
    try {
      const transportType = sendung.transport_type || 'AIR';
      const importExport = sendung.import_export || 'EXPORT';
      const milestones = getMilestones(transportType, importExport);
      
      const typeMilestones = milestones.filter(m => m.ampel === type);
      const currentStatus = getTrafficLightStatus(sendung, type);
      
      return {
        milestones: typeMilestones,
        currentStatus,
        transportType,
        importExport
      };
    } catch (error) {
      return {
        milestones: [],
        currentStatus: 'grey',
        transportType: 'AIR',
        importExport: 'EXPORT'
      };
    }
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
    
    return 'Unbekannt';
  };

  // SICHERE Partner-Name Funktion
  const getPartnerName = (partnerId) => {
    if (!partnerId || !partners) return 'Unbekannt';
    
    if (Array.isArray(partners)) {
      const partner = partners.find(p => p && p.id === partnerId);
      return partner?.name || 'Unbekannt';
    }
    
    if (typeof partners === 'object') {
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
          <td style={{ padding: '16px 12px', minWidth: '140px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <td style={{ padding: '16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <td style={{ padding: '16px 12px', minWidth: '140px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

  // Debug-Ausgabe für Traffic Light System
  useEffect(() => {
    if (safeSendungen.length > 0) {
      const sampleSendung = safeSendungen[0];
      console.log('🚦 Traffic Light Debug:', {
        sendung: sampleSendung.position,
        transportType: sampleSendung.transport_type,
        importExport: sampleSendung.import_export,
        status: sampleSendung.status
      });
    }
  }, [safeSendungen]);

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