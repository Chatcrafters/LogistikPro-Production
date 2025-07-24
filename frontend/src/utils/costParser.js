// frontend/src/utils/costParser.js
// Magic Cost Input System - Erweitert und Optimiert

// === MAIN PARSER FUNCTION ===

export const processMagicInput = (text, anfrage, inputType = 'cost') => {
  if (!text.trim()) {
    alert('Bitte fügen Sie den Text ein');
    return null;
  }
 
  console.log('🔍 MAGIC BOX Input Type:', inputType);
  console.log('🔍 MAGIC BOX Text Preview:', text.substring(0, 300) + '...');
 
  // 📄 DOKUMENT-ERKENNUNG (OCR/Scan)
  if (inputType === 'document' || detectDocumentType(text)) {
    return parseShipmentDocument(text);
  }
 
  // 📧 KUNDEN-ANFRAGE
  if (inputType === 'customer' || detectCustomerInquiry(text)) {
    return parseCustomerInquiry(text);
  }
 
  // 💰 KOSTEN-ANTWORT (Standard)
  return parseCostResponse(text, anfrage);
};

// === DOCUMENT TYPE DETECTION ===

const detectDocumentType = (text) => {
  const documentIndicators = [
    'CMR', 'Frachtbrief', 'Customs invoice', 'Commercial Invoice',
    'Packing List', 'Bill of Lading', 'AWB', 'House AWB',
    'Delivery Note', 'Lieferschein', 'Invoice', 'Rechnung'
  ];
  
  return documentIndicators.some(indicator => 
    text.toUpperCase().includes(indicator.toUpperCase())
  );
};

// === CUSTOMER INQUIRY DETECTION ===

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

// === COST RESPONSE PARSER ===

