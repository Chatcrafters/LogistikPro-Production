import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
// App.css Import entfernt - wir nutzen Tailwind über index.css

// Direct imports
import SendungsBoard from './components/SendungsBoard';
import NeueSendungSuper from './components/NeueSendungSuper';
import Login from './components/ui/Login';

// Supabase Client Setup
// Supabase Client Setup - Vite nutzt import.meta.env statt process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vjehwwmhtzqilvwtppcc.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZWh3d21odHpxaWx2d3RwcGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDYwMDIsImV4cCI6MjA2NzQ4MjAwMn0.wkFyJHFi2mAb_FRsbjrrBTqX75vqV_4nsfWQLWm8QjI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Production Error Caught:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // In Production: Send to error tracking service
    // trackError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fee2e2',
          borderRadius: '8px',
          margin: '20px',
          border: '1px solid #fecaca'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>
            🚨 Unerwarteter Fehler aufgetreten
          </h2>
          <p style={{ color: '#991b1b', marginBottom: '20px' }}>
            Die Anwendung konnte nicht korrekt geladen werden.
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                marginRight: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Erneut versuchen
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ↻ Seite neu laden
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '20px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                🔍 Debug Information
              </summary>
              <pre style={{
                backgroundColor: '#f3f4f6',
                padding: '12px',
                borderRadius: '4px',
                overflow: 'auto',
                marginTop: '8px',
                fontSize: '12px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Spinner Component
const LoadingSpinner = ({ message = "Daten werden geladen..." }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '16px'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <p style={{ color: '#6b7280', fontSize: '16px' }}>{message}</p>
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Main App Component
function App() {
  console.log('🚀 App Component loaded');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [initError, setInitError] = useState(null);

  // Authentication State Management
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth initialization error:', error);
          setInitError(error.message);
          return;
        }

        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        if (mounted) {
          setInitError('Authentifizierung konnte nicht initialisiert werden');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN') {
          setCurrentView('dashboard');
        } else if (event === 'SIGNED_OUT') {
          setCurrentView('login');
        }
      }
    );

    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Navigation Handler
  const handleNavigation = (view) => {
    setCurrentView(view);
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        alert('Logout fehlgeschlagen: ' + error.message);
        return;
      }
      
      setCurrentView('login');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout fehlgeschlagen');
    }
  };

  // Initial Loading State
  if (loading) {
    return <LoadingSpinner message="LogistikPro wird gestartet..." />;
  }

  // Auth Error State
  if (initError) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#fef3c7',
        borderRadius: '8px',
        margin: '20px'
      }}>
        <h2 style={{ color: '#92400e' }}>⚠️ Initialisierungsfehler</h2>
        <p style={{ color: '#d97706' }}>{initError}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          🔄 Anwendung neu starten
        </button>
      </div>
    );
  }

  console.log('👤 User state:', user);
  
  // Not Authenticated - Show Login
  if (!user) {
    return (
      <ErrorBoundary>
        <div className="App">
          <Login
            supabase={supabase}
            onLogin={(user) => {
              setUser(user);
              setCurrentView('dashboard');
            }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // Authenticated - Show Main App
  return (
    <ErrorBoundary>
      <div className="App">
        {/* Header Navigation */}
        <header style={{
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <h1 style={{ 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              📦 LogistikPro
            </h1>
            
            <nav style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => handleNavigation('dashboard')}
                style={{
                  backgroundColor: currentView === 'dashboard' ? '#3b82f6' : 'transparent',
                  color: 'white',
                  border: '1px solid #4b5563',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📊 Dashboard
              </button>
              
              <button
                onClick={() => handleNavigation('new-shipment')}
                style={{
                  backgroundColor: currentView === 'new-shipment' ? '#3b82f6' : 'transparent',
                  color: 'white',
                  border: '1px solid #4b5563',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ➕ Neue Sendung
              </button>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>
              👤 {user.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🚪 Abmelden
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ 
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          minHeight: 'calc(100vh - 100px)'
        }}>
          {currentView === 'dashboard' && (
            <SendungsBoard 
              supabase={supabase} 
              user={user}
              onNavigate={handleNavigation}
            />
          )}
          
          {currentView === 'new-shipment' && (
            <NeueSendungSuper 
              supabase={supabase} 
              user={user}
              onNavigate={handleNavigation}
              onSuccess={() => handleNavigation('dashboard')}
            />
          )}
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: '#f9fafb',
          padding: '16px 24px',
          textAlign: 'center',
          borderTop: '1px solid #e5e7eb',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p>🚀 LogistikPro - Weltklasse Logistik-Software © 2025</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
