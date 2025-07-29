import React, { useState, useEffect } from 'react';
import CustomerForm from '../components/CustomerForm';
import PartnerForm from '../components/PartnerForm';

const CustomersAndPartners = () => {
  // Kunden-Logik
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Partner-Logik
  const [partners, setPartners] = useState([]);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  // Kunden laden
  const fetchCustomers = async () => {
    try {
      const response = await fetch('https://logistikpro-production.onrender.com/api/customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
    }
  };

  // Partner laden
  const fetchPartners = async () => {
    try {
      const response = await fetch('https://logistikpro-production.onrender.com/api/partners');
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error('Fehler beim Laden der Partner:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPartners();
  }, []);

  // Partner löschen
  const handleDeletePartner = async (id) => {
    if (!window.confirm("Diesen Partner wirklich löschen?")) return;
    try {
      await fetch(`https://logistikpro-production.onrender.com/api/partners/${id}`, { method: "DELETE" });
      fetchPartners();
    } catch (error) {
      console.error('Fehler beim Löschen des Partners:', error);
    }
  };

  // Hilfsfunktionen für Kundenverwaltung
  const getDayName = (dayNumber) => {
    const days = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    return days[dayNumber] || `Tag ${dayNumber}`;
  };

  const getContactForAddress = (customer, contactId) => {
    if (!contactId || !customer.contacts) return null;
    return customer.contacts.find(contact => contact.id === contactId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>LogistikPro - Kunden- und Partnerverwaltung</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingCustomer(null);
          }}
        >
          Neuer Kunde
        </button>
      </header>

      {/* Kundenformular */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSave={() => {
            setShowForm(false);
            setEditingCustomer(null);
            fetchCustomers();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* Kundenliste */}
      <div className="customers-list">
        {customers.length === 0 ? (
          <div className="no-customers">
            <p>Keine Kunden vorhanden.</p>
            <p>Klicken Sie auf "Neuer Kunde", um den ersten Kunden anzulegen.</p>
          </div>
        ) : (
          customers.map(customer => (
            <div key={customer.id} className="customer-card">
              <div className="customer-header">
                <div className="customer-title">
                  <h2>{customer.name}</h2>
                  {customer.info && (
                    <div className="customer-info">
                      <span className="info-icon">ℹ️</span>
                      <span className="info-text">{customer.info}</span>
                    </div>
                  )}
                </div>
                <div className="customer-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingCustomer(customer);
                      setShowForm(true);
                    }}
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>

              <div className="customer-details">
                {/* Ansprechpartner */}
                <div className="contacts-section">
                  <h3>Ansprechpartner</h3>
                  {customer.contacts && customer.contacts.length > 0 ? (
                    <div className="contacts-list">
                      {customer.contacts.map(contact => (
                        <div key={contact.id} className="contact-card">
                          <div className="contact-header">
                            <div className="contact-info">
                              <h4>{contact.name}</h4>
                              {contact.email && (
                                <p className="contact-email">
                                  <span className="contact-label">E-Mail:</span>
                                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                </p>
                              )}
                            </div>
                          </div>
                          {contact.phones && contact.phones.length > 0 && (
                            <div className="contact-phones">
                              <span className="contact-label">Telefon:</span>
                              <ul>
                                {contact.phones.map((phone, i) => (
                                  <li key={i}>
                                    <a href={`tel:${phone}`}>{phone}</a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">Keine Ansprechpartner vorhanden.</p>
                  )}
                </div>

                {/* Abholadressen */}
                <div className="addresses-section">
                  <h3>Abholadressen</h3>
                  {customer.pickup_addresses && customer.pickup_addresses.length > 0 ? (
                    <div className="addresses-list">
                      {customer.pickup_addresses.map(address => {
                        const addressContact = getContactForAddress(customer, address.contact_id);
                        return (
                          <div key={address.id} className="address-card">
                            <div className="address-header">
                              <div className="address-info">
                                <h4>{address.street}</h4>
                                <p>{address.zip} {address.city}, {address.country}</p>
                                {addressContact && (
                                  <div className="address-contact">
                                    <span className="contact-label">Ansprechpartner:</span>
                                    <span className="contact-name">{addressContact.name}</span>
                                    {addressContact.phones && addressContact.phones.length > 0 && (
                                      <span className="contact-phone">
                                        | <a href={`tel:${addressContact.phones[0]}`}>{addressContact.phones[0]}</a>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="pickup-times">
                              <h5>Abholzeiten</h5>
                              {address.pickup_times && address.pickup_times.length > 0 ? (
                                <ul className="pickup-times-list">
                                  {address.pickup_times.map(time => (
                                    <li key={time.id} className="pickup-time">
                                      <div className="pickup-time-info">
                                        <span className="pickup-day">{getDayName(time.day_of_week)}</span>
                                        <span className="pickup-hours">{time.time_from} - {time.time_to}</span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="no-data">Keine Abholzeiten definiert.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-data">Keine Adressen vorhanden.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Partnerverwaltung */}
      <hr />
      <div
        className="partner-section"
        style={{
          background: "#e3f2fd",
          padding: "2rem",
          borderRadius: "1rem",
          marginTop: "2rem"
        }}
      >
        <h2 style={{ color: "#1976d2" }}>Partner verwalten</h2>
        
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowPartnerForm(true);
            setEditingPartner(null);
          }}
          style={{ marginBottom: "1rem" }}
        >
          Neuer Partner
        </button>

        {/* Partner-Formular */}
        {showPartnerForm && (
          <PartnerForm
            partner={editingPartner}
            onSave={() => {
              setShowPartnerForm(false);
              setEditingPartner(null);
              fetchPartners();
            }}
            onCancel={() => {
              setShowPartnerForm(false);
              setEditingPartner(null);
            }}
          />
        )}

        <h3 style={{ marginTop: "2rem" }}>Alle Partner</h3>
        {partners.length === 0 ? (
          <p>Keine Partner angelegt.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {partners.map(partner => (
              <li
                key={partner.id}
                style={{
                  background: partner.type === "carrier" ? "#fffde7" : "#e8f5e9",
                  border: "1px solid #bdbdbd",
                  borderRadius: "0.5rem",
                  margin: "0.5rem 0",
                  padding: "1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                      {partner.name}{" "}
                      <span
                        style={{
                          color: partner.type === "carrier" ? "#fbc02d" : "#388e3c",
                          fontWeight: "normal"
                        }}
                      >
                        ({partner.type === "carrier" ? "Fuhrunternehmer" : "Agent"})
                      </span>
                    </div>
                    {partner.info && (
                      <div style={{ fontStyle: "italic", color: "#616161", marginTop: "0.5rem" }}>
                        <strong>Info:</strong> {partner.info}
                      </div>
                    )}
                    {partner.emails && partner.emails.length > 0 && (
                      <div>
                        <span style={{ fontWeight: "bold" }}>E-Mail:</span>{" "}
                        {partner.emails.join(", ")}
                      </div>
                    )}
                    {partner.phones && partner.phones.length > 0 && (
                      <div>
                        <span style={{ fontWeight: "bold" }}>Telefon:</span>{" "}
                        {partner.phones.join(", ")}
                      </div>
                    )}
                    {partner.address && (
                      <div>
                        <span style={{ fontWeight: "bold" }}>Adresse:</span>{" "}
                        {partner.address.street}, {partner.address.zip} {partner.address.city}, {partner.address.country}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingPartner(partner);
                        setShowPartnerForm(true);
                      }}
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeletePartner(partner.id)}
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomersAndPartners;
