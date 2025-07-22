import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plane, 
  Clock, 
  Euro, 
  Package, 
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Globe
} from 'lucide-react';

const WebCargoRates = ({ shipmentData, onSelectRate, onClose }) => {
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [filterAirline, setFilterAirline] = useState('all');

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Berechne Werte falls nicht vorhanden
      const totalWeight = shipmentData.gesamtGewicht || 100;
      const totalVolume = shipmentData.gesamtVolumen || 0.5;
      const totalPieces = shipmentData.gesamtColli || 1;
      
      // Versuche echte API
      const response = await fetch('http://localhost:3001/api/webcargo/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: shipmentData.vonFlughafen,
          destination: shipmentData.nachFlughafen,
          weight: totalWeight,
          volume: totalVolume,
          pieces: totalPieces
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.rates && data.rates.length > 0) {
          setRates(data.rates);
          setFilteredRates(data.rates);
          setLoading(false);
          return;
        }
      }
      
      // Fallback auf Mock-Daten
      console.log('API nicht verfügbar, verwende Mock-Daten');
      
      const mockRates = generateMockRates(
        shipmentData.vonFlughafen,
        shipmentData.nachFlughafen,
        totalWeight,
        totalVolume
      );
      
      setRates(mockRates);
      setFilteredRates(mockRates);
      
    } catch (err) {
      console.error('Fehler beim Laden der Raten:', err);
      
      // Bei Fehler auch Mock-Daten verwenden
      const totalWeight = shipmentData.gesamtGewicht || 100;
      const totalVolume = shipmentData.gesamtVolumen || 0.5;
      
      const mockRates = generateMockRates(
        shipmentData.vonFlughafen,
        shipmentData.nachFlughafen,
        totalWeight,
        totalVolume
      );
      
      setRates(mockRates);
      setFilteredRates(mockRates);
      
    } finally {
      setLoading(false);
    }
  };

  const generateMockRates = (origin, destination, weight, volume) => {
    const airlines = [
      { name: 'Lufthansa Cargo', code: 'LH', base: 3.85 },
      { name: 'United Cargo', code: 'UA', base: 3.45 },
      { name: 'American Airlines Cargo', code: 'AA', base: 3.65 },
      { name: 'Air France Cargo', code: 'AF', base: 3.55 },
      { name: 'Emirates SkyCargo', code: 'EK', base: 3.25 },
      { name: 'Turkish Cargo', code: 'TK', base: 3.15 }
    ];

    const now = new Date();
    
    return airlines.map((airline, index) => {
      const departureHours = 6 + (index * 4);
      const departure = new Date(now);
      departure.setHours(departureHours, 0, 0, 0);
      if (departure < now) {
        departure.setDate(departure.getDate() + 1);
      }
      
      const arrival = new Date(departure);
      arrival.setHours(arrival.getHours() + 10 + Math.floor(Math.random() * 8));
      
      const ratePerKg = airline.base + (Math.random() * 0.5 - 0.25);
      const minCharge = 45;
      const basePrice = Math.max(ratePerKg * weight, minCharge);
      const fuelSurcharge = basePrice * 0.15;
      const securityCharge = weight * 0.12;
      const total = basePrice + fuelSurcharge + securityCharge;
      
      return {
        airline: airline.name,
        airline_code: airline.code,
        flight_number: `${airline.code}${Math.floor(1000 + Math.random() * 8999)}`,
        departure: departure.toISOString(),
        arrival: arrival.toISOString(),
        transit_time: `${Math.floor((arrival - departure) / 3600000)} Stunden`,
        service_level: index % 3 === 0 ? 'EXPRESS' : 'STANDARD',
        rate_per_kg: ratePerKg,
        min_charge: minCharge,
        fuel_surcharge: fuelSurcharge / weight,
        security_charge: 0.12,
        total: total,
        available_space: Math.random() > 0.3,
        route: `${origin} → ${destination}`,
        via: index % 4 === 0 ? 'FRA' : null
      };
    }).sort((a, b) => a.total - b.total);
  };

  const handleSelectRate = (rate) => {
    setSelectedRate(rate);
  };

  const confirmSelection = () => {
    if (selectedRate) {
      onSelectRate(selectedRate);
      onClose();
    }
  };

  const handleFilterChange = (airline) => {
    setFilterAirline(airline);
    if (airline === 'all') {
      setFilteredRates(rates);
    } else {
      setFilteredRates(rates.filter(r => r.airline === airline));
    }
  };

  const uniqueAirlines = [...new Set(rates.map(r => r.airline))];

  return (
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f9fafb',
          borderRadius: '12px 12px 0 0'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Globe style={{ width: '24px', height: '24px', color: '#2563eb' }} />
              WebCargo Flugraten
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {shipmentData.vonFlughafen} → {shipmentData.nachFlughafen} • 
              {shipmentData.gesamtColli} Colli • {shipmentData.gesamtGewicht}kg • {shipmentData.gesamtVolumen}m³
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Filter Bar */}
        {!loading && rates.length > 0 && (
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Filter:</span>
              <button
                onClick={() => handleFilterChange('all')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: filterAirline === 'all' ? '#2563eb' : 'white',
                  color: filterAirline === 'all' ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Alle Airlines ({rates.length})
              </button>
              {uniqueAirlines.map(airline => (
                <button
                  key={airline}
                  onClick={() => handleFilterChange(airline)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: filterAirline === airline ? '#2563eb' : 'white',
                    color: filterAirline === airline ? 'white' : '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {airline}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              color: '#6b7280'
            }}>
              <RefreshCw style={{ 
                width: '48px', 
                height: '48px', 
                marginBottom: '16px', 
                animation: 'spin 1s linear infinite' 
              }} />
              <p style={{ fontSize: '16px', margin: 0 }}>Flugraten werden geladen...</p>
            </div>
          )}

          {!loading && filteredRates.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#6b7280'
            }}>
              <Package style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#d1d5db' }} />
              <p>Keine Flugraten verfügbar für diese Filterauswahl.</p>
            </div>
          )}

          {!loading && filteredRates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredRates.map((rate, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectRate(rate)}
                  style={{
                    border: selectedRate === rate ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: selectedRate === rate ? '#eff6ff' : 'white'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRate !== rate) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRate !== rate) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                          {rate.airline}
                        </h3>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: rate.service_level === 'EXPRESS' ? '#fef3c7' : '#dbeafe',
                          color: rate.service_level === 'EXPRESS' ? '#92400e' : '#1e40af',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {rate.service_level}
                        </span>
                        {rate.available_space && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle style={{ width: '12px', height: '12px' }} />
                            Platz verfügbar
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#6b7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Plane style={{ width: '14px', height: '14px' }} />
                          {rate.flight_number}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar style={{ width: '14px', height: '14px' }} />
                          {new Date(rate.departure).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock style={{ width: '14px', height: '14px' }} />
                          {rate.transit_time}
                        </div>
                        {rate.via && (
                          <div>Via: {rate.via}</div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
                        €{rate.total.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        €{rate.rate_per_kg.toFixed(2)}/kg • Min: €{rate.min_charge}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        inkl. Treibstoff & Security
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '0 0 12px 12px'
        }}>
          <button
            onClick={() => {
              setSelectedRate(null);
              fetchRates();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#d1d5db';
            }}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
            Raten aktualisieren
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              Abbrechen
            </button>
            <button
              onClick={confirmSelection}
              disabled={!selectedRate}
              style={{
                padding: '8px 20px',
                backgroundColor: selectedRate ? '#2563eb' : '#e5e7eb',
                color: selectedRate ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedRate ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedRate) {
                  e.target.style.backgroundColor = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedRate) {
                  e.target.style.backgroundColor = '#2563eb';
                }
              }}
            >
              Rate auswählen & weiter
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WebCargoRates;