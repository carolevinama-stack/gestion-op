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
  width: '100%', padding: '13px 16px', border: '1.5px solid #c8e6c9', borderRadius: 10,
  fontSize: 14, background: '#fff', outline: 'none', transition: 'border 0.2s', fontFamily: 'inherit',
  boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: '#1B6B2E', marginBottom: 8, letterSpacing: 0.5 };

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
      {/* Panneau gauche — dégradé vert foncé → vert moyen */}
      <div style={{
        width: '40%', minWidth: 320,
        background: 'linear-gradient(160deg, #1B6B2E 0%, #2E9940 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 40, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        {/* Logo sans contour */}
        <div style={{
          background: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: 18,
          position: 'relative', zIndex: 1,
        }}>
          <img src={LOGO_PIF2} alt="PIF2" style={{ width: 200, display: 'block' }} />
        </div>
        <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginTop: 28, textAlign: 'center', position: 'relative', zIndex: 1 }}>Bienvenue</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 10, textAlign: 'center', position: 'relative', zIndex: 1, lineHeight: 1.7 }}>
          Projet d'Investissement Forestier<br />Côte d'Ivoire
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '40px 60px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {!showForgot ? (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 24, color: '#1B6B2E', fontWeight: 700, margin: '0 0 6px' }}>Se connecter</h2>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Entrez vos identifiants pour continuer</p>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FFEBEE', color: '#C43E3E', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>ADRESSE E-MAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nom@exemple.com" required style={inputStyle} autoFocus
                  onFocus={e => e.target.style.borderColor='#2E9940'} onBlur={e => e.target.style.borderColor='#c8e6c9'} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>MOT DE PASSE</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="" required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => e.target.style.borderColor='#2E9940'} onBlur={e => e.target.style.borderColor='#c8e6c9'} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                    title={showPwd ? 'Masquer' : 'Afficher'}>
                    {showPwd ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMessage(null); }}
                  style={{ background: 'none', border: 'none', fontSize: 13, color: '#2E9940', cursor: 'pointer', fontWeight: 600 }}>
                  Mot de passe oublié ?
                </button>
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 13, border: 'none', borderRadius: 10, background: '#2E9940', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <>
              <h2 style={{ fontSize: 24, color: '#1B6B2E', fontWeight: 700, margin: '0 0 6px' }}>Mot de passe oublié</h2>
              <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Saisissez votre e-mail pour recevoir un lien de réinitialisation</p>
              {forgotMessage && (
                <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 16,
                  background: forgotMessage.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                  color: forgotMessage.type === 'success' ? '#1B6B2E' : '#C43E3E',
                }}>{forgotMessage.text}</div>
              )}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>ADRESSE E-MAIL</label>
                <input type="email" value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotMessage(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleForgotPassword(); }} placeholder="nom@exemple.com" style={inputStyle} autoFocus
                  onFocus={e => e.target.style.borderColor='#2E9940'} onBlur={e => e.target.style.borderColor='#c8e6c9'} />
              </div>
              <button onClick={handleForgotPassword} disabled={forgotLoading}
                style={{ width: '100%', padding: 13, border: 'none', borderRadius: 10, background: '#2E9940', color: '#fff', fontSize: 15, fontWeight: 700, cursor: forgotLoading ? 'not-allowed' : 'pointer', marginBottom: 14, opacity: forgotLoading ? 0.7 : 1 }}>
                {forgotLoading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button onClick={() => { setShowForgot(false); setForgotMessage(null); }}
                style={{ width: '100%', padding: 11, border: '1.5px solid #c8e6c9', borderRadius: 10, background: 'transparent', color: '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Retour à la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
