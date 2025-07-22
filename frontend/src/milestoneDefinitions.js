export const MILESTONE_DEFINITIONS = {
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

export const getMilestones = (transportType, shipmentType) => {
  if (transportType === 'TRUCK' || transportType === 'LKW') {
    return MILESTONE_DEFINITIONS.LKW;
  }
  
  if (transportType === 'SEA' || transportType === 'SEE') {
    return shipmentType === 'IMPORT' ? MILESTONE_DEFINITIONS.SEE_IMPORT : MILESTONE_DEFINITIONS.SEE_EXPORT;
  }
  
  // Default: Luftfracht
  return shipmentType === 'IMPORT' ? MILESTONE_DEFINITIONS.LUFT_IMPORT : MILESTONE_DEFINITIONS.LUFT_EXPORT;
};

export const getMilestoneForAmpel = (milestoneId, ampelType) => {
  const mapping = {
    abholung: [1, 2, 3],
    carrier: [4, 5, 6],
    flug: [7, 8],
    zustellung: [9, 10, 11]
  };
  
  return mapping[ampelType] || [];
};