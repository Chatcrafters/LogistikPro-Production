// src/components/SendungDetail.jsx
import React from 'react';

const SendungDetail = ({ sendung, onClose, onUpdate }) => {
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
        maxWidth: '600px'
      }}>
        <h2>Sendungsdetails</h2>
        <p>Position: {sendung?.position}</p>
        <p>Status: {sendung?.status}</p>
        <button onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
};

export default SendungDetail;