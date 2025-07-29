// src/services/shipmentService.js

const API_URL = 'https://logistikpro-production.onrender.com/api';

export const shipmentService = {
 // Alle Sendungen abrufen
 async getShipments() {
   const response = await fetch(`${API_URL}/shipments`);
   if (!response.ok) throw new Error('Fehler beim Abrufen der Sendungen');
   return response.json();
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
   try {
     console.log('Sende Partner-Daten:', data);
     
     const response = await fetch(`${API_URL}/shipments/${id}/partners`, {
       method: 'PUT',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
     });
     
     const result = await response.json();
     
     if (!response.ok) {
       console.error('Partner-Zuweisung Fehler:', result);
       throw new Error(result.error || 'Fehler beim Zuweisen');
     }
     
     return result;
   } catch (error) {
     console.error('Partner-Fehler Details:', error);
     throw error;
   }
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
 }
};

export default shipmentService;