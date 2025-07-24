import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import Login from './components/Login';
import SendungsBoard from './components/SendungsBoard';

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
    console.error('SendungsBoard Error Boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
              <h1 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '24px', 
                fontWeight: '700',
                color: '#dc2626'
              }}>
                Oops! Etwas ist schiefgelaufen
              </h1>
              <p style={{ 
                margin: 0, 
                color: '#6b7280', 
                fontSize: '16px' 
              }}>
                Es gab einen unerwarteten Fehler im SendungsBoard
              </p>
            </div>

            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '14px', 
                fontWeight: '600',
                color: '#991b1b'
              }}>
                Fehlerdetails:
              </h3>
              <pre style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: '#dc2626',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                🔄 Seite neu laden
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
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
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                🔧 Erneut versuchen
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#1e40af'
            }}>
              <strong>💡 Mögliche Lösungen:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px' }}>
                <li>Browser-Cache leeren (Strg+F5)</li>
                <li>Supabase-Verbindung prüfen</li>
                <li>Backend-Server Status prüfen</li>
                <li>Browser-Konsole für Details öffnen</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
      minWidth: '300px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }} />
      <h2 style={{ 
        margin: '0 0 8px 0', 
        fontSize: '20px', 
        fontWeight: '600',
        color: '#1f2937'
      }}>
        LogistikPro wird geladen...
      </h2>
      <p style={{ 
        margin: 0, 
        color: '#6b7280', 
        fontSize: '14px' 
      }}>
        Authentifizierung wird überprüft
      </p>
    </div>

    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Main App Component
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setAuthError(error.message);
        } else if (mounted) {
          setUser(session?.user ?? null);
          console.log('🔐 Initial session:', session?.user ? 'Authenticated' : 'Not authenticated');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setAuthError('Authentifizierungsfehler: ' + err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkInitialSession();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔐 Auth state change:', event, session?.user ? 'User logged in' : 'User logged out');
        
        setUser(session?.user ?? null);
        setAuthError(null);
        
        // Clear loading state on auth changes
        if (loading) {
          setLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [loading]);

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        setAuthError('Logout-Fehler: ' + error.message);
      } else {
        console.log('✅ Successfully logged out');
        setUser(null);
      }
    } catch (err) {
      console.error('Logout exception:', err);
      setAuthError('Logout-Fehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle login success
  const handleLoginSuccess = (userData) => {
    console.log('✅ Login successful:', userData);
    setUser(userData);
    setAuthError(null);
  };

  // Show loading screen
  if (loading) {
    return <LoadingScreen />;
  }

  // Show auth error
  if (authError) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #fee2e2'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '24px', 
            fontWeight: '700',
            color: '#dc2626'
          }}>
            Authentifizierungsfehler
          </h1>
          <p style={{ 
            margin: '0 0 20px 0', 
            color: '#6b7280', 
            fontSize: '16px' 
          }}>
            {authError}
          </p>
          <button
            onClick={() => {
              setAuthError(null);
              setLoading(true);
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <ErrorBoundary>
        <Login 
          onLogin={handleLoginSuccess}
          onError={setAuthError}
        />
      </ErrorBoundary>
    );
  }

  // Show main application
  return (
    <ErrorBoundary>
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <SendungsBoard 
          user={user} 
          onLogout={handleLogout}
        />
      </div>
    </ErrorBoundary>
  );
}