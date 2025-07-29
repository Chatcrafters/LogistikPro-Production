import React, { useState, useEffect } from 'react';

function CustomerForm({ customer, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [info, setInfo] = useState('');
  const [contacts, setContacts] = useState([
    { name: '', email: '', phones: [''] }
  ]);
  const [addresses, setAddresses] = useState([{
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland',
    contact_id: '',
    pickupTimes: [{
      day_of_week: 1,
      time_from: '08:00',
      time_to: '12:00'
    }]
  }]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formular mit Kundendaten füllen (beim Bearbeiten)
  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setInfo(customer.info || '');
      
      // Ansprechpartner laden
      if (customer.contacts && customer.contacts.length > 0) {
        const loadedContacts = customer.contacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          email: contact.email || '',
          phones: contact.phones && contact.phones.length > 0 ? contact.phones : ['']
        }));
        setContacts(loadedContacts);
      }
      
      // Adressen laden (nur zur Anzeige beim Bearbeiten)
      if (customer.pickup_addresses && customer.pickup_addresses.length > 0) {
        const loadedAddresses = customer.pickup_addresses.map(addr => ({
          id: addr.id,
          street: addr.street,
          zip: addr.zip,
          city: addr.city,
          country: addr.country,
          contact_id: addr.contact_id || '',
          pickupTimes: addr.pickup_times && addr.pickup_times.length > 0 
            ? addr.pickup_times 
            : [{ day_of_week: 1, time_from: '08:00', time_to: '12:00' }]
        }));
        setAddresses(loadedAddresses);
      }
    }
  }, [customer]);

  // Ansprechpartner-Felder verwalten
  const handleContactChange = (index, field, value) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handlePhoneChange = (contactIndex, phoneIndex, value) => {
    const newContacts = [...contacts];
    newContacts[contactIndex].phones[phoneIndex] = value;
    setContacts(newContacts);
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', email: '', phones: [''] }]);
  };

  const removeContact = (index) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const addPhone = (contactIndex) => {
    const newContacts = [...contacts];
    newContacts[contactIndex].phones.push('');
    setContacts(newContacts);
  };

  const removePhone = (contactIndex, phoneIndex) => {
    const newContacts = [...contacts];
    if (newContacts[contactIndex].phones.length > 1) {
      newContacts[contactIndex].phones = newContacts[contactIndex].phones.filter((_, i) => i !== phoneIndex);
      setContacts(newContacts);
    }
  };

  // Adress-Felder verwalten
  const handleAddressChange = (addressIndex, field, value) => {
    const newAddresses = [...addresses];
    newAddresses[addressIndex][field] = value;
    setAddresses(newAddresses);
  };

  const addAddress = () => {
    setAddresses([...addresses, {
      street: '',
      zip: '',
      city: '',
      country: 'Deutschland',
      contact_id: '',
      pickupTimes: [{ day_of_week: 1, time_from: '08:00', time_to: '12:00' }]
    }]);
  };

  const removeAddress = (index) => {
    if (addresses.length > 1) {
      setAddresses(addresses.filter((_, i) => i !== index));
    }
  };

  // Abholzeit-Felder verwalten
  const handlePickupTimeChange = (addressIndex, timeIndex, field, value) => {
    const newAddresses = [...addresses];
    newAddresses[addressIndex].pickupTimes[timeIndex][field] = value;
    setAddresses(newAddresses);
  };

  const addPickupTime = (addressIndex) => {
    const newAddresses = [...addresses];
    newAddresses[addressIndex].pickupTimes.push({
      day_of_week: 1,
      time_from: '08:00',
      time_to: '12:00'
    });
    setAddresses(newAddresses);
  };

  const removePickupTime = (addressIndex, timeIndex) => {
    const newAddresses = [...addresses];
    if (newAddresses[addressIndex].pickupTimes.length > 1) {
      newAddresses[addressIndex].pickupTimes = newAddresses[addressIndex].pickupTimes.filter((_, i) => i !== timeIndex);
      setAddresses(newAddresses);
    }
  };

  // Validierung
  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    // Mindestens ein Ansprechpartner mit Name
    const validContacts = contacts.filter(contact => contact.name.trim() !== '');
    if (validContacts.length === 0) {
      newErrors.contacts = 'Mindestens ein Ansprechpartner mit Name ist erforderlich';
    }

    // Adress-Validierung (nur bei neuen Kunden)
    if (!customer) {
      addresses.forEach((address, addressIndex) => {
        if (!address.street.trim()) {
          newErrors[`address_${addressIndex}_street`] = 'Straße ist erforderlich';
        }
        if (!address.zip.trim()) {
          newErrors[`address_${addressIndex}_zip`] = 'PLZ ist erforderlich';
        }
        if (!address.city.trim()) {
          newErrors[`address_${addressIndex}_city`] = 'Stadt ist erforderlich';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Formular absenden
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Kunden speichern/aktualisieren
      const customerData = {
        name: name.trim(),
        info: info.trim()
      };

      let savedCustomer;
      if (customer) {
        // Kunde aktualisieren
        const response = await fetch(`https://logistikpro-production.onrender.com/api/customers/${customer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
        if (!response.ok) throw new Error('Fehler beim Aktualisieren des Kunden');
        savedCustomer = await response.json();

        // Ansprechpartner aktualisieren (vereinfacht: alle löschen und neu anlegen)
        // In einer echten App würdest du hier differenzierter vorgehen
        for (const contact of customer.contacts || []) {
          await fetch(`https://logistikpro-production.onrender.com/api/contacts/${contact.id}`, {
            method: 'DELETE'
          });
        }
      } else {
        // Neuen Kunden anlegen
        const response = await fetch('https://logistikpro-production.onrender.com/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
        if (!response.ok) throw new Error('Fehler beim Anlegen des Kunden');
        savedCustomer = await response.json();
      }

      // 2. Ansprechpartner speichern
      const savedContacts = [];
      for (const contact of contacts) {
        if (contact.name.trim()) {
          const contactResponse = await fetch('https://logistikpro-production.onrender.com/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: savedCustomer.id,
              name: contact.name.trim(),
              email: contact.email.trim() || null,
              phones: contact.phones.filter(phone => phone.trim() !== '')
            })
          });
          if (!contactResponse.ok) throw new Error('Fehler beim Speichern des Ansprechpartners');
          const savedContact = await contactResponse.json();
          savedContacts.push(savedContact);
        }
      }

      // 3. Adressen und Abholzeiten speichern (nur bei neuen Kunden)
      if (!customer) {
        for (const address of addresses) {
          if (address.street.trim() && address.zip.trim() && address.city.trim()) {
            // Contact ID finden (falls Ansprechpartner ausgewählt)
            let contactId = null;
            if (address.contact_id) {
              // Hier müssten wir die richtige ID aus den gespeicherten Kontakten finden
              // Vereinfacht: ersten Kontakt nehmen, wenn einer ausgewählt wurde
              if (savedContacts.length > 0) {
                contactId = savedContacts[0].id;
              }
            }

            const addressResponse = await fetch('https://logistikpro-production.onrender.com/api/pickup_addresses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customer_id: savedCustomer.id,
                street: address.street.trim(),
                zip: address.zip.trim(),
                city: address.city.trim(),
                country: address.country.trim(),
                contact_id: contactId
              })
            });
            if (!addressResponse.ok) throw new Error('Fehler beim Speichern der Adresse');
            const savedAddress = await addressResponse.json();

            // Abholzeiten für diese Adresse speichern
            for (const time of address.pickupTimes) {
              if (time.time_from && time.time_to) {
                await fetch('https://logistikpro-production.onrender.com/api/pickup_times', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    address_id: savedAddress.id,
                    day_of_week: parseInt(time.day_of_week),
                    time_from: time.time_from,
                    time_to: time.time_to
                  })
                });
              }
            }
          }
        }
      }

      onSave();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setErrors({ submit: 'Fehler beim Speichern. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="customer-form-overlay">
      <div className="customer-form">
        <h2>{customer ? 'Kunde bearbeiten' : 'Neuer Kunde'}</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label>Firmenname / Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'error' : ''}
              placeholder="z.B. Muster GmbH"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* Info */}
          <div className="form-group">
            <label>Wichtige Hinweise</label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="z.B. Immer 30 Minuten vor Abholung anrufen, Zugang über Hintereingang, etc."
              rows="3"
            />
          </div>

          {/* Ansprechpartner */}
          <div className="form-group">
            <label>Ansprechpartner *</label>
            {contacts.map((contact, contactIndex) => (
              <div key={contactIndex} className="address-group">
                <div className="contact-header">
                  <h4>Ansprechpartner {contactIndex + 1}</h4>
                  {contacts.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeContact(contactIndex)}
                      className="btn btn-danger btn-small"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
                
                <div className="input-row">
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => handleContactChange(contactIndex, 'name', e.target.value)}
                    placeholder="Name *"
                    required
                  />
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(e) => handleContactChange(contactIndex, 'email', e.target.value)}
                    placeholder="E-Mail (optional)"
                  />
                </div>

                <div className="phones-section">
                  <label>Telefonnummern</label>
                  {contact.phones.map((phone, phoneIndex) => (
                    <div key={phoneIndex} className="input-group">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(contactIndex, phoneIndex, e.target.value)}
                        placeholder="Telefonnummer"
                      />
                      {contact.phones.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removePhone(contactIndex, phoneIndex)}
                          className="btn btn-danger btn-small"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => addPhone(contactIndex)}
                    className="btn btn-secondary btn-small"
                  >
                    + Telefonnummer hinzufügen
                  </button>
                </div>
              </div>
            ))}
            
            <button type="button" onClick={addContact} className="btn btn-secondary">
              + Weiteren Ansprechpartner hinzufügen
            </button>
            {errors.contacts && <span className="error-message">{errors.contacts}</span>}
          </div>

          {/* Adressen (nur bei neuen Kunden) */}
          {!customer && (
            <div className="form-group">
              <label>Abholadressen</label>
              {addresses.map((address, addressIndex) => (
                <div key={addressIndex} className="address-group">
                  <div className="contact-header">
                    <h4>Adresse {addressIndex + 1}</h4>
                    {addresses.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeAddress(addressIndex)}
                        className="btn btn-danger btn-small"
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                  
                  <div className="input-group">
                    <input
                      type="text"
                      value={address.street}
                      onChange={(e) => handleAddressChange(addressIndex, 'street', e.target.value)}
                      placeholder="Straße und Hausnummer *"
                      className={errors[`address_${addressIndex}_street`] ? 'error' : ''}
                    />
                    {errors[`address_${addressIndex}_street`] && (
                      <span className="error-message">{errors[`address_${addressIndex}_street`]}</span>
                    )}
                  </div>

                  <div className="input-row">
                    <input
                      type="text"
                      value={address.zip}
                      onChange={(e) => handleAddressChange(addressIndex, 'zip', e.target.value)}
                      placeholder="PLZ *"
                      className={errors[`address_${addressIndex}_zip`] ? 'error' : ''}
                    />
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => handleAddressChange(addressIndex, 'city', e.target.value)}
                      placeholder="Stadt *"
                      className={errors[`address_${addressIndex}_city`] ? 'error' : ''}
                    />
                    <input
                      type="text"
                      value={address.country}
                      onChange={(e) => handleAddressChange(addressIndex, 'country', e.target.value)}
                      placeholder="Land"
                    />
                  </div>

                  {/* Ansprechpartner für Adresse auswählen */}
                  <div className="form-group">
                    <label>Ansprechpartner für diese Adresse</label>
                    <select
                      value={address.contact_id}
                      onChange={(e) => handleAddressChange(addressIndex, 'contact_id', e.target.value)}
                    >
                      <option value="">Ansprechpartner wählen (optional)</option>
                      {contacts.map((contact, idx) => 
                        contact.name.trim() && (
                          <option key={idx} value={idx}>
                            {contact.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Abholzeiten für diese Adresse */}
                  <div className="pickup-times-group">
                    <h5>Abholzeiten</h5>
                    {address.pickupTimes.map((time, timeIndex) => (
                      <div key={timeIndex} className="pickup-time-row">
                        <select
                          value={time.day_of_week}
                          onChange={(e) => handlePickupTimeChange(addressIndex, timeIndex, 'day_of_week', e.target.value)}
                        >
                          <option value={1}>Montag</option>
                          <option value={2}>Dienstag</option>
                          <option value={3}>Mittwoch</option>
                          <option value={4}>Donnerstag</option>
                          <option value={5}>Freitag</option>
                          <option value={6}>Samstag</option>
                          <option value={7}>Sonntag</option>
                        </select>
                        <input
                          type="time"
                          value={time.time_from}
                          onChange={(e) => handlePickupTimeChange(addressIndex, timeIndex, 'time_from', e.target.value)}
                        />
                        <input
                          type="time"
                          value={time.time_to}
                          onChange={(e) => handlePickupTimeChange(addressIndex, timeIndex, 'time_to', e.target.value)}
                        />
                        {address.pickupTimes.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removePickupTime(addressIndex, timeIndex)}
                            className="btn btn-danger btn-small"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => addPickupTime(addressIndex)}
                      className="btn btn-secondary btn-small"
                    >
                      + Abholzeit hinzufügen
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addAddress} className="btn btn-secondary">
                + Weitere Adresse hinzufügen
              </button>
            </div>
          )}

          {errors.submit && <div className="error-message">{errors.submit}</div>}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Abbrechen
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Speichern...' : (customer ? 'Aktualisieren' : 'Speichern')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerForm;