export const parseCostResponse = (text, anfrage) => {
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
  
  // === PATTERN DEFINITIONS ===
  
  // ABHOLUNG / PICKUP PATTERNS
  const pickupPatterns = [
    // Echte Abholung beim Versender
    /(?:abholung|abholen|vorlauf)[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /collection(?:\s*from\s*sender)?[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /truck.*to.*airport(?:\s*from\s*sender)?[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    
    // HuT spezifisch
    /hut.*pick.*up[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /(?:local\s*)?truck.*stuttgart[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /(?:local\s*)?truck.*frankfurt[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    
    // Spezifische Pickup-Kosten
    /(?:abhol|pickup)(?:kosten|cost|gebühr|fee)[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /vorlaufkosten[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /pre\s*carriage[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /origin\s*charges[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi
  ];

  // HAUPTLAUF / MAIN PATTERNS
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

  // ZUSTELLUNG / DELIVERY PATTERNS
  const deliveryPatterns = [
    // Import Zustellungen
    /(?:zustellung|delivery|final\s*delivery)[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /nachlauf[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /on\s*carriage[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /destination\s*charges[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    
    // Zoll & Handling
    /(?:customs|zoll)(?:\s*clearance)?[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /handling[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /storage[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    
    // USA spezifisch (für LAX Tests)
    /carnet\s*clearance[^:$€]*[:=]?\s*\$?([\d,]+(?:\.\d+)?)/gi,
    /pick\s*up\s*and\s*transfer\s*to\s*lax[^:$€]*[:=]?\s*\$?([\d,]+(?:\.\d+)?)/gi,
    /overnight\s*carnet\s*to\s*la\s*office[^:$€]*[:=]?\s*\$?([\d,]+(?:\.\d+)?)/gi,
    
    // LKW Transfer am Zielort
    /truck.*from.*airport[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi,
    /local\s*delivery[^:$€]*[:=]?\s*[$€]?([\d,]+(?:\.\d+)?)/gi
  ];

  console.log('💰 Starting cost parsing...');
  console.log('📝 Input text length:', text.length);
  console.log('💱 Exchange rate:', exchangeRate);

  // === PICKUP COST DETECTION ===
  console.log('\n🚚 === PICKUP PATTERNS ANALYSE ===');
  for (const pattern of pickupPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      console.log('🎯 Pattern match:', pattern.source.substring(0, 50));
      for (const match of matches) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        const isUSD = match[0].includes('$');
        const originalAmount = amount;
        
        if (isUSD) {
          amount = amount / exchangeRate;
          console.log(`💱 Pickup conversion: $${originalAmount} ÷ ${exchangeRate} = €${amount.toFixed(2)}`);
        }
        
        costs.pickup_cost = Math.max(costs.pickup_cost, amount);
        console.log(`🚚 Pickup found: "${match[0].substring(0, 40)}..." → €${amount.toFixed(2)}`);
      }
    }
  }

  // === MAIN COST DETECTION ===
  console.log('\n✈️ === MAIN PATTERNS ANALYSE ===');
  for (const pattern of mainPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      console.log('🎯 Pattern match:', pattern.source.substring(0, 50));
      for (const match of matches) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        const isUSD = match[0].includes('$');
        const originalAmount = amount;
        
        if (isUSD) {
          amount = amount / exchangeRate;
          console.log(`💱 Main conversion: $${originalAmount} ÷ ${exchangeRate} = €${amount.toFixed(2)}`);
        }
        
       // LUFTFRACHT-GEWICHTS-BERECHNUNG
        if (pattern.toString().includes('kg') && anfrage?.total_weight) {
          const bruttoWeight = parseFloat(anfrage.total_weight || 0);
          
          // Volumengewicht berechnen (falls Abmessungen vorhanden)
          // Standard: Falls keine Abmessungen, nehme Bruttogewicht
          let volumeWeight = 0;
          if (anfrage.dimensions || anfrage.length || anfrage.width || anfrage.height) {
            const length = parseFloat(anfrage.length || anfrage.dimensions?.length || 0);
            const width = parseFloat(anfrage.width || anfrage.dimensions?.width || 0);
            const height = parseFloat(anfrage.height || anfrage.dimensions?.height || 0);
            
            if (length > 0 && width > 0 && height > 0) {
              volumeWeight = (length * width * height) / 6000; // cm³ zu kg für Luftfracht
              console.log(`📏 Abmessungen: ${length}×${width}×${height}cm`);
              console.log(`📦 Volumengewicht: ${volumeWeight.toFixed(1)}kg`);
            }
          }
          
          // Chargeable Weight = höheres Gewicht (Brutto vs Volumen)
          const chargeableWeight = Math.max(bruttoWeight, volumeWeight);
          const weightAmount = amount * chargeableWeight;
          
          console.log(`⚖️ LUFTFRACHT-KALKULATION:`);
          console.log(`   💰 Rate: €${amount.toFixed(2)}/kg`);
          console.log(`   ⚖️ Bruttogewicht: ${bruttoWeight}kg`);
          console.log(`   📦 Volumengewicht: ${volumeWeight.toFixed(1)}kg`);
          console.log(`   🎯 Chargeables Gewicht: ${chargeableWeight}kg (höherer Wert)`);
          console.log(`   💵 Hauptlauf: €${amount.toFixed(2)} × ${chargeableWeight}kg = €${weightAmount.toFixed(2)}`);
          
          // LUFTFRACHT-RATE VALIDIERUNG
          if (amount < 1.5 || amount > 15) {
            console.warn(`⚠️ UNGEWÖHNLICHE RATE: €${amount.toFixed(2)}/kg`);
            console.warn(`   Typische Luftfracht-Raten: €2-8/kg`);
            
            if (amount > 50) {
              console.warn(`   🔧 RATE ZU HOCH: Verwende als Pauschalbetrag statt per kg`);
              amount = originalAmount; // Verwende als Gesamtbetrag, nicht per kg
            } else if (amount < 1) {
              console.warn(`   🔧 RATE ZU NIEDRIG: Könnte Fehler sein`);
            }
          } else {
            // Normale Rate - verwende Gewichts-Berechnung
            amount = weightAmount;
          }
          
          // SICHERHEITS-CHECK für extreme Werte
          if (amount > 50000) {
            console.warn(`⚠️ SEHR HOHE HAUPTLAUF-KOSTEN: €${amount.toFixed(2)}`);
            console.warn(`   Rate: €${(amount/chargeableWeight).toFixed(2)}/kg × ${chargeableWeight}kg`);
            
            const isRealistic = confirm(
              `⚠️ HOHE LUFTFRACHT-KOSTEN ERKANNT:\n\n` +
              `💰 Rate: €${(weightAmount/chargeableWeight).toFixed(2)}/kg\n` +
              `⚖️ Chargeables Gewicht: ${chargeableWeight}kg\n` +
              `💵 Hauptlauf-Kosten: €${weightAmount.toFixed(2)}\n\n` +
              `Sind diese Kosten realistisch?\n\n` +
              `(Normale Luftfracht: €2-8/kg)`
            );
            
            if (!isRealistic) {
              // User sagt es ist unrealistisch - reduziere auf vernünftigen Wert
              const correctedRate = prompt(
                `Korrekte Rate eingeben (€/kg):`,
                `4.50`
              );
              
              if (correctedRate && !isNaN(parseFloat(correctedRate))) {
                const newRate = parseFloat(correctedRate);
                amount = newRate * chargeableWeight;
                console.warn(`   🔧 BENUTZER-KORREKTUR: €${newRate}/kg × ${chargeableWeight}kg = €${amount.toFixed(2)}`);
              } else {
                // Fallback auf vernünftigen Standardwert
                amount = 4.50 * chargeableWeight;
                console.warn(`   🔧 STANDARD-KORREKTUR: €4.50/kg × ${chargeableWeight}kg = €${amount.toFixed(2)}`);
              }
            }
          }
        }
        
        costs.main_cost = Math.max(costs.main_cost, amount);
        console.log(`✈️ Main found: "${match[0].substring(0, 40)}..." → €${amount.toFixed(2)}`);
      }
    }
  }

  // === DELIVERY COST DETECTION ===
  console.log('\n📦 === DELIVERY PATTERNS ANALYSE ===');
  const foundDeliveryItems = [];

  deliveryPatterns.forEach((pattern, index) => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      const isUSD = match[0].includes('$');
      const originalAmount = amount;
      const originalCurrency = isUSD ? 'USD' : 'EUR';
      
      if (isUSD) {
        amount = amount / exchangeRate;
        console.log(`💱 Delivery conversion: $${originalAmount} ÷ ${exchangeRate} = €${amount.toFixed(2)}`);
      }
      
      const item = {
        description: match[0].trim(),
        originalAmount: originalAmount,
        originalCurrency: originalCurrency,
        convertedAmount: amount,
        convertedCurrency: 'EUR'
      };
      foundDeliveryItems.push(item);
      
      costs.delivery_cost += amount; // ADDIEREN für multiple delivery items
      console.log(`📦 Delivery found: "${match[0].substring(0, 40)}..." → €${amount.toFixed(2)}`);
    });
  });

  console.log('\n✅ === FINAL COST SUMMARY ===');
  console.log('🚚 Pickup costs:', `€${costs.pickup_cost.toFixed(2)}`);
  console.log('✈️ Main costs:', `€${costs.main_cost.toFixed(2)}`);
  console.log('📦 Delivery costs:', `€${costs.delivery_cost.toFixed(2)}`);
  
  // === RESULT VALIDATION ===
  const found = [];
  if (costs.pickup_cost > 0) found.push(`🚚 Abholung: €${costs.pickup_cost.toFixed(2)}`);
  if (costs.main_cost > 0) found.push(`✈️ Hauptlauf: €${costs.main_cost.toFixed(2)}`);

  let deliveryDetails = '';
  if (costs.delivery_cost > 0) {
    found.push(`📦 Zustellung: €${costs.delivery_cost.toFixed(2)}`);
    
    if (foundDeliveryItems.length > 0) {
      deliveryDetails = '\n\n📋 Zustellung Details:\n';
      foundDeliveryItems.forEach((item, index) => {
        const conversion = item.originalCurrency === 'USD' ? 
          ` ($${item.originalAmount} → €${item.convertedAmount.toFixed(2)})` :
          ` (€${item.convertedAmount.toFixed(2)})`;
        
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

  const confirmationText = `💰 Erkannte Kosten:\n\n${found.join('\n')}${deliveryDetails}\n📊 Gesamtkosten: €${total.toFixed(2)}${currencyNote}\n\nMöchten Sie diese speichern?`;

  if (confirm(confirmationText)) {
    return {
      type: 'costs',
      data: costs
    };
  }

  return null;
};

// === SHIPMENT DOCUMENT PARSER ===

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
  
  // ABSENDER ERKENNUNG
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
  
  // EMPFÄNGER ERKENNUNG
  const empfaengerPatterns = [
    /(?:Empfänger|Consignee)[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)\n([^\n]*)/i,
    /2\s*Empfänger[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)/i,
    /Delivery address[:\s]*\n([^\n]*)\n([^\n]*)\n([^\n]*)/i
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
  
  // GEWICHT & ABMESSUNGEN
  const gewichtMatches = [...text.matchAll(/(\d+[,.]?\d*)\s*kg/gi)];
  for (const match of gewichtMatches) {
    const weight = parseFloat(match[1].replace(',', '.'));
    if (weight > shipmentData.gewicht) {
      shipmentData.gewicht = weight;
    }
  }
  
  const colliMatches = [...text.matchAll(/(\d+)\s*(?:Colli|carton|Karton|pieces|pcs|Stück)/gi)];
  for (const match of colliMatches) {
    const pieces = parseInt(match[1]);
    if (pieces > shipmentData.colli) {
      shipmentData.colli = pieces;
    }
  }
  
  // ABMESSUNGEN
  const abmessungenMatch = text.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*cm/i);
  if (abmessungenMatch) {
    shipmentData.abmessungen = `${abmessungenMatch[1]}x${abmessungenMatch[2]}x${abmessungenMatch[3]} cm`;
  }
  
  // WARENWERT
  const warenwertMatch = text.match(/(?:Total|Value|Invoice\s*value)[:\s]*€?\s*(\d+[,.]?\d*)/i);
  if (warenwertMatch) {
    shipmentData.warenwert = parseFloat(warenwertMatch[1].replace(',', '.'));
  }
  
  // DANGEROUS GOODS
  const gefahrIndicators = ['DANGEROUS GOODS', 'UN 1950', 'AEROSOLS', 'LITHIUM', 'BATTERY'];
  if (gefahrIndicators.some(indicator => text.toUpperCase().includes(indicator))) {
    shipmentData.gefahr = true;
    shipmentData.warenart = 'Dangerous Goods (Siehe Dokument für Details)';
  }
  
  // ROUTE BESTIMMEN
  if (shipmentData.absender?.ort?.includes('Affalterbach')) {
    shipmentData.route.von = 'Stuttgart (STR)';
  }
  
  if (shipmentData.empfaenger?.ort?.includes('Englewood') || 
      shipmentData.empfaenger?.land === 'USA') {
    shipmentData.route.nach = 'Denver (DEN)';
  }
  
  console.log('📄 Extracted Shipment Data:', shipmentData);
  
  const summary = `
📄 DOKUMENT GESCANNT - Sendung erkannt:

📦 SENDUNGSDETAILS:
Von: ${shipmentData.route.von}
Nach: ${shipmentData.route.nach}
Gewicht: ${shipmentData.gewicht} kg
Colli: ${shipmentData.colli}
Abmessungen: ${shipmentData.abmessungen || 'Nicht erkannt'}

👤 ABSENDER: ${shipmentData.absender?.firma || 'N/A'}
👤 EMPFÄNGER: ${shipmentData.empfaenger?.firma || 'N/A'}

💰 WERT: €${shipmentData.warenwert}
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

// === CUSTOMER INQUIRY PARSER ===

const parseCustomerInquiry = (text) => {
  console.log('📧 Parsing Customer Inquiry...');
  
  const inquiryData = {
    kunde: '',
    route: { von: '', nach: '' },
    gewicht: 0,
    colli: 0,
    abholDatum: '',
    urgency: 'normal'
  };
  
  // ROUTE ERKENNUNG
  const routeMatch = text.match(/(?:von|from)\s*([A-Z]{3})\s*(?:nach|to)\s*([A-Z]{3})/i);
  if (routeMatch) {
    inquiryData.route.von = routeMatch[1];
    inquiryData.route.nach = routeMatch[2];
  }
  
  // GEWICHT
  const gewichtMatch = text.match(/(\d+[,.]?\d*)\s*(?:kg|kilo)/i);
  if (gewichtMatch) {
    inquiryData.gewicht = parseFloat(gewichtMatch[1].replace(',', '.'));
  }
  
  // URGENCY
  if (/(?:urgent|dringend|asap|sofort)/i.test(text)) {
    inquiryData.urgency = 'urgent';
  }
  
  return {
    type: 'customer_inquiry',
    data: inquiryData
  };
};

// === COST SAVE HANDLER ===

export const handleSaveCosts = async (shipmentId, costs) => {
  console.log('💾 Speichere Kosten für Shipment:', shipmentId);
  console.log('💰 Kosten-Daten:', costs);
  
  try {
    // Validate inputs
    if (!shipmentId) {
      throw new Error('Keine Sendungs-ID übergeben');
    }
    
    const cleanCosts = {
      pickup_cost: parseFloat(costs.pickup_cost || 0),
      main_cost: parseFloat(costs.main_cost || costs.mainrun_cost || 0),
      delivery_cost: parseFloat(costs.delivery_cost || 0)
    };
    
    console.log('🧹 Bereinigte Kosten:', cleanCosts);
    
    // Try Backend API first
    try {
      const response = await fetch(`http://localhost:3001/api/shipments/${shipmentId}/costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cost_type: 'bulk',
          costs: cleanCosts,
          method: 'magic_input',
          currency: 'EUR'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend API Erfolg:', result);
        
        const total = cleanCosts.pickup_cost + cleanCosts.main_cost + cleanCosts.delivery_cost;
        alert(
          `✅ Kosten erfolgreich gespeichert!\n\n` +
          `🚚 Abholung: €${cleanCosts.pickup_cost.toFixed(2)}\n` +
          `✈️ Hauptlauf: €${cleanCosts.main_cost.toFixed(2)}\n` +
          `📋 Zustellung: €${cleanCosts.delivery_cost.toFixed(2)}\n\n` +
          `💰 Gesamtkosten: €${total.toFixed(2)}`
        );
        
        return true;
      } else {
        throw new Error('Backend API nicht verfügbar');
      }
    } catch (apiError) {
      console.warn('⚠️ Backend API Fehler, verwende Supabase:', apiError);
      
      // Fallback: Direct Supabase update
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data, error } = await supabase
        .from('shipments')
        .update({
          pickup_cost: cleanCosts.pickup_cost,
          main_cost: cleanCosts.main_cost,
          delivery_cost: cleanCosts.delivery_cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Supabase Fallback Erfolg:', data);
      
      const total = cleanCosts.pickup_cost + cleanCosts.main_cost + cleanCosts.delivery_cost;
      alert(
        `✅ Kosten erfolgreich gespeichert! (Fallback)\n\n` +
        `🚚 Abholung: €${cleanCosts.pickup_cost.toFixed(2)}\n` +
        `✈️ Hauptlauf: €${cleanCosts.main_cost.toFixed(2)}\n` +
        `📋 Zustellung: €${cleanCosts.delivery_cost.toFixed(2)}\n\n` +
        `💰 Gesamtkosten: €${total.toFixed(2)}`
      );
      
      return true;
    }
  } catch (err) {
    console.error('💥 Fehler beim Speichern der Kosten:', err);
    
    alert(
      `❌ Fehler beim Speichern der Kosten:\n\n` +
      `Fehler: ${err.message}\n\n` +
      `Sendung: ${shipmentId}\n` +
      `Bitte versuchen Sie es erneut.`
    );
    
    return false;
  }
};

// === UTILITY FUNCTIONS ===

export const validateCosts = (costs) => {
  const errors = [];
  
  if (costs.pickup_cost < 0) errors.push('Abholkosten dürfen nicht negativ sein');
  if (costs.main_cost < 0) errors.push('Hauptlaufkosten dürfen nicht negativ sein');
  if (costs.delivery_cost < 0) errors.push('Zustellkosten dürfen nicht negativ sein');
  
  const total = costs.pickup_cost + costs.main_cost + costs.delivery_cost;
  if (total === 0) errors.push('Mindestens eine Kostenposition muss größer als 0 sein');
  if (total > 100000) errors.push('Gesamtkosten scheinen unrealistisch hoch');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatCostSummary = (costs) => {
  const total = costs.pickup_cost + costs.main_cost + costs.delivery_cost;
  
  return {
    pickup: `€${costs.pickup_cost.toFixed(2)}`,
    main: `€${costs.main_cost.toFixed(2)}`,
    delivery: `€${costs.delivery_cost.toFixed(2)}`,
    total: `€${total.toFixed(2)}`,
    breakdown: {
      pickup: costs.pickup_cost,
      main: costs.main_cost,
      delivery: costs.delivery_cost,
      total: total
    }
  };
};

// === EXPORT ===

export default {
  processMagicInput,
  parseCostResponse,
  handleSaveCosts,
  validateCosts,
  formatCostSummary
};