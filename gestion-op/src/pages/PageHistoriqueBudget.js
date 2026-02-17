import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatMontant, exportToCSV } from '../utils/formatters';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

// ==================== PALETTE ====================
const P = {
  bg: '#F6F4F1', card: '#FFFFFF', border: '#E8E4DF',
  green: '#2E9940', greenLight: '#E8F5E9', greenBorder: '#C8E6C9',
  orange: '#D4722A', orangeLight: '#FFF3E0',
  gold: '#C5961F', goldLight: '#FFFDE7',
  red: '#C43E3E', redLight: '#FFEBEE',
  blue: '#3B5998', blueLight: '#E3F2FD',
  text: '#2C2C2C', textSec: '#6c757d', textMuted: '#adb5bd',
};

// ==================== ICONS SVG ====================
const Icon = {
  arrowLeft: (color = P.textSec, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  scroll: (color = P.green, size = 20) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 01-2 2zm0 0a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v12"/><path d="M4 19V7a2 2 0 012-2"/><line x1="12" y1="7" x2="18" y2="7"/><line x1="12" y1="11" x2="18" y2="11"/></svg>,
  download: (color = 'white', size = 15) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  trash: (color = P.red, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  chevron: (color = P.textMuted, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  check: (color = P.green, size = 12) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  lock: (color = P.red, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  alert: (color = P.gold, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  x: (color = 'white', size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ==================== TOAST ====================
const TOAST_STYLES = {
  success: { bg: 'linear-gradient(135deg, #f0faf5 0%, #fff 100%)', iconBg: P.greenLight, titleColor: P.green },
  error: { bg: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', iconBg: P.redLight, titleColor: P.red },
  warning: { bg: 'linear-gradient(135deg, #fffbf0 0%, #fff 100%)', iconBg: P.orangeLight, titleColor: P.gold },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
};
const ToastNotif = ({ toast, onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  useEffect(() => { const t1 = setTimeout(() => setLeaving(true), 3500); const t2 = setTimeout(onDone, 3900); return () => { clearTimeout(t1); clearTimeout(t2); }; }, [onDone]);
  return (
    <div style={{ background: s.bg, borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 320, maxWidth: 420, pointerEvents: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ToastIcon type={toast.type} /></div>
      <div><div style={{ fontSize: 14, fontWeight: 700, color: s.titleColor, marginBottom: 2 }}>{toast.title}</div>{toast.message && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>}</div>
    </div>
  );
};

// ==================== CONFIRM MODAL ====================
const ConfirmModal = ({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, icon }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
    <div style={{ background: 'white', borderRadius: 16, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 28px', background: confirmColor || P.red, display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0' }}>
        {icon}{' '}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{title}</span>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <p style={{ margin: 0, fontSize: 14, color: P.text, lineHeight: 1.6 }}>{message}</p>
      </div>
      <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
        <button className="hist-btn" onClick={onCancel} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
        <button className="hist-btn" onClick={onConfirm} style={{ background: confirmColor || P.red, color: 'white', padding: '10px 20px' }}>{confirmLabel || 'Confirmer'}</button>
      </div>
    </div>
  </div>
);

// ==================== PASSWORD MODAL ====================
const PasswordModal = ({ onConfirm, onCancel }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002 }}>
      <div style={{ background: 'white', borderRadius: 16, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', background: P.orange, display: 'flex', alignItems: 'center', gap: 10, borderRadius: '16px 16px 0 0' }}>
          {Icon.lock('white', 18)}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Mot de passe requis</span>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>MOT DE PASSE ADMIN</label>
          <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && onConfirm(pwd)}
            placeholder="Entrez le mot de passe" autoFocus
            style={{ padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 14, width: '100%', boxSizing: 'border-box', background: P.goldLight }} />
        </div>
        <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
          <button className="hist-btn" onClick={onCancel} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
          <button className="hist-btn" onClick={() => onConfirm(pwd)} style={{ background: P.orange, color: 'white', padding: '10px 20px' }}>Valider</button>
        </div>
      </div>
    </div>
  );
};

// ==================== PAGE ====================
const PageHistoriqueBudget = () => {
  const { projet, historiqueParams, sources, exercices, budgets, setBudgets, setCurrentPage } = useAppContext();
  const { sourceId, exerciceId } = historiqueParams;
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // { budget }
  const [pwdState, setPwdState] = useState(null); // { budget }

  const currentSourceObj = sources.find(s => s.id === sourceId);
  const currentExerciceObj = exercices.find(e => e.id === exerciceId);
  const accent = currentSourceObj?.couleur || P.green;

  const allBudgetsForSourceExercice = budgets
    .filter(b => b.sourceId === sourceId && b.exerciceId === exerciceId)
    .sort((a, b) => (a.version || 1) - (b.version || 1));

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => setToasts(prev => prev.filter(t => t.uid !== uid)), []);

  const getTotaux = (budget) => {
    if (!budget?.lignes) return { dotation: 0 };
    return { dotation: budget.lignes.reduce((sum, l) => sum + (l.dotation || 0), 0) };
  };

  const getVersionLabel = (budget) => {
    if (!budget) return '';
    if (budget.nomVersion) return budget.nomVersion;
    return (budget.version || 1) === 1 ? 'Budget Primitif' : `V${budget.version}`;
  };

  // Delete flow: password → confirm → delete
  const startDelete = (budget) => setPwdState({ budget });
  const onPwdConfirm = (pwd) => {
    const expected = projet?.motDePasseAdmin || 'admin123';
    if (pwd !== expected) { showToast('error', 'Mot de passe incorrect'); setPwdState(null); return; }
    setPwdState(null);
    setConfirmState({ budget: pwdState.budget });
  };
  const onDeleteConfirm = async () => {
    const budget = confirmState.budget;
    setConfirmState(null);
    try {
      await deleteDoc(doc(db, 'budgets', budget.id));
      setBudgets(budgets.filter(b => b.id !== budget.id));
      showToast('success', 'Version supprimée');
      if (expandedVersion === budget.id) setExpandedVersion(null);
      const remaining = allBudgetsForSourceExercice.filter(b => b.id !== budget.id);
      if (remaining.length <= 1) setCurrentPage('budget');
    } catch (e) { showToast('error', 'Erreur', e.message); }
  };

  const getVariations = (budget, index) => {
    if (index === 0) return null;
    const prevBudget = allBudgetsForSourceExercice[index - 1];
    if (!prevBudget) return null;
    const allCodes = new Set();
    (budget.lignes || []).forEach(l => allCodes.add(l.code));
    (prevBudget.lignes || []).forEach(l => allCodes.add(l.code));
    const variations = [];
    allCodes.forEach(code => {
      const curr = (budget.lignes || []).find(l => l.code === code);
      const prev = (prevBudget.lignes || []).find(l => l.code === code);
      variations.push({ code, libelle: curr?.libelle || prev?.libelle || '', dotation: curr?.dotation || 0, dotationPrecedente: prev?.dotation || 0, variation: (curr?.dotation || 0) - (prev?.dotation || 0) });
    });
    return variations.sort((a, b) => a.code.localeCompare(b.code));
  };

  const exportHistorique = () => {
    if (allBudgetsForSourceExercice.length === 0) return;
    const now = new Date().toLocaleDateString('fr-FR');
    let csv = `HISTORIQUE DES REVISIONS - ${currentSourceObj?.nom || ''}\nExercice: ${currentExerciceObj?.annee || ''}\nDate d'export: ${now}\n\nRévision;Montant Total;Date Validation;Motif\n`;
    allBudgetsForSourceExercice.forEach(b => { csv += `${getVersionLabel(b)};${getTotaux(b).dotation};${b.dateNotification || '-'};${b.motifRevision || ''}\n`; });
    exportToCSV(csv, `Historique_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}.csv`);
  };

  const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase', background: '#FAFAF8' };
  const tdStyle = { padding: '14px 16px', borderBottom: `1px solid ${P.border}`, fontSize: 14 };

  if (!sourceId || !exerciceId) {
    return (
      <div>
        <button className="hist-btn" onClick={() => setCurrentPage('budget')} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 18px', marginBottom: 20 }}>
          {Icon.arrowLeft()} Retour au budget
        </button>
        <div style={{ textAlign: 'center', padding: 60, color: P.textMuted }}>Aucune donnée à afficher</div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }
        @keyframes toastOut { from { opacity:1; } to { opacity:0; transform: translateX(40px); } }
        .hist-btn { border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .hist-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .hist-row { transition: background 0.15s; cursor: pointer; }
        .hist-row:hover { background: ${P.greenLight} !important; }
      `}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => <ToastNotif key={t.uid} toast={t} onDone={() => removeToast(t.uid)} />)}
      </div>

      {/* Password modal */}
      {pwdState && <PasswordModal onCancel={() => setPwdState(null)} onConfirm={onPwdConfirm} />}
      {/* Confirm modal */}
      {confirmState && (
        <ConfirmModal title="Supprimer cette version" message={`Supprimer définitivement "${getVersionLabel(confirmState.budget)}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer" confirmColor={P.red} icon={Icon.trash('white', 18)}
          onCancel={() => setConfirmState(null)} onConfirm={onDeleteConfirm} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button className="hist-btn" onClick={() => setCurrentPage('budget')}
            style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 18px', marginBottom: 16 }}>
            {Icon.arrowLeft(P.textSec)} Retour au budget
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.scroll(P.green)}</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: P.text }}>Historique des révisions</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, color: P.textSec, fontSize: 13 }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: accent }}></span>
                {currentSourceObj?.nom} — Exercice {currentExerciceObj?.annee}
              </div>
            </div>
          </div>
        </div>
        <button className="hist-btn" onClick={exportHistorique} style={{ background: P.blue, color: 'white', padding: '10px 18px' }}>
          {Icon.download('white', 14)} Exporter
        </button>
      </div>

      {/* Table */}
      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', maxHeight: '75vh' }}>
        <div style={{ overflowY: 'auto', maxHeight: '75vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th style={{ ...thStyle, minWidth: 200 }}>Budget</th>
                <th style={{ ...thStyle, textAlign: 'right', minWidth: 160 }}>Montant total</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Date validation</th>
                <th style={thStyle}>Motif</th>
                <th style={{ ...thStyle, width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {allBudgetsForSourceExercice.map((budget, index) => {
                const total = getTotaux(budget).dotation;
                const isExpanded = expandedVersion === budget.id;
                const variations = getVariations(budget, index);
                const prevTotal = index > 0 ? getTotaux(allBudgetsForSourceExercice[index - 1]).dotation : 0;
                const totalVariation = index > 0 ? total - prevTotal : 0;
                const isLast = index === allBudgetsForSourceExercice.length - 1;

                return (
                  <React.Fragment key={budget.id}>
                    <tr className="hist-row" onClick={() => setExpandedVersion(isExpanded ? null : budget.id)}
                      style={{ background: isExpanded ? P.greenLight : 'transparent' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-flex' }}>{Icon.chevron(accent)}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: accent }}>{getVersionLabel(budget)}</div>
                            {isLast && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, background: P.greenLight, color: P.green, padding: '2px 8px', borderRadius: 20, fontWeight: 700, marginTop: 2 }}>
                                {Icon.check(P.green, 10)} Active
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{formatMontant(total)}</span>
                        {index > 0 && totalVariation !== 0 && (
                          <div style={{ fontSize: 11, color: totalVariation > 0 ? P.green : P.red, fontWeight: 700, fontFamily: 'monospace' }}>
                            {totalVariation > 0 ? '+' : ''}{formatMontant(totalVariation)}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 13, color: P.textSec }}>
                        {budget.dateNotification || (budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-')}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#666', fontStyle: budget.motifRevision ? 'normal' : 'italic' }}>
                        {budget.motifRevision || '-'}
                      </td>
                      <td style={tdStyle} onClick={e => e.stopPropagation()}>
                        <button className="hist-btn" onClick={() => startDelete(budget)} title="Supprimer"
                          style={{ background: P.redLight, color: P.red, padding: '6px 8px' }}>
                          {Icon.trash(P.red, 13)}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                          <div style={{ margin: '0 16px 16px', background: '#fafffe', border: `1px solid ${P.greenBorder}`, borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                  <tr style={{ background: P.greenLight }}>
                                    <th style={{ ...thStyle, width: 100, background: P.greenLight }}>Code</th>
                                    <th style={{ ...thStyle, background: P.greenLight }}>Libellé</th>
                                    <th style={{ ...thStyle, textAlign: 'right', width: 150, background: P.greenLight }}>Montant</th>
                                    {index > 0 && <th style={{ ...thStyle, textAlign: 'right', width: 150, background: P.greenLight }}>Variation</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {index === 0 ? (
                                    (budget.lignes || []).sort((a, b) => a.code.localeCompare(b.code)).map(ligne => (
                                      <tr key={ligne.code}>
                                        <td style={tdStyle}><code style={{ background: accent, color: 'white', padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{ligne.code}</code></td>
                                        <td style={{ ...tdStyle, fontSize: 12 }}>{ligne.libelle}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(ligne.dotation)}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    variations && variations.map(v => (
                                      <tr key={v.code} style={{ background: v.variation !== 0 ? (v.variation > 0 ? '#f1f8e9' : '#fef2f2') : 'transparent' }}>
                                        <td style={tdStyle}><code style={{ background: accent, color: 'white', padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{v.code}</code></td>
                                        <td style={{ ...tdStyle, fontSize: 12 }}>{v.libelle}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(v.dotation)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: v.variation > 0 ? P.green : v.variation < 0 ? P.red : P.textMuted }}>
                                          {v.variation === 0 ? '-' : `${v.variation > 0 ? '+' : ''}${formatMontant(v.variation)}`}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                                <tfoot style={{ position: 'sticky', bottom: 0 }}>
                                  <tr style={{ background: P.greenLight }}>
                                    <td colSpan={2} style={{ ...tdStyle, fontWeight: 800, fontSize: 12 }}>TOTAL</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{formatMontant(total)}</td>
                                    {index > 0 && <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: totalVariation > 0 ? P.green : totalVariation < 0 ? P.red : P.textMuted }}>
                                      {totalVariation === 0 ? '-' : `${totalVariation > 0 ? '+' : ''}${formatMontant(totalVariation)}`}
                                    </td>}
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageHistoriqueBudget;
