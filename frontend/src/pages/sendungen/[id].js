import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  FileText,
  Truck,
  Plane,
  Building,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Hash,
  Edit3,
  CheckCircle
} from 'lucide-react';

export default function SendungDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [sendung, setSendung] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (id) {
      loadSendung();
    }
  }, [id]);

  const loadSendung = async () => {
    try {
      const response = await fetch(`https://logistikpro-production.onrender.com/api/shipments/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSendung(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Sendung:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Sendungsdetails...</p>
        </div>
      </div>
    );
  }

  if (!sendung) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Sendung nicht gefunden</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Sendungsdetails: {sendung.reference || sendung.id}
                </h1>
                <p className="text-sm text-gray-500">
                  Erstellt am {new Date(sendung.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Bearbeiten</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sendungsdetails
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Sendungsverlauf
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dokumente
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sendungsinformationen */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Sendungsinformationen
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Kunde:</dt>
                  <dd className="font-medium">{sendung.customer_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Referenz:</dt>
                  <dd className="font-medium">{sendung.reference || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">AWB:</dt>
                  <dd className="font-medium text-blue-600">{sendung.awb_number || 'TBD'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Transport:</dt>
                  <dd className="font-medium">{sendung.transport_type || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Route:</dt>
                  <dd className="font-medium">
                    {sendung.from_airport || sendung.origin_airport} → {sendung.to_airport || sendung.destination_airport}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Empfänger */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-600" />
                Empfänger
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Firma:</dt>
                  <dd className="font-medium">{sendung.consignee_name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Ansprechpartner:</dt>
                  <dd className="font-medium">{sendung.consignee_contact || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Adresse:</dt>
                  <dd className="font-medium">
                    {sendung.consignee_address || '-'}<br/>
                    {sendung.consignee_zip} {sendung.consignee_city}<br/>
                    {sendung.consignee_country || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Telefon:</dt>
                  <dd className="font-medium">{sendung.consignee_phone || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">E-Mail:</dt>
                  <dd className="font-medium text-blue-600">
                    {sendung.consignee_email ? (
                      <a href={`mailto:${sendung.consignee_email}`}>{sendung.consignee_email}</a>
                    ) : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Packstücke & Abmessungen */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                Packstücke & Abmessungen
              </h3>
              <dl className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <dt className="text-sm text-gray-500">STÜCK</dt>
                    <dd className="text-2xl font-bold text-blue-600">{sendung.total_pieces || 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">GEWICHT (KG)</dt>
                    <dd className="text-2xl font-bold text-blue-600">
                      {sendung.total_weight ? parseFloat(sendung.total_weight).toFixed(1) : '0.0'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">VOLUMEN (M³)</dt>
                    <dd className="text-2xl font-bold text-blue-600">
                      {sendung.total_volume ? parseFloat(sendung.total_volume).toFixed(3) : '0.000'}
                    </dd>
                  </div>
                </div>
              </dl>
              
              {/* Packstück-Details */}
              {sendung.pieces && sendung.pieces.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Details:</h4>
                  <div className="space-y-2">
                    {sendung.pieces.map((piece, index) => (
                      <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                        <span className="font-medium">{piece.quantity}x</span> {piece.length}x{piece.width}x{piece.height} cm, 
                        <span className="ml-1">{piece.weight_per_piece} kg/Stück</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Sendungsverlauf</h3>
            <div className="space-y-4">
              {/* Timeline items would go here */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Sendung erstellt</p>
                  <p className="text-sm text-gray-500">
                    {new Date(sendung.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
              {/* Add more timeline items based on sendung.history */}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Dokumente</h3>
            <p className="text-gray-500">Keine Dokumente vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}