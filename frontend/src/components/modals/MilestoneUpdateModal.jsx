// frontend/src/components/modals/MilestoneUpdateModal.jsx
import React, { useState } from 'react';
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const MilestoneUpdateModal = ({ isOpen, onClose, sendung, onUpdateMilestone }) => {
  const [selectedMilestone, setSelectedMilestone] = useState(sendung?.current_milestone || 0);
  const [isLoading, setIsLoading] = useState(false);

  // Milestone-Definitionen für alle 3 Ampel-Bereiche
  const milestoneDefinitions = {
    // AMPEL 1: Abholung (Vorlauf) - Milestones 1-3
    abholung: {
      range: [1, 2, 3],
      title: "📅 Abholung & Vorlauf",
      milestones: {
        1: { text: "Abholung beauftragt", color: "#f59e0b" },
        2: { text: "Sendung abgeholt", color: "#3b82f6" },
        3: { text: "Anlieferung im Lager", color: "#10b981" }
      }
    },
    // AMPEL 2: Carrier (Hauptlauf) - Milestones 4-8
    carrier: {
      range: [4, 5, 6, 7, 8],
      title: "✈️ Transport & Hauptlauf",
      milestones: {
        4: { text: "Sendung gebucht", color: "#f59e0b" },
        5: { text: "Zoll erledigt", color: "#8b5cf6" },
        6: { text: "Anlieferung bei Airline", color: "#3b82f6" },
        7: { text: "Sendung abgeflogen", color: "#06b6d4" },
        8: { text: "Sendung angekommen", color: "#10b981" }
      }
    },
    // AMPEL 3: Zustellung (Nachlauf) - Milestones 9-10
    zustellung: {
      range: [9, 10],
      title: "🚚 Zustellung & Nachlauf",
      milestones: {
        9: { text: "Sendung verzollt", color: "#f59e0b" },
        10: { text: "Sendung zugestellt", color: "#10b981" }
      }
    }
  };

  // Bestimme welche Ampel basierend auf aktuellem Milestone
  const getCurrentAmpelType = (milestone) => {
    if (milestone >= 1 && milestone <= 3) return 'abholung';
    if (milestone >= 4 && milestone <= 8) return 'carrier';
    if (milestone >= 9 && milestone <= 10) return 'zustellung';
    return 'abholung'; // Default
  };

  const currentAmpelType = getCurrentAmpelType(sendung?.current_milestone || 0);
  const currentAmpel = milestoneDefinitions[currentAmpelType];

  // Verfügbare Milestones basierend auf aktuellem Status
  const getAvailableMilestones = () => {
    const current = sendung?.current_milestone || 0;
    const available = [];

    // Alle Milestones von 0 bis 10
    for (let i = 0; i <= 10; i++) {
      let category = '';
      let definition = null;

      if (i === 0) {
        category = 'start';
        definition = { text: "Nicht begonnen", color: "#9ca3af" };
      } else if (i >= 1 && i <= 3) {
        category = 'abholung';
        definition = milestoneDefinitions.abholung.milestones[i];
      } else if (i >= 4 && i <= 8) {
        category = 'carrier';
        definition = milestoneDefinitions.carrier.milestones[i];
      } else if (i >= 9 && i <= 10) {
        category = 'zustellung';
        definition = milestoneDefinitions.zustellung.milestones[i];
      }

      available.push({
        id: i,
        category,
        definition,
        isCurrent: i === current,
        isCompleted: i < current,
        isNext: i === current + 1,
        isPossible: true // Alle Milestones sind anwählbar
      });
    }

    return available;
  };

  const availableMilestones = getAvailableMilestones();

  const handleSave = async () => {
    if (!sendung || selectedMilestone === sendung.current_milestone) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateMilestone(sendung.id, selectedMilestone);
      onClose();
    } catch (error) {
      console.error('Fehler beim Milestone-Update:', error);
      alert('Fehler beim Speichern des Milestones!');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !sendung) return null;

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
              🎯 Milestone aktualisieren
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
          {/* Aktueller Status */}
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
              marginBottom: '8px'
            }}>
              <CheckCircle size={16} style={{ color: '#0ea5e9' }} />
              <span style={{ fontWeight: '600', color: '#0369a1' }}>
                Aktueller Status
              </span>
            </div>
            <div style={{ fontSize: '14px', color: '#0369a1' }}>
              <strong>Milestone {sendung.current_milestone}:</strong>{' '}
              {availableMilestones.find(m => m.id === sendung.current_milestone)?.definition?.text || 'Unbekannt'}
            </div>
          </div>

          {/* Milestone-Auswahl */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📊 Neues Milestone auswählen
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
                        e.target.style.backgroundColor = '#f9fafb';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = isCurrent ? '#f0f9ff' : 
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
                       milestone.isNext ? '!' : 
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
                        Milestone {milestone.id}: {milestone.definition?.text}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {milestone.category === 'start' && '⚪ Startpunkt'}
                        {milestone.category === 'abholung' && '📅 Abholung & Vorlauf'}
                        {milestone.category === 'carrier' && '✈️ Transport & Hauptlauf'}
                        {milestone.category === 'zustellung' && '🚚 Zustellung & Nachlauf'}
                        {isCurrent && ' (Aktuell)'}
                        {milestone.isCompleted && ' (Abgeschlossen)'}
                        {milestone.isNext && ' (Nächster Schritt)'}
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
              <strong>Hinweise:</strong>
            </div>
            • Du kannst sowohl vor- als auch rückwärts navigieren<br/>
            • Milestone-Änderungen werden automatisch gespeichert<br/>
            • Traffic Lights werden automatisch aktualisiert<br/>
            • Partner können per E-Mail benachrichtigt werden (geplant)
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
            {selectedMilestone !== sendung.current_milestone && (
              <>
                {selectedMilestone > sendung.current_milestone ? '⬆️ Fortschritt' : '⬇️ Rückschritt'}: 
                {' '}Milestone {sendung.current_milestone} → {selectedMilestone}
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
              disabled={isLoading || selectedMilestone === sendung.current_milestone}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: selectedMilestone !== sendung.current_milestone ? '#3b82f6' : '#9ca3af',
                color: 'white',
                cursor: selectedMilestone !== sendung.current_milestone ? 'pointer' : 'not-allowed',
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
