import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== TOAST COMPONENT ====================
const ToastIcon = ({ type }) => {
  if (type === 'success') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
    </svg>
  );
  if (type === 'error') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
};

const TOAST_STYLES = {
  success: { bg: 'linear-gradient(135deg, #f0faf5 0%, #fff 100%)', iconBg: '#e8f5e9', iconBorder: '#4caf5020' },
  error: { bg: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', iconBg: '#ffebee', iconBorder: '#f4433620' },
  warning: { bg: 'linear-gradient(135deg, #fffbf0 0%, #fff 100%)', iconBg: '#fff3e0', iconBorder: '#ff980020' },
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
    <div style={{
      background: s.bg, borderRadius: 14, padding: '16px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      minWidth: 320, maxWidth: 420,
      boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out',
      pointerEvents: 'none'
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: s.iconBg,
        border: `1.5px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{toast.title}</div>
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>
      </div>
    </div>
  );
};

// ==================== PAGE NOUVEL OP ====================
const PageNouvelOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exercices, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage, userProfile } = useAppContext();
  const defaultForm = { type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT', objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '', montantTVA: '', tvaRecuperable: null, opProvisoireNumero: '', opProvisoireId: '' };

  const loadDraft = () => {
    try { const saved = localStorage.getItem('op_draft'); if (saved) return JSON.parse(saved); } catch (e) {}
    return defaultForm;
  };
  const loadSource = () => {
    try { const saved = localStorage.getItem('op_draft_source'); if (saved && sources.find(s => s.id === saved)) return saved; } catch (e) {}
    return sources[0]?.id || null;
  };

  const [activeSource, setActiveSource] = useState(loadSource);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState(loadDraft);
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((type, title, message) => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  useEffect(() => { try { localStorage.setItem('op_draft', JSON.stringify(form)); } catch (e) {} }, [form]);
  useEffect(() => { try { if (activeSource) localStorage.setItem('op_draft_source', activeSource); } catch (e) {} }, [activeSource]);

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const accent = currentSourceObj?.couleur || '#0f4c3a';
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);

  useEffect(() => {
    if (consultOpData && consultOpData._duplicate) {
      const op = consultOpData;
      if (op.sourceId) setActiveSource(op.sourceId);
      setForm({
        type: op.type === 'ANNULATION' ? 'PROVISOIRE' : op.type,
        beneficiaireId: op.beneficiaireId || '', ribIndex: 0,
        modeReglement: op.modeReglement || 'VIREMENT',
        objet: op.objet || '', piecesJustificatives: op.piecesJustificatives || '',
        montant: '', ligneBudgetaire: op.ligneBudgetaire || '',
        montantTVA: '', tvaRecuperable: op.tvaRecuperable || null,
        opProvisoireNumero: '', opProvisoireId: ''
      });
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);

  const getBeneficiaireRibs = (ben) => {
    if (!ben) return [];
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };

  const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
  const selectedRib = beneficiaireRibs[form.ribIndex] || beneficiaireRibs[0] || null;

  const currentBudget = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === exerciceActif?.id)
    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];

  const selectedLigne = currentBudget?.lignes?.find(l => l.code === form.ligneBudgetaire);
  const getDotation = () => selectedLigne?.dotation || 0;

  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire) return 0;
    return ops.filter(op =>
      op.sourceId === activeSource && op.exerciceId === exerciceActif?.id &&
      op.ligneBudgetaire === form.ligneBudgetaire &&
      ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
      !['REJETE', 'ANNULE'].includes(op.statut)
    ).reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const getEngagementActuel = () => {
    const montant = parseFloat(form.montant) || 0;
    if (form.type === 'DEFINITIF' && form.opProvisoireId) {
      const opProv = ops.find(o => o.id === form.opProvisoireId);
      return montant - (opProv?.montant || 0);
    }
    return montant;
  };

  const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
  const getDisponible = () => getDotation() - getEngagementsCumules();

  const opProvisoiresAnnulation = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION')
  ) : [];

  const opProvisoiresDefinitif = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'DEFINITIF')
  ) : [];

  const opProvisoiresDisponibles = form.type === 'ANNULATION' ? opProvisoiresAnnulation : opProvisoiresDefinitif;

  const getOpProvLabel = (op) => {
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ex = exercices.find(e => e.id === op.exerciceId);
    const isExtra = op.importAnterieur ? ' [Extra]' : '';
    const isAutreEx = (exerciceActif && op.exerciceId !== exerciceActif.id && ex) ? ` (${ex.annee})` : '';
    return `${op.numero}${isExtra}${isAutreEx} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`;
  };

  const genererNumero = () => {
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSource = currentSourceObj?.sigle || 'OP';
    const annee = exerciceActif?.annee || new Date().getFullYear();
    const opsSource = ops.filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id);
    let maxNum = 0;
    opsSource.forEach(op => { const match = (op.numero || '').match(/N°(\d+)\//); if (match) maxNum = Math.max(maxNum, parseInt(match[1])); });
    return `N°${String(maxNum + 1).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
  };

  const handleSelectOpProvisoire = (opId) => {
    if (!opId) { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '' }); return; }
    const op = ops.find(o => o.id === opId);
    if (op) {
      setForm({
        ...form, opProvisoireId: opId, opProvisoireNumero: op.numero,
        beneficiaireId: op.beneficiaireId, ligneBudgetaire: op.ligneBudgetaire, objet: op.objet,
        montant: form.type === 'ANNULATION' ? String(op.montant) : form.montant,
        modeReglement: op.modeReglement || 'VIREMENT'
      });
    }
  };

  const handleClear = () => { setForm(defaultForm); try { localStorage.removeItem('op_draft'); } catch (e) {} };

  const handleSave = async () => {
    if (!activeSource) { showToast('error', 'Source manquante', 'Veuillez sélectionner une source de financement'); return; }
    if (!exerciceActif) { showToast('error', 'Exercice manquant', 'Aucun exercice actif défini'); return; }
    if (!form.beneficiaireId) { showToast('error', 'Champ obligatoire', 'Veuillez sélectionner un bénéficiaire'); return; }
    if (form.modeReglement === 'VIREMENT' && !selectedRib) { showToast('error', 'RIB manquant', 'Veuillez renseigner un RIB pour le bénéficiaire'); return; }
    if (!form.ligneBudgetaire) { showToast('error', 'Champ obligatoire', 'Veuillez sélectionner une ligne budgétaire'); return; }
    if (!form.objet.trim()) { showToast('error', 'Champ obligatoire', "Veuillez saisir l'objet de la dépense"); return; }
    if (!form.montant || parseFloat(form.montant) === 0) { showToast('error', 'Montant invalide', 'Veuillez saisir un montant valide'); return; }
    if (['ANNULATION', 'DEFINITIF'].includes(form.type) && !form.opProvisoireId && !form.opProvisoireNumero.trim()) {
      showToast('error', 'OP Provisoire requis', `Veuillez renseigner le N° d'OP Provisoire à ${form.type === 'ANNULATION' ? 'annuler' : 'régulariser'}`); return;
    }
    if (form.type !== 'ANNULATION' && getDisponible() < 0) {
      showToast('error', 'Budget insuffisant', `Disponible : ${formatMontant(getDisponible())} FCFA`); return;
    }

    setSaving(true);
    try {
      const sigleProjet = projet?.sigle || 'PROJET';
      const sigleSource = currentSourceObj?.sigle || 'OP';
      const annee = exerciceActif?.annee || new Date().getFullYear();

      const allOpsSnap = await getDocs(query(collection(db, 'ops'), where('sourceId', '==', activeSource), where('exerciceId', '==', exerciceActif.id)));
      const allNumerosExistants = allOpsSnap.docs.map(d => d.data().numero);

      let maxNum = 0;
      allNumerosExistants.forEach(n => { const match = (n || '').match(/N°(\d+)\//); if (match) maxNum = Math.max(maxNum, parseInt(match[1])); });
      let nextNum = maxNum + 1;
      let numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
      let tentatives = 0;
      while (allNumerosExistants.includes(numero) && tentatives < 50) { nextNum++; numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`; tentatives++; }

      const numeroInitial = genererNumero();
      if (numero !== numeroInitial) showToast('warning', 'Numéro corrigé', `${numeroInitial} déjà utilisé → ${numero}`);

      const opData = {
        numero, type: form.type, sourceId: activeSource, exerciceId: exerciceActif.id,
        beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: selectedRib || null, ligneBudgetaire: form.ligneBudgetaire,
        objet: form.objet.trim(), piecesJustificatives: form.piecesJustificatives.trim(),
        montant: parseFloat(form.montant), montantTVA: form.montantTVA ? parseFloat(form.montantTVA) : null,
        tvaRecuperable: form.tvaRecuperable === true, statut: 'EN_COURS',
        opProvisoireId: form.opProvisoireId || null, opProvisoireNumero: form.opProvisoireNumero || null,
        dateCreation: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        creePar: userProfile?.nom || userProfile?.email || 'Inconnu'
      };

      const docRef = await addDoc(collection(db, 'ops'), opData);

      const doublonSnap = await getDocs(query(collection(db, 'ops'), where('numero', '==', numero)));
      if (doublonSnap.size > 1) {
        const allOpsSnap2 = await getDocs(query(collection(db, 'ops'), where('sourceId', '==', activeSource), where('exerciceId', '==', exerciceActif.id)));
        const allNums2 = allOpsSnap2.docs.map(d => d.data().numero);
        let fixMax = 0;
        allNums2.forEach(n => { const m = (n || '').match(/N°(\d+)\//); if (m) fixMax = Math.max(fixMax, parseInt(m[1])); });
        let fixNum = fixMax + 1;
        let fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
        while (allNums2.includes(fixNumero)) { fixNum++; fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`; }
        await updateDoc(doc(db, 'ops', docRef.id), { numero: fixNumero, updatedAt: new Date().toISOString() });
        opData.numero = fixNumero;
        showToast('warning', 'Doublon corrigé', `Nouveau numéro : ${fixNumero}`);
      }

      setOps([...ops, { id: docRef.id, ...opData }]);
      showToast('success', 'OP créé avec succès', `${opData.numero} enregistré`);
      handleClear();
    } catch (error) {
      console.error('Erreur:', error);
      showToast('error', 'Erreur', "Erreur lors de la création de l'OP");
    }
    setSaving(false);
  };

  // ==================== STYLES LOCAUX ====================
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d', letterSpacing: 0.3 };
  const inputBase = { ...styles.input, marginBottom: 0, borderRadius: 8, border: '1.5px solid #e0e0e0' };
  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );

  return (
    <div>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes toastOut { from { opacity: 1; transform: translate(-50%, -50%) scale(1); } to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } }
      `}</style>

      {/* TOASTS */}
      {toasts.map(t => (
        <div key={t.uid} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
          <ToastNotif toast={t} onDone={() => removeToast(t.uid)} />
        </div>
      ))}

      {/* SOURCES EN ÉVIDENCE */}
      <div style={{ maxWidth: 900, margin: '0 auto', marginBottom: 4 }}>
        <label style={{ ...labelStyle, marginBottom: 10, fontSize: 12 }}>SOURCE DE FINANCEMENT</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {sources.map(s => {
            const isActive = activeSource === s.id;
            const col = s.couleur || '#0f4c3a';
            return (
              <div key={s.id} onClick={() => setActiveSource(s.id)}
                style={{
                  flex: 1, padding: '16px 20px', borderRadius: 12, cursor: 'pointer',
                  background: isActive ? col : 'white',
                  border: isActive ? `2px solid ${col}` : '2px solid #e0e0e0',
                  boxShadow: isActive ? `0 4px 16px ${col}33` : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.25s'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isActive ? 'white' : col, letterSpacing: 0.5 }}>{s.sigle || s.nom}</div>
                    <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.8)' : '#999', marginTop: 2 }}>{s.nom}</div>
                  </div>
                  {isActive && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORMULAIRE */}
      <div style={{ maxWidth: 900, margin: '0 auto', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${accent}` }}>

        {!exerciceActif ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>⚠️</div>
            <p style={{ color: '#e65100', fontWeight: 600 }}>Aucun exercice actif</p>
            <p style={{ color: '#6c757d' }}>Veuillez définir un exercice actif dans les <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span></p>
          </div>
        ) : (
          <div style={{ padding: '24px 28px 20px' }}>

            {/* N° OP + TYPE + Effacer */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>N° OP</label>
                <div style={{ ...inputBase, background: '#f8f9fa', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: accent }}>{genererNumero()}</div>
              </div>
              <div>
                <label style={labelStyle}>TYPE D'OP</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { value: 'PROVISOIRE', label: 'Provisoire', icon: '⏳', color: '#ff9800' },
                    { value: 'DIRECT', label: 'Direct', icon: '⚡', color: '#2196f3' },
                    { value: 'DEFINITIF', label: 'Définitif', icon: '✅', color: '#4caf50' },
                    { value: 'ANNULATION', label: 'Annulation', icon: '✕', color: '#f44336' },
                  ].map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm({ ...form, type: t.value, opProvisoireId: '', opProvisoireNumero: '' })}
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: `1.5px solid ${form.type === t.value ? t.color : '#e0e0e0'}`,
                        background: form.type === t.value ? t.color + '12' : 'white',
                        color: form.type === t.value ? t.color : '#777',
                        fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                      <span style={{ fontSize: 12 }}>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={handleClear} style={{
                  padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                  background: 'white', color: '#999', fontWeight: 600, fontSize: 12, cursor: 'pointer'
                }}>Effacer</button>
              </div>
            </div>

            <div style={{ height: 1, background: '#f0f0f0', marginBottom: 24 }} />

            {/* 👤 Bénéficiaire */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('👤', 'Bénéficiaire')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16 }}>
                <div>
                  <label style={labelStyle}>NOM / RAISON SOCIALE *</label>
                  <Autocomplete
                    options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || '', ...(b.ribs || []).map(r => r.numero), ...(b.ribs || []).map(r => r.banque), b.rib || ''] }))}
                    value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null}
                    onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                    placeholder="🔍 Rechercher par nom ou NCC..."
                    isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                    noOptionsMessage="Aucun bénéficiaire trouvé"
                    accentColor={accent}
                  />
                </div>
                <div>
                  <label style={labelStyle}>N°CC</label>
                  <input type="text" value={selectedBeneficiaire?.ncc || ''} readOnly style={{ ...inputBase, background: '#f8f9fa' }} />
                </div>
              </div>
            </div>

            {/* 💳 Règlement */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('💳', 'Règlement')}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                {['ESPECES', 'CHEQUE', 'VIREMENT'].map(m => (
                  <label key={m} onClick={() => setForm({ ...form, modeReglement: m })} style={{
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 16px',
                    borderRadius: 8, border: `1.5px solid ${form.modeReglement === m ? accent : '#e0e0e0'}`,
                    background: form.modeReglement === m ? accent + '08' : 'white', transition: 'all 0.2s'
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', border: `2px solid ${form.modeReglement === m ? accent : '#ccc'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {form.modeReglement === m && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: form.modeReglement === m ? 600 : 400, color: form.modeReglement === m ? accent : '#555' }}>{m}</span>
                  </label>
                ))}
              </div>
              {form.modeReglement === 'VIREMENT' && (
                <div style={{ maxWidth: 420 }}>
                  <label style={labelStyle}>RIB</label>
                  {!selectedBeneficiaire ? (
                    <div style={{ ...inputBase, background: '#f8f9fa', color: '#adb5bd', fontStyle: 'italic' }}>Sélectionnez d'abord un bénéficiaire</div>
                  ) : beneficiaireRibs.length === 0 ? (
                    <div style={{ ...inputBase, background: '#fff3e0', color: '#e65100' }}>⚠️ Aucun RIB enregistré</div>
                  ) : beneficiaireRibs.length === 1 ? (
                    <div style={{ ...inputBase, background: '#f8f9fa', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {beneficiaireRibs[0].banque && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{beneficiaireRibs[0].banque}</span>}
                      <span>{beneficiaireRibs[0].numero}</span>
                    </div>
                  ) : (
                    <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={inputBase}>
                      {beneficiaireRibs.map((rib, index) => <option key={index} value={index}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* 📝 Détails */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('📝', 'Détails de la dépense')}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>OBJET *</label>
                <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })}
                  style={{ ...inputBase, minHeight: 60, resize: 'vertical' }} placeholder="Décrire l'objet de la dépense..." />
              </div>
              <div>
                <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })}
                  style={{ ...inputBase, minHeight: 44, resize: 'vertical', fontSize: 13 }} placeholder="Lister les pièces jointes..." />
              </div>
            </div>

            {/* 💰 Montant et budget */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('💰', 'Montant et budget')}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 180px 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
                <div>
                  <label style={labelStyle}>MONTANT (FCFA) *</label>
                  <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })}
                    style={{ ...inputBase, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, textAlign: 'right' }}
                    placeholder="0" disabled={form.type === 'ANNULATION' && form.opProvisoireId} />
                </div>
                <div>
                  <label style={labelStyle}>LIGNE BUDG. *</label>
                  <Autocomplete
                    options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}`, searchFields: [l.code, l.libelle] }))}
                    value={form.ligneBudgetaire ? (currentBudget?.lignes || []).filter(x => x.code === form.ligneBudgetaire).map(l => ({ value: l.code, label: l.code }))[0] || null : null}
                    onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                    placeholder="🔍 Code..."
                    isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                    noOptionsMessage="Aucune ligne trouvée"
                    accentColor={accent}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LIBELLÉ</label>
                  <div style={{ padding: '10px 14px', background: '#f0f4ff', borderRadius: 8, fontSize: 12, color: '#555', minHeight: 20 }}>
                    {selectedLigne?.libelle || '—'}
                  </div>
                </div>

                {/* Ligne 2 : Budget (col 1+2) | OP Provisoire (col 3) */}
                <div style={{ gridColumn: '1 / 3' }}>
                  <div style={{ background: '#f8faf9', padding: 14, borderRadius: 10, border: '1px solid #e8ece9' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 5 }}>
                      <span style={{ fontSize: 11, color: '#6c757d' }}>Dotation</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                      <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. antérieurs</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                      <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. actuel</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: getEngagementActuel() < 0 ? '#2e7d32' : '#e65100' }}>{getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}</span>
                      <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. cumulés</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsCumules())}</span>
                      <div style={{ gridColumn: '1 / -1', height: 1, background: '#d0d8d3', margin: '6px 0' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>Disponible budgétaire</span>
                      <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: getDisponible() >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(getDisponible())}</span>
                    </div>
                    {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                      <div style={{ marginTop: 10, padding: 8, background: '#ffebee', borderRadius: 6, color: '#c62828', fontSize: 11, fontWeight: 600 }}>⚠️ Budget insuffisant</div>
                    )}
                  </div>
                </div>
                <div>
                  {['DEFINITIF', 'ANNULATION'].includes(form.type) && (
                    <>
                      <label style={{ ...labelStyle, color: form.type === 'ANNULATION' ? '#c62828' : '#2e7d32' }}>
                        {form.type === 'ANNULATION' ? '🗑️' : '🔄'} OP PROV. À {form.type === 'ANNULATION' ? 'ANNULER' : 'RÉGULARISER'}
                      </label>
                      <div style={{ marginBottom: 6 }}>
                        <Autocomplete
                          options={opProvisoiresDisponibles.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant), op.objet || ''] }))}
                          value={form.opProvisoireId ? opProvisoiresDisponibles.filter(o => o.id === form.opProvisoireId).map(op => ({ value: op.id, label: getOpProvLabel(op) }))[0] || null : null}
                          onChange={(option) => handleSelectOpProvisoire(option?.value || '')}
                          placeholder="🔍 Rechercher..."
                          noOptionsMessage={!form.beneficiaireId ? "Sélectionnez d'abord un bénéficiaire" : 'Aucun OP disponible'}
                          accentColor={form.type === 'ANNULATION' ? '#c62828' : '#2e7d32'}
                        />
                      </div>
                      <input type="text" value={form.opProvisoireNumero}
                        onChange={(e) => setForm({ ...form, opProvisoireNumero: e.target.value, opProvisoireId: '' })}
                        style={{ ...inputBase, fontSize: 12 }} placeholder="ou saisir : N°0012/PIF2-IDA/2026" />
                    </>
                  )}
                </div>
              </div>

              {/* Récap paiement DEFINITIF */}
              {form.type === 'DEFINITIF' && form.opProvisoireId && (() => {
                const opProv = ops.find(o => o.id === form.opProvisoireId);
                if (!opProv) return null;
                const mtPaye = Number(opProv.montantPaye || opProv.montant || 0);
                const mtDef = parseFloat(form.montant) || 0;
                const ecart = mtPaye - mtDef;
                return (
                  <div style={{ padding: 12, background: '#f8faf9', borderRadius: 8, border: '1px solid #c8e6c9' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: '#2e7d32' }}>💰 Récapitulatif paiement</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, color: '#6c757d', marginBottom: 4 }}>Montant payé (provisoire)</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#1565c0' }}>{formatMontant(mtPaye)} F</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: '#6c757d', marginBottom: 4 }}>Montant définitif</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{mtDef > 0 ? formatMontant(mtDef) + ' F' : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: '#6c757d', marginBottom: 4 }}>Écart</div>
                        {mtDef > 0 ? (
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: ecart > 0 ? '#c62828' : ecart < 0 ? '#e65100' : '#2e7d32' }}>
                            {ecart > 0 ? '+' + formatMontant(ecart) + ' F' : ecart < 0 ? formatMontant(ecart) + ' F' : '0 F'}
                            <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>
                              {ecart > 0 ? '⚠️ Trop perçu → reversement' : ecart < 0 ? '⚠️ Complément à payer' : '✅ Aucun écart'}
                            </div>
                          </div>
                        ) : <div style={{ fontSize: 12, color: '#999' }}>Saisir le montant</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Date + TVA */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>DATE</label>
                  <input type="date" value={new Date().toISOString().split('T')[0]} readOnly style={{ ...inputBase, background: '#f8f9fa' }} />
                </div>
                {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                  <div>
                    <label style={labelStyle}>TVA RÉCUPÉRABLE</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {[{ label: 'OUI', val: true }, { label: 'NON', val: false }].map(v => (
                        <label key={v.label} onClick={() => setForm({ ...form, tvaRecuperable: v.val })} style={{
                          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '7px 14px',
                          borderRadius: 8, border: `1.5px solid ${form.tvaRecuperable === v.val ? accent : '#e0e0e0'}`,
                          background: form.tvaRecuperable === v.val ? accent + '08' : 'white', transition: 'all 0.2s'
                        }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%', border: `2px solid ${form.tvaRecuperable === v.val ? accent : '#ccc'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {form.tvaRecuperable === v.val && <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />}
                          </div>
                          <span style={{ fontSize: 12 }}>{v.label}</span>
                        </label>
                      ))}
                      {form.tvaRecuperable === true && (
                        <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })}
                          style={{ ...inputBase, width: 140, fontFamily: 'monospace', textAlign: 'right', fontSize: 13 }} placeholder="Montant TVA" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={handleSave}
                disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                style={{
                  width: 52, height: 52, borderRadius: '50%', border: 'none',
                  background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? '#bdbdbd' : accent,
                  color: 'white', cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer',
                  boxShadow: `0 4px 14px ${accent}44`, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Enregistrer"
              >
                {saving ? (
                  <span style={{ fontSize: 18 }}>⏳</span>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageNouvelOp;
