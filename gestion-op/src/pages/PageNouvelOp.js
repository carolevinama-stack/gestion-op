import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== TOAST SYSTEM ====================
const TOAST_STYLES = {
  success: { bg: 'linear-gradient(135deg, #f0faf5 0%, #fff 100%)', iconBg: '#e8f5e9', iconBorder: '#4caf5020' },
  error: { bg: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', iconBg: '#ffebee', iconBorder: '#f4433620' },
  warning: { bg: 'linear-gradient(135deg, #fffbf0 0%, #fff 100%)', iconBg: '#fff3e0', iconBorder: '#ff980020' },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
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
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: s.iconBg,
        border: `1.5px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
};

// ==================== PAGE NOUVEL OP ====================
const PageNouvelOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exercices, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage, userProfile } = useAppContext();
  const defaultForm = { type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT', objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '', montantTVA: '', tvaRecuperable: null, opProvisoireNumero: '', opProvisoireId: '' };

  // Restaurer le brouillon depuis localStorage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem('op_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultForm;
  };
  const loadSource = () => {
    try {
      const saved = localStorage.getItem('op_draft_source');
      if (saved && sources.find(s => s.id === saved)) return saved;
    } catch (e) {}
    return sources[0]?.id || null;
  };

  const [activeSource, setActiveSource] = useState(loadSource);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState(loadDraft);
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  // Sauvegarder le brouillon à chaque modification
  useEffect(() => {
    try { localStorage.setItem('op_draft', JSON.stringify(form)); } catch (e) {}
  }, [form]);
  useEffect(() => {
    try { if (activeSource) localStorage.setItem('op_draft_source', activeSource); } catch (e) {}
  }, [activeSource]);

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);

  // Si on vient de Consulter OP avec duplication
  useEffect(() => {
    if (consultOpData && consultOpData._duplicate) {
      const op = consultOpData;
      if (op.sourceId) setActiveSource(op.sourceId);
      setForm({
        type: op.type === 'ANNULATION' ? 'PROVISOIRE' : op.type,
        beneficiaireId: op.beneficiaireId || '',
        ribIndex: 0,
        modeReglement: op.modeReglement || 'VIREMENT',
        objet: op.objet || '',
        piecesJustificatives: op.piecesJustificatives || '',
        montant: '',
        ligneBudgetaire: op.ligneBudgetaire || '',
        montantTVA: '',
        tvaRecuperable: op.tvaRecuperable === true ? true : op.tvaRecuperable === false ? false : null,
        opProvisoireNumero: '',
        opProvisoireId: ''
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
    return ops
      .filter(op => 
        op.sourceId === activeSource && 
        op.exerciceId === exerciceActif?.id &&
        op.ligneBudgetaire === form.ligneBudgetaire &&
        ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
        !['REJETE', 'ANNULE'].includes(op.statut)
      )
      .reduce((sum, op) => sum + (op.montant || 0), 0);
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

  // OP provisoires pour ANNULATION : même bénéficiaire obligatoire, pas déjà annulé
  const opProvisoiresAnnulation = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    op.beneficiaireId === form.beneficiaireId &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION')
  ) : [];

  // OP provisoires pour DEFINITIF : même bénéficiaire, pas déjà régularisé
  const opProvisoiresDefinitif = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    op.beneficiaireId === form.beneficiaireId &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'DEFINITIF')
  ) : [];

  // Sélection selon le type en cours
  const opProvisoiresDisponibles = form.type === 'ANNULATION' ? opProvisoiresAnnulation : opProvisoiresDefinitif;

  // Label pour l'autocomplete (avec badge Extra + année si autre exercice)
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
    // Extraire le plus grand numéro existant
    let maxNum = 0;
    opsSource.forEach(op => {
      const match = (op.numero || '').match(/N°(\d+)\//);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });
    const nextNum = maxNum + 1;
    return `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
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

  const handleClear = () => {
    setForm(defaultForm);
    try { localStorage.removeItem('op_draft'); } catch (e) {}
  };

  const handleSave = async () => {
    if (!activeSource) { showToast('error', 'Source manquante', 'Veuillez sélectionner une source de financement'); return; }
    if (!exerciceActif) { showToast('error', 'Exercice manquant', 'Aucun exercice actif'); return; }
    if (!form.beneficiaireId) { showToast('error', 'Champ obligatoire', 'Veuillez sélectionner un bénéficiaire'); return; }
    if (form.modeReglement === 'VIREMENT' && !selectedRib) { showToast('error', 'RIB manquant', 'Veuillez renseigner un RIB pour le bénéficiaire'); return; }
    if (!form.ligneBudgetaire) { showToast('error', 'Champ obligatoire', 'Veuillez sélectionner une ligne budgétaire'); return; }
    if (!form.objet.trim()) { showToast('error', 'Champ obligatoire', 'Veuillez saisir l\'objet de la dépense'); return; }
    if (!form.montant || parseFloat(form.montant) === 0) { showToast('error', 'Champ obligatoire', 'Veuillez saisir un montant valide'); return; }
    if (['DIRECT', 'DEFINITIF'].includes(form.type) && form.tvaRecuperable === null) {
      showToast('error', 'Champ obligatoire', 'Veuillez indiquer si la TVA est récupérable (OUI / NON)'); return;
    }
    if (['ANNULATION', 'DEFINITIF'].includes(form.type) && !form.opProvisoireId && !form.opProvisoireNumero.trim()) {
      showToast('error', 'Champ obligatoire', `Veuillez renseigner le N° d'OP Provisoire à ${form.type === 'ANNULATION' ? 'annuler' : 'régulariser'}`); return;
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
      
      // Extraire le plus grand numéro existant
      let maxNum = 0;
      allNumerosExistants.forEach(n => {
        const match = (n || '').match(/N°(\d+)\//);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
      });
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
        tvaRecuperable: form.tvaRecuperable === true, statut: 'CREE',
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
        showToast('warning', 'Numéro corrigé', `Doublon corrigé → ${fixNumero}`);
      }
      
      setOps([...ops, { id: docRef.id, ...opData }]);
      showToast('success', 'OP créé avec succès', `N° ${opData.numero}`);
      handleClear();
    } catch (error) {
      console.error('Erreur:', error);
      showToast('error', 'Erreur', 'Erreur lors de la création de l\'OP');
    }
    setSaving(false);
  };

  // === STYLES ===
  const accent = currentSourceObj?.couleur || '#0f4c3a';
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d', letterSpacing: 0.3 };
  const fieldStyle = { padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, fontSize: 13, border: '1.5px solid #e0e0e0', width: '100%', boxSizing: 'border-box' };
  const editFieldStyle = { ...fieldStyle, background: '#fffde7', border: `1.5px solid ${accent}40` };
  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );

  return (
    <div className="nouvelop-form">
      <style>{`
        @keyframes toastIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
        .nouvelop-form *, .nouvelop-form *::before, .nouvelop-form *::after { box-sizing: border-box; }
        .nouvelop-form input, .nouvelop-form select, .nouvelop-form textarea { box-sizing: border-box; }
      `}</style>
      {toasts.map(t => (
        <div key={t.uid} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <ToastNotif toast={t} onDone={() => removeToast(t.uid)} />
        </div>
      ))}

      {/* Sources */}
      <div style={{ maxWidth: 1020, margin: '0 auto', marginBottom: 4 }}>
        <label style={{ ...labelStyle, fontSize: 12, marginBottom: 10 }}>SOURCE DE FINANCEMENT</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {sources.map(s => {
            const isActive = activeSource === s.id;
            return (
              <div key={s.id} onClick={() => setActiveSource(s.id)}
                style={{ flex: 1, padding: '16px 20px', borderRadius: 12, cursor: 'pointer', background: isActive ? s.couleur : 'white', border: isActive ? `2px solid ${s.couleur}` : '2px solid #e0e0e0', boxShadow: isActive ? `0 4px 16px ${s.couleur}33` : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.25s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isActive ? 'white' : s.couleur }}>{s.sigle || s.nom}</div>
                    <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.8)' : '#999', marginTop: 2 }}>{s.nom}</div>
                  </div>
                  {isActive && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>✓</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!exerciceActif ? (
        <div style={{ maxWidth: 1020, margin: '0 auto', background: 'white', borderRadius: 12, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#e65100', fontWeight: 600 }}>Aucun exercice actif</p>
          <p style={{ color: '#6c757d' }}>Veuillez définir un exercice actif dans les <span style={{ color: accent, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span></p>
        </div>
      ) : (
        <div style={{ maxWidth: 1020, margin: '0 auto', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${accent}` }}>
          <div style={{ padding: '24px 28px 20px' }}>

            {/* N°OP + TYPE + DATE + EFFACER — même ligne */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'end', marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                <label style={labelStyle}>N° OP (auto)</label>
                <div style={{ ...fieldStyle, fontWeight: 700, fontFamily: 'monospace', fontSize: 15 }}>{genererNumero()}</div>
              </div>
              <div style={{ flex: '0 1 180px', minWidth: 160 }}>
                <label style={labelStyle}>TYPE D'OP *</label>
                <select value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value, opProvisoireId: '', opProvisoireNumero: '', tvaRecuperable: ['DIRECT', 'DEFINITIF'].includes(e.target.value) ? null : form.tvaRecuperable })}
                  style={{ ...fieldStyle, fontWeight: 700, fontSize: 14, color: ({ PROVISOIRE: '#ff9800', DIRECT: '#2196f3', DEFINITIF: '#4caf50', ANNULATION: '#f44336' })[form.type], cursor: 'pointer', borderColor: ({ PROVISOIRE: '#ff9800', DIRECT: '#2196f3', DEFINITIF: '#4caf50', ANNULATION: '#f44336' })[form.type] + '40' }}>
                  <option value="PROVISOIRE">⏳ Provisoire</option>
                  <option value="DIRECT">⚡ Direct</option>
                  <option value="DEFINITIF">✅ Définitif</option>
                  <option value="ANNULATION">✕ Annulation</option>
                </select>
              </div>
              <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                <label style={labelStyle}>DATE</label>
                <input type="date" value={new Date().toISOString().split('T')[0]} readOnly style={{ ...fieldStyle, fontFamily: 'monospace', textAlign: 'center' }} />
              </div>
              <div>
                <button onClick={handleClear} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e0e0e0', background: 'white', fontSize: 12, fontWeight: 600, color: '#666', cursor: 'pointer', whiteSpace: 'nowrap' }}>EFFACER</button>
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
                  <div style={fieldStyle}>{selectedBeneficiaire?.ncc || ''}</div>
                </div>
              </div>
            </div>

            {/* 💳 Règlement */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('💳', 'Règlement')}
              <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => {
                  const active = form.modeReglement === mode;
                  return (
                    <div key={mode} onClick={() => setForm({ ...form, modeReglement: mode })}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${active ? accent : '#e0e0e0'}`, background: active ? accent + '08' : 'white', cursor: 'pointer' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? accent : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? accent : '#555' }}>{mode}</span>
                    </div>
                  );
                })}
              </div>
              {form.modeReglement === 'VIREMENT' && (
                <div style={{ maxWidth: 420 }}>
                  <label style={labelStyle}>RIB {beneficiaireRibs.length > 1 && '*'}</label>
                  {!selectedBeneficiaire ? (
                    <div style={{ ...fieldStyle, color: '#adb5bd', fontStyle: 'italic' }}>Sélectionnez d'abord un bénéficiaire</div>
                  ) : beneficiaireRibs.length === 0 ? (
                    <div style={{ ...fieldStyle, background: '#fff3e0', color: '#e65100', border: '1.5px solid #ffe0b2' }}>⚠️ Aucun RIB enregistré</div>
                  ) : beneficiaireRibs.length === 1 ? (
                    <div style={{ ...fieldStyle, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {beneficiaireRibs[0].banque && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{beneficiaireRibs[0].banque}</span>}
                      <span>{beneficiaireRibs[0].numero}</span>
                    </div>
                  ) : (
                    <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...styles.input, marginBottom: 0 }}>
                      {beneficiaireRibs.map((rib, index) => <option key={index} value={index}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* 📝 Détails */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('📝', 'Détails de la dépense')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>OBJET *</label>
                  <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })}
                    style={{ ...editFieldStyle, width: '100%', minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} placeholder="Décrire l'objet de la dépense..." />
                </div>
                <div>
                  <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                  <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })}
                    style={{ ...editFieldStyle, width: '100%', minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} placeholder="Lister les pièces jointes..." />
                </div>
              </div>
            </div>

            {/* 💰 Montant et budget */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('💰', 'Montant et budget')}
              {/* Ligne 1 : Montant + Ligne budg + Libellé */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>MONTANT (FCFA) *</label>
                  <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })}
                    style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0"
                    disabled={form.type === 'ANNULATION' && form.opProvisoireId} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label style={labelStyle}>LIGNE BUDG. *</label>
                  <Autocomplete
                    options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: l.code, searchFields: [l.code, l.libelle] }))}
                    value={form.ligneBudgetaire ? { value: form.ligneBudgetaire, label: form.ligneBudgetaire } : null}
                    onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                    placeholder="Code..."
                    isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                    noOptionsMessage="Aucune ligne"
                    accentColor={accent}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LIBELLÉ</label>
                  <div style={{ padding: '10px 14px', background: '#f0f4ff', borderRadius: 8, fontSize: 12, color: '#555' }}>{selectedLigne?.libelle || ''}</div>
                </div>
              </div>
              {/* Ligne 2 : Budget sous col 1+2, TVA sous col 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / 3', background: '#f8faf9', padding: 14, borderRadius: 10, border: '1px solid #e8ece9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
                    <span style={{ fontSize: 11, color: '#6c757d' }}>Dotation</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                    <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. antérieurs</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                    <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. actuel</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#2e7d32' : '#e65100' }}>{getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}</span>
                    <span style={{ fontSize: 11, color: '#6c757d' }}>Engag. cumulés</span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsCumules())}</span>
                    <div style={{ gridColumn: '1 / -1', height: 1, background: '#d0d8d3', margin: '4px 0' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>Disponible</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: getDisponible() >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(getDisponible())}</span>
                  </div>
                  {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                    <div style={{ marginTop: 10, padding: 8, background: '#ffebee', borderRadius: 6, color: '#c62828', fontSize: 11, fontWeight: 600 }}>⚠️ Budget insuffisant</div>
                  )}
                </div>
                <div>
                  {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>TVA RÉCUPÉRABLE *</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {[{ val: true, lbl: 'OUI' }, { val: false, lbl: 'NON' }].map(opt => {
                            const active = form.tvaRecuperable === opt.val;
                            return (
                              <div key={opt.lbl} onClick={() => setForm({ ...form, tvaRecuperable: opt.val })}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${active ? accent : form.tvaRecuperable === null ? '#ffcc8040' : '#e0e0e0'}`, background: active ? accent + '08' : 'white', cursor: 'pointer' }}>
                                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${active ? accent : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />}
                                </div>
                                <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? accent : '#555' }}>{opt.lbl}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {form.tvaRecuperable && (
                        <div>
                          <label style={labelStyle}>MONTANT TVA</label>
                          <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', textAlign: 'right', width: '100%' }} placeholder="0" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* OP Provisoire pour Annulation/Définitif */}
            {['ANNULATION', 'DEFINITIF'].includes(form.type) && (
              <div style={{ marginBottom: 24, padding: 16, background: form.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', borderRadius: 10, border: `1.5px solid ${form.type === 'ANNULATION' ? '#ffcdd2' : '#c8e6c9'}` }}>
                <label style={{ ...labelStyle, marginBottom: 10, color: form.type === 'ANNULATION' ? '#c62828' : '#2e7d32' }}>
                  🔄 N° OP PROVISOIRE À {form.type === 'ANNULATION' ? 'ANNULER' : 'RÉGULARISER'} *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, marginBottom: 4, color: '#6c757d' }}>Saisie manuelle</label>
                    <input type="text" value={form.opProvisoireNumero} onChange={(e) => setForm({ ...form, opProvisoireNumero: e.target.value, opProvisoireId: '' })} style={{ ...styles.input, marginBottom: 0 }} placeholder="Ex: ETAT-2025-0012" />
                  </div>
                  <div style={{ padding: '0 8px', color: '#6c757d', fontSize: 12 }}>ou</div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, marginBottom: 4, color: '#6c757d' }}>Sélectionner un OP existant</label>
                    <Autocomplete
                      options={opProvisoiresDisponibles.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant), op.objet || ''] }))}
                      value={form.opProvisoireId ? opProvisoiresDisponibles.filter(o => o.id === form.opProvisoireId).map(op => ({ value: op.id, label: getOpProvLabel(op) }))[0] || null : null}
                      onChange={(option) => handleSelectOpProvisoire(option?.value || '')}
                      placeholder="🔍 Rechercher par N°, bénéficiaire, montant..."
                      noOptionsMessage={!form.beneficiaireId ? 'Sélectionnez d\'abord un bénéficiaire' : 'Aucun OP Provisoire disponible'}
                      accentColor={form.type === 'ANNULATION' ? '#c62828' : '#2e7d32'}
                    />
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
                    <div style={{ marginTop: 14, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #c8e6c9' }}>
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
                          ) : <div style={{ fontSize: 12, color: '#999' }}>Saisir le montant définitif</div>}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ENREGISTRER - bouton rond */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={handleSave} disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                title="Enregistrer l'OP"
                style={{
                  width: 52, height: 52, borderRadius: '50%', border: 'none',
                  background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? '#bdbdbd' : accent,
                  cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 3px 12px ${accent}44`, transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                {saving ? (
                  <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>...</span>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageNouvelOp;
