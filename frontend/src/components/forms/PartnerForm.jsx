import React, { useState, useEffect } from "react";

const initialState = {
  name: "",
  type: "carrier",
  info: "",
  emails: [""],
  phones: [""],
  address: {
    street: "",
    zip: "",
    city: "",
    country: ""
  }
};

export default function PartnerForm({ partner, onSave, onCancel }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Formular mit Partner-Daten vorausfüllen (beim Bearbeiten)
  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name || "",
        type: partner.type || "carrier",
        info: partner.info || "",
        emails: partner.emails && partner.emails.length > 0 ? partner.emails : [""],
        phones: partner.phones && partner.phones.length > 0 ? partner.phones : [""],
        address: partner.address || { street: "", zip: "", city: "", country: "" }
      });
    } else {
      setForm(initialState);
    }
  }, [partner]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("address.")) {
      setForm({
        ...form,
        address: { ...form.address, [name.split(".")[1]]: value }
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleArrayChange = (field, idx, value) => {
    const arr = [...form[field]];
    arr[idx] = value;
    setForm({ ...form, [field]: arr });
  };

  const addArrayField = (field) => {
    setForm({ ...form, [field]: [...form[field], ""] });
  };

  const removeArrayField = (field, idx) => {
    const arr = [...form[field]];
    arr.splice(idx, 1);
    setForm({ ...form, [field]: arr });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Filter leere Einträge raus
    const emails = form.emails.filter((email) => email.trim() !== "");
    const phones = form.phones.filter((phone) => phone.trim() !== "");
    const payload = { ...form, emails, phones };

    try {
      const url = partner 
        ? `https://logistikpro-production.onrender.com/api/partners/${partner.id}`
        : "https://logistikpro-production.onrender.com/api/partners";
      const method = partner ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern des Partners");
      }

      setSuccess(partner ? "Partner erfolgreich aktualisiert!" : "Partner erfolgreich angelegt!");
      
      if (!partner) {
        setForm(initialState);
      }
      
      if (onSave) {
        setTimeout(() => onSave(), 1000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: "#fff",
      border: "1px solid #90caf9",
      borderRadius: "1rem",
      padding: "1.5rem",
      marginBottom: "2rem",
      boxShadow: "0 2px 8px #e3f2fd"
    }}>
      <h2 style={{ color: "#1976d2", marginBottom: "1rem" }}>
        {partner ? "Partner bearbeiten" : "Neuen Partner anlegen"}
      </h2>
      
      {error && <div style={{ color: "red", marginBottom: "0.5rem" }}>{error}</div>}
      {success && <div style={{ color: "green", marginBottom: "0.5rem" }}>{success}</div>}

      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        Name*<br />
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        Typ*<br />
        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd" }}
        >
          <option value="carrier">Fuhrunternehmer</option>
          <option value="agent">Agent</option>
        </select>
      </label>

      <label style={{ display: "block", marginBottom: "0.5rem" }}>
        Info (optional)<br />
        <input
          type="text"
          name="info"
          value={form.info}
          onChange={handleChange}
          placeholder="Notizen, Besonderheiten, interne Hinweise..."
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd" }}
        />
      </label>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>E-Mails</label>
        {form.emails.map((email, idx) => (
          <div key={idx} style={{ display: "flex", marginBottom: "0.3rem" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => handleArrayChange("emails", idx, e.target.value)}
              style={{ flex: 1, padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd" }}
            />
            <button type="button" onClick={() => removeArrayField("emails", idx)} style={{ marginLeft: "0.5rem", color: "red" }}>-</button>
          </div>
        ))}
        <button type="button" onClick={() => addArrayField("emails")} style={{ color: "#1976d2", marginTop: "0.2rem" }}>+ E-Mail</button>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>Telefonnummern</label>
        {form.phones.map((phone, idx) => (
          <div key={idx} style={{ display: "flex", marginBottom: "0.3rem" }}>
            <input
              type="text"
              value={phone}
              onChange={(e) => handleArrayChange("phones", idx, e.target.value)}
              style={{ flex: 1, padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd" }}
            />
            <button type="button" onClick={() => removeArrayField("phones", idx)} style={{ marginLeft: "0.5rem", color: "red" }}>-</button>
          </div>
        ))}
        <button type="button" onClick={() => addArrayField("phones")} style={{ color: "#1976d2", marginTop: "0.2rem" }}>+ Telefon</button>
      </div>

      <fieldset style={{ border: "1px solid #bdbdbd", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem" }}>
        <legend style={{ fontWeight: "bold" }}>Adresse</legend>
        <input
          type="text"
          name="address.street"
          placeholder="Straße"
          value={form.address.street}
          onChange={handleChange}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd", marginBottom: "0.3rem" }}
        />
        <input
          type="text"
          name="address.zip"
          placeholder="PLZ"
          value={form.address.zip}
          onChange={handleChange}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd", marginBottom: "0.3rem" }}
        />
        <input
          type="text"
          name="address.city"
          placeholder="Stadt"
          value={form.address.city}
          onChange={handleChange}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd", marginBottom: "0.3rem" }}
        />
        <input
          type="text"
          name="address.country"
          placeholder="Land"
          value={form.address.country}
          onChange={handleChange}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.3rem", border: "1px solid #bdbdbd" }}
        />
      </fieldset>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button type="submit" style={{
          background: "#1976d2",
          color: "#fff",
          padding: "0.7rem 2rem",
          border: "none",
          borderRadius: "0.5rem",
          fontWeight: "bold",
          cursor: "pointer"
        }}>
          {partner ? "Aktualisieren" : "Partner anlegen"}
        </button>
        
        {onCancel && (
          <button type="button" onClick={onCancel} style={{
            background: "#757575",
            color: "#fff",
            padding: "0.7rem 2rem",
            border: "none",
            borderRadius: "0.5rem",
            fontWeight: "bold",
            cursor: "pointer"
          }}>
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
