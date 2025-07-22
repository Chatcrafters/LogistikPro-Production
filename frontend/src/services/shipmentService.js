// src/services/shipmentService.js
const API_URL = 'http://localhost:3001/api';

export const shipmentService = {
  // Alle Sendungen abrufen
  async getShipments() {
    const response = await fetch(`${API_URL}/shipments`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Sendungen');
    const result = await response.json();
    return result.data || []; // Extrahiere das data Array aus der Response
  },

  // Einzelne Sendung
  async getShipment(id) {
    const response = await fetch(`${API_URL}/shipments/${id}`);
    if (!response.ok) throw new Error('Sendung nicht gefunden');
    return response.json();
  },

  // Neue Sendung erstellen
  async createShipment(data) {
    try {
      const response = await fetch(`${API_URL}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('API Fehler:', result);
        throw new Error(result.error || 'Fehler beim Erstellen');
      }
      
      return result;
    } catch (error) {
      console.error('Fehler Details:', error);
      throw error;
    }
  },

  // Partner zuweisen
  async assignPartners(id, data) {
    const response = await fetch(`${API_URL}/shipments/${id}/partners`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Fehler beim Zuweisen');
    return response.json();
  },

  // Kunden abrufen
  async getCustomers() {
    const response = await fetch(`${API_URL}/customers`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Kunden');
    return response.json();
  },

  // Partner abrufen
  async getPartners() {
    const response = await fetch(`${API_URL}/partners`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Partner');
    return response.json();
  },

  // Flughäfen abrufen
  async getAirports() {
    const response = await fetch(`${API_URL}/airports`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Flughäfen');
    return response.json();
  },

  // Status aktualisieren
  async updateShipmentStatus(id, status) {
    const response = await fetch(`${API_URL}/shipments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Fehler beim Aktualisieren des Status');
    return response.json();
  },

  // Milestone Update
  async updateMilestone(shipmentId, milestoneId) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/milestone`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ milestone_id: milestoneId })
    });
    
    if (!response.ok) {
      throw new Error('Fehler beim Aktualisieren des Milestones');
    }
    
    return response.json();
  },

  // Sendung aktualisieren
  async updateShipment(id, data) {
    const response = await fetch(`${API_URL}/shipments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Fehler beim Aktualisieren der Sendung');
    return response.json();
  },

  // Sendung löschen
  async deleteShipment(id) {
    const response = await fetch(`${API_URL}/shipments/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fehler beim Löschen der Sendung');
    return response.json();
  },

  // Historie abrufen
  async getShipmentHistory(id) {
    const response = await fetch(`${API_URL}/shipments/${id}/history`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Historie');
    return response.json();
  },

  // Dokumente hochladen
  async uploadDocument(shipmentId, file) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('shipment_id', shipmentId);

    const response = await fetch(`${API_URL}/shipments/${shipmentId}/documents`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) throw new Error('Fehler beim Hochladen des Dokuments');
    return response.json();
  },

  // Dokumente abrufen
  async getDocuments(shipmentId) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/documents`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Dokumente');
    return response.json();
  },

  // Dokument löschen
  async deleteDocument(shipmentId, documentId) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/documents/${documentId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Fehler beim Löschen des Dokuments');
    return response.json();
  },

  // Tracking-URL generieren
  async generateTrackingUrl(shipmentId) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/tracking-url`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Fehler beim Generieren der Tracking-URL');
    return response.json();
  },

  // E-Mail senden
  async sendEmail(shipmentId, emailData) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    if (!response.ok) throw new Error('Fehler beim Senden der E-Mail');
    return response.json();
  },

  // Statistiken abrufen
  async getStatistics(dateRange) {
    const params = new URLSearchParams(dateRange);
    const response = await fetch(`${API_URL}/statistics?${params}`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Statistiken');
    return response.json();
  },

  // Milestones für Sendungstyp abrufen
  async getMilestonesForType(transportType, shipmentType) {
    const params = new URLSearchParams({ 
      transport_type: transportType, 
      shipment_type: shipmentType 
    });
    const response = await fetch(`${API_URL}/milestones?${params}`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Milestones');
    return response.json();
  },

  // Bulk-Status-Update
  async bulkUpdateStatus(shipmentIds, status) {
    const response = await fetch(`${API_URL}/shipments/bulk-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipment_ids: shipmentIds, status })
    });
    if (!response.ok) throw new Error('Fehler beim Bulk-Update');
    return response.json();
  },

  // Sendung duplizieren
  async duplicateShipment(id) {
    const response = await fetch(`${API_URL}/shipments/${id}/duplicate`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Fehler beim Duplizieren der Sendung');
    return response.json();
  },

  // Export als CSV
  async exportToCSV(filters) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/shipments/export?${params}`);
    if (!response.ok) throw new Error('Fehler beim Exportieren');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `sendungen_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // Suche mit Volltextsuche
  async searchShipments(query) {
    const response = await fetch(`${API_URL}/shipments/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Fehler bei der Suche');
    return response.json();
  },

  // Notiz hinzufügen
  async addNote(shipmentId, note) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    if (!response.ok) throw new Error('Fehler beim Hinzufügen der Notiz');
    return response.json();
  },

  // Notizen abrufen
  async getNotes(shipmentId) {
    const response = await fetch(`${API_URL}/shipments/${shipmentId}/notes`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Notizen');
    return response.json();
  },

  // Dashboard-Daten abrufen
  async getDashboardData() {
    const response = await fetch(`${API_URL}/dashboard`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Dashboard-Daten');
    return response.json();
  },

  // Benachrichtigungen abrufen
  async getNotifications() {
    const response = await fetch(`${API_URL}/notifications`);
    if (!response.ok) throw new Error('Fehler beim Abrufen der Benachrichtigungen');
    return response.json();
  },

  // Benachrichtigung als gelesen markieren
  async markNotificationAsRead(notificationId) {
    const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('Fehler beim Markieren der Benachrichtigung');
    return response.json();
  }
};

export default shipmentService;