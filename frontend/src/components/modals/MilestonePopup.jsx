// MilestonePopup.jsx - REPARIERTE VERSION mit allen Imports
import React from 'react';
import { X, Check, Clock, Mail } from 'lucide-react'; // ← FIX: Fehlende Icons importiert
import { formatDate } from '../../utils/formatters';
import { getMilestones } from '../../utils/milestoneDefinitions';

const MilestonePopup = ({
  position, 
  sendung, 
  type, 
  currentMilestone, 
  onUpdateMilestone, 
  onEmailPartner, 
  onClose 
}) => {
  // Bestimme welche Milestones angezeigt werden sollen
  const milestones = getMilestones(sendung.transport_type, sendung.shipment_type);
  
  // Filtere relevante Milestones basierend auf Ampel-Typ
  const relevantMilestones = milestones.filter(m => {
    switch(type) {
      case 'abholung':
        return m.id <= 3; // Bis "Sendung abgeholt"
      case 'carrier':
        return m.id >= 4 && m.id <= 6; // Lager bis Airline
      case 'flug':
        return m.id >= 7 && m.id <= 8; // Abflug bis Ankunft
      case 'zustellung':
        return m.id >= 9; // Verzollung bis Zustellung
      default:
        return true;
    }
  });

  const getPartnerForType = () => {
    switch(type) {
      case 'abholung':
        return sendung.pickup_partner || { name: 'Abholpartner', email: 'partner@example.com' };
      case 'carrier':
      case 'flug':
        return sendung.main_partner || { name: sendung.airline || 'Carrier', email: 'carrier@example.com' };
      case 'zustellung':
        return sendung.delivery_partner || { name: 'Zustellpartner', email: 'delivery@example.com' };
      default:
        return null;
    }
  };

  const partner = getPartnerForType();

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
        onClick={onClose}
      />
      
      {/* Popup */}
      <div style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        backgroundColor: 'white',
        border: '1px solid #d2d2d7',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: '350px',
        maxWidth: '450px',
        maxHeight: '500px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f5f5f7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
            Milestone Update - {sendung.awb_number || sendung.shipment_number}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} color="#86868b" />
          </button>
        </div>

        {/* Milestones List */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          padding: '16px 0'
        }}>
          {relevantMilestones.map((milestone) => {
            const isCompleted = currentMilestone >= milestone.id;
            const isCurrent = currentMilestone === milestone.id;
            const isPending = currentMilestone < milestone.id;
            
            return (
              <div
                key={milestone.id}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  backgroundColor: isCurrent ? '#e8f2ff' : 'transparent',
                  borderLeft: `3px solid ${isCompleted ? '#34c759' : isPending ? '#e5e7eb' : '#ff9500'}`
                }}
                onClick={() => onUpdateMilestone(sendung.id, milestone.id)}
                onMouseEnter={(e) => {
                  if (!isCurrent) e.currentTarget.style.backgroundColor = '#f5f5f7';
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCompleted ? '#34c759' : isPending ? '#e5e7eb' : '#ff9500',
                    color: 'white'
                  }}>
                    {isCompleted ? (
                      <Check size={14} strokeWidth={3} />
                    ) : isCurrent ? (
                      <Clock size={14} />
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: isPending ? '#86868b' : 'white' }}>
                        {milestone.id}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: isCurrent ? '600' : '400',
                      color: isCompleted ? '#1d1d1f' : isPending ? '#86868b' : '#1d1d1f'
                    }}>
                      {milestone.text}
                    </div>
                    {milestone.timestamp && (
                      <div style={{ fontSize: '12px', color: '#86868b', marginTop: '2px' }}>
                        {new Date(milestone.timestamp).toLocaleString('de-DE')}
                      </div>
                    )}
                  </div>
                  {isCurrent && (
                    <div style={{
                      padding: '2px 8px',
                      backgroundColor: '#ff9500',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      AKTUELL
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Email Button */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f5f5f7'
        }}>
          <button
            onClick={() => {
              const currentMilestoneText = milestones.find(m => m.id === currentMilestone)?.text || 'Unbekannt';
              onEmailPartner(partner, sendung, currentMilestoneText);
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#0071e3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0051a3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0071e3'}
          >
            <Mail size={16} />
            Status bei {partner?.name} erfragen
          </button>
        </div>
      </div>
    </>
  );
};

export default MilestonePopup;
