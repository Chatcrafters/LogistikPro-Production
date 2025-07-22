// src/utils/patterns/ShipmentPatterns.js
// 🎯 VEREINFACHTE PATTERNS FÜR START

export class ShipmentPatterns {
  getGewichtPatterns() {
    return [
      /(\d+[,.]?\d*)\s*kg/gi,
      /Weight[:\s]*(\d+[,.]?\d*)\s*kg/gi
    ];
  }
}

export default ShipmentPatterns;