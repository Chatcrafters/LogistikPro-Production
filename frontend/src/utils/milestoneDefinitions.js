// frontend/src/utils/milestoneDefinitions.js
// KOMPLETT NEUE VERSION - Basierend auf Sergios Dokument

// 🎯 MILESTONE DEFINITIONEN FÜR ALLE TRANSPORTARTEN
export const milestoneDefinitions = {
  
  // ✈️ LUFTFRACHTEXPORT (10 Milestones → 3 Ampeln) - KORRIGIERTE REIHENFOLGE
  airExport: [
    // AMPEL 1 (Abholung) - Milestones 1-3
    { id: 1, text: 'Abholung beauftragt', ampel: 'abholung', stage: 'start', category: 'pickup_ordered' },
    { id: 2, text: 'Sendung abgeholt', ampel: 'abholung', stage: 'progress', category: 'pickup_done' },
    { id: 3, text: 'Anlieferung im Lager', ampel: 'abholung', stage: 'completed', category: 'warehouse_in' },
    
    // AMPEL 2 (Carrier/Transport) - Milestones 4-8
    { id: 4, text: 'Sendung gebucht', ampel: 'carrier', stage: 'start', category: 'booking' },
    { id: 5, text: 'Zoll erledigt', ampel: 'carrier', stage: 'planned', category: 'customs_export' },
    { id: 6, text: 'Anlieferung bei der Airline', ampel: 'carrier', stage: 'progress', category: 'airline_delivery' },
    { id: 7, text: 'Sendung abgeflogen', ampel: 'carrier', stage: 'progress', category: 'departed' },
    { id: 8, text: 'Sendung angekommen', ampel: 'carrier', stage: 'completed', category: 'arrived' },
    
    // AMPEL 3 (Zustellung) - Milestones 9-10
    { id: 9, text: 'Sendung verzollt', ampel: 'zustellung', stage: 'start', category: 'customs_import' },
    { id: 10, text: 'Sendung zugestellt', ampel: 'zustellung', stage: 'completed', category: 'delivered' }
  ],

  // 📦 LUFTFRACHTIMPORT (10 Milestones → 3 Ampeln)
  airImport: [
    // AMPEL 1 (Empfang/Ankunft) - Milestones 1-4
    { id: 1, text: 'Sendung angekündigt / Voravis erhalten', ampel: 'abholung', stage: 'start', category: 'announced' },
    { id: 2, text: 'Sendung abgeholt', ampel: 'abholung', stage: 'planned', category: 'pickup_origin' },
    { id: 3, text: 'Ankunft am Zielflughafen', ampel: 'abholung', stage: 'progress', category: 'arrived_airport' },
    { id: 4, text: 'Sendung entladen (Airline)', ampel: 'abholung', stage: 'completed', category: 'unloaded' },
    
    // AMPEL 2 (Zoll/Abholung) - Milestones 5-8
    { id: 5, text: 'Zollabfertigung', ampel: 'carrier', stage: 'start', category: 'customs_processing' },
    { id: 6, text: 'Zoll erledigt', ampel: 'carrier', stage: 'progress', category: 'customs_cleared' },
    { id: 7, text: 'Abholung geplant', ampel: 'carrier', stage: 'planned', category: 'pickup_planned' },
    { id: 8, text: 'Sendung abgeholt', ampel: 'carrier', stage: 'completed', category: 'pickup_done' },
    
    // AMPEL 3 (Zustellung) - Milestones 9-10
    { id: 9, text: 'Anlieferung beim Empfänger geplant', ampel: 'zustellung', stage: 'planned', category: 'delivery_planned' },
    { id: 10, text: 'Sendung zugestellt', ampel: 'zustellung', stage: 'completed', category: 'delivered' }
  ],

  // 🚢 SEEFRACHTEXPORT (8 Milestones → 3 Ampeln)
  seaExport: [
    // AMPEL 1 (Abholung/Container) - Milestones 1-3
    { id: 1, text: 'Sendung gebucht (Verschiffung)', ampel: 'abholung', stage: 'start', category: 'booking' },
    { id: 2, text: 'Abholung geplant', ampel: 'abholung', stage: 'planned', category: 'pickup_planned' },
    { id: 3, text: 'Sendung abgeholt', ampel: 'abholung', stage: 'completed', category: 'pickup_done' },
    
    // AMPEL 2 (Export/Verschiffung) - Milestones 4-7
    { id: 4, text: 'Anlieferung Containerterminal / Sammellager', ampel: 'carrier', stage: 'start', category: 'terminal_delivery' },
    { id: 5, text: 'Zollabwicklung Export abgeschlossen', ampel: 'carrier', stage: 'progress', category: 'customs_export' },
    { id: 6, text: 'Verladung auf Schiff', ampel: 'carrier', stage: 'progress', category: 'loading' },
    { id: 7, text: 'Schiff abgefahren', ampel: 'carrier', stage: 'completed', category: 'departed' },
    
    // AMPEL 3 (Ankunft) - Milestone 8
    { id: 8, text: 'Ankunft Zielhafen (ETA)', ampel: 'zustellung', stage: 'completed', category: 'arrived' }
  ],

  // ⚓ SEEFRACHTIMPORT (11 Milestones → 3 Ampeln)
  seaImport: [
    // AMPEL 1 (Container/Abfahrt) - Milestones 1-4
    { id: 1, text: 'Container-Gestellung beim Absender', ampel: 'abholung', stage: 'start', category: 'container_positioning' },
    { id: 2, text: 'Container am Abgangshafen angeliefert', ampel: 'abholung', stage: 'progress', category: 'port_delivery' },
    { id: 3, text: 'Schiff abgefahren (Abgangshafen)', ampel: 'abholung', stage: 'completed', category: 'departed' },
    { id: 4, text: 'Schiff angekommen (Zielhafen)', ampel: 'abholung', stage: 'completed', category: 'arrived' },
    
    // AMPEL 2 (Import/Zoll) - Milestones 5-8
    { id: 5, text: 'Entladung Schiff / Umschlag im Zielhafen', ampel: 'carrier', stage: 'start', category: 'unloading' },
    { id: 6, text: 'Importzollabwicklung begonnen', ampel: 'carrier', stage: 'progress', category: 'customs_processing' },
    { id: 7, text: 'Sendung verzollt', ampel: 'carrier', stage: 'progress', category: 'customs_cleared' },
    { id: 8, text: 'Abholung geplant (vom Terminal)', ampel: 'carrier', stage: 'completed', category: 'pickup_planned' },
    
    // AMPEL 3 (Zustellung) - Milestones 9-11
    { id: 9, text: 'Sendung abgeholt (aus dem Hafen)', ampel: 'zustellung', stage: 'start', category: 'pickup_from_port' },
    { id: 10, text: 'Anlieferung beim Empfänger geplant', ampel: 'zustellung', stage: 'planned', category: 'delivery_planned' },
    { id: 11, text: 'Sendung zugestellt', ampel: 'zustellung', stage: 'completed', category: 'delivered' }
  ],

  // 🚛 LKW-TRANSPORT (4 Milestones → 2 Ampeln)
  truck: [
    // AMPEL 1 (Abholung) - Milestones 1-2
    { id: 1, text: 'Abholung veranlasst', ampel: 'abholung', stage: 'start', category: 'pickup_ordered' },
    { id: 2, text: 'Sendung abgeholt', ampel: 'abholung', stage: 'completed', category: 'pickup_done' },
    
    // AMPEL 3 (Zustellung) - Milestones 3-4 (KEIN Hauptlauf bei LKW!)
    { id: 3, text: 'Geplante Zustellung', ampel: 'zustellung', stage: 'planned', category: 'delivery_planned' },
    { id: 4, text: 'Sendung zugestellt', ampel: 'zustellung', stage: 'completed', category: 'delivered' }
  ]
};

