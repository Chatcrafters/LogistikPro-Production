// src/utils/parsers/ShipmentDocumentParser.js
// 📄 SENDUNGSDOKUMENT PARSER - Vereinfacht für Start

export class ShipmentDocumentParser {
  
  async parse(text, options = {}) {
    console.log('📄 ShipmentDocumentParser: Starte Document-Parsing...');
    
    try {
      const shipmentData = {
        absender: { firma: '', adresse: '', ort: '' },
        empfaenger: { firma: '', adresse: '', ort: '', land: '' },
        gewicht: 0,
        colli: 0,
        abmessungen: null,
        route: { von: '', nach: '' },
        incoterm: 'CPT',
        warenwert: 0,
        warenart: '',
        gefahr: false
      };

      // Einfache Gewicht-Erkennung
      const gewichtMatch = text.match(/(\d+[,.]?\d*)\s*kg/i);
      if (gewichtMatch) {
        shipmentData.gewicht = parseFloat(gewichtMatch[1].replace(',', '.'));
      }

      // Einfache Colli-Erkennung  
      const colliMatch = text.match(/(\d+)\s*(?:Colli|carton|pieces|pcs)/i);
      if (colliMatch) {
        shipmentData.colli = parseInt(colliMatch[1]);
      }

      return {
        success: true,
        confidence: 80,
        data: shipmentData,
        rawText: text,
        metadata: {
          parser: 'ShipmentDocumentParser',
          parsedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

export default ShipmentDocumentParser;
