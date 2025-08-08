// frontend/src/components/modals/MilestoneUpdateModal.jsx
// ✅ NEUE VERSION - Separate Milestones pro Ampel
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const MilestoneUpdateModal = ({ isOpen, onClose, sendung, onUpdateMilestone, ampelType }) => {
  // ✅ NEUE LOGIK: Initialer Milestone basierend auf Ampel-Typ
  const getInitialMilestone = () => {
    if (!sendung) return 0;
    
    switch(ampelType) {
      case 'abholung':
        return sendung.pickup_milestone || 0;
      case 'carrier':
        return sendung.carrier_milestone || 0;
      case 'zustellung':
        return sendung.delivery_milestone || 0;
      default:
        return sendung.current_milestone || 0;
    }
  };

  const [selectedMilestone, setSelectedMilestone] = useState(getInitialMilestone());
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Update wenn sich Sendung oder Ampel-Typ ändert
  useEffect(() => {
    setSelectedMilestone(getInitialMilestone());
  }, [sendung, ampelType]);

  // Milestone-Definitionen für alle 3 Ampel-Bereiche
  const milestoneDefinitions = {
    // AMPEL 1: Abholung (Vorlauf) - Milestones 0-3
    abholung: {
      range: [0, 1, 2, 3],
      title: "📅 Abholung & Vorlauf",
      milestones: {
        0: { text: "Nicht begonnen", color: "#9ca3af" },
        1: { text: "Abholung beauftragt", color: "#f59e0b" },
        2: { text: "Sendung abgeholt", color: "#3b82f6" },
        3: { text: "Anlieferung im Lager", color: "#10b981" }
      }
    },
    // AMPEL 2: Carrier (Hauptlauf) - Milestones 0,4-8
    carrier: {
      range: [0, 4, 5, 6, 7, 8],
      title: "✈️ Transport & Hauptlauf",
      milestones: {
        0: { text: "Nicht begonnen", color: "#9ca3af" },
        4: { text: "Sendung gebucht", color: "#f59e0b" },
        5: { text: "Zoll erledigt", color: "#8b5cf6" },
        6: { text: "Anlieferung bei Airline", color: "#3b82f6" },
        7: { text: "Sendung abgeflogen", color: "#06b6d4" },
        8: { text: "Sendung angekommen", color: "#10b981" }
      }
    },
    // AMPEL 3: Zustellung (Nachlauf) - Milestones 0,9-10
    zustellung: {
      range: [0, 9, 10],
      title: "🚚 Zustellung & Nachlauf",
      milestones: {
        0: { text: "Nicht begonnen", color: "#9ca3af" },
        9: { text: "Sendung verzollt", color: "#f59e0b" },
        10: { text: "Sendung zugestellt", color: "#10b981" }
      }
    }
  };

  // ✅ NEUE LOGIK: Nur relevante Milestones für die aktuelle Ampel
  const getCurrentAmpelDefinition = () => {
    return milestoneDefinitions[ampelType] || milestoneDefinitions.abholung;
  };

  const currentAmpelDef = getCurrentAmpelDefinition();

  // ✅ Verfügbare Milestones NUR für die aktuelle Ampel
  const getAvailableMilestones = () => {
    const available = [];
    const currentValue = getInitialMilestone();
    
    // Nur Milestones der aktuellen Ampel anzeigen
    currentAmpelDef.range.forEach(milestoneId => {
      const definition = currentAmpelDef.milestones[milestoneId];
      if (definition) {
        available.push({
          id: milestoneId,
          category: ampelType,
          definition,
          isCurrent: milestoneId === currentValue,
          isCompleted: milestoneId < currentValue && milestoneId !== 0,
          isNext: false,
          isPossible: true
        });
      }
    });

    return available;
  };

  const availableMilestones = getAvailableMilestones();

  const handleSave = async () => {
    const currentValue = getInitialMilestone();
    
    if (!sendung || selectedMilestone === currentValue) {
      onClose();
      return;
    }

    setIsLoading(true);
    
    console.log('🎯 SAVING MILESTONE:', {
      shipmentId: sendung.id,
      milestone: selectedMilestone,
      ampelType: ampelType,
      previousValue: currentValue
    });

    try {
      // ✅ WICHTIG: Sende ampelType mit!
      await onUpdateMilestone(sendung.id, selectedMilestone, ampelType);
      onClose();
    } catch (error) {
      console.error('❌ Fehler beim Milestone-Update:', error);
      alert('Fehler beim Speichern des Milestones!');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !sendung) return null;

  // ✅ Aktueller Wert für diese Ampel
  const currentMilestoneValue = getInitialMilestone();
  const currentMilestoneText = currentAmpelDef.milestones[currentMilestoneValue]?.text || 'Unbekannt';

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
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
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
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {currentAmpelDef.title}
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              {sendung.position} - {sendung.reference || 'Keine Referenz'}
            </p>
          </div>
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

        {/* Content */}
        <div style={{
          padding: '24px',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {/* ✅ ALLE 3 AMPEL-STATUS ANZEIGEN */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <CheckCircle size={16} style={{ color: '#0ea5e9' }} />
              <span style={{ fontWeight: '600', color: '#0369a1' }}>
                Aktuelle Milestone-Status
              </span>
            </div>
            
            {/* Zeige Status ALLER 3 Ampeln */}
            <div style={{ fontSize: '13px', color: '#0369a1', lineHeight: '1.6' }}>
              <div style={{ 
                padding: '4px 0',
                fontWeight: ampelType === 'abholung' ? '700' : '400',
                backgroundColor: ampelType === 'abholung' ? '#dbeafe' : 'transparent',
                paddingLeft: '8px',
                marginLeft: '-8px',
                marginRight: '-8px',
                borderRadius: '4px'
              }}>
                📅 <strong>Abholung:</strong> MS {sendung.pickup_milestone || 0} - {
                  milestoneDefinitions.abholung.milestones[sendung.pickup_milestone || 0]?.text || 'Nicht begonnen'
                }
              </div>
              <div style={{ 
                padding: '4px 0',
                fontWeight: ampelType === 'carrier' ? '700' : '400',
                backgroundColor: ampelType === 'carrier' ? '#dbeafe' : 'transparent',
                paddingLeft: '8px',
                marginLeft: '-8px',
                marginRight: '-8px',
                borderRadius: '4px'
              }}>
                ✈️ <strong>Carrier:</strong> MS {sendung.carrier_milestone || 0} - {
                  milestoneDefinitions.carrier.milestones[sendung.carrier_milestone || 0]?.text || 'Nicht begonnen'
                }
              </div>
              <div style={{ 
                padding: '4px 0',
                fontWeight: ampelType === 'zustellung' ? '700' : '400',
                backgroundColor: ampelType === 'zustellung' ? '#dbeafe' : 'transparent',
                paddingLeft: '8px',
                marginLeft: '-8px',
                marginRight: '-8px',
                borderRadius: '4px'
              }}>
                🚚 <strong>Zustellung:</strong> MS {sendung.delivery_milestone || 0} - {
                  milestoneDefinitions.zustellung.milestones[sendung.delivery_milestone || 0]?.text || 'Nicht begonnen'
                }
              </div>
            </div>
          </div>

          {/* Milestone-Auswahl NUR für aktuelle Ampel */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📊 Neuen Status für {currentAmpelDef.title} wählen
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableMilestones.map(milestone => {
                const isSelected = selectedMilestone === milestone.id;
                const isCurrent = milestone.isCurrent;
                
                return (
                  <button
                    key={milestone.id}
                    onClick={() => setSelectedMilestone(milestone.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${milestone.definition?.color || '#3b82f6'}` : '1px solid #e5e7eb',
                      backgroundColor: isSelected ? `${milestone.definition?.color || '#3b82f6'}15` : 
                                     isCurrent ? '#f0f9ff' : 
                                     milestone.isCompleted ? '#f0fdf4' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = isCurrent ? '#f0f9ff' : 
                                                       milestone.isCompleted ? '#f0fdf4' : 'white';
                      }
                    }}
                  >
                    {/* Status Icon */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: milestone.definition?.color || '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {milestone.isCompleted ? '✓' : 
                       isCurrent ? '●' : 
                       milestone.id === 0 ? '○' :
                       milestone.id}
                    </div>

                    {/* Milestone Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#1f2937',
                        marginBottom: '2px'
                      }}>
                        {milestone.id === 0 ? 'Reset:' : `Milestone ${milestone.id}:`} {milestone.definition?.text}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {isCurrent && ' ✅ Aktueller Status'}
                        {milestone.isCompleted && ' ✓ Bereits erledigt'}
                        {milestone.id === 0 && ' ⚪ Zurücksetzen auf Anfang'}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <CheckCircle size={20} style={{ color: milestone.definition?.color || '#3b82f6' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hinweise */}
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
            color: '#92400e'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <AlertCircle size={14} />
              <strong>Wichtig:</strong>
            </div>
            • Jede Ampel hat ihren eigenen Milestone-Status<br/>
            • Du kannst jeden Status unabhängig setzen<br/>
            • Milestone 0 = Ampel zurücksetzen auf "Nicht begonnen"<br/>
            • Die anderen Ampeln bleiben unverändert
          </div>
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
            {selectedMilestone !== currentMilestoneValue && (
              <>
                {selectedMilestone > currentMilestoneValue ? '⬆️ Fortschritt' : 
                 selectedMilestone === 0 ? '↩️ Zurücksetzen' : '⬇️ Rückschritt'}: 
                {' '}Milestone {currentMilestoneValue} → {selectedMilestone}
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
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
              Abbrechen
            </button>
            
            <button
              onClick={handleSave}
              disabled={isLoading || selectedMilestone === currentMilestoneValue}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: selectedMilestone !== currentMilestoneValue ? '#3b82f6' : '#9ca3af',
                color: 'white',
                cursor: selectedMilestone !== currentMilestoneValue ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isLoading && <Clock size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {isLoading ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneUpdateModal;