// 🔧 TRANSPORT-TYP MAPPING (Robuste Erkennung)
export const getTransportKey = (transportType, importExport) => {
  // Normalisiere Input
  const normalizedType = (transportType || '').toUpperCase();
  const normalizedDirection = (importExport || '').toUpperCase();
  
  // LKW/TRUCK (keine Import/Export Unterscheidung)
  if (normalizedType === 'TRUCK' || normalizedType === 'LKW') {
    return 'truck';
  }
  
  // LUFTFRACHT
  if (normalizedType === 'AIR' || normalizedType === 'LUFTFRACHT') {
    return normalizedDirection === 'IMPORT' ? 'airImport' : 'airExport';
  }
  
  // SEEFRACHT
  if (normalizedType === 'SEA' || normalizedType === 'SEEFRACHT') {
    return normalizedDirection === 'IMPORT' ? 'seaImport' : 'seaExport';
  }
  
  // DEFAULT: Luftfracht Export
  return 'airExport';
};

// 📋 MILESTONES FÜR SENDUNG ABRUFEN
export const getMilestones = (transportType, importExport) => {
  const key = getTransportKey(transportType, importExport);
  return milestoneDefinitions[key] || milestoneDefinitions.airExport;
};

// 🚦 MILESTONES FÜR BESTIMMTE AMPEL FILTERN
export const getMilestonesForAmpel = (transportType, importExport, ampelType) => {
  const allMilestones = getMilestones(transportType, importExport);
  return allMilestones.filter(milestone => milestone.ampel === ampelType);
};

