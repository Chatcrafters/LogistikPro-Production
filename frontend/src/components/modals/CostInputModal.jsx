import React, { useState, useEffect } from 'react';
import { X, DollarSign, Wand2, AlertCircle } from 'lucide-react';

const CostInputModal = ({ 
  sendung, 
  partners, 
  costParser, 
  onClose, 
  onSave 
}) => {
  // Partner-Lookup Helper
  const getPartnerName = (partnerId) => {
    if (!partnerId || !partners) return 'Partner nicht gefunden';
    
    // Partners ist ein Array (aus useSendungsData)
    if (Array.isArray(partners)) {
      const partner = partners.find(p => p.id === parseInt(partnerId));
      return partner?.name || `Partner ID ${partnerId}`;
    }
    
    // Falls Partners ein Object ist
    if (typeof partners === 'object' && partners[partnerId]) {
      return partners[partnerId].name || `Partner ID ${partnerId}`;
    }
    
    return `Partner ID ${partnerId}`;
  };

  // Local states für die Kosten
  const [costs, setCosts] = useState({
    pickup: sendung?.pickup_cost || sendung?.cost_pickup || 0,
    main: sendung?.main_cost || sendung?.cost_mainrun || sendung?.mainrun_cost || 0,
    delivery: sendung?.delivery_cost || sendung?.cost_delivery || 0
  });

  const [showMagicInput, setShowMagicInput] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug-Output
  useEffect(() => {
    console.log('=== CostInputModal Debug ===');
    console.log('Sendung:', sendung);
    console.log('Partner IDs:', {
      pickup: sendung?.pickup_partner_id,
      mainrun: sendung?.mainrun_partner_id,
      delivery: sendung?.delivery_partner_id
    });
    console.log('Partners Array:', partners);
    
    if (partners && sendung) {
      console.log('Aufgelöste Partner:', {
        pickup: getPartnerName(sendung.pickup_partner_id),
        mainrun: getPartnerName(sendung.mainrun_partner_id),
        delivery: getPartnerName(sendung.delivery_partner_id)
      });
    }
  }, [sendung, partners]);

  // Berechne Gesamtkosten
  const totalCost = Object.values(costs).reduce((sum, cost) => sum + parseFloat(cost || 0), 0);

  // Handle Magic Input
  const handleMagicParse = async () => {
    if (!magicText.trim()) return;
    
    setIsProcessing(true);
    try {
      // Verwende costParser direkt
      const result = await costParser.processMagicInput(magicText, sendung);
      
      if (result.success) {
        setCosts({
          pickup: result.costs.pickup || costs.pickup,
          main: result.costs.main || costs.main,
          delivery: result.costs.delivery || costs.delivery
        });
        setShowMagicInput(false);
        setMagicText('');
      } else {
        alert('Fehler beim Parsen: ' + result.error);
      }
    } catch (error) {
      console.error('Magic parse error:', error);
      alert('Fehler beim Verarbeiten der Eingabe');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Save
  const handleSave = () => {
    const costsData = {
      pickup_cost: parseFloat(costs.pickup) || 0,
      main_cost: parseFloat(costs.main) || 0,
      delivery_cost: parseFloat(costs.delivery) || 0,
      total_cost: totalCost
    };
    
    console.log('Saving costs:', costsData);
    onSave(costsData);
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
        maxHeight: '90vh',
        overflow: 'auto',
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
            <DollarSign style={{ width: '24px', height: '24px', color: '#10b981' }} />
            Kosten erfassen für {sendung?.position || 'Sendung'}
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
          {/* Sendungsinfo */}
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              Route: {sendung?.origin_airport || sendung?.from_airport} → {sendung?.destination_airport || sendung?.to_airport}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Gewicht: {sendung?.total_weight || sendung?.weight || 0} kg | 
              Packstücke: {sendung?.total_pieces || sendung?.pieces || 0}
            </div>
          </div>

          {/* Kosten-Eingabe Felder */}
          <div style={{ marginBottom: '20px' }}>
            {/* Vorlaufkosten */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Vorlaufkosten (Abholung) - {getPartnerName(sendung?.pickup_partner_id)}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}>€</span>
                <input
                  type="number"
                  value={costs.pickup}
                  onChange={(e) => setCosts({...costs, pickup: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              {sendung?.pickup_cost > 0 && (
                <div style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#10b981'
                }}>
                  ✓ Aus Kalkulation übernommen: €{sendung.pickup_cost}
                </div>
              )}
            </div>

            {/* Hauptlaufkosten */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Hauptlaufkosten - {getPartnerName(sendung?.mainrun_partner_id)}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}>€</span>
                <input
                  type="number"
                  value={costs.main}
                  onChange={(e) => setCosts({...costs, main: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            {/* Nachlaufkosten */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Nachlaufkosten (Zustellung) - {getPartnerName(sendung?.delivery_partner_id)}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}>€</span>
                <input
                  type="number"
                  value={costs.delivery}
                  onChange={(e) => setCosts({...costs, delivery: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 32px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px'
                  }}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Magic Input Button */}
          <button
            onClick={() => setShowMagicInput(!showMagicInput)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Wand2 style={{ width: '16px', height: '16px' }} />
            Magic Input - Freitext-Eingabe
          </button>

          {/* Magic Input Area */}
          {showMagicInput && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Füge eine E-Mail oder Text mit Kosten ein
                </span>
              </div>
              <textarea
                value={magicText}
                onChange={(e) => setMagicText(e.target.value)}
                placeholder="z.B. 'Vorlauf 250€, Hauptlauf 1800€, Nachlauf 450€' oder füge eine komplette E-Mail ein..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={handleMagicParse}
                disabled={isProcessing || !magicText.trim()}
                style={{
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {isProcessing ? 'Verarbeite...' : 'Kosten erkennen'}
              </button>
            </div>
          )}

          {/* Kostenübersicht */}
          <div style={{
            backgroundColor: '#ecfdf5',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              fontSize: '14px', 
              color: '#065f46',
              marginBottom: '4px'
            }}>
              Vorlauf: €{parseFloat(costs.pickup || 0).toFixed(2)}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#065f46',
              marginBottom: '4px'
            }}>
              Hauptlauf: €{parseFloat(costs.main || 0).toFixed(2)}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#065f46',
              marginBottom: '8px'
            }}>
              Nachlauf: €{parseFloat(costs.delivery || 0).toFixed(2)}
            </div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '700',
              color: '#065f46',
              borderTop: '1px solid #10b981',
              paddingTop: '8px'
            }}>
              Gesamt: €{totalCost.toFixed(2)}
            </div>
          </div>

          {/* Action Buttons */}
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
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              💰 Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostInputModal;
