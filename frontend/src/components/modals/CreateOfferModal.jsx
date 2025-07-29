import React, { useState, useEffect } from 'react';
import { X, TrendingUp, DollarSign, Calculator } from 'lucide-react';

const CreateOfferModal = ({ sendung, onClose, onSave }) => {
  // Kosten aus der Sendung
  const pickupCost = parseFloat(sendung.pickup_cost || sendung.cost_pickup || 0);
  const mainCost = parseFloat(sendung.main_cost || sendung.cost_mainrun || 0); 
  const deliveryCost = parseFloat(sendung.delivery_cost || sendung.cost_delivery || 0);
  const totalCost = pickupCost + mainCost + deliveryCost;

  // States
  const [offerPrice, setOfferPrice] = useState(0);
  const [marginPercent, setMarginPercent] = useState(15);
  const [marginAmount, setMarginAmount] = useState(0);

  // Mock historische Daten (später aus DB)
  const historicalData = [
    { route: `${sendung.origin_airport}-${sendung.destination_airport}`, customer: 'Kunde A', margin: 18 },
    { route: `${sendung.origin_airport}-${sendung.destination_airport}`, customer: 'Kunde B', margin: 22 },
    { route: 'Alle Routen', customer: sendung.customer_name, margin: 16 },
  ];

  const avgHistoricalMargin = historicalData.reduce((sum, d) => sum + d.margin, 0) / historicalData.length;

  // Berechne empfohlenen Preis basierend auf historischen Daten
  useEffect(() => {
    const recommendedMargin = avgHistoricalMargin;
    setMarginPercent(recommendedMargin);
    const margin = totalCost * (recommendedMargin / 100);
    setMarginAmount(margin);
    setOfferPrice(totalCost + margin);
  }, [totalCost, avgHistoricalMargin]);

  // Handler für Margin-Änderung (Prozent)
  const handleMarginPercentChange = (value) => {
    const percent = parseFloat(value) || 0;
    setMarginPercent(percent);
    const margin = totalCost * (percent / 100);
    setMarginAmount(margin);
    setOfferPrice(totalCost + margin);
  };

  // Handler für Angebotspreis-Änderung
  const handleOfferPriceChange = (value) => {
    const price = parseFloat(value) || 0;
    setOfferPrice(price);
    const margin = price - totalCost;
    setMarginAmount(margin);
    const percent = totalCost > 0 ? (margin / totalCost) * 100 : 0;
    setMarginPercent(percent);
  };

  const handleSave = () => {
    if (offerPrice <= totalCost) {
      alert('Angebotspreis muss höher als die Kosten sein!');
      return;
    }
    
    onSave({
      offer_price: offerPrice,
      margin_amount: marginAmount,
      margin_percent: marginPercent,
      total_cost: totalCost
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '600px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <DollarSign style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
            Angebot erstellen für {sendung.position}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Kostenübersicht */}
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
              Kostenübersicht
            </h3>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Abholung:</span>
                <span>€{pickupCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Hauptlauf:</span>
                <span>€{mainCost.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Zustellung:</span>
                <span>€{deliveryCost.toFixed(2)}</span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                paddingTop: '8px', 
                borderTop: '1px solid #d1d5db',
                fontWeight: '600',
                fontSize: '16px'
              }}>
                <span>Gesamtkosten:</span>
                <span style={{ color: '#dc2626' }}>€{totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Historische Margen */}
          <div style={{
            backgroundColor: '#fef3c7',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <TrendingUp style={{ width: '16px', height: '16px' }} />
              Historische Margen
            </h3>
            <div style={{ fontSize: '14px' }}>
              {historicalData.map((data, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#92400e' }}>{data.route} • {data.customer}:</span>
                  <span style={{ fontWeight: '600', marginLeft: '8px' }}>{data.margin}%</span>
                </div>
              ))}
              <div style={{ 
                marginTop: '8px', 
                paddingTop: '8px', 
                borderTop: '1px solid #fbbf24',
                fontWeight: '600'
              }}>
                Durchschnitt: {avgHistoricalMargin.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Kalkulation */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
              Preiskalkulation
            </h3>
            
            {/* Marge in Prozent */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Marge in %
              </label>
              <input
                type="number"
                value={marginPercent}
                onChange={(e) => handleMarginPercentChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
                step="0.1"
              />
            </div>

            {/* Marge in EUR */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Marge in EUR
              </label>
              <div style={{
                padding: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#059669'
              }}>
                €{marginAmount.toFixed(2)}
              </div>
            </div>

            {/* Angebotspreis */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontSize: '14px', 
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Calculator style={{ width: '14px', height: '14px' }} />
                Angebotspreis
              </label>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => handleOfferPriceChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1e40af'
                }}
                step="0.01"
              />
            </div>
          </div>

          {/* Zusammenfassung */}
          <div style={{
            backgroundColor: '#dbeafe',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Kosten:</span>
              <span>€{totalCost.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>+ Marge ({marginPercent.toFixed(1)}%):</span>
              <span>€{marginAmount.toFixed(2)}</span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid #93c5fd',
              fontWeight: '700',
              fontSize: '18px',
              color: '#1e40af'
            }}>
              <span>Angebotspreis:</span>
              <span>€{offerPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              📄 Angebot erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOfferModal;