// 🎯 AMPEL-STATUS BERECHNEN (Basierend auf erledigten Milestones)
export const calculateAmpelStatus = (milestones, completedMilestoneIds, ampelType) => {
  const ampelMilestones = milestones.filter(m => m.ampel === ampelType);
  const completedAmpelMilestones = ampelMilestones.filter(m => 
    completedMilestoneIds.includes(m.id)
  );
  
  const totalCount = ampelMilestones.length;
  const completedCount = completedAmpelMilestones.length;
  
  if (completedCount === 0) {
    return 'grey'; // Noch nicht begonnen
  } else if (completedCount === totalCount) {
    return 'green'; // Alle Milestones erledigt
  } else {
    return 'yellow'; // Teilweise erledigt
  }
};

// 🚦 TRAFFIC LIGHT STATUS FÜR ALLE AMPELN BERECHNEN
export const calculateTrafficLightStatus = (milestones, completedMilestones) => {
  const ampelStatus = {
    abholung: 'grey',
    carrier: 'grey', 
    zustellung: 'grey'
  };

  // Für jede Ampel den Status basierend auf abgeschlossenen Milestones berechnen
  ['abholung', 'carrier', 'zustellung'].forEach(ampel => {
    ampelStatus[ampel] = calculateAmpelStatus(milestones, completedMilestones, ampel);
  });

  return ampelStatus;
};

// 📊 MILESTONE-PROGRESS BERECHNEN
export const getMilestoneProgress = (transportType, importExport, completedMilestoneIds) => {
  const milestones = getMilestones(transportType, importExport);
  const trafficStatus = calculateTrafficLightStatus(milestones, completedMilestoneIds);
  
  return {
    abholung: {
      milestones: getMilestonesForAmpel(transportType, importExport, 'abholung'),
      completed: getMilestonesForAmpel(transportType, importExport, 'abholung')
        .filter(m => completedMilestoneIds.includes(m.id)).length,
      total: getMilestonesForAmpel(transportType, importExport, 'abholung').length,
      status: trafficStatus.abholung
    },
    carrier: {
      milestones: getMilestonesForAmpel(transportType, importExport, 'carrier'),
      completed: getMilestonesForAmpel(transportType, importExport, 'carrier')
        .filter(m => completedMilestoneIds.includes(m.id)).length,
      total: getMilestonesForAmpel(transportType, importExport, 'carrier').length,
      status: trafficStatus.carrier
    },
    zustellung: {
      milestones: getMilestonesForAmpel(transportType, importExport, 'zustellung'),
      completed: getMilestonesForAmpel(transportType, importExport, 'zustellung')
        .filter(m => completedMilestoneIds.includes(m.id)).length,
      total: getMilestonesForAmpel(transportType, importExport, 'zustellung').length,
      status: trafficStatus.zustellung
    }
  };
};

// 🎨 AMPEL-FARBEN DEFINITIONEN
export const AMPEL_COLORS = {
  grey: '#9ca3af',    // Nicht begonnen
  yellow: '#fbbf24',  // In Bearbeitung
  green: '#10b981',   // Abgeschlossen
  red: '#ef4444'      // Problem/Verspätung
};

// 🎨 FARBE FÜR AMPEL-STATUS ABRUFEN
export const getTrafficLightColor = (status) => {
  return AMPEL_COLORS[status] || AMPEL_COLORS.grey;
};

// 📢 STANDARD MILESTONES FÜR KUNDEN-NOTIFICATIONS
export const getStandardMilestones = (transportType, importExport) => {
  const milestones = getMilestones(transportType, importExport);
  
  // Standard: Wichtigste Milestones für Kunden-Updates
  const standardIds = [];
  
  ['abholung', 'carrier', 'zustellung'].forEach(ampel => {
    const ampelMilestones = milestones.filter(m => m.ampel === ampel);
    if (ampelMilestones.length > 0) {
      // Erstes und letztes Milestone jeder Ampel
      standardIds.push(ampelMilestones[0].id); // Start
      const lastMilestone = ampelMilestones[ampelMilestones.length - 1];
      if (lastMilestone.id !== ampelMilestones[0].id) {
        standardIds.push(lastMilestone.id); // Ende
      }
    }
  });
  
  return [...new Set(standardIds)]; // Remove duplicates
};

// 🔍 DEBUGGING HELPER
export const debugMilestones = (transportType, importExport, completedIds = []) => {
  const key = getTransportKey(transportType, importExport);
  const milestones = getMilestones(transportType, importExport);
  const progress = getMilestoneProgress(transportType, importExport, completedIds);
  
  console.log('🚦 MILESTONE DEBUG:', {
    transportType,
    importExport,
    key,
    totalMilestones: milestones.length,
    ampelBreakdown: {
      abholung: `${progress.abholung.completed}/${progress.abholung.total}`,
      carrier: `${progress.carrier.completed}/${progress.carrier.total}`,
      zustellung: `${progress.zustellung.completed}/${progress.zustellung.total}`
    },
    trafficLightStatus: {
      abholung: progress.abholung.status,
      carrier: progress.carrier.status,
      zustellung: progress.zustellung.status
    }
  });
  
  return progress;
};

// 🎯 NÄCHSTER ZU ERLEDIGENDER MILESTONE
export const getNextMilestone = (transportType, importExport, completedMilestoneIds) => {
  const milestones = getMilestones(transportType, importExport);
  return milestones.find(m => !completedMilestoneIds.includes(m.id));
};

// 📝 MILESTONE-STATUS TEXT GENERIEREN
export const getMilestoneStatusText = (milestone, isCompleted) => {
  return isCompleted ? `✅ ${milestone.text}` : `⏳ ${milestone.text}`;
};

// 📋 AKTUELLER STATUS UNTER AMPEL ANZEIGEN
export const getCurrentAmpelStatusText = (transportType, importExport, completedMilestoneIds, ampelType) => {
  const ampelMilestones = getMilestonesForAmpel(transportType, importExport, ampelType);
  
  if (ampelMilestones.length === 0) {
    return 'Nicht verfügbar';
  }
  
  // Finde den letzten abgeschlossenen Milestone
  let lastCompleted = null;
  for (let i = ampelMilestones.length - 1; i >= 0; i--) {
    if (completedMilestoneIds.includes(ampelMilestones[i].id)) {
      lastCompleted = ampelMilestones[i];
      break;
    }
  }
  
  // Finde den nächsten zu erledigenden Milestone
  const nextMilestone = ampelMilestones.find(m => !completedMilestoneIds.includes(m.id));
  
  if (lastCompleted) {
    return lastCompleted.text; // Zeige letzten abgeschlossenen Status
  } else if (nextMilestone) {
    return `⏳ ${nextMilestone.text}`; // Zeige nächsten zu erledigenden
  } else {
    return ampelMilestones[0].text; // Fallback: Ersten Milestone
  }
};

// 📊 KOMPAKTE STATUS-INFO FÜR AMPEL
export const getAmpelStatusInfo = (transportType, importExport, completedMilestoneIds, ampelType) => {
  const ampelMilestones = getMilestonesForAmpel(transportType, importExport, ampelType);
  const completedCount = ampelMilestones.filter(m => completedMilestoneIds.includes(m.id)).length;
  const totalCount = ampelMilestones.length;
  const status = calculateAmpelStatus(
    getMilestones(transportType, importExport), 
    completedMilestoneIds, 
    ampelType
  );
  const statusText = getCurrentAmpelStatusText(transportType, importExport, completedMilestoneIds, ampelType);
  
  return {
    completed: completedCount,
    total: totalCount,
    status: status,
    statusText: statusText,
    percentage: totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  };
};

// DEFAULT EXPORT für Kompatibilität
export default {
  milestoneDefinitions,
  getMilestones,
  getMilestonesForAmpel,
  calculateTrafficLightStatus,
  calculateAmpelStatus,
  getMilestoneProgress,
  getStandardMilestones,
  getTransportKey,
  getTrafficLightColor,
  debugMilestones,
  getNextMilestone,
  getMilestoneStatusText,
  AMPEL_COLORS
};
