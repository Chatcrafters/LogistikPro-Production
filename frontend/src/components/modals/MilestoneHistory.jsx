// frontend/src/components/modals/MilestoneHistory.jsx
// ✅ NEUE VERSION - Zeigt Milestone-Texte statt Nummern, chronologisch sortiert
import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, Mail, AlertCircle, History, Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const MilestoneHistory = ({ isOpen, onClose, sendung, onUpdate }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, milestones, emails

  // ✅ MILESTONE-DEFINITIONEN MIT TEXTEN
  const milestoneDefinitions = {
    0: { text: "Nicht begonnen", color: "#9ca3af", ampel: "start", icon: "⚪" },
    1: { text: "Abholung beauftragt", color: "#f59e0b", ampel: "abholung", icon: "📅" },
    2: { text: "Sendung abgeholt", color: "#3b82f6", ampel: "abholung", icon: "📅" },
    3: { text: "Anlieferung im Lager", color: "#10b981", ampel: "abholung", icon: "📅" },
    4: { text: "Sendung gebucht", color: "#f59e0b", ampel: "carrier", icon: "✈️" },
    5: { text: "Zoll erledigt", color: "#8b5cf6", ampel: "carrier", icon: "✈️" },
    6: { text: "Anlieferung bei Airline", color: "#3b82f6", ampel: "carrier", icon: "✈️" },
    7: { text: "Sendung abgeflogen", color: "#06b6d4", ampel: "carrier", icon: "✈️" },
    8: { text: "Sendung angekommen", color: "#10b981", ampel: "carrier", icon: "✈️" },
    9: { text: "Sendung verzollt", color: "#f59e0b", ampel: "zustellung", icon: "🚚" },
    10: { text: "Sendung zugestellt", color: "#10b981", ampel: "zustellung", icon: "🚚" }
  };

  // ✅ AMPEL-NAMEN
  const ampelNames = {
    abholung: "Abholung",
    carrier: "Carrier/Transport",
    zustellung: "Zustellung"
  };

  // ✅ HISTORIE LADEN - MIT MILESTONE-HISTORY PARSING
  const loadHistory = async () => {
    if (!sendung?.id) return;
    setIsLoading(true);
    setError(null);
    
    try {
      // Verwende milestone_history direkt aus sendung wenn vorhanden
      if (sendung.milestone_history && Array.isArray(sendung.milestone_history)) {
        console.log('📊 Using milestone_history from sendung:', sendung.milestone_history);
        
        // Konvertiere milestone_history zu lesbarem Format
        const processedHistory = sendung.milestone_history.map((entry, index) => {
          const milestoneId = entry.milestone || 0;
          const definition = milestoneDefinitions[milestoneId] || {};
          
          return {
            id: `history-${index}`,
            action: 'Milestone Update',
            milestone_id: milestoneId,
            milestone_text: entry.text || definition.text || `Milestone ${milestoneId}`,
            ampel: entry.ampel || definition.ampel || 'unbekannt',
            ampel_icon: definition.icon || '📍',
            color: definition.color || '#6b7280',
            created_at: entry.timestamp || entry.date || new Date().toISOString(),
            formatted_date: entry.date || (entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('de-DE') : ''),
            formatted_time: entry.time || (entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''),
            created_by: entry.created_by || 'System',
            details: `Status geändert zu: ${entry.text || definition.text}`
          };
        });
        
        // Sortiere nach Datum (neueste zuerst)
        processedHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setHistory(processedHistory);
        
      } else {
        // Fallback: Lade vom Backend
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/shipments/${sendung.id}/history`);
        if (!response.ok) throw new Error('Netzwerkfehler beim Laden der Historie');
        
        const data = await response.json();
        
        // Verarbeite Backend-Daten
        const processedData = data.map(entry => {
          // Versuche Milestone-ID aus details zu extrahieren
          let milestoneId = entry.milestone_id;
          let milestoneText = entry.details;
          
          if (!milestoneId && entry.details) {
            const match = entry.details.match(/Milestone geändert auf (\d+)/);
            if (match) {
              milestoneId = parseInt(match[1]);
            }
          }
          
          if (milestoneId !== undefined && milestoneId !== null) {
            const definition = milestoneDefinitions[milestoneId] || {};
            milestoneText = definition.text || `Milestone ${milestoneId}`;
            
            return {
              ...entry,
              milestone_id: milestoneId,
              milestone_text: milestoneText,
              ampel: definition.ampel || 'unbekannt',
              ampel_icon: definition.icon || '📍',
              color: definition.color || '#6b7280',
              formatted_date: new Date(entry.created_at).toLocaleDateString('de-DE'),
              formatted_time: new Date(entry.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
            };
          }
          
          return {
            ...entry,
            formatted_date: new Date(entry.created_at).toLocaleDateString('de-DE'),
            formatted_time: new Date(entry.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          };
        });
        
        // Sortiere nach Datum (neueste zuerst)
        processedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setHistory(processedData);
      }
    } catch (err) {
      console.error('❌ Historie-Fehler:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && sendung) {
      loadHistory();
    }
  }, [isOpen, sendung]);

  // ✅ FILTER-FUNKTIONEN
  const isMilestoneUpdate = (action) => {
    return action === 'Milestone Update' || 
           action === 'milestone_update' || 
           action === 'Status-Update' ||
           (action && action.toLowerCase().includes('milestone'));
  };
  
  const isEmailRequest = (action) => {
    return action === 'Status-Anfrage' || 
           action === 'E-Mail gesendet' ||
           (action && action.toLowerCase().includes('mail'));
  };

  // Historie filtern
  const getFilteredHistory = () => {
    if (filterType === 'all') return history;
    return history.filter(entry => {
      switch (filterType) {
        case 'milestones': 
          return isMilestoneUpdate(entry.action);
        case 'emails': 
          return isEmailRequest(entry.action);
        default: 
          return true;
      }
    });
  };

  // ✅ EXPORT-FUNKTION
  const exportHistory = () => {
    const csvContent = [
      ['Datum', 'Zeit', 'Milestone', 'Status', 'Ampel', 'Benutzer'],
      ...history.map(entry => [
        entry.formatted_date || new Date(entry.created_at).toLocaleDateString('de-DE'),
        entry.formatted_time || new Date(entry.created_at).toLocaleTimeString('de-DE'),
        entry.milestone_id !== undefined ? `MS ${entry.milestone_id}` : '-',
        entry.milestone_text || entry.action || '-',
        entry.ampel ? ampelNames[entry.ampel] || entry.ampel : '-',
        entry.created_by || 'System'
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `milestone-historie-${sendung.position}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !sendung) return null;

  const filteredHistory = getFilteredHistory();
  const filterButtons = [
    { key: 'all', label: 'Alle', count: history.length },
    { key: 'milestones', label: 'Milestones', count: history.filter(h => isMilestoneUpdate(h.action)).length },
    { key: 'emails', label: 'E-Mails', count: history.filter(h => isEmailRequest(h.action)).length }
  ];

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
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        
        {/* HEADER */}
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                Milestone-Historie
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
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
              <Download size={14} /> Export
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

        {/* AKTUELLER STATUS */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#f0f9ff',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '12px' }}>
            📊 Aktueller Milestone-Stand
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>📅</span>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Abholung</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  MS {sendung.pickup_milestone || 0}
                </div>
              </div>
            </div>
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>✈️</span>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Carrier</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  MS {sendung.carrier_milestone || 0}
                </div>
              </div>
            </div>
            <div style={{
              padding: '8px 12px',
              backgroundColor: 'white',
              borderRadius: '6px',
              border: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>🚚</span>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Zustellung</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  MS {sendung.delivery_milestone || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Filter:</span>
            {filterButtons.map(filter => (
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
        
        {/* HISTORIE CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Clock size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              Lade Historie...
            </div>
          )}
          
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '16px',
              color: '#dc2626'
            }}>
              <strong>Fehler:</strong> {error}
            </div>
          )}
          
          {!isLoading && !error && filteredHistory.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <History size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                Keine Einträge gefunden
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {filterType === 'all' 
                  ? 'Es sind noch keine Aktionen protokolliert.' 
                  : `Keine Einträge für den Filter "${filterButtons.find(f => f.key === filterType)?.label || ''}" gefunden.`}
              </p>
            </div>
          )}
          
          {!isLoading && !error && filteredHistory.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Timeline Linie */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                bottom: '20px',
                width: '2px',
                backgroundColor: '#e5e7eb'
              }} />
              
              {/* Historie Einträge */}
              {filteredHistory.map((entry, index) => {
                const isLastEntry = index === filteredHistory.length - 1;
                const nextEntry = !isLastEntry ? filteredHistory[index + 1] : null;
                const showProgress = nextEntry && entry.milestone_id !== undefined && nextEntry.milestone_id !== undefined;
                
                return (
                  <div key={entry.id || index} style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: isLastEntry ? '0' : '24px',
                    position: 'relative'
                  }}>
                    {/* Timeline Punkt */}
                    <div style={{
                      width: '40px',
                      flexShrink: 0,
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: entry.color || '#6b7280',
                        border: '3px solid white',
                        boxShadow: '0 0 0 2px #e5e7eb',
                        marginTop: '4px',
                        zIndex: 1
                      }} />
                    </div>
                    
                    {/* Inhalt */}
                    <div style={{
                      flex: 1,
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '14px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                      {/* Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {entry.ampel_icon && <span>{entry.ampel_icon}</span>}
                            {entry.milestone_id !== undefined ? (
                              <>
                                Milestone {entry.milestone_id}: {entry.milestone_text || `Milestone ${entry.milestone_id}`}
                              </>
                            ) : (
                              entry.action
                            )}
                          </div>
                          
                          {/* Datum und Zeit */}
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              {entry.formatted_date || 'Kein Datum'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              {entry.formatted_time || 'Keine Zeit'}
                            </span>
                            {entry.created_by && (
                              <span>• {entry.created_by}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Ampel Badge */}
                        {entry.ampel && entry.ampel !== 'unbekannt' && (
                          <div style={{
                            padding: '3px 10px',
                            backgroundColor: (entry.color || '#6b7280') + '20',
                            color: entry.color || '#6b7280',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {ampelNames[entry.ampel] || entry.ampel}
                          </div>
                        )}
                      </div>
                      
                      {/* Details */}
                      {entry.details && !entry.details.includes('Milestone geändert auf') && (
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #f3f4f6',
                          fontSize: '13px',
                          color: '#4b5563'
                        }}>
                          {entry.details}
                        </div>
                      )}
                      
                      {/* Progress Indicator */}
                      {showProgress && (
                        <div style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #f3f4f6',
                          fontSize: '11px',
                          color: '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {entry.milestone_id > nextEntry.milestone_id ? (
                            <>
                              <TrendingUp size={12} style={{ color: '#10b981' }} />
                              <span style={{ color: '#10b981' }}>
                                Fortschritt von MS {nextEntry.milestone_id}
                              </span>
                            </>
                          ) : entry.milestone_id < nextEntry.milestone_id ? (
                            <>
                              <TrendingDown size={12} style={{ color: '#ef4444' }} />
                              <span style={{ color: '#ef4444' }}>
                                Rückschritt von MS {nextEntry.milestone_id}
                              </span>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {filteredHistory.length} {filteredHistory.length === 1 ? 'Eintrag' : 'Einträge'} in der Historie
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