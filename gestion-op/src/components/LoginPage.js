import React, { useState } from 'react';
import { LOGO_PIF2 } from '../utils/logos';

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1.5px solid #e0e0e0', borderRadius: 10,
  fontSize: 13, background: '#fff', outline: 'none', transition: 'border 0.2s', fontFamily: 'inherit',
};
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#3B6B8A', marginBottom: 6, letterSpacing: 0.5 };

const LoginPage = ({ onLogin, onForgotPassword, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotMessage({ type: 'error', text: 'Veuillez saisir votre email.' }); return; }
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
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Panneau gauche */}
      <div style={{
        width: '40%', minWidth: 320,
        background: 'linear-gradient(180deg, #1B6B2E 0%, #155A25 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 40, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 250, height: 250, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 200, height: 200, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.03)' }} />
        <img src={LOGO_PIF2} alt="PIF2" style={{ width: 180, position: 'relative', zIndex: 1 }} />
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginTop: 30, textAlign: 'center', position: 'relative', zIndex: 1 }}>Bienvenue</div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 8, textAlign: 'center', position: 'relative', zIndex: 1, lineHeight: 1.7 }}>
          Projet d'Investissement Forestier<br />Côte d'Ivoire
        </div>
      </div>

      {/* Panneau droit */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '40px 50px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {!showForgot ? (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 22, color: '#3B6B8A', fontWeight: 700, margin: '0 0 4px' }}>Se connecter</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Entrez vos identifiants pour continuer</p>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FFEBEE', color: '#DC3545', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>{error}</div>
              )}
              <label style={labelStyle}>ADRESSE E-MAIL</label>
              <div style={{ marginBottom: 18 }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nom@exemple.com" required style={inputStyle} autoFocus
                  onFocus={e => e.target.style.borderColor='#3B6B8A'} onBlur={e => e.target.style.borderColor='#e0e0e0'} />
              </div>
              <label style={labelStyle}>MOT DE PASSE</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={e => e.target.style.borderColor='#3B6B8A'} onBlur={e => e.target.style.borderColor='#e0e0e0'} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                  title={showPwd ? 'Masquer' : 'Afficher'}>
                  {showPwd ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginBottom: 24 }}>
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMessage(null); }}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#E8B931', cursor: 'pointer', fontWeight: 600 }}>
                  Mot de passe oublié ?
                </button>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 13, border: 'none', borderRadius: 10, background: '#3B6B8A', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <>
              <h2 style={{ fontSize: 22, color: '#3B6B8A', fontWeight: 700, margin: '0 0 4px' }}>Mot de passe oublié</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Saisissez votre e-mail pour recevoir un lien de réinitialisation</p>
              {forgotMessage && (
                <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 16,
                  background: forgotMessage.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                  color: forgotMessage.type === 'success' ? '#1B6B2E' : '#DC3545',
                }}>{forgotMessage.text}</div>
              )}
              <label style={labelStyle}>ADRESSE E-MAIL</label>
              <div style={{ marginBottom: 24 }}>
                <input type="email" value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotMessage(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleForgotPassword(); }} placeholder="nom@exemple.com" style={inputStyle} autoFocus
                  onFocus={e => e.target.style.borderColor='#3B6B8A'} onBlur={e => e.target.style.borderColor='#e0e0e0'} />
              </div>
              <button onClick={handleForgotPassword} disabled={forgotLoading}
                style={{ width: '100%', padding: 13, border: 'none', borderRadius: 10, background: '#3B6B8A', color: '#fff', fontSize: 14, fontWeight: 700, cursor: forgotLoading ? 'not-allowed' : 'pointer', marginBottom: 14, opacity: forgotLoading ? 0.7 : 1 }}>
                {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button onClick={() => { setShowForgot(false); setForgotMessage(null); }}
                style={{ width: '100%', padding: 11, border: '1.5px solid #e0e0e0', borderRadius: 10, background: 'transparent', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ← Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
