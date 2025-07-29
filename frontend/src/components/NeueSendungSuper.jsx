import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  User,
  Users,
  MapPin,
  Calendar,
  FileText,
  Save,
  Plus,
  Trash2,
  Building,
  Plane,
  Ship,
  Truck,
  AlertCircle,
  Clock,
  Euro,
  Globe,
  Home,
  Search,
  Wand2
} from 'lucide-react';
import PartnerKalkulation from './PartnerKalkulation';
import shipmentService from '../services/shipmentService';

const NeueSendungSuper = ({ onClose, onSave }) => {
  const [showPartnerKalkulation, setShowPartnerKalkulation] = useState(false);
  const [erfassteSendung, setErfassteSendung] = useState(null);
  
  // States für Daten aus der API
  const [kunden, setKunden] = useState([]);
  const [flughaefen, setFlughaefen] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Magic Box Upload States
  const [magicInputMode, setMagicInputMode] = useState('text');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [extractedData, setExtractedData] = useState([]);
  
  // Partner-Modal State
  const [showNewPartnerModal, setShowNewPartnerModal] = useState(null);

  const [formData, setFormData] = useState({
    // Kunde & Abholung
    kunde: '',
    abholort: '',
    referenz: '',
    gewichtsModus: 'einzeln',
    
    // Partner-Felder
    vorlaufPartner: '',
    hauptlaufPartner: [],
    zustellungPartner: '',
    
    // Route & Transport
    importExport: 'export',
    transportArt: 'luftfracht',
    vonFlughafen: '',
    nachFlughafen: '',
    
    // Zeiten
    abholDatum: '',
    abholZeit: '',
    deadline: '',
    
    // Empfänger
    empfaenger: {
      name: '',
      strasse: '',
      plz: '',
      ort: '',
      land: ''
    },
    
    // Frankatur
    frankatur: 'CPT',
    
    // Packstücke
    colli: [
      { 
        anzahl: 1, 
        laenge: '', 
        breite: '', 
        hoehe: '', 
        gewichtProStueck: '', 
        gewichtTyp: 'proStueck',
        volumen: 0 
      }
    ],
    
    // Zusatzinfos
    warenbeschreibung: '',
    sonderanweisungen: '',
    warenwert: '',
    
    // Partner (nach Erfassung)
    abholPartner: '',
    hauptlaufPartner: '',
    zustellPartner: ''
  });

  // Lade echte Daten beim Start
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      console.log('🚀 Loading master data...');
      
      const [customersData, partnersData, airportsData] = await Promise.all([
        shipmentService.getCustomers().catch(err => {
          console.error('❌ Error loading customers:', err);
          return [];
        }),
        shipmentService.getPartners().catch(err => {
          console.error('❌ Error loading partners:', err);
          return [];
        }), 
        shipmentService.getAirports().catch(err => {
          console.error('❌ Error loading airports:', err);
          return [];
        })
      ]);
      
      console.log('📊 Loaded data:', {
        customers: customersData?.length || 0,
        partners: partnersData?.length || 0,
        airports: airportsData?.length || 0
      });
      
      // Kunden mit Abholorten formatieren
      const formattedCustomers = customersData.map(c => ({
        id: c.id,
        name: c.name,
        abholorte: c.pickup_addresses?.map(a => ({
          id: a.id,
          name: `${a.street}, ${a.city}`,
          adresse: `${a.street}, ${a.zip} ${a.city}`,
          zeiten: a.pickup_times?.map(t => {
            const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
            return `${days[t.day_of_week]} ${t.time_from}-${t.time_to}`;
          }).join(', ') || 'Keine Zeiten hinterlegt'
        })) || []
      }));
      
      setKunden(formattedCustomers);
      setFlughaefen(airportsData);
      
      console.log('🔧 Loading partners:', partnersData);
      
      // Partner strukturieren
      const structuredPartners = {
        raw: partnersData
      };
      
      setPartners(structuredPartners);
      
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const incoterms = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FOB', 'CIF'];

  // Intelligente Partner-Auswahl Funktionen
  const getPickupPartners = () => {
    if (!partners.raw) return [];
    
    const pickupPartners = partners.raw.filter(p => p.type === 'carrier');
    const airport = formData.vonFlughafen;
    
    return pickupPartners.map(p => ({
      ...p,
      isRecommended: (airport === 'STR' && p.name === 'HuT') ||
                     (airport === 'FRA' && p.name === 'BT Blue Transport UG') ||
                     (p.name === 'Böpple Automotive GmbH' && formData.transportArt === 'fahrzeug')
    }));
  };

  const getRecommendedPickup = () => {
    const airport = formData.vonFlughafen;
    if (airport === 'STR') return 'HuT';
    if (airport === 'FRA') return 'BT Blue';
    if (formData.transportArt === 'fahrzeug') return 'Böpple';
    return 'Partner nach Flughafen wählen';
  };

  const getMainRunPartners = () => {
    if (!partners.raw) return [];
    
    return [
      ...partners.raw.filter(p => p.type === 'airline' || p.name.includes('Cargo')),
      { id: 'webcargo', name: 'WebCargoNet', type: 'platform' },
      { id: 'chapman', name: 'Chapman Freeborn', type: 'platform' },
      ...partners.raw.filter(p => p.type === 'forwarder')
    ];
  };

  const getDeliveryPartners = () => {
    if (!partners.raw) return [];
    
    const agents = partners.raw.filter(p => p.type === 'agent');
    const targetCountry = formData.empfaenger?.land || formData.nachFlughafen?.substring(0, 2);
    
    return agents.map(p => ({
      ...p,
      country: getCountryFromPartner(p),
      isRecommended: p.country === targetCountry
    })).sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const getCountryFromPartner = (partner) => {
    if (partner.name.includes('USA') || partner.address?.country === 'US') return 'US';
    if (partner.name.includes('UK') || partner.name.includes('London')) return 'GB';
    if (partner.name.includes('Deutschland') || partner.address?.country === 'DE') return 'DE';
    return partner.address?.country || 'Unknown';
  };

  // File Upload Handlers
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    console.log('📎 Files to upload:', files);
    
    const initialProgress = files.map(file => ({
      name: file.name,
      status: 'pending',
      extractedData: []
    }));
    setUploadProgress(initialProgress);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setUploadProgress(prev => prev.map((item, index) => 
        index === i ? { ...item, status: 'processing' } : item
      ));
      
      try {
        const result = await processFile(file);
        
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'success', 
            extractedData: result 
          } : item
        ));
        
        setExtractedData(prev => [...prev, ...result]);
        
      } catch (error) {
        console.error('File processing error:', error);
        
        setUploadProgress(prev => prev.map((item, index) => 
          index === i ? { 
            ...item, 
            status: 'error', 
            error: error.message 
          } : item
        ));
      }
    }
  };

  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          let extractedData = [];
          
          if (file.type === 'application/pdf') {
            extractedData = [
              { field: 'Dateiname', value: file.name },
              { field: 'Dateityp', value: 'PDF-Dokument' },
              { field: 'Hinweis', value: 'PDF erkannt. Kopiere relevanten Text in das Text-Feld für bessere Erkennung.' }
            ];
            
            setMagicInputMode('text');
            
            setTimeout(() => {
              const message = document.createElement('div');
              message.innerHTML = '📄 PDF erkannt! Wechsle zum Text-Modus und kopiere den Inhalt für bessere Erkennung.';
              message.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 16px 24px; border-radius: 8px; z-index: 9999; max-width: 300px;';
              document.body.appendChild(message);
              setTimeout(() => message.remove(), 5000);
            }, 500);
            
          } else if (file.type.startsWith('image/')) {
            extractedData = [
              { field: 'Dateiname', value: file.name },
              { field: 'Dateityp', value: 'Bild-Datei' },
              { field: 'Hinweis', value: 'Bild erkannt. OCR-Erkennung in Entwicklung.' }
            ];
          } else if (file.type.includes('text') || file.name.endsWith('.eml') || file.name.endsWith('.txt')) {
            extractedData = await processTextContent(content);
          } else {
            try {
              extractedData = await processTextContent(content);
            } catch (textError) {
              extractedData = [
                { field: 'Dateiname', value: file.name },
                { field: 'Hinweis', value: 'Unbekannter Dateityp. Versuche Text-Modus.' }
              ];
            }
          }
          
          resolve(extractedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const processTextContent = async (content) => {
    const extractedData = [];
    
    console.log('📄 Processing text content:', content.substring(0, 200));
    
    // Packstücke erkennen
    let totalMatch = content.match(/(\d+)\s*pieces?\s*\/\s*([\d.]+)\s*CBM\s*\/\s*([\d,]+)\s*kg/i);
    if (totalMatch) {
      extractedData.push({ field: 'Packstücke', value: `${totalMatch[1]} Stück` });
      extractedData.push({ field: 'Volumen', value: `${totalMatch[2]} m³` });
      extractedData.push({ field: 'Gewicht', value: `${totalMatch[3]} kg` });
    }
    
    // Empfänger erkennen
    let empfaengerMatch = content.match(/delivery address:\s*([^\n]+)/i);
    if (empfaengerMatch) {
      extractedData.push({ field: 'Empfänger', value: empfaengerMatch[1].trim() });
    }
    
    // Referenz erkennen
    const refMatch = content.match(/(?:ref|reference)[:\s#]*([A-Z0-9-]+)/i);
    if (refMatch) {
      extractedData.push({ field: 'Referenz', value: refMatch[1] });
    }
    
    // Kosten erkennen
    const costMatches = content.matchAll(/([A-Za-z\s]+):\s*\$?([\d,]+(?:\.\d+)?)/g);
    for (const match of costMatches) {
      const [_, service, amount] = match;
      if (service.toLowerCase().includes('customs') || 
          service.toLowerCase().includes('freight') || 
          service.toLowerCase().includes('delivery')) {
        extractedData.push({ field: service.trim(), value: `$${amount}` });
      }
    }
    
    return extractedData;
  };

  const applyExtractedData = () => {
    extractedData.forEach(item => {
      switch(item.field.toLowerCase()) {
        case 'referenz':
          setFormData(prev => ({ ...prev, referenz: item.value }));
          break;
        case 'empfänger':
          setFormData(prev => ({ 
            ...prev, 
            empfaenger: { ...prev.empfaenger, name: item.value }
          }));
          break;
      }
    });
    
    const feedbackDiv = document.createElement('div');
    feedbackDiv.innerHTML = `✅ ${extractedData.length} Felder übernommen`;
    feedbackDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; z-index: 9999;';
    document.body.appendChild(feedbackDiv);
    setTimeout(() => feedbackDiv.remove(), 3000);
    
    setExtractedData([]);
    setUploadProgress([]);
  };

  // Berechne Volumen wenn Maße eingegeben werden
  const handleColliChange = (index, field, value) => {
    const newColli = [...formData.colli];
    newColli[index][field] = value;
    
    if (!newColli[index].gewichtTyp) {
      newColli[index].gewichtTyp = 'proStueck';
    }
    
    if (field === 'laenge' || field === 'breite' || field === 'hoehe') {
      const l = parseFloat(newColli[index].laenge) || 0;
      const b = parseFloat(newColli[index].breite) || 0;
      const h = parseFloat(newColli[index].hoehe) || 0;
      newColli[index].volumen = ((l * b * h) / 1000000).toFixed(3);
      newColli[index].volumengewicht = ((l * b * h) / 6000).toFixed(1);
    }
    
    if (field === 'gewichtProStueck' || field === 'gewichtTyp' || field === 'anzahl') {
      const anzahl = parseInt(newColli[index].anzahl) || 1;
      const gewicht = parseFloat(newColli[index].gewichtProStueck) || 0;
      
      if (newColli[index].gewichtTyp === 'gesamt' && anzahl > 0) {
        newColli[index].gewichtProStueckBerechnet = (gewicht / anzahl).toFixed(2);
      } else {
        newColli[index].gewichtProStueckBerechnet = gewicht;
      }
    }
    
    setFormData(prev => ({ ...prev, colli: newColli }));
  };

  const addColli = () => {
    setFormData(prev => ({
      ...prev,
      colli: [...prev.colli, { 
        anzahl: 1, 
        laenge: '', 
        breite: '', 
        hoehe: '', 
        gewichtProStueck: '', 
        gewichtTyp: 'proStueck',
        volumen: 0 
      }]
    }));
  };

  const removeColli = (index) => {
    if (formData.colli.length > 1) {
      setFormData(prev => ({
        ...prev,
        colli: prev.colli.filter((_, i) => i !== index)
      }));
    }
  };

  // Summen berechnen
  const calculateTotals = () => {
    const totalColli = formData.colli.reduce((sum, c) => sum + (parseInt(c.anzahl) || 0), 0);
    
    const totalGewicht = formData.colli.reduce((sum, c) => {
      const anzahl = parseInt(c.anzahl) || 0;
      const gewicht = parseFloat(c.gewichtProStueck) || 0;
      const gewichtTyp = c.gewichtTyp || 'proStueck';
      
      if (gewichtTyp === 'gesamt') {
        return sum + gewicht;
      } else {
        return sum + (anzahl * gewicht);
      }
    }, 0);
    
    const totalVolumen = formData.colli.reduce((sum, c) => sum + ((parseInt(c.anzahl) || 0) * (parseFloat(c.volumen) || 0)), 0);
    const totalVolumengewicht = formData.colli.reduce((sum, c) => sum + ((parseInt(c.anzahl) || 0) * (parseFloat(c.volumengewicht) || 0)), 0);
    const frachtgewicht = Math.max(totalGewicht, totalVolumengewicht);
    
    return { totalColli, totalGewicht, totalVolumen, totalVolumengewicht, frachtgewicht };
  };

  // PLZ aus Abholort extrahieren für PartnerKalkulation
  const handlePartnerKalkulation = () => {
    const totals = calculateTotals();
    console.log('=== TOTALS BERECHNET ===');
    console.log('Berechnete Totale:', totals);
    console.log('FormData Colli:', formData.colli);
    
    const selectedKunde = kunden.find(k => k.name === formData.kunde);
    const selectedAbholort = selectedKunde?.abholorte?.find(a => a.name === formData.abholort);
    
    let absenderPlz = '';
    if (formData.abholort) {
      const plzMatch = formData.abholort.match(/\b(\d{5})\b/);
      if (plzMatch) {
        absenderPlz = plzMatch[1];
      }
    }
    
    if (!absenderPlz && formData.abholort) {
      const ortLower = formData.abholort.toLowerCase();
      if (ortLower.includes('breuberg')) {
        absenderPlz = '64747'; // DELPHEX PLZ
      } else if (ortLower.includes('affalterbach')) {
        absenderPlz = '71563'; // Mercedes-AMG PLZ
      }
    }

    const sendungData = {
      kunde: formData.kunde,
      kunde_id: selectedKunde?.id,
      customer_id: selectedKunde?.id,
      abholort: formData.abholort,
      absenderPlz: absenderPlz,
      referenz: formData.referenz,
      gewichtsModus: formData.gewichtsModus,
      vorlaufPartner: formData.vorlaufPartner,
      hauptlaufPartner: formData.hauptlaufPartner,
      zustellungPartner: formData.zustellungPartner,
      importExport: formData.importExport,
      transportArt: formData.transportArt,
      vonFlughafen: formData.vonFlughafen,
      nachFlughafen: formData.nachFlughafen,
      abholDatum: formData.abholDatum,
      abholZeit: formData.abholZeit,
      deadline: formData.deadline,
      empfaenger: formData.empfaenger,
      frankatur: formData.frankatur,
      colli: formData.colli,
      warenbeschreibung: formData.warenbeschreibung,
      sonderanweisungen: formData.sonderanweisungen,
      warenwert: formData.warenwert,
      gesamtColli: totals.totalColli,
      gesamtGewicht: totals.totalGewicht,
      gesamtVolumen: totals.totalVolumen
    };

    console.log('=== NeueSendungSuper handlePartnerKalkulation ===');
    console.log('selectedKunde:', selectedKunde);
    console.log('absenderPlz extrahiert:', absenderPlz);
    console.log('sendungData:', sendungData);

    setErfassteSendung(sendungData);
    setShowPartnerKalkulation(true);
  };

  const handleSubmit = () => {
    handlePartnerKalkulation();
  };

  const updateIntelligentDefaults = (data) => {
    console.log('updateIntelligentDefaults called with:', data);
  };

  const { totalColli, totalGewicht, totalVolumen } = calculateTotals();
  const selectedKunde = kunden.find(k => k.name === formData.kunde);
  const abholorte = selectedKunde?.abholorte || [];

  // Loading State
  if (loading) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 50 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Lade Daten...</div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Kunden, Partner und Flughäfen werden geladen</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1rem', 
        zIndex: 50 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', 
          maxWidth: '80rem', 
          width: '100%', 
          maxHeight: '90vh', 
          overflow: 'hidden' 
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid #e5e7eb', 
            backgroundColor: '#f9fafb', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
              <Package style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Neue Sendung - Superdokument
            </h2>
            <button onClick={onClose} style={{ padding: '8px', cursor: 'pointer', border: 'none', background: 'none' }}>
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
            
            {/* Kunde & Abholung */}
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                <User style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Kunde & Abholung
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Kunde auswählen
                  </label>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.kunde}
                    onChange={(e) => setFormData(prev => ({ ...prev, kunde: e.target.value, abholort: '' }))}
                    required
                  >
                    <option value="">Bitte wählen...</option>
                    {kunden.map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Referenznummer
                  </label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.referenz}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenz: e.target.value }))}
                    placeholder="Kunden-Referenz (optional)"
                  />
                </div>
              </div>
              
              {selectedKunde && (
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Abholort
                  </label>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.abholort}
                    onChange={(e) => setFormData(prev => ({ ...prev, abholort: e.target.value }))}
                    required
                  >
                    <option value="">Bitte wählen...</option>
                    {abholorte.map(ort => (
                      <option key={ort.id} value={ort.name}>{ort.name}</option>
                    ))}
                    <option value="new">+ Neuer Abholort</option>
                  </select>
                  
                  {formData.abholort && formData.abholort !== 'new' && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px', fontSize: '0.875rem' }}>
                      {(() => {
                        const ort = abholorte.find(o => o.name === formData.abholort);
                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                              <Home style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                              {ort?.adresse}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <Clock style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                              Abholzeiten: {ort?.zeiten}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Route & Transport */}
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                <MapPin style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Route & Transport
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Import/Export
                  </label>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.importExport}
                    onChange={(e) => setFormData(prev => ({ ...prev, importExport: e.target.value }))}
                  >
                    <option value="export">Export</option>
                    <option value="import">Import</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Transportart
                  </label>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.transportArt}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        transportArt: newValue,
                        vorlaufPartner: '',
                        hauptlaufPartner: [],
                        zustellungPartner: ''
                      }));
                      updateIntelligentDefaults({ ...formData, transportArt: newValue });
                    }}
                  >
                    <option value="luftfracht">🔧 Luftfracht (Teile)</option>
                    <option value="luftfracht-fahrzeuge">🚗 Luftfracht (Fahrzeuge)</option>
                    <option value="seefracht">🚢 Seefracht</option>
                    <option value="lkw">🚛 LKW</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Abholung Datum
                  </label>
                  <input 
                    type="date"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.abholDatum}
                    onChange={(e) => setFormData(prev => ({ ...prev, abholDatum: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Abholung Uhrzeit
                  </label>
                  <input 
                    type="time"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.abholZeit}
                    onChange={(e) => setFormData(prev => ({ ...prev, abholZeit: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Von {formData.transportArt.includes('luftfracht') ? 'Flughafen' : formData.transportArt === 'seefracht' ? 'Hafen' : 'Ort'}
                  </label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.vonFlughafen}
                    onChange={(e) => {
                      const newValue = e.target.value.toUpperCase();
                      setFormData(prev => ({ ...prev, vonFlughafen: newValue }));
                      if (newValue.length === 3) {
                        setTimeout(() => updateIntelligentDefaults({ ...formData, vonFlughafen: newValue }), 100);
                      }
                    }}
                    placeholder="z.B. STR"
                    maxLength="3"
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Nach {formData.transportArt.includes('luftfracht') ? 'Flughafen' : formData.transportArt === 'seefracht' ? 'Hafen' : 'Ort'}
                  </label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.nachFlughafen}
                    onChange={(e) => setFormData(prev => ({ ...prev, nachFlughafen: e.target.value.toUpperCase() }))}
                    placeholder="z.B. LAX"
                    maxLength="3"
                    required
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Frankatur
                  </label>
                  <select 
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.frankatur}
                    onChange={(e) => setFormData(prev => ({ ...prev, frankatur: e.target.value }))}
                  >
                    {incoterms.map(term => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Packstücke */}
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                  <Package style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                  Packstücke
                </h3>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ 
                    display: 'flex', 
                    backgroundColor: 'white', 
                    borderRadius: '6px', 
                    border: '1px solid #e5e7eb',
                    padding: '2px'
                  }}>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, gewichtsModus: 'einzeln' }))}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: formData.gewichtsModus === 'einzeln' ? '#2563eb' : 'transparent',
                        color: formData.gewichtsModus === 'einzeln' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      ⚖️ Einzelgewicht
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, gewichtsModus: 'gesamt' }))}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: formData.gewichtsModus === 'gesamt' ? '#2563eb' : 'transparent',
                        color: formData.gewichtsModus === 'gesamt' ? 'white' : '#6b7280',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      📦 Gesamtgewicht
                    </button>
                  </div>
                  
                  <button 
                    onClick={addColli}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '6px 12px', 
                      backgroundColor: '#34c759', 
                      color: 'white', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      border: 'none',
                      fontSize: '0.875rem'
                    }}
                  >
                    <Plus style={{ width: '16px', height: '16px', marginRight: '4px' }} />
                    Hinzufügen
                  </button>
                </div>
              </div>

              {formData.gewichtsModus === 'gesamt' && (
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '12px', 
                  backgroundColor: '#e0f2fe', 
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <AlertCircle style={{ width: '16px', height: '16px', color: '#0369a1' }} />
                  <span style={{ fontSize: '0.875rem' }}>Gesamtgewicht für alle Packstücke:</span>
                  <input 
                    type="number"
                    step="0.1"
                    style={{ 
                      width: '120px',
                      padding: '6px 12px',
                      border: '1px solid #0369a1',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}
                    placeholder="kg gesamt"
                    onChange={(e) => {
                      const totalWeight = parseFloat(e.target.value) || 0;
                      const totalPieces = formData.colli.reduce((sum, c) => sum + (parseInt(c.anzahl) || 0), 0);
                      if (totalPieces > 0) {
                        const weightPerPiece = totalWeight / totalPieces;
                        const newColli = formData.colli.map(c => ({
                          ...c,
                          gewichtProStueck: ((parseInt(c.anzahl) || 0) * weightPerPiece).toFixed(2),
                          gewichtTyp: 'gesamt'
                        }));
                        setFormData(prev => ({ ...prev, colli: newColli }));
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>kg</span>
                </div>
              )}
              
              {formData.colli.map((colli, index) => (
                <div key={index} style={{ marginBottom: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 140px repeat(3, 1fr) 100px', gap: '8px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Anzahl</label>
                      <input 
                        type="number"
                        min="1"
                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        value={colli.anzahl}
                        onChange={(e) => handleColliChange(index, 'anzahl', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Gewicht {formData.gewichtsModus === 'gesamt' ? '(auto)' : ''}
                      </label>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input 
                          type="number"
                          step="0.1"
                          style={{ 
                            flex: 1, 
                            padding: '8px', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '4px',
                            backgroundColor: formData.gewichtsModus === 'gesamt' ? '#f3f4f6' : 'white'
                          }}
                          value={colli.gewichtProStueck || ''}
                          onChange={(e) => handleColliChange(index, 'gewichtProStueck', e.target.value)}
                          placeholder="kg"
                          disabled={formData.gewichtsModus === 'gesamt'}
                        />
                        {formData.gewichtsModus === 'einzeln' && (
                          <select
                            style={{ 
                              padding: '8px 4px', 
                              border: '1px solid #d1d5db', 
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              width: '80px'
                            }}
                            value={colli.gewichtTyp || 'proStueck'}
                            onChange={(e) => handleColliChange(index, 'gewichtTyp', e.target.value)}
                          >
                            <option value="proStueck">kg/Stück</option>
                            <option value="gesamt">kg gesamt</option>
                          </select>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>L (cm)</label>
                      <input 
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        value={colli.laenge}
                        onChange={(e) => handleColliChange(index, 'laenge', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>B (cm)</label>
                      <input 
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        value={colli.breite}
                        onChange={(e) => handleColliChange(index, 'breite', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>H (cm)</label>
                      <input 
                        type="number"
                        style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        value={colli.hoehe}
                        onChange={(e) => handleColliChange(index, 'hoehe', e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Vol (m³)</label>
                        <input 
                          type="text"
                          style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f3f4f6' }}
                          value={colli.volumen}
                          readOnly
                        />
                      </div>
                      {formData.colli.length > 1 && (
                        <button 
                          onClick={() => removeColli(index)}
                          style={{ padding: '8px', color: '#ef4444', cursor: 'pointer', border: 'none', background: 'none' }}
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Magic Input */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '20px', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '12px',
                border: '2px dashed #0284c7'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                  <Wand2 style={{ width: '20px', height: '20px', color: '#0284c7' }} />
                  <strong style={{ fontSize: '1rem' }}>Magic Input - Intelligente Datenerkennung</strong>
                  <span style={{
                    marginLeft: 'auto',
                    padding: '4px 12px',
                    backgroundColor: formData.importExport === 'import' ? '#d1fae5' : '#fef3c7',
                    color: formData.importExport === 'import' ? '#065f46' : '#92400e',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {formData.importExport === 'import' ? 'Auftrags-Modus' : 'Anfrage-Modus'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  backgroundColor: '#e0f2fe',
                  padding: '4px',
                  borderRadius: '8px'
                }}>
                  <button 
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: magicInputMode === 'text' ? '#0284c7' : 'transparent',
                      color: magicInputMode === 'text' ? 'white' : '#0284c7',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setMagicInputMode('text')}
                  >
                    📝 Text/E-Mail einfügen
                  </button>
                  <button 
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: magicInputMode === 'upload' ? '#0284c7' : 'transparent',
                      color: magicInputMode === 'upload' ? 'white' : '#0284c7',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setMagicInputMode('upload')}
                  >
                    📎 Datei hochladen
                  </button>
                </div>

                {magicInputMode === 'text' && (
                  <textarea
                    placeholder={`Fügen Sie hier E-Mails, Angebote oder andere Texte ein...

Das System erkennt automatisch:
✓ Packstücke: "5 pieces / 11.52 CBM / 2,320 kg"
✓ Preise: "Customs Clearance: $295", "Air Freight: $2.95/kg"
✓ Partner: "Luis Manjarrez", "Schaefer Trans Inc"
✓ Referenzen: "REF: ABC-123", "AWB: 123-45678901"

Beispiel:
5 pieces / 11.52 CBM / 2,320 kg
Customs Clearance: $295
ISF: $300
Air Freight: $2.95/kg
Handling: $75`}
                    style={{
                      width: '100%',
                      minHeight: '200px',
                      padding: '16px',
                      border: '1px solid #0284c7',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      resize: 'vertical',
                      backgroundColor: 'white'
                    }}
                    onBlur={(e) => {
                      const text = e.target.value;
                      if (!text.trim()) return;
                      
                      console.log('🪄 Magic Input Text Processing:', text);
                      
                      let updatesMade = false;
                      
                      const packMatch = text.match(/(\d+)\s*pieces?\s*\/\s*([\d.]+)\s*CBM\s*\/\s*([\d,]+)\s*kg/i);
                      if (packMatch) {
                        const [_, pieces, cbm, weight] = packMatch;
                        console.log('✅ Packstücke gefunden:', { pieces, cbm, weight });
                        
                        const weightNum = parseFloat(weight.replace(',', ''));
                        const cbmNum = parseFloat(cbm);
                        const piecesNum = parseInt(pieces);
                        
                        setFormData(prev => ({
                          ...prev,
                          colli: [{
                            anzahl: piecesNum,
                            gewichtProStueck: (weightNum / piecesNum).toFixed(2),
                            gewichtTyp: 'proStueck',
                            volumen: (cbmNum / piecesNum).toFixed(3),
                            laenge: '',
                            breite: '',
                            hoehe: ''
                          }]
                        }));
                        updatesMade = true;
                      }
                      
                      const refMatch = text.match(/(?:REF|Reference)[:\s]*([A-Z0-9-]+)/i);
                      if (refMatch) {
                        console.log('✅ Referenz gefunden:', refMatch[1]);
                        setFormData(prev => ({ ...prev, referenz: refMatch[1] }));
                        updatesMade = true;
                      }
                      
                      if (updatesMade) {
                        console.log('🎉 Magic Input: Updates applied!');
                        
                        const feedback = document.createElement('div');
                        feedback.innerHTML = '🪄 Magic Input erfolgreich! Felder wurden automatisch ausgefüllt.';
                        feedback.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 16px 24px; border-radius: 8px; z-index: 9999; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
                        document.body.appendChild(feedback);
                        setTimeout(() => feedback.remove(), 4000);
                        
                        e.target.value = '';
                      } else {
                        console.log('❌ Magic Input: Keine Patterns erkannt');
                        
                        const feedback = document.createElement('div');
                        feedback.innerHTML = '🔍 Keine Patterns erkannt. Prüfe das Text-Format.';
                        feedback.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 16px 24px; border-radius: 8px; z-index: 9999;';
                        document.body.appendChild(feedback);
                        setTimeout(() => feedback.remove(), 3000);
                      }
                    }}
                  />
                )}

                {magicInputMode === 'upload' && (
                  <div>
                    <div 
                      style={{
                        border: '2px dashed #0284c7',
                        borderRadius: '8px',
                        padding: '40px 20px',
                        textAlign: 'center',
                        backgroundColor: dragOver ? '#e0f2fe' : 'white',
                        transition: 'background-color 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const files = Array.from(e.dataTransfer.files);
                        handleFileUpload(files);
                      }}
                      onClick={() => document.getElementById('file-upload').click()}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📎</div>
                      <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#0284c7' }}>
                        Dateien hier ablegen oder klicken zum Auswählen
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                        Unterstützt: PDF, JPG, PNG, DOC, XLS, E-Mail-Dateien (.eml, .msg)
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Maximale Dateigröße: 10 MB pro Datei
                      </div>
                    </div>

                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.eml,.msg,.txt"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    />

                    {uploadProgress.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                          Dateien werden verarbeitet:
                        </div>
                        {uploadProgress.map((file, index) => (
                          <div key={index} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '8px 12px', 
                            backgroundColor: '#f8fafc', 
                            borderRadius: '6px', 
                            marginBottom: '4px' 
                          }}>
                            <span style={{ fontSize: '20px', marginRight: '12px' }}>
                              {file.status === 'processing' ? '⏳' : 
                               file.status === 'success' ? '✅' : 
                               file.status === 'error' ? '❌' : '📎'}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: '500' }}>{file.name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                {file.status === 'processing' ? 'Wird verarbeitet...' :
                                 file.status === 'success' ? `${file.extractedData?.length || 0} Felder erkannt` :
                                 file.status === 'error' ? file.error : 'Bereit'}
                              </div>
                            </div>
                            {file.status === 'processing' && (
                              <div style={{ 
                                width: '24px', 
                                height: '24px', 
                                border: '2px solid #e5e7eb', 
                                borderTop: '2px solid #0284c7', 
                                borderRadius: '50%', 
                                animation: 'spin 1s linear infinite' 
                              }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {extractedData.length > 0 && (
                      <div style={{ 
                        marginTop: '16px', 
                        padding: '16px', 
                        backgroundColor: '#f0fdf4', 
                        borderRadius: '8px',
                        border: '1px solid #16a34a'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#16a34a' }}>
                          📋 Extrahierte Daten:
                        </div>
                        {extractedData.map((item, index) => (
                          <div key={index} style={{ 
                            fontSize: '12px', 
                            padding: '4px 8px', 
                            backgroundColor: 'white', 
                            borderRadius: '4px', 
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span style={{ fontWeight: '500' }}>{item.field}:</span>
                            <span>{item.value}</span>
                          </div>
                        ))}
                        <button
                          onClick={applyExtractedData}
                          style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          ✅ Daten übernehmen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Warenbeschreibung (optional)
                  </label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.warenbeschreibung}
                    onChange={(e) => setFormData(prev => ({ ...prev, warenbeschreibung: e.target.value }))}
                    placeholder="z.B. Automotive Parts"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                    Sonderanweisungen (optional)
                  </label>
                  <input 
                    type="text"
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    value={formData.sonderanweisungen}
                    onChange={(e) => setFormData(prev => ({ ...prev, sonderanweisungen: e.target.value }))}
                    placeholder="z.B. Fragile, Keep cool"
                  />
                </div>
              </div>
             
             <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
               <div>
                 <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                   Warenwert (optional)
                 </label>
                 <div style={{ display: 'flex', alignItems: 'center' }}>
                   <input 
                     type="number"
                     style={{ flex: 1, padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px 0 0 4px' }}
                     value={formData.warenwert}
                     onChange={(e) => setFormData(prev => ({ ...prev, warenwert: e.target.value }))}
                     placeholder="0.00"
                   />
                   <span style={{ padding: '8px 12px', backgroundColor: '#e5e7eb', borderRadius: '0 4px 4px 0' }}>EUR</span>
                 </div>
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>
                   Deadline (optional)
                 </label>
                 <input 
                   type="date"
                   style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                   value={formData.deadline}
                   onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                 />
               </div>
             </div>
             
             {/* Summen */}
             <div style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#dbeafe', borderRadius: '4px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                 <div>
                   <span style={{ color: '#6b7280' }}>Gesamt Colli:</span>
                   <span style={{ fontWeight: '600', marginLeft: '8px' }}>{totalColli}</span>
                 </div>
                 <div>
                   <span style={{ color: '#6b7280' }}>Gesamt Gewicht:</span>
                   <span style={{ fontWeight: '600', marginLeft: '8px' }}>{totalGewicht.toFixed(1)} kg</span>
                 </div>
                 <div>
                   <span style={{ color: '#6b7280' }}>Gesamt Volumen:</span>
                   <span style={{ fontWeight: '600', marginLeft: '8px' }}>{totalVolumen.toFixed(3)} m³</span>
                 </div>
               </div>
             </div>
             
             {/* Volumengewicht-Details für Luftfracht */}
             {formData.transportArt === 'luftfracht' && (
               <div style={{ marginTop: '1rem', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                   <AlertCircle style={{ width: '16px', height: '16px', marginRight: '8px', color: '#f59e0b' }} />
                   <strong style={{ fontSize: '0.875rem' }}>Luftfracht Gewichtsberechnung</strong>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                   <div>
                     <span style={{ color: '#6b7280' }}>Tatsächliches Gewicht:</span>
                     <span style={{ fontWeight: '600', marginLeft: '8px' }}>{totalGewicht.toFixed(1)} kg</span>
                   </div>
                   <div>
                     <span style={{ color: '#6b7280' }}>Volumengewicht:</span>
                     <span style={{ fontWeight: '600', marginLeft: '8px' }}>{calculateTotals().totalVolumengewicht.toFixed(1)} kg</span>
                   </div>
                   <div>
                     <span style={{ color: '#6b7280' }}>Frachtgewicht:</span>
                     <span style={{ fontWeight: '600', marginLeft: '8px', color: '#dc2626' }}>
                       {calculateTotals().frachtgewicht.toFixed(1)} kg
                     </span>
                   </div>
                 </div>
                 <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#92400e' }}>
                   * Berechnung: L × B × H (cm) ÷ 6000 = Volumengewicht (kg)
                 </div>
               </div>
             )}
           </div>

           {/* Empfänger */}
           <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
             <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
               <Building style={{ width: '16px', height: '16px', marginRight: '8px' }} />
               Empfänger
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
               <input 
                 type="text"
                 placeholder="Firmenname (optional)"
                 style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                 value={formData.empfaenger.name}
                 onChange={(e) => setFormData(prev => ({ 
                   ...prev, 
                   empfaenger: { ...prev.empfaenger, name: e.target.value }
                 }))}
               />
               <input 
                 type="text"
                 placeholder="Straße (optional)"
                 style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                 value={formData.empfaenger.strasse}
                 onChange={(e) => setFormData(prev => ({ 
                   ...prev, 
                   empfaenger: { ...prev.empfaenger, strasse: e.target.value }
                 }))}
               />
               <input 
                 type="text"
                 placeholder="PLZ (optional)"
                 style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                 value={formData.empfaenger.plz}
                 onChange={(e) => setFormData(prev => ({ 
                   ...prev, 
                   empfaenger: { ...prev.empfaenger, plz: e.target.value }
                 }))}
               />
               <div>
                 <input 
                   type="text"
                   placeholder="Ort *"
                   style={{ 
                     padding: '8px', 
                     border: '1px solid #d1d5db', 
                     borderRadius: '4px',
                     borderColor: formData.empfaenger.ort ? '#d1d5db' : '#ef4444'
                   }}
                   value={formData.empfaenger.ort}
                   onChange={(e) => setFormData(prev => ({ 
                     ...prev, 
                     empfaenger: { ...prev.empfaenger, ort: e.target.value }
                   }))}
                   required
                 />
                 <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>* Pflichtfeld</span>
               </div>
               <div style={{ gridColumn: 'span 2' }}>
                 <input 
                   type="text"
                   placeholder="Land-Code (z.B. DE, US, FR) *"
                   style={{ 
                     width: '100%',
                     padding: '8px', 
                     border: '1px solid #d1d5db', 
                     borderRadius: '4px',
                     borderColor: formData.empfaenger.land ? '#d1d5db' : '#ef4444'
                   }}
                   value={formData.empfaenger.land}
                   onChange={(e) => setFormData(prev => ({ 
                     ...prev, 
                     empfaenger: { ...prev.empfaenger, land: e.target.value.toUpperCase() }
                   }))}
                   maxLength="2"
                   required
                 />
                 <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>* Pflichtfeld</span>
               </div>
             </div>
           </div>

           {/* Actions */}
           <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
             <button 
               onClick={onClose}
               style={{ 
                 padding: '8px 16px', 
                 border: '1px solid #d1d5db', 
                 borderRadius: '4px', 
                 backgroundColor: 'white',
                 cursor: 'pointer'
               }}
             >
               Abbrechen
             </button>
             <button 
               onClick={handleSubmit}
               style={{ 
                 padding: '8px 16px', 
                 backgroundColor: '#2563eb', 
                 color: 'white', 
                 borderRadius: '4px', 
                 display: 'flex', 
                 alignItems: 'center',
                 cursor: 'pointer',
                 border: 'none'
               }}
             >
               <Save style={{ width: '16px', height: '16px', marginRight: '8px' }} />
               Weiter zur Partnerzuweisung
             </button>
           </div>
         </div>
       </div>
     </div>

     {/* Partner Kalkulation Modal */}
     {showPartnerKalkulation && (
       <PartnerKalkulation 
         sendungData={erfassteSendung}
         onClose={() => {
           setShowPartnerKalkulation(false);
           if (window.location.pathname.includes('sendung')) {
             window.location.reload();
           }
         }}
         onComplete={(completeData) => {
           if (completeData.status !== 'ANFRAGE') {
             onSave(completeData);
           }
         }}
       />
     )}
   </>
 );
};

export default NeueSendungSuper;
