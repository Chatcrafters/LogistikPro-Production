import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import Login from './components/Login';
import SendungsBoard from './components/SendungsBoard';

export default function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Error Boundary
  try {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f7' }}>
        <SendungsBoard user={user} onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
        }} />
      </div>
    );
  } catch (err) {
    console.error('SendungsBoard Error:', err);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Fehler im SendungsBoard</h1>
        <pre>{err.toString()}</pre>
      </div>
    );
  }
}