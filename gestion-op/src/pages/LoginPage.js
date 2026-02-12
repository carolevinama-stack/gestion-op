import React, { useState } from 'react';
import { styles } from '../utils/styles';

// ==================== PAGE DE CONNEXION ====================
const LoginPage = ({ onLogin, onForgotPassword, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotMessage({ type: 'error', text: 'Veuillez saisir votre email' }); return; }
    setForgotLoading(true);
    const result = await onForgotPassword(forgotEmail.trim());
    if (result.success) {
      setForgotMessage({ type: 'success', text: `Un email de réinitialisation a été envoyé à ${forgotEmail}. Vérifiez votre boîte de réception.` });
    } else {
      setForgotMessage({ type: 'error', text: result.error });
    }
    setForgotLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a3528 0%, #0f4c3a 100%)' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 80, height: 80, background: '#f0b429', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px' }}>🌳</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f4c3a', margin: 0 }}>Gestion des OP</h1>
          <p style={{ color: '#6c757d', fontSize: 14, marginTop: 8 }}>
            {showForgot ? 'Réinitialiser votre mot de passe' : 'Connectez-vous pour continuer'}
          </p>
        </div>
        
        {!showForgot ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Email</label>
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com" style={styles.input} required
              />
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Mot de passe</label>
              <input 
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={styles.input} required
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMessage(null); }}
                style={{ background: 'none', border: 'none', color: '#0f4c3a', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                Mot de passe oublié ?
              </button>
            </div>

            {error && (
              <div style={{ padding: 12, background: '#ffebee', borderRadius: 8, color: '#c62828', fontSize: 13, marginBottom: 20 }}>{error}</div>
            )}
            
            <button type="submit" disabled={loading}
              style={{ ...styles.button, width: '100%', padding: 14, fontSize: 16, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Votre email</label>
              <input type="email" value={forgotEmail} 
                onChange={(e) => { setForgotEmail(e.target.value); setForgotMessage(null); }}
                placeholder="votre@email.com" style={styles.input}
              />
            </div>

            {forgotMessage && (
              <div style={{ padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 20,
                background: forgotMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
                color: forgotMessage.type === 'success' ? '#2e7d32' : '#c62828'
              }}>{forgotMessage.text}</div>
            )}

            <button onClick={handleForgotPassword} disabled={forgotLoading}
              style={{ ...styles.button, width: '100%', padding: 14, fontSize: 15, marginBottom: 14, opacity: forgotLoading ? 0.7 : 1 }}>
              {forgotLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>

            <button onClick={() => { setShowForgot(false); setForgotMessage(null); }}
              style={{ width: '100%', padding: 12, fontSize: 14, background: 'none', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', color: '#333' }}>
              ← Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
