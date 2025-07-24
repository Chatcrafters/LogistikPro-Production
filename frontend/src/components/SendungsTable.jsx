// frontend/src/components/SendungsTable.jsx
import React from 'react';
import {
  Package, User, MapPin, Edit, Trash2, Euro
} from 'lucide-react';
import { formatDate, getStatusColor } from '../utils/formatters';

const SendungsTable = ({
  sendungen,
  customers,
  partners,
  viewMode,
  searchTerm,
  onEditClick,
  onDeleteClick,
  onCreateOffer,
  onAcceptOffer,
  onRejectOffer,
  onCostInputClick
}) => {

  const getCostStatus = (shipment) => {
    if (!shipment) {
      return { text: '❌ Fehler', className: 'cost-error', total: 0 };
    }
    
    const pickupValue = parseFloat(shipment.pickup_cost || shipment.cost_pickup || 0);
    const mainValue = parseFloat(
      shipment.main_cost || 
      shipment.cost_mainrun || 
      shipment.mainrun_cost || 
      0
    );
    const deliveryValue = parseFloat(shipment.delivery_cost || shipment.cost_delivery || 0);
    
    const hasPickupCost = pickupValue > 0;
    const hasMainCost = mainValue > 0;
    const hasDeliveryCost = deliveryValue > 0;
    
    const totalCosts = [hasPickupCost, hasMainCost, hasDeliveryCost].filter(Boolean).length;
    const totalValue = pickupValue + mainValue + deliveryValue;
    
    if (totalCosts === 0) {
      return { 
        text: '⏳ Ausstehend', 
        className: 'cost-pending',
        total: 0
      };
    } else if (totalCosts === 3) {
      return { 
        text: '✅ Komplett', 
        className: 'cost-complete',
        total: totalValue
      };
    } else {
      return { 
        text: `📊 ${totalCosts}/3 erfasst`, 
        className: 'cost-partial',
        total: totalValue
      };
    }
  };

  // Empty State Component
  const EmptyState = () => (
    <div style={{ 
      padding: '60px 40px', 
      textAlign: 'center', 
      color: '#6b7280',
      backgroundColor: '#fafafa'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        {searchTerm ? '🔍' : 
         viewMode === 'anfragen' ? '❓' : 
         viewMode === 'angebote' ? '💼' : '📦'}
      </div>
      <h3 style={{ 
        margin: '0 0 8px 0', 
        fontSize: '18px', 
        fontWeight: '600',
        color: '#374151'
      }}>
        {searchTerm ? 'Keine Suchergebnisse' : 
         viewMode === 'anfragen' ? 'Keine Anfragen' : 
         viewMode === 'angebote' ? 'Keine Angebote' : 'Keine Sendungen'}
      </h3>
      <p style={{ 
        margin: '0 0 20px 0', 
        color: '#6b7280',
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        {searchTerm ? `Keine Einträge gefunden für "${searchTerm}"` : 
         viewMode === 'anfragen' ? 'Erstellen Sie eine neue Sendung als Anfrage.' : 
         viewMode === 'angebote' ? 'Erstellen Sie Angebote aus Anfragen.' : 'Erstellen Sie Ihre erste Sendung.'}
      </p>
    </div>
  );

  // Table Row Component
  const TableRow = ({ sendung, index }) => {
    const statusColors = getStatusColor(sendung.status);
    const costStatus = getCostStatus(sendung);
    const isEvenRow = index % 2 === 0;

    return (
      <tr
        key={sendung.id}
        style={{
          backgroundColor: isEvenRow ? '#fafafa' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          borderBottom: '1px solid #f1f5f9'
        }}
        onClick={() => onEditClick(sendung)}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f9ff';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = isEvenRow ? '#fafafa' : 'white';
        }}
      >
        {/* Position */}
        <td style={{ padding: '16px 12px', fontWeight: '600', fontSize: '14px' }}>
          {sendung.position || `ID-${sendung.id}`}
        </td>
        
        {/* Kunde */}
        <td style={{ padding: '16px 12px' }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '14px',
            color: '#1f2937',
            marginBottom: '2px'
          }}>
            {customers[sendung.customer_id] || 'N/A'}
          </div>
          {sendung.reference && (
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              fontFamily: 'monospace'
            }}>
              Ref: {sendung.reference}
            </div>
          )}
        </td>

        {/* Kosten-Status (nur bei Anfragen) */}
        {viewMode === 'anfragen' && (
          <td style={{ padding: '16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span 
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 
                    costStatus.className === 'cost-complete' ? '#dcfce7' :
                    costStatus.className === 'cost-partial' ? '#fef3c7' : '#fee2e2',
                  color:
                    costStatus.className === 'cost-complete' ? '#166534' :
                    costStatus.className === 'cost-partial' ? '#92400e' : '#dc2626',
                  border: `1px solid ${
                    costStatus.className === 'cost-complete' ? '#bbf7d0' :
                    costStatus.className === 'cost-partial' ? '#fde68a' : '#fecaca'
                  }`
                }}
              >
                {costStatus.text}
              </span>
              {costStatus.className === 'cost-partial' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCostInputClick(sendung);
                  }}
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Vervollständigen
                </button>
              )}
            </div>
            {costStatus.total > 0 && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                Total: €{costStatus.total.toFixed(2)}
              </div>
            )}
          </td>
        )}
        
        {/* Colli/Gewicht */}
        <td style={{ padding: '16px 12px' }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '14px',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Package style={{ width: '14px', height: '14px', color: '#6b7280' }} />
            {parseFloat(sendung.total_weight || sendung.weight || 0).toFixed(1)} kg
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginTop: '2px'
          }}>
            📦 {sendung.total_pieces || sendung.pieces || 0} Colli
          </div>
        </td>
        
        {/* Route */}
        <td style={{ padding: '16px 12px' }}>
          <div style={{
            fontWeight: '500',
            fontSize: '14px',
            color: '#1f2937'
          }}>
            {sendung.origin_airport || 'N/A'} → {sendung.destination_airport || 'N/A'}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginTop: '2px'
          }}>
            {sendung.from_city || 'N/A'} → {sendung.to_city || 'N/A'}
          </div>
        </td>
        
        {/* Status */}
        <td style={{ padding: '16px 12px' }}>
          <span style={{
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            backgroundColor: statusColors.bg,
            color: statusColors.color,
            border: `1px solid ${statusColors.color}20`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            width: 'fit-content'
          }}>
            {statusColors.icon} {sendung.status}
          </span>
        </td>
        
        {/* Aktionen */}
        <td style={{ padding: '12px' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ 
            display: 'flex', 
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            {/* Standard Aktionen */}
            <button 
              title="Details anzeigen/bearbeiten"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(sendung);
              }}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                color: '#0071e3',
                border: '1px solid #0071e3',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: '1'
              }}
            >
              ✏️
            </button>
            
            <button 
              title="Sendung löschen"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(sendung.id);
              }}
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: '1'
              }}
            >
              🗑️
            </button>
            
            {/* Anfrage-spezifische Aktionen */}
            {sendung.status === 'ANFRAGE' && (
              <>
                <button 
                  title={`Kosten erfassen (${costStatus.text})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCostInputClick(sendung);
                  }}
                  style={{
                    padding: '6px',
                    backgroundColor: costStatus.className === 'cost-complete' ? '#dcfce7' : 'transparent',
                    color: costStatus.className === 'cost-complete' ? '#166534' : '#10b981',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  💰
                </button>
                
                {costStatus.className === 'cost-complete' && (
                  <button 
                    title="Angebot erstellen"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateOffer(sendung);
                    }}
                    style={{
                      padding: '6px',
                      backgroundColor: 'transparent',
                      color: '#f59e0b',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: '1'
                    }}
                  >
                    📄
                  </button>
                )}
              </>
            )}
            
            {/* Angebot-spezifische Aktionen */}
            {sendung.status === 'ANGEBOT' && (
              <>
                <button 
                  title={`Angebot annehmen (€${sendung.offer_price || 'N/A'})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptOffer(sendung);
                  }}
                  style={{
                    padding: '6px',
                    backgroundColor: 'transparent',
                    color: '#10b981',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  ✅
                </button>
                
                <button 
                  title="Angebot ablehnen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRejectOffer(sendung);
                  }}
                  style={{
                    padding: '6px',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: '1'
                  }}
                >
                  ❌
                </button>
              </>
            )}
          </div>
          
          {/* Offer Price Display */}
          {sendung.status === 'ANGEBOT' && sendung.offer_price && (
            <div style={{ 
              marginTop: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#059669',
              textAlign: 'center'
            }}>
              💰 €{sendung.offer_price}
            </div>
          )}
        </td>
      </tr>
    );
  };

  // Main Render
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      {/* Table Header Info */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fafafa',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1d1d1f' }}>
          {viewMode === 'sendungen' && '📦 Sendungen'}
          {viewMode === 'anfragen' && '❓ Anfragen'}
          {viewMode === 'angebote' && '💼 Angebote'}
          {viewMode === 'alle' && '📊 Alle Einträge'}
          <span style={{ fontSize: '14px', fontWeight: '400', color: '#86868b', marginLeft: '8px' }}>
            ({sendungen.length} {sendungen.length === 1 ? 'Eintrag' : 'Einträge'})
          </span>
        </div>
        
        {searchTerm && (
          <span style={{
            fontSize: '12px',
            backgroundColor: '#f0f9ff',
            color: '#0071e3',
            padding: '4px 8px',
            borderRadius: '4px',
            fontWeight: '500'
          }}>
            Suche: "{searchTerm}"
          </span>
        )}
      </div>

      {/* Main Table */}
      {sendungen.length === 0 ? (
        <EmptyState />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ 
            backgroundColor: '#f8fafc', 
            borderBottom: '2px solid #e2e8f0'
          }}>
            <tr>
              <th style={{ 
                padding: '16px 12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderRight: '1px solid #e5e7eb'
              }}>
                Position
              </th>
              
              <th style={{ 
                padding: '16px 12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User style={{ width: '14px', height: '14px' }} />
                  Kunde
                </div>
              </th>

              {viewMode === 'anfragen' && (
                <th style={{ 
                  padding: '16px 12px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderRight: '1px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Euro style={{ width: '14px', height: '14px' }} />
                    Kosten-Status
                  </div>
                </th>
              )}

              <th style={{ 
                padding: '16px 12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package style={{ width: '14px', height: '14px' }} />
                  Colli/Gewicht
                </div>
              </th>

              <th style={{ 
                padding: '16px 12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderRight: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin style={{ width: '14px', height: '14px' }} />
                  Route
                </div>
              </th>

              <th style={{ 
                padding: '16px 12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderRight: '1px solid #e5e7eb'
              }}>
                Status
              </th>

              <th style={{ 
                padding: '16px 12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit style={{ width: '14px', height: '14px' }} />
                  Aktionen
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sendungen.map((sendung, index) => (
              <TableRow key={sendung.id} sendung={sendung} index={index} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SendungsTable;