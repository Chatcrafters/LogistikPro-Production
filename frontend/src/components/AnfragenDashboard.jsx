import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Filter,
  Calendar,
  Euro,
  X
} from 'lucide-react';

const AnfragenDashboard = ({ onClose }) => {
  const [anfragen, setAnfragen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, complete
  const [selectedAnfrage, setSelectedAnfrage] = useState(null);
  const [updateModal, setUpdateModal] = useState(false);
  const [updateCost, setUpdateCost] = useState('');

  useEffect(() => {
    loadAnfragen();
  }, []);

  const loadAnfragen = async () => {
  try {
    setLoading(true);
    const response = await fetch('http://localhost:3001/api/quotations');
    if (!response.ok) {
      console.error('Fehler beim Laden der Anfragen:', response.status);
      setAnfragen([]);
      return;
    }
    const data = await response.json();
    setAnfragen(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Fehler beim Laden der Anfragen:', error);
    setAnfragen([]);
  } finally {
    setLoading(false);
  }
};

  const getStatusBadge = (status) => {
    switch (status) {
      case 'calculated':
        return { color: '#059669', icon: CheckCircle, text: 'Berechnet' };
      case 'requested':
        return { color: '#f59e0b', icon: Clock, text: 'Angefragt' };
      case 'received':
        return { color: '#059669', icon: CheckCircle, text: 'Erhalten' };
      default:
        return { color: '#6b7280', icon: AlertCircle, text: 'Offen' };
    }
  };

  const getOverallStatus = (anfrage) => {
    const statuses = [
      anfrage.pickup_status,
      anfrage.main_status,
      anfrage.delivery_status
    ];
    
    if (statuses.every(s => s === 'received' || s === 'calculated')) {
      return { color: '#059669', text: 'Vollständig', progress: 100 };
    } else if (statuses.some(s => s === 'requested' || s === 'received' || s === 'calculated')) {
      const complete = statuses.filter(s => s === 'received' || s === 'calculated').length;
      return { color: '#f59e0b', text: 'Teilweise', progress: (complete / 3) * 100 };
    } else {
      return { color: '#dc2626', text: 'Offen', progress: 0 };
    }
  };

  const handleUpdateCost = async (anfrageId, type, cost) => {
    try {
      const response = await fetch(`http://localhost:3001/api/quotations/${anfrageId}/update-cost`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, cost })
      });
      
      if (response.ok) {
        loadAnfragen();
        setUpdateModal(false);
        setUpdateCost('');
        setSelectedAnfrage(null);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
    }
  };

  const handleSendRequest = async (anfrageId, type) => {
    try {
      const response = await fetch(`http://localhost:3001/api/quotations/${anfrageId}/send-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      
      if (response.ok) {
        loadAnfragen();
      }
    } catch (error) {
      console.error('Fehler beim Senden der Anfrage:', error);
    }
  };

  const filteredAnfragen = anfragen.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return getOverallStatus(a).text !== 'Vollständig';
    if (filter === 'complete') return getOverallStatus(a).text === 'Vollständig';
    return true;
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 50
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '80rem',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
              <Clock style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Offene Anfragen & Kalkulationen
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
              Verwalten Sie ausstehende Preisanfragen und Kalkulationen
            </p>
          </div>
          <button onClick={onClose} style={{ padding: '8px', cursor: 'pointer', border: 'none', background: 'none' }}>
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Filter style={{ width: '16px', height: '16px', color: '#6b7280' }} />
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              backgroundColor: filter === 'all' ? '#2563eb' : 'white',
              color: filter === 'all' ? 'white' : '#374151',
              border: filter === 'all' ? 'none' : '1px solid #d1d5db'
            }}
          >
            Alle ({anfragen.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              backgroundColor: filter === 'pending' ? '#f59e0b' : 'white',
              color: filter === 'pending' ? 'white' : '#374151',
              border: filter === 'pending' ? 'none' : '1px solid #d1d5db'
            }}
          >
            Ausstehend ({anfragen.filter(a => getOverallStatus(a).text !== 'Vollständig').length})
          </button>
          <button
            onClick={() => setFilter('complete')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              backgroundColor: filter === 'complete' ? '#059669' : 'white',
              color: filter === 'complete' ? 'white' : '#374151',
              border: filter === 'complete' ? 'none' : '1px solid #d1d5db'
            }}
          >
            Vollständig ({anfragen.filter(a => getOverallStatus(a).text === 'Vollständig').length})
          </button>
          <button
            onClick={loadAnfragen}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw style={{ width: '14px', height: '14px' }} />
            Aktualisieren
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw style={{ width: '24px', height: '24px', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>Lade Anfragen...</p>
            </div>
          ) : filteredAnfragen.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <AlertCircle style={{ width: '48px', height: '48px', margin: '0 auto', color: '#d1d5db' }} />
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>Keine Anfragen gefunden</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredAnfragen.map(anfrage => {
                const status = getOverallStatus(anfrage);
                return (
                  <div
                    key={anfrage.id}
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontWeight: '600' }}>
                          {anfrage.shipment_number} • {anfrage.customer_name}
                        </h3>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: status.color + '20',
                          color: status.color
                        }}>
                          {status.text}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        <Calendar style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} />
                        {new Date(anfrage.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: '4px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${status.progress}%`,
                        backgroundColor: status.color,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    {/* Cost Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      {/* Abholung */}
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                          Abholung ({anfrage.pickup_partner_name})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            {anfrage.pickup_cost ? (
                              <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                €{parseFloat(anfrage.pickup_cost).toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>Ausstehend</span>
                            )}
                          </div>
                          {getStatusBadge(anfrage.pickup_status).icon && (
                            React.createElement(getStatusBadge(anfrage.pickup_status).icon, {
                              style: { width: '16px', height: '16px', color: getStatusBadge(anfrage.pickup_status).color }
                            })
                          )}
                        </div>
                        {anfrage.pickup_status === 'requested' && anfrage.pickup_requested_at && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                            Angefragt: {new Date(anfrage.pickup_requested_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                        {anfrage.pickup_status !== 'calculated' && anfrage.pickup_status !== 'received' && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleSendRequest(anfrage.id, 'pickup')}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Send style={{ width: '12px', height: '12px' }} />
                              Anfragen
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAnfrage({ id: anfrage.id, type: 'pickup' });
                                setUpdateModal(true);
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Euro style={{ width: '12px', height: '12px' }} />
                              Eingeben
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Hauptlauf */}
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                          Hauptlauf ({anfrage.main_partner_name})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            {anfrage.main_cost ? (
                              <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                €{parseFloat(anfrage.main_cost).toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>Ausstehend</span>
                            )}
                          </div>
                          {getStatusBadge(anfrage.main_status).icon && (
                            React.createElement(getStatusBadge(anfrage.main_status).icon, {
                              style: { width: '16px', height: '16px', color: getStatusBadge(anfrage.main_status).color }
                            })
                          )}
                        </div>
                        {anfrage.main_status === 'requested' && anfrage.main_requested_at && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                            Angefragt: {new Date(anfrage.main_requested_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                        {anfrage.main_status !== 'calculated' && anfrage.main_status !== 'received' && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleSendRequest(anfrage.id, 'main')}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Send style={{ width: '12px', height: '12px' }} />
                              Anfragen
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAnfrage({ id: anfrage.id, type: 'main' });
                                setUpdateModal(true);
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Euro style={{ width: '12px', height: '12px' }} />
                              Eingeben
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Zustellung */}
                      <div style={{
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                          Zustellung ({anfrage.delivery_partner_name})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            {anfrage.delivery_cost ? (
                              <span style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                €{parseFloat(anfrage.delivery_cost).toFixed(2)}
                              </span>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>Ausstehend</span>
                            )}
                          </div>
                          {getStatusBadge(anfrage.delivery_status).icon && (
                            React.createElement(getStatusBadge(anfrage.delivery_status).icon, {
                              style: { width: '16px', height: '16px', color: getStatusBadge(anfrage.delivery_status).color }
                            })
                          )}
                        </div>
                        {anfrage.delivery_status === 'requested' && anfrage.delivery_requested_at && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                            Angefragt: {new Date(anfrage.delivery_requested_at).toLocaleDateString('de-DE')}
                          </div>
                        )}
                        {anfrage.delivery_status !== 'calculated' && anfrage.delivery_status !== 'received' && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleSendRequest(anfrage.id, 'delivery')}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Send style={{ width: '12px', height: '12px' }} />
                              Anfragen
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAnfrage({ id: anfrage.id, type: 'delivery' });
                                setUpdateModal(true);
                              }}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Euro style={{ width: '12px', height: '12px' }} />
                              Eingeben
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Route: {anfrage.from_airport} → {anfrage.to_airport}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Gesamtkosten</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                          €{anfrage.total_cost ? parseFloat(anfrage.total_cost).toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Update Modal */}
        {updateModal && selectedAnfrage && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '24rem',
              width: '100%'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                Kosten eingeben
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {selectedAnfrage.type === 'pickup' && 'Abholungskosten'}
                  {selectedAnfrage.type === 'main' && 'Hauptlaufkosten'}
                  {selectedAnfrage.type === 'delivery' && 'Zustellungskosten'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updateCost}
                  onChange={(e) => setUpdateCost(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '4px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  placeholder="0.00"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setUpdateModal(false);
                    setUpdateCost('');
                    setSelectedAnfrage(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleUpdateCost(selectedAnfrage.id, selectedAnfrage.type, updateCost)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnfragenDashboard;