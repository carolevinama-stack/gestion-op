import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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

// ==================== ICONS ====================
const Icon = {
  arrowLeft: (c = P.textSec, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  gear: (c = P.green, s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus: (c = 'white', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: (c = P.orange, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (c = P.red, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  check: (c = 'white', s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (c = 'white', s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  upload: (c = P.blue, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  search: (c = P.textMuted, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  list: (c = P.green, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  barChart: (c = P.textMuted, s = 40) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
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
        {icon}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{title}</span>
      </div>
      <div style={{ padding: '24px 28px' }}><p style={{ margin: 0, fontSize: 14, color: P.text, lineHeight: 1.6 }}>{message}</p></div>
      <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
        <button className="lb-btn" onClick={onCancel} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
        <button className="lb-btn" onClick={onConfirm} style={{ background: confirmColor || P.red, color: 'white', padding: '10px 20px' }}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

// ==================== PAGE ====================
const PageLignesBudgetaires = () => {
  const { lignesBudgetaires, setLignesBudgetaires, budgets, setCurrentPage } = useAppContext();

  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLigne, setEditingLigne] = useState(null); // null = ajout, objet = modification
  const [form, setForm] = useState({ code: '', libelle: '' });

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => setToasts(prev => prev.filter(t => t.uid !== uid)), []);

  // Filtered list
  const filtered = lignesBudgetaires.filter(l => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return l.code?.toLowerCase().includes(s) || l.libelle?.toLowerCase().includes(s);
  });

  // ===== CRUD =====
  const openAdd = () => { setEditingLigne(null); setForm({ code: '', libelle: '' }); setShowFormModal(true); };
  const openEdit = (ligne) => { setEditingLigne(ligne); setForm({ code: ligne.code, libelle: ligne.libelle }); setShowFormModal(true); };

  const handleSave = async () => {
    if (!form.code.trim() || !form.libelle.trim()) { showToast('error', 'Champs obligatoires', 'Code et libellé requis'); return; }

    if (editingLigne) {
      // MODIFICATION
      const duplicate = lignesBudgetaires.find(l => l.code === form.code.trim() && l.id !== editingLigne.id);
      if (duplicate) { showToast('warning', 'Doublon', 'Ce code existe déjà'); return; }
      try {
        const updated = { code: form.code.trim(), libelle: form.libelle.trim() };
        await updateDoc(doc(db, 'lignesBudgetaires', editingLigne.id), updated);

        // Mettre à jour aussi dans les budgets qui utilisent cette ligne (libellé seulement, code ne devrait pas changer en principe)
        setLignesBudgetaires(lignesBudgetaires.map(l => l.id === editingLigne.id ? { ...l, ...updated } : l).sort((a, b) => a.code.localeCompare(b.code)));
        setShowFormModal(false);
        showToast('success', 'Ligne modifiée');
      } catch (error) { showToast('error', 'Erreur', error.message); }
    } else {
      // AJOUT
      if (lignesBudgetaires.find(l => l.code === form.code.trim())) { showToast('warning', 'Doublon', 'Ce code existe déjà'); return; }
      try {
        const data = { code: form.code.trim(), libelle: form.libelle.trim() };
        const docRef = await addDoc(collection(db, 'lignesBudgetaires'), data);
        setLignesBudgetaires([...lignesBudgetaires, { id: docRef.id, ...data }].sort((a, b) => a.code.localeCompare(b.code)));
        setShowFormModal(false);
        showToast('success', 'Ligne ajoutée');
      } catch (error) { showToast('error', 'Erreur', error.message); }
    }
  };

  const handleDelete = (ligne) => {
    const isUsed = budgets.some(b => b.lignes?.some(l => l.code === ligne.code));
    if (isUsed) { showToast('error', 'Suppression impossible', 'Cette ligne est utilisée dans un budget'); return; }
    setConfirmState({ ligne });
  };
  const confirmDelete = async () => {
    const ligne = confirmState.ligne;
    setConfirmState(null);
    try {
      await deleteDoc(doc(db, 'lignesBudgetaires', ligne.id));
      setLignesBudgetaires(lignesBudgetaires.filter(l => l.id !== ligne.id));
      showToast('success', 'Ligne supprimée');
    } catch (e) { showToast('error', 'Erreur', e.message); }
  };

  // ===== IMPORT =====
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(event.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          parseRows(rows);
        } catch (err) { showToast('error', 'Erreur', 'Impossible de lire le fichier Excel'); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const separator = lines[0]?.includes(';') ? ';' : ',';
        const rows = lines.map(l => l.split(separator).map(c => c.trim().replace(/^["']|["']$/g, '')));
        parseRows(rows);
      };
      reader.readAsText(file);
    }
  };

  const parseRows = (rows) => {
    const startIndex = rows[0] && (String(rows[0][0]).toLowerCase().includes('code') || String(rows[0][0]).toLowerCase().includes('ligne')) ? 1 : 0;
    const parsed = [];
    for (let i = startIndex; i < rows.length; i++) {
      const cols = rows[i];
      if (cols && cols.length >= 2 && String(cols[0]).trim() && String(cols[1]).trim()) {
        const code = String(cols[0]).trim(), libelle = String(cols[1]).trim();
        if (!lignesBudgetaires.find(l => l.code === code) && !parsed.find(p => p.code === code)) {
          parsed.push({ code, libelle });
        }
      }
    }
    setImportData(parsed);
  };

  const handleImport = async () => {
    if (importData.length === 0) { showToast('warning', 'Rien à importer'); return; }
    setImporting(true);
    try {
      const newLignes = [];
      for (const ligne of importData) {
        const docRef = await addDoc(collection(db, 'lignesBudgetaires'), ligne);
        newLignes.push({ id: docRef.id, ...ligne });
      }
      setLignesBudgetaires([...lignesBudgetaires, ...newLignes].sort((a, b) => a.code.localeCompare(b.code)));
      setShowImportModal(false); setImportData([]);
      showToast('success', `${newLignes.length} ligne(s) importée(s)`);
    } catch (error) { showToast('error', 'Erreur', "Erreur lors de l'importation"); }
    setImporting(false);
  };

  // Styles
  const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase', background: '#FAFAF8' };
  const tdStyle = { padding: '14px 16px', borderBottom: `1px solid ${P.border}`, fontSize: 14 };
  const inputStyle = { padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }
        @keyframes toastOut { from { opacity:1; } to { opacity:0; transform: translateX(40px); } }
        .lb-btn { border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; transition: all 0.15s; }
        .lb-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .lb-row { transition: background 0.15s; }
        .lb-row:hover { background: ${P.greenLight} !important; }
      `}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => <ToastNotif key={t.uid} toast={t} onDone={() => removeToast(t.uid)} />)}
      </div>

      {/* Confirm */}
      {confirmState && (
        <ConfirmModal title="Supprimer la ligne" message={`Supprimer "${confirmState.ligne.code} — ${confirmState.ligne.libelle}" de la bibliothèque ?`}
          confirmLabel="Supprimer" confirmColor={P.red} icon={Icon.trash('white', 16)}
          onCancel={() => setConfirmState(null)} onConfirm={confirmDelete} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button className="lb-btn" onClick={() => setCurrentPage('budget')}
          style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 18px', marginBottom: 16 }}>
          {Icon.arrowLeft(P.textSec)} Retour au budget
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.gear(P.green, 24)}</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: P.text }}>Lignes budgétaires</h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: P.textSec }}>{lignesBudgetaires.length} ligne(s) dans la bibliothèque</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="lb-btn" onClick={() => setShowImportModal(true)} style={{ background: P.blueLight, color: P.blue, padding: '10px 16px' }}>
              {Icon.upload(P.blue, 14)} Importer
            </button>
            <button className="lb-btn" onClick={openAdd} style={{ background: P.green, color: 'white', padding: '10px 16px' }}>
              {Icon.plus('white', 14)} Nouvelle ligne
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ background: P.greenLight, padding: '14px 20px', borderRadius: 10, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        {Icon.list(P.green)}
        <span style={{ fontSize: 13, color: P.green, fontWeight: 600 }}>Bibliothèque de référence</span>
        <span style={{ fontSize: 12, color: P.textSec }}>— Importez votre nomenclature une fois, réutilisez-la pour chaque budget.</span>
      </div>

      {/* Search */}
      {lignesBudgetaires.length > 0 && (
        <div style={{ marginBottom: 16, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>{Icon.search(P.textMuted, 16)}</div>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher par code ou libellé..."
            style={{ ...inputStyle, paddingLeft: 40, background: P.card }} />
        </div>
      )}

      {/* Table */}
      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {lignesBudgetaires.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: P.textMuted }}>
            {Icon.barChart()}
            <p style={{ marginTop: 12, fontSize: 14 }}>Aucune ligne budgétaire</p>
            <p style={{ fontSize: 12 }}>Importez un fichier ou ajoutez manuellement</p>
          </div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ ...thStyle, width: 120 }}>Code</th>
                  <th style={thStyle}>Libellé</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Statut</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: P.textMuted }}>Aucun résultat pour "{searchTerm}"</td></tr>
                ) : filtered.map(ligne => {
                  const isUsed = budgets.some(b => b.lignes?.some(l => l.code === ligne.code));
                  return (
                    <tr key={ligne.id} className="lb-row">
                      <td style={tdStyle}>
                        <code style={{ background: P.greenLight, color: P.green, padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{ligne.code}</code>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 13 }}>{ligne.libelle}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {isUsed ? (
                          <span style={{ background: P.greenLight, color: P.green, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Utilisée</span>
                        ) : (
                          <span style={{ background: '#f5f5f5', color: P.textMuted, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Libre</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button className="lb-btn" onClick={() => openEdit(ligne)} title="Modifier"
                            style={{ background: P.orangeLight, color: P.orange, padding: '6px 10px' }}>
                            {Icon.edit(P.orange, 13)}
                          </button>
                          {!isUsed && (
                            <button className="lb-btn" onClick={() => handleDelete(ligne)} title="Supprimer"
                              style={{ background: P.redLight, color: P.red, padding: '6px 10px' }}>
                              {Icon.trash(P.red, 13)}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== MODAL AJOUT / MODIFICATION ==================== */}
      {showFormModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', background: editingLigne ? P.orange : P.green, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {editingLigne ? Icon.edit('white', 18) : Icon.plus('white', 18)}
                <span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{editingLigne ? 'Modifier la ligne' : 'Nouvelle ligne budgétaire'}</span>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>{Icon.x('white')}</button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>CODE *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                    style={{ ...inputStyle, background: P.goldLight, fontFamily: 'monospace', fontWeight: 700, fontSize: 16 }}
                    placeholder="6221" autoFocus disabled={editingLigne && budgets.some(b => b.lignes?.some(l => l.code === editingLigne.code))} />
                  {editingLigne && budgets.some(b => b.lignes?.some(l => l.code === editingLigne.code)) && (
                    <p style={{ fontSize: 11, color: P.orange, marginTop: 4 }}>Code non modifiable (utilisé dans un budget)</p>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>LIBELLÉ *</label>
                  <input value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })}
                    style={{ ...inputStyle, background: P.goldLight }}
                    placeholder="Ex: Personnel temporaire" />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
              <button className="lb-btn" onClick={() => setShowFormModal(false)} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
              <button className="lb-btn" onClick={handleSave} style={{ background: editingLigne ? P.orange : P.green, color: 'white', padding: '10px 20px' }}>
                {Icon.check('white', 14)} {editingLigne ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL IMPORT ==================== */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 700, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 28px', background: P.blue, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '16px 16px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {Icon.upload('white', 18)}<span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Importer la nomenclature</span>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>{Icon.x('white')}</button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ background: P.blueLight, padding: 16, borderRadius: 10, marginBottom: 20 }}>
                <strong style={{ color: P.blue, fontSize: 13 }}>Format attendu (CSV ou Excel)</strong>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: P.textSec }}>
                  2 colonnes : <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>Code</code> et <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>Libellé</code>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: P.textMuted }}>Séparateur : virgule (,) ou point-virgule (;) — Fichiers acceptés : .xlsx, .xls, .csv, .txt</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>SÉLECTIONNER UN FICHIER</label>
                <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload}
                  style={{ padding: 12, border: `2px dashed ${P.border}`, borderRadius: 10, width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
              </div>

              {importData.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    {Icon.check(P.green, 14)} <strong style={{ color: P.green, fontSize: 13 }}>{importData.length} ligne(s) prête(s)</strong>
                  </div>
                  <div style={{ maxHeight: 250, overflowY: 'auto', border: `1px solid ${P.border}`, borderRadius: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0 }}><tr><th style={thStyle}>Code</th><th style={thStyle}>Libellé</th></tr></thead>
                      <tbody>
                        {importData.map((l, i) => (
                          <tr key={i}>
                            <td style={tdStyle}><code style={{ background: P.greenLight, color: P.green, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{l.code}</code></td>
                            <td style={{ ...tdStyle, fontSize: 13 }}>{l.libelle}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
              <button className="lb-btn" onClick={() => { setShowImportModal(false); setImportData([]); }} style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>Annuler</button>
              <button className="lb-btn" onClick={handleImport} disabled={importing || importData.length === 0}
                style={{ background: P.blue, color: 'white', padding: '10px 20px', opacity: importing || importData.length === 0 ? 0.5 : 1 }}>
                {Icon.check('white', 14)} {importing ? 'Importation...' : `Importer ${importData.length} ligne(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageLignesBudgetaires;
