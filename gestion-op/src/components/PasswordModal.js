import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';

const PasswordModal = ({ show, isOpen, onClose, onConfirm, title, description, warning, warningMessage, confirmText, confirmColor }) => {
  const { projet, setCurrentPage } = useAppContext();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const isVisible = show || isOpen;
  const warningText = warning || warningMessage;
  const buttonText = confirmText || '🔓 Confirmer';
  const buttonColor = confirmColor || '#f57f17';

  if (!isVisible) return null;

  const handleConfirm = () => {
    if (!projet?.adminPassword) {
      onConfirm();
      setPassword('');
      return;
    }
    
    if (password === projet.adminPassword) {
      onConfirm();
      setPassword('');
      setError('');
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#fff8e1' }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#f57f17' }}>🔐 {title || 'Action protégée'}</h2>
        </div>
        <div style={{ padding: 24 }}>
          {description && (
            <p style={{ marginBottom: 16, color: '#333' }}>{description}</p>
          )}
          
          {warningText && (
            <div style={{ background: '#ffebee', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              <strong style={{ color: '#c62828' }}>⚠️ Attention :</strong>
              <span style={{ color: '#c62828', marginLeft: 4 }}>{warningText}</span>
            </div>
          )}
          
          {!projet?.adminPassword ? (
            <div style={{ background: '#fff3e0', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              <strong style={{ color: '#e65100' }}>ℹ️</strong>
              <span style={{ color: '#e65100', marginLeft: 4 }}>
                Aucun mot de passe administrateur configuré. 
                <span 
                  onClick={() => { handleClose(); setCurrentPage('parametres'); }}
                  style={{ textDecoration: 'underline', cursor: 'pointer', marginLeft: 4 }}
                >
                  Configurer maintenant
                </span>
              </span>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mot de passe administrateur *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPwd ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
                  style={{ ...styles.input, paddingRight: 45, borderColor: error ? '#c62828' : undefined }} 
                  placeholder="Entrez le mot de passe"
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
              {error && <span style={{ color: '#c62828', fontSize: 12 }}>❌ {error}</span>}
            </div>
          )}
        </div>
        <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={handleClose} style={styles.buttonSecondary}>Annuler</button>
          <button onClick={handleConfirm} style={{ ...styles.button, background: buttonColor }}>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;
