// frontend/src/components/modals/MilestoneHistory.jsx
import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, User, Calendar, Mail, Phone, AlertCircle, History, Download } from 'lucide-react';

const MilestoneHistory = ({ isOpen, onClose, sendung }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, milestones, status, emails

  // Milestone-Definitionen (synchronized with SendungsBoard)
  const milestoneDefinitions = {
    0: { text: "Nicht begonnen", color: "#9ca3af", category: "start" },
    1: { text: "Abholung beauftragt", color: "#f59e0b", category: "abholung" },
    2: { text: "Sendung abgeholt", color: "#3b82f6", category: "abholung" },
    3: { text: "Anlieferung im Lager", color: "#10b981", category: "abholung" },
    4: { text: "Sendung gebucht", color: "#f59e0b", category: "carrier" },
    5: { text: "Zoll erledigt", color: "#8b5cf6", category: "carrier" },
    6: { text: "Anlieferung bei Airline", color: "#3b82f6", category: "carrier" },
    7: { text: "Sendung abgeflogen", color: "#06b6d4", category: "carrier" },
    8: { text: "Sendung angekommen", color: "#10b981", category: "carrier" },
    9: { text: "Sendung verzollt", color: "#f59e0b", category: "zustellung" },
    10: { text: "Sendung zugestellt", color: "#10b981", category: "zustellung" }
  };

  // Helper function to get milestone text from history entry
  const getMilestoneTextFromEntry = (entry) => {
    if (entry.milestone_id && milestoneDefinitions[entry.milestone_id]) {
      return milestoneDefinitions[entry.milestone_id].text;
    }
    
    // Parse from details if available
    if (entry.details && entry.details.includes('Status geändert zu:')) {
      const match = entry.details.match(/Status geändert zu: (.+?) \(/);
      if (match) return match[1];
    }
    
    return `Milestone ${entry.milestone_id || '?'}`;
  };

  // Historie laden
  useEffect(() => {
    if (isOpen && sendung?.id) {
      loadHistory();
    }
  }, [isOpen, sendung?.id]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/shipments/${sendung.id}/history`);
      
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Historie');
      }

      const data = await response.json();
      
      // Sortiere nach Datum (neueste zuerst)
      const sortedHistory = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setHistory(sortedHistory);
    } catch (err) {
      console.error('Fehler beim Laden der Historie:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Historie filtern
  const getFilteredHistory = () => {
    if (filterType === 'all') return history;
    
    return history.filter(entry => {
      switch (filterType) {
        case 'milestones':
          return entry.action === 'Milestone Update' || entry.action === 'milestone_update';
        case 'status':
          return entry.action === 'Status geändert' || entry.action === 'status_change';
        case 'emails':
          return entry.action === 'Status-Anfrage' || entry.action === 'E-Mail gesendet';
        default:
          return true;
      }
    });
  };

  // Entry-Icon bestimmen
  const getEntryIcon = (entry) => {
    if (entry.action === 'Milestone Update' || entry.action === 'milestone_update') {
      const milestone = milestoneDefinitions[entry.milestone_id];
      return (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: milestone?.color || '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {entry.milestone_id || '?'}
        </div>
      );
    }

    if (entry.action === 'Status-Anfrage' || entry.action === 'E-Mail gesendet') {
      return <Mail size={16} style={{ color: '#3b82f6' }} />;
    }

    if (entry.action === 'Status geändert') {
      return <CheckCircle size={16} style={{ color: '#10b981' }} />;
    }

    return <Clock size={16} style={{ color: '#6b7280' }} />;
  };

  // Timeline-Farbe bestimmen
  const getTimelineColor = (entry) => {
    if (entry.action === 'Milestone Update') return '#3b82f6';
    if (entry.action === 'Status-Anfrage') return '#f59e0b';
    if (entry.action === 'Status geändert') return '#10b981';
    return '#9ca3af';
  };

  // Export-Funktion
  const exportHistory = () => {
    const csvContent = [
      ['Datum', 'Zeit', 'Aktion', 'Details', 'Benutzer'],
      ...history.map(entry => [
        new Date(entry.created_at).toLocaleDateString('de-DE'),
        new Date(entry.created_at).toLocaleTimeString('de-DE'),
        entry.action,
        entry.details || '',
        entry.created_by || 'System'
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historie-${sendung.position}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!isOpen || !sendung) return null;

  const filteredHistory = getFilteredHistory();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '85vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <History size={24} style={{ color: '#3b82f6' }} />
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                📊 Milestone-Historie
              </h2>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {sendung.position} - {sendung.reference || 'Keine Referenz'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={exportHistory}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Historie als CSV exportieren"
            >
              <Download size={14} />
              Export
            </button>
            
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Filter:
            </span>
            
            {[
              { key: 'all', label: 'Alle', count: history.length },
              { key: 'milestones', label: 'Milestones', count: history.filter(h => h.action === 'Milestone Update').length },
              { key: 'status', label: 'Status', count: history.filter(h => h.action === 'Status geändert').length },
              { key: 'emails', label: 'E-Mails', count: history.filter(h => h.action === 'Status-Anfrage').length }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: '1px solid #d1d5db',
                  backgroundColor: filterType === filter.key ? '#3b82f6' : 'white',
                  color: filterType === filter.key ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {filter.label}
                <span style={{
                  backgroundColor: filterType === filter.key ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                  color: filterType === filter.key ? 'white' : '#6b7280',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 24px',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {isLoading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <Clock size={20} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
              Historie wird geladen...
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '16px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={20} />
              <div>
                <strong>Fehler beim Laden:</strong> {error}
              </div>
            </div>
          )}

          {!isLoading && !error && filteredHistory.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6b7280'
            }}>
              <History size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                Keine Historie gefunden
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {filterType === 'all' 
                  ? 'Es sind noch keine Aktionen für diese Sendung protokolliert.'
                  : `Keine Einträge für Filter "${filterType}" gefunden.`
                }
              </p>
            </div>
          )}

          {/* Timeline */}
          {!isLoading && !error && filteredHistory.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Timeline-Linie */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '0',
                bottom: '0',
                width: '2px',
                backgroundColor: '#e5e7eb'
              }} />

              {filteredHistory.map((entry, index) => (
                <div
                  key={entry.id || index}
                  style={{
                    position: 'relative',
                    paddingLeft: '60px',
                    paddingBottom: index < filteredHistory.length - 1 ? '24px' : '0'
                  }}
                >
                  {/* Timeline-Punkt */}
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '0',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: getTimelineColor(entry),
                    border: '3px solid white',
                    boxShadow: '0 0 0 1px #e5e7eb'
                  }} />

                  {/* Entry-Content */}
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {getEntryIcon(entry)}
                        <div>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#1f2937'
                          }}>
                            {entry.action}
                            {entry.milestone_id && (
                              <span style={{ color: '#6b7280', fontWeight: '400' }}>
                                {' '}→ {milestoneDefinitions[entry.milestone_id]?.text}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            {new Date(entry.created_at).toLocaleString('de-DE')}
                            {entry.created_by && ` • von ${entry.created_by}`}
                          </div>
                        </div>
                      </div>

                      {/* Kategorie-Badge */}
                      {entry.milestone_id && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: `${milestoneDefinitions[entry.milestone_id]?.color}20`,
                          color: milestoneDefinitions[entry.milestone_id]?.color,
                          textTransform: 'uppercase'
                        }}>
                          {milestoneDefinitions[entry.milestone_id]?.category}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    {entry.details && (
                      <div style={{
                        fontSize: '13px',
                        color: '#4b5563',
                        backgroundColor: '#f9fafb',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${getTimelineColor(entry)}`
                      }}>
                        {entry.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {filteredHistory.length} {filteredHistory.length === 1 ? 'Eintrag' : 'Einträge'} 
            {filterType !== 'all' && ` (gefiltert)`}
          </div>
          
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneHistory;