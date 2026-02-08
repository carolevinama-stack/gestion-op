import React, { useState } from 'react';
import styles from '../utils/styles';

// ==================== PAGE DE CONNEXION ====================
const LoginPage = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a3528 0%, #0f4c3a 100%)' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 80, height: 80, background: '#f0b429', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px' }}>🌳</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f4c3a', margin: 0 }}>Gestion des OP</h1>
          <p style={{ color: '#6c757d', fontSize: 14, marginTop: 8 }}>Connectez-vous pour continuer</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              style={styles.input}
              required
            />
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {error && (
            <div style={{ padding: 12, background: '#ffebee', borderRadius: 8, color: '#c62828', fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ ...styles.button, width: '100%', padding: 14, fontSize: 16, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
