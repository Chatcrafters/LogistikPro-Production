// frontend/src/components/modals/SendungsModals.jsx
import React, { useState, useEffect } from 'react';
import {
  X, Check, AlertCircle, Euro, FileText, Calendar,
  Clock, MapPin, User, Phone, Mail, Package, Truck, Plane,
  Edit, Save, Trash2, Plus, Minus
} from 'lucide-react';
import { formatDate, formatDateTime, getTrafficLightColor, formatCurrency } from '../../utils/formatters';

const SendungsModals = ({
  // Status Popup Props
  showStatusPopup,
  statusPopupData,
  popupPosition,
  popupRef,
  onStatusUpdate,
  onCloseStatusPopup,
  
  // Cost Input Props
  showCostInput,
  selectedAnfrage,
  magicCostText,
  onMagicCostTextChange,
  onCloseCostInput,
  onProcessMagicInput,
  
  // Edit Modal Props
  selectedSendung,
  onCloseEdit,
  onSaveSendung
}) => {

  // Edit Modal State
  const [editData, setEditData] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Initialize edit data when sendung changes
  useEffect(() => {
    if (selectedSendung) {
      setEditData({ ...selectedSendung });
      setEditMode(false);
    }
  }, [selectedSendung]);

  // Status Options Configuration
  const statusOptionen = {
    abholung: [
      { value: 'grey', text: 'Nicht geplant', color: '#c7c7cc', description: 'Abholung noch nicht organisiert' },
      { value: 'yellow', text: 'Geplant', color: '#ff9500', description: 'Abholtermin steht fest' },
      { value: 'green', text: 'Bestätigt', color: '#34c759', description: 'Abholung bestätigt/durchgeführt' },
      { value: 'red', text: 'Problem/Verspätung', color: '#ff3b30', description: 'Verzögerung oder Problem' }
    ],
    carrier: [
      { value: 'grey', text: 'Nicht gebucht', color: '#c7c7cc', description: 'Noch keine Carrier-Buchung' },
      { value: 'yellow', text: 'Angefragt', color: '#ff9500', description: 'Anfrage beim Carrier gestellt' },
      { value: 'green', text: 'Gebucht', color: '#34c759', description: 'Carrier gebucht und bestätigt' },
      { value: 'red', text: 'Storniert', color: '#ff3b30', description: 'Buchung storniert' }
    ],
    flug: [
      { value: 'grey', text: 'Nicht abgeflogen', color: '#c7c7cc', description: 'Noch am Boden' },
      { value: 'yellow', text: 'Check-in', color: '#ff9500', description: 'Sendung zum Check-in' },
      { value: 'green', text: 'Abgeflogen', color: '#34c759', description: 'Flug gestartet' },
      { value: 'red', text: 'Verspätet/Cancelled', color: '#ff3b30', description: 'Flugproblem' }
    ],
    zustellung: [
      { value: 'grey', text: 'Nicht geplant', color: '#c7c7cc', description: 'Zustellung noch nicht organisiert' },
      { value: 'yellow', text: 'In Zustellung', color: '#ff9500', description: 'Auf dem Weg zum Empfänger' },
      { value: 'green', text: 'Zugestellt', color: '#34c759', description: 'Erfolgreich zugestellt' },
      { value: 'red', text: 'Zustellproblem', color: '#ff3b30', description: 'Problem bei Zustellung' }
    ]
  };

  // Handle Edit Field Change
  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Save Edit
  const handleSaveEdit = async () => {
    setSaveLoading(true);
    try {
      await onSaveSendung(editData, false);
      setEditMode(false);
    } catch (error) {
      console.error('Save error:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // STATUS POPUP COMPONENT
  const StatusPopup = () => {
    if (!showStatusPopup || !statusPopupData) return null;

    return (
      <div 
        ref={popupRef}
        style={{
          position: 'fixed',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '280px',
          left: `${Math.max(10, Math.min(popupPosition.x, window.innerWidth - 300))}px`,
          top: `${Math.max(10, Math.min(popupPosition.y, window.innerHeight - 200))}px`,
          animation: 'fadeInScale 0.2s ease-out'
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#fafafa',
          borderRadius: '12px 12px 0 0'
        }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '15px', 
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: getTrafficLightColor(statusPopupData.currentStatus),
              display: 'inline-block'
            }} />
            Status aktualisieren
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#6b7280', 
            marginTop: '4px' 
          }}>
            {statusPopupData.sendung.position || 'Sendung'} - {
              statusPopupData.type === 'abholung' ? 'Abholung' :
              statusPopupData.type === 'carrier' ? 'Carrier' :
              statusPopupData.type === 'flug' ? 'Flug/Transport' :
              statusPopupData.type === 'zustellung' ? 'Zustellung' : 'Status'
            }
          </div>
        </div>
        
        <div style={{ padding: '8px 0' }}>
          {statusOptionen[statusPopupData.type]?.map(opt => (
            <div
              key={opt.value}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                backgroundColor: opt.value === statusPopupData.currentStatus ? '#eff6ff' : 'transparent',
                borderLeft: opt.value === statusPopupData.currentStatus ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                onStatusUpdate(statusPopupData.sendungId, statusPopupData.type, opt.value);
                onCloseStatusPopup();
              }}
              onMouseOver={(e) => {
                if (opt.value !== statusPopupData.currentStatus) {
                  e.target.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (opt.value !== statusPopupData.currentStatus) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'inline-block',
                marginRight: '12px',
                backgroundColor: opt.color,
                border: '2px solid white',
                boxShadow: `0 0 8px ${opt.color}40`
              }} />
              <div>
                <div style={{ fontWeight: opt.value === statusPopupData.currentStatus ? '600' : '500' }}>
                  {opt.text}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  {opt.description}
                </div>
              </div>
              {opt.value === statusPopupData.currentStatus && (
                <div style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: '16px' }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #f1f5f9',
          backgroundColor: '#fafafa',
          borderRadius: '0 0 12px 12px',
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          💡 Klicken Sie auf eine Option zum Ändern
        </div>
      </div>
    );
  };

  // COST INPUT MODAL COMPONENT
  const CostInputModal = () => {
    if (!showCostInput || !selectedAnfrage) return null;

    return (
      <div style={{
        position: 'fixed',
        zIndex: 2001,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '95%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ 
            padding: '24px 32px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative'
          }}>
            <button 
              onClick={onCloseCostInput}
              style={{ 
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'white',
                borderRadius: '8px',
                padding: '8px'
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
              💰 Magic Cost Input
            </h2>
            <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
              Kosten erfassen für {selectedAnfrage.position}
            </p>
          </div>
          
          <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                E-Mail Text oder Kostenliste einfügen:
              </label>
              <textarea
                placeholder="📧 E-Mail-Text hier einfügen... 

Beispiel:
Pickup Stuttgart: EUR 85.00
Air freight: EUR 2.45/kg 
Delivery LA: USD 145.00

KI erkennt automatisch alle Kostenpositionen und Währungen!"
                style={{
                  width: '100%',
                  minHeight: '250px',
                  padding: '16px',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  fontFamily: 'SF Mono, Monaco, monospace',
                  fontSize: '13px',
                  resize: 'vertical',
                  backgroundColor: 'white',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                value={magicCostText}
                onChange={(e) => onMagicCostTextChange(e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                onBlur={(e) => e.target.style.borderColor = '#667eea'}
              />
            </div>

            {/* Info Box */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: '#0284c7', marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#0f172a' }}>
                  <strong>Unterstützte Formate:</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                    <li>E-Mail Antworten von Partnern</li>
                    <li>Kostenaufstellungen (EUR/USD)</li>
                    <li>Frachtbriefe und Rechnungen</li>
                    <li>Strukturierte Listen</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  onProcessMagicInput(magicCostText, selectedAnfrage);
                }}
                disabled={!magicCostText.trim()}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: magicCostText.trim() ? 
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e5e7eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: magicCostText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (magicCostText.trim()) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                🎯 KI-Analyse starten
              </button>

              <button
                onClick={onCloseCostInput}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // EDIT MODAL COMPONENT
  const EditModal = () => {
    if (!selectedSendung) return null;

    return (
      <div style={{
        position: 'fixed',
        zIndex: 2000,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '24px 32px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: 'white',
            position: 'relative'
          }}>
            <button 
              onClick={onCloseEdit}
              style={{ 
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'white',
                borderRadius: '8px',
                padding: '8px'
              }}
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Package style={{ width: '28px', height: '28px' }} />
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700' }}>
                  {editMode ? 'Sendung bearbeiten' : 'Sendung Details'}
                </h2>
                <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
                  {editData.position || `ID-${editData.id}`} • {editData.status}
                </p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div style={{ 
            padding: '32px', 
            maxHeight: 'calc(90vh - 120px)', 
            overflowY: 'auto' 
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px' 
            }}>
              
              {/* Basic Info */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FileText style={{ width: '20px', height: '20px' }} />
                  Grunddaten
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Position
                    </label>
                    <input
                      type="text"
                      value={editData.position || ''}
                      onChange={(e) => handleEditChange('position', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Referenz
                    </label>
                    <input
                      type="text"
                      value={editData.reference || ''}
                      onChange={(e) => handleEditChange('reference', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      AWB Nummer
                    </label>
                    <input
                      type="text"
                      value={editData.awb_number || ''}
                      onChange={(e) => handleEditChange('awb_number', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Route Info */}
              <div style={{
                backgroundColor: '#f0fdf4',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <MapPin style={{ width: '20px', height: '20px' }} />
                  Route
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Von (Flughafen)
                    </label>
                    <input
                      type="text"
                      value={editData.origin_airport || ''}
                      onChange={(e) => handleEditChange('origin_airport', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Nach (Flughafen)
                    </label>
                    <input
                      type="text"
                      value={editData.destination_airport || ''}
                      onChange={(e) => handleEditChange('destination_airport', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Transport Art
                    </label>
                    <select
                      value={editData.transport_type || ''}
                      onChange={(e) => handleEditChange('transport_type', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    >
                      <option value="">Wählen...</option>
                      <option value="AIR">Luftfracht</option>
                      <option value="SEA">Seefracht</option>
                      <option value="TRUCK">LKW</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipment Details */}
              <div style={{
                backgroundColor: '#fefce8',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #fde68a'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Package style={{ width: '20px', height: '20px' }} />
                  Sendungsdetails
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                        Gewicht (kg)
                      </label>
                      <input
                        type="number"
                        value={editData.total_weight || ''}
                        onChange={(e) => handleEditChange('total_weight', e.target.value)}
                        disabled={!editMode}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: editMode ? 'white' : '#f9fafb'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                        Colli
                      </label>
                      <input
                        type="number"
                        value={editData.total_pieces || ''}
                        onChange={(e) => handleEditChange('total_pieces', e.target.value)}
                        disabled={!editMode}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          backgroundColor: editMode ? 'white' : '#f9fafb'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Volumen (m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.total_volume || ''}
                      onChange={(e) => handleEditChange('total_volume', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Warenart
                    </label>
                    <input
                      type="text"
                      value={editData.commodity || ''}
                      onChange={(e) => handleEditChange('commodity', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div style={{
                backgroundColor: '#eff6ff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #bfdbfe'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Calendar style={{ width: '20px', height: '20px' }} />
                  Termine
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Abholdatum
                    </label>
                    <input
                      type="date"
                      value={editData.pickup_date || ''}
                      onChange={(e) => handleEditChange('pickup_date', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      Zustelldatum
                    </label>
                    <input
                      type="date"
                      value={editData.delivery_date || ''}
                      onChange={(e) => handleEditChange('delivery_date', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      ETA
                    </label>
                    <input
                      type="datetime-local"
                      value={editData.eta ? new Date(editData.eta).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleEditChange('eta', e.target.value)}
                      disabled={!editMode}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: editMode ? 'white' : '#f9fafb'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Costs & Financial */}
              {(editData.pickup_cost > 0 || editData.main_cost > 0 || editData.delivery_cost > 0 || editData.offer_price > 0) && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0'
                }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    fontSize: '18px', 
                    fontWeight: '600',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Euro style={{ width: '20px', height: '20px' }} />
                    Finanzen
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {editData.pickup_cost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>🚚 Abholung:</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {formatCurrency(editData.pickup_cost)}
                        </span>
                      </div>
                    )}
                    
                    {editData.main_cost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>✈️ Hauptlauf:</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {formatCurrency(editData.main_cost)}
                        </span>
                      </div>
                    )}
                    
                    {editData.delivery_cost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>📦 Zustellung:</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {formatCurrency(editData.delivery_cost)}
                        </span>
                      </div>
                    )}
                    
                    {(editData.pickup_cost > 0 || editData.main_cost > 0 || editData.delivery_cost > 0) && (
                      <>
                        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Gesamtkosten:</span>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>
                            {formatCurrency((editData.pickup_cost || 0) + (editData.main_cost || 0) + (editData.delivery_cost || 0))}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {editData.offer_price > 0 && (
                      <>
                        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>Angebotspreis:</span>
                          <span style={{ fontSize: '16px', fontWeight: '700', color: '#0284c7' }}>
                            {formatCurrency(editData.offer_price)}
                          </span>
                        </div>
                        
                        {editData.offer_margin_percent && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#64748b' }}>Marge:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                              {editData.offer_margin_percent.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div style={{
            padding: '20px 32px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {editData.created_at && `Erstellt: ${formatDateTime(editData.created_at)}`}
              {editData.updated_at && ` • Aktualisiert: ${formatDateTime(editData.updated_at)}`}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onCloseEdit}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Schließen
              </button>
              
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Edit style={{ width: '16px', height: '16px' }} />
                  Bearbeiten
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditData({ ...selectedSendung });
                    }}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      border: '2px solid #ef4444',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Abbrechen
                  </button>
                  
                  <button
                    onClick={handleSaveEdit}
                    disabled={saveLoading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: saveLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: saveLoading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {saveLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff40',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Check style={{ width: '16px', height: '16px' }} />
                        Speichern
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <StatusPopup />
      <CostInputModal />
      <EditModal />
      
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default SendungsModals;
