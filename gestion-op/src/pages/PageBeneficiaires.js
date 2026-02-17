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
  red: '#C43E3E', redLight: '#FFEBEE', redBorder: '#FFCDD2',
  blue: '#3B5998', blueLight: '#E3F2FD',
  text: '#2C2C2C', textSec: '#6c757d', textMuted: '#adb5bd',
};

// ==================== ICONS SVG ====================
const Icon = {
  users: (color = P.text, size = 20) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  search: (color = P.textMuted, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus: (color = 'white', size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit: (color = P.orange, size = 15) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (color = P.red, size = 15) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  upload: (color = P.blue, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  check: (color = 'white', size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (color = P.textSec, size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bank: (color = P.blue, size = 14) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M12 2L2 8h20L12 2z"/><line x1="7" y1="14" x2="7" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="17" y1="14" x2="17" y2="17"/></svg>,
  alert: (color = P.red, size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clipboard: (color = P.blue, size = 16) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
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
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3500);
    const t2 = setTimeout(onDone, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div style={{ background: s.bg, borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 320, maxWidth: 420, pointerEvents: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: s.titleColor, marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
};

// ==================== CONFIRM MODAL ====================
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = false }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
    <div style={{ background: 'white', borderRadius: 16, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: danger ? P.redLight : P.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon.alert(danger ? P.red : P.gold)}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{title}</div>
          <div style={{ fontSize: 13, color: P.textSec, marginTop: 4, lineHeight: 1.5 }}>{message}</div>
        </div>
      </div>
      <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: `1.5px solid ${P.border}`, background: 'white', fontSize: 13, fontWeight: 600, color: P.textSec, cursor: 'pointer' }}>Annuler</button>
        <button onClick={onConfirm} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: danger ? P.red : P.orange, fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer' }}>Confirmer</button>
      </div>
    </div>
  </div>
);

// ==================== PAGE BENEFICIAIRES ====================
const PageBeneficiaires = () => {
  const { beneficiaires, setBeneficiaires, ops } = useAppContext();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editBen, setEditBen] = useState(null);
  const [form, setForm] = useState({ nom: '', ncc: '', ribs: [] });
  const [newRib, setNewRib] = useState({ banque: '', numero: '' });
  const [importData, setImportData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  const filtered = beneficiaires.filter(b =>
    b.nom?.toLowerCase().includes(search.toLowerCase()) ||
    b.ncc?.toLowerCase().includes(search.toLowerCase()) ||
    (b.ribs || []).some(r => r.numero?.toLowerCase().includes(search.toLowerCase()) || r.banque?.toLowerCase().includes(search.toLowerCase()))
  );

  // Rétrocompatibilité ancien format rib (string) → ribs (array)
  const getRibs = (ben) => {
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };

  const openNew = () => {
    setForm({ nom: '', ncc: '', ribs: [] });
    setNewRib({ banque: '', numero: '' });
    setEditBen(null);
    setShowModal(true);
  };

  const openEdit = (ben) => {
    setForm({ nom: ben.nom, ncc: ben.ncc || '', ribs: [...getRibs(ben)] });
    setNewRib({ banque: '', numero: '' });
    setEditBen(ben);
    setShowModal(true);
  };

  const addRib = () => {
    if (!newRib.numero.trim()) {
      showToast('error', 'RIB incomplet', 'Veuillez saisir le numéro RIB');
      return;
    }
    const updatedRibs = [...(form.ribs || []), { banque: newRib.banque.trim(), numero: newRib.numero.trim() }];
    setForm({ ...form, ribs: updatedRibs });
    setNewRib({ banque: '', numero: '' });
  };

  const removeRib = (index) => {
    const updatedRibs = (form.ribs || []).filter((_, i) => i !== index);
    setForm({ ...form, ribs: updatedRibs });
  };

  // Import CSV
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const firstLine = lines[0] || '';
      let separator = ';';
      if (firstLine.includes('\t')) separator = '\t';
      else if (firstLine.split(',').length > firstLine.split(';').length) separator = ',';

      const parsed = [];
      lines.forEach((line, index) => {
        const cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (index === 0) {
          const first = cols[0]?.toLowerCase();
          if (['nom', 'name', 'beneficiaire', 'raison sociale'].includes(first)) return;
        }
        if (cols[0]) {
          const nom = cols[0].toUpperCase();
          const exists = beneficiaires.find(b => b.nom === nom);
          if (!exists) {
            parsed.push({ nom, ncc: cols[1] || '', ribs: cols[2] ? [{ banque: '', numero: cols[2] }] : [] });
          }
        }
      });
      setImportData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (importData.length === 0) return;
    setImporting(true);
    try {
      const newBens = [];
      for (const ben of importData) {
        const docRef = await addDoc(collection(db, 'beneficiaires'), ben);
        newBens.push({ id: docRef.id, ...ben });
      }
      setBeneficiaires([...beneficiaires, ...newBens].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowImportModal(false);
      setImportData([]);
      showToast('success', 'Import réussi', `${newBens.length} bénéficiaire(s) importé(s)`);
    } catch (error) {
      console.error('Erreur import:', error);
      showToast('error', 'Erreur', 'Erreur lors de l\'import');
    }
    setImporting(false);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      showToast('error', 'Champ obligatoire', 'Le nom est obligatoire');
      return;
    }

    // Si un RIB est en cours de saisie, l'ajouter automatiquement
    let ribsToSave = [...(form.ribs || [])];
    if (newRib.numero.trim()) {
      ribsToSave.push({ banque: newRib.banque.trim(), numero: newRib.numero.trim() });
    }

    setSaving(true);
    try {
      const dataToSave = {
        nom: form.nom.trim().toUpperCase(),
        ncc: (form.ncc || '').trim(),
        ribs: ribsToSave
      };

      if (editBen) {
        await updateDoc(doc(db, 'beneficiaires', editBen.id), dataToSave);
        setBeneficiaires(beneficiaires.map(b => b.id === editBen.id ? { ...b, ...dataToSave } : b));
        showToast('success', 'Modifié', `${dataToSave.nom} mis à jour`);
      } else {
        const docRef = await addDoc(collection(db, 'beneficiaires'), dataToSave);
        setBeneficiaires([...beneficiaires, { id: docRef.id, ...dataToSave }].sort((a, b) => a.nom.localeCompare(b.nom)));
        showToast('success', 'Créé', `${dataToSave.nom} ajouté`);
      }
      setShowModal(false);
      setNewRib({ banque: '', numero: '' });
    } catch (error) {
      console.error('Erreur:', error);
      showToast('error', 'Erreur', 'Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleDelete = (ben) => {
    const opsLies = ops.filter(op => op.beneficiaireId === ben.id);
    if (opsLies.length > 0) {
      showToast('error', 'Suppression impossible', `"${ben.nom}" est lié à ${opsLies.length} OP`);
      return;
    }
    setConfirmModal({
      title: 'Supprimer ce bénéficiaire ?',
      message: `"${ben.nom}" sera supprimé définitivement.`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteDoc(doc(db, 'beneficiaires', ben.id));
          setBeneficiaires(beneficiaires.filter(b => b.id !== ben.id));
          showToast('success', 'Supprimé', `${ben.nom} a été supprimé`);
        } catch (error) {
          console.error('Erreur:', error);
          showToast('error', 'Erreur', 'Erreur lors de la suppression');
        }
      }
    });
  };

  // Styles locaux
  const inputStyle = { padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', background: 'white', transition: 'border 0.2s' };
  const inputEditStyle = { ...inputStyle, background: P.goldLight, borderColor: `${P.green}40` };

  return (
    <div>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateX(40px); } }
        .ben-row:hover { background: ${P.greenLight} !important; }
        .ben-btn { border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; transition: all 0.15s; }
        .ben-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      `}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => <ToastNotif key={t.uid} toast={t} onDone={() => removeToast(t.uid)} />)}
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon.users(P.green)}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: P.text }}>Bénéficiaires</h1>
            <span style={{ fontSize: 12, color: P.textSec }}>{beneficiaires.length} enregistré{beneficiaires.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="ben-btn" onClick={() => setShowImportModal(true)} style={{ background: P.orangeLight, color: P.orange }}>
            {Icon.upload(P.orange)} Importer
          </button>
          <button className="ben-btn" onClick={openNew} style={{ background: P.green, color: 'white' }}>
            {Icon.plus()} Nouveau
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ background: P.card, borderRadius: 12, padding: 16, marginBottom: 20, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>{Icon.search()}</div>
          <input
            type="text"
            placeholder="Rechercher par nom, NCC ou RIB..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${P.border}`, color: P.textSec, fontSize: 13, fontWeight: 600 }}>
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: P.textMuted, padding: 60, fontSize: 14 }}>Aucun bénéficiaire trouvé</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase' }}>Nom / Raison sociale</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase' }}>NCC</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase' }}>RIB(s)</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: P.textSec, letterSpacing: 0.5, textTransform: 'uppercase', width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ben => {
                const ribs = getRibs(ben);
                const opsCount = ops.filter(op => op.beneficiaireId === ben.id).length;
                return (
                  <tr key={ben.id} className="ben-row" style={{ borderBottom: `1px solid ${P.border}`, transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{ben.nom}</div>
                      {opsCount > 0 && <div style={{ fontSize: 10, color: P.textMuted, marginTop: 2 }}>{opsCount} OP</div>}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {ben.ncc ? (
                        <code style={{ fontSize: 14, background: '#f5f5f5', padding: '3px 8px', borderRadius: 4, color: P.text }}>{ben.ncc}</code>
                      ) : (
                        <span style={{ color: P.textMuted, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {ribs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ribs.map((rib, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              {rib.banque && (
                                <span style={{ background: P.blueLight, color: P.blue, padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                                  {rib.banque}
                                </span>
                              )}
                              <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, fontSize: 13, color: P.text }}>{rib.numero}</code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: P.textMuted, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button className="ben-btn" onClick={() => openEdit(ben)} style={{ background: P.orangeLight, color: P.orange, padding: '6px 10px' }}>
                          {Icon.edit()}
                        </button>
                        <button className="ben-btn" onClick={() => handleDelete(ben)} style={{ background: P.redLight, color: P.red, padding: '6px 10px' }}>
                          {Icon.trash()}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ==================== MODAL CRÉATION / ÉDITION ==================== */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: editBen ? P.orangeLight : P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {editBen ? Icon.edit(P.orange, 18) : Icon.plus(P.green, 18)}
                </div>
                <span style={{ fontSize: 17, fontWeight: 700, color: P.text }}>{editBen ? 'Modifier le bénéficiaire' : 'Nouveau bénéficiaire'}</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>{Icon.x()}</button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>NOM / RAISON SOCIALE *</label>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                    style={inputEditStyle} placeholder="Ex: SOGEA SATOM" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: P.textSec }}>NCC</label>
                  <input value={form.ncc || ''} onChange={e => setForm({ ...form, ncc: e.target.value })}
                    style={inputEditStyle} placeholder="1904588 U" />
                </div>
              </div>

              {/* Section RIB */}
              <div style={{ background: P.bg, padding: 20, borderRadius: 12, border: `1px solid ${P.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  {Icon.bank(P.blue, 16)}
                  <label style={{ fontSize: 12, fontWeight: 700, color: P.text }}>Références bancaires (RIB)</label>
                  {(form.ribs || []).length > 0 && (
                    <span style={{ background: P.blueLight, color: P.blue, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {(form.ribs || []).length}
                    </span>
                  )}
                </div>

                {/* RIBs existants */}
                {(form.ribs || []).length > 0 && (
                  <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.ribs.map((rib, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '10px 14px', borderRadius: 8, border: `1px solid ${P.border}` }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: P.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {Icon.bank(P.blue, 12)}
                        </div>
                        {rib.banque && (
                          <span style={{ background: P.blueLight, color: P.blue, padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                            {rib.banque}
                          </span>
                        )}
                        <code style={{ flex: 1, fontSize: 12, color: P.text }}>{rib.numero}</code>
                        <button type="button" onClick={() => removeRib(index)} className="ben-btn"
                          style={{ background: P.redLight, color: P.red, padding: '4px 8px', fontSize: 11 }}>
                          {Icon.trash(P.red, 13)}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ajouter RIB */}
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: P.textSec, marginBottom: 4, fontWeight: 600 }}>Banque</label>
                    <input value={newRib.banque} onChange={e => setNewRib({ ...newRib, banque: e.target.value })}
                      style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }} placeholder="SGBCI" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: P.textSec, marginBottom: 4, fontWeight: 600 }}>Numéro RIB</label>
                    <input value={newRib.numero} onChange={e => setNewRib({ ...newRib, numero: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRib(); } }}
                      style={{ ...inputStyle, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace' }} placeholder="" />
                  </div>
                  <button type="button" onClick={addRib} className="ben-btn"
                    style={{ background: P.green, color: 'white', padding: '9px 16px', fontSize: 12 }}>
                    {Icon.plus('white', 14)}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => setShowModal(false)} className="ben-btn"
                style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="ben-btn"
                style={{ background: P.green, color: 'white', padding: '10px 24px', opacity: saving ? 0.6 : 1 }}>
                {Icon.check('white', 14)} {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL IMPORT ==================== */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: 'white', borderRadius: 16, width: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: P.blue, borderRadius: '16px 16px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {Icon.upload('white', 18)}
                <span style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Importer des bénéficiaires</span>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}>{Icon.x('white')}</button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Info format */}
              <div style={{ background: P.blueLight, padding: 16, borderRadius: 10, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {Icon.clipboard(P.blue)}
                <div>
                  <strong style={{ color: P.blue, fontSize: 13 }}>Format attendu (CSV)</strong>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: P.textSec, lineHeight: 1.5 }}>
                    3 colonnes : <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4 }}>Nom ; NCC ; RIB</code><br />
                    Séparateur : virgule, point-virgule ou tabulation. Les doublons sont ignorés.
                  </p>
                </div>
              </div>

              {/* File input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: P.textSec }}>FICHIER</label>
                <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleFileUpload}
                  style={{ width: '100%', padding: 16, border: `2px dashed ${P.blue}`, borderRadius: 10, cursor: 'pointer', fontSize: 13 }} />
              </div>

              {/* Preview */}
              {importData.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    {Icon.check(P.green, 16)}
                    <strong style={{ color: P.green, fontSize: 13 }}>{importData.length} bénéficiaire(s) à importer</strong>
                  </div>
                  <div style={{ maxHeight: 250, overflowY: 'auto', border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#FAFAF8' }}>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: P.textSec }}>NOM</th>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: P.textSec }}>NCC</th>
                          <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: P.textSec }}>RIB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 50).map((ben, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${P.border}` }}>
                            <td style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600 }}>{ben.nom}</td>
                            <td style={{ padding: '8px 16px', fontSize: 12, color: P.textSec }}>{ben.ncc || '—'}</td>
                            <td style={{ padding: '8px 16px', fontSize: 11, fontFamily: 'monospace' }}>{ben.ribs?.[0]?.numero || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 50 && (
                      <div style={{ padding: 12, textAlign: 'center', color: P.textSec, fontSize: 12 }}>... et {importData.length - 50} autre(s)</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 28px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} className="ben-btn"
                style={{ background: 'white', color: P.textSec, border: `1.5px solid ${P.border}`, padding: '10px 20px' }}>
                Annuler
              </button>
              <button onClick={handleImport} disabled={importing || importData.length === 0} className="ben-btn"
                style={{ background: P.blue, color: 'white', padding: '10px 24px', opacity: importing || importData.length === 0 ? 0.6 : 1 }}>
                {Icon.check('white', 14)} {importing ? 'Import en cours...' : `Importer ${importData.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageBeneficiaires;
