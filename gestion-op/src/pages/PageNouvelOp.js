import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, runTransaction } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== TOAST SYSTEM ====================
const TOAST_STYLES = {
  success: { bg: 'linear-gradient(135deg, #f0faf5 0%, #fff 100%)', iconBg: '#e8f5e9', iconBorder: '#D4722A20', titleColor: '#2e7d32' },
  error: { bg: 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)', iconBg: '#ffebee', iconBorder: '#C43E3E20', titleColor: '#C43E3E' },
  warning: { bg: 'linear-gradient(135deg, #fffbf0 0%, #fff 100%)', iconBg: '#fff3e0', iconBorder: '#ff980020', titleColor: '#C5961F' },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C43E3E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5961F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
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
      minWidth: 320, maxWidth: 420, pointerEvents: 'auto',
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
        <div style={{ fontSize: 14, fontWeight: 700, color: s.titleColor, marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
};

// ==================== PAGE NOUVEL OP ====================
const typeColors = { PROVISOIRE: '#ff9800', DIRECT: '#D4722A', DEFINITIF: '#D4722A', ANNULATION: '#C43E3E' };
const PageNouvelOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exercices, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage, userProfile } = useAppContext();
  const defaultForm = { type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT', objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '', montantTVA: '', tvaRecuperable: null, opProvisoireNumero: '', opProvisoireId: '', opProvisoireIds: [], opProvisoireManuel: '' };

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
        opProvisoireId: '',
        opProvisoireIds: [],
        opProvisoireManuel: ''
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
        !['REJETE', 'ANNULE', 'TRAITE'].includes(op.statut)
      )
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const getEngagementActuel = () => {
    return parseFloat(form.montant) || 0;
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
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => (o.opProvisoireId === op.id || (o.opProvisoireIds || []).includes(op.id)) && o.type === 'DEFINITIF')
  ) : [];


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

  // Génération atomique via transaction Firestore (anti-doublon simultané)
  const genererNumeroTransaction = async () => {
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSource = currentSourceObj?.sigle || 'OP';
    const annee = exerciceActif?.annee || new Date().getFullYear();
    const compteurId = `OP_${activeSource}_${exerciceActif?.id}`;
    const compteurRef = doc(db, 'compteurs', compteurId);

    // Si le compteur n'existe pas encore, initialiser depuis le max existant
    let initCount = 0;
    const snapCheck = await getDoc(compteurRef);
    if (!snapCheck.exists()) {
      const allOpsSnap = await getDocs(query(
        collection(db, 'ops'),
        where('sourceId', '==', activeSource),
        where('exerciceId', '==', exerciceActif.id)
      ));
      allOpsSnap.docs.forEach(d => {
        const match = (d.data().numero || '').match(/N°(\d+)\//);
        if (match) initCount = Math.max(initCount, parseInt(match[1]));
      });
    }

    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(compteurRef);
      const currentCount = snap.exists() ? (snap.data().count || 0) : initCount;
      const nextNum = currentCount + 1;
      tx.set(compteurRef, { count: nextNum, type: 'OP', sourceId: activeSource, exerciceId: exerciceActif?.id, updatedAt: new Date().toISOString() });
      return `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
    });
  };

  // ANNULATION : sélection unique d'un OP provisoire
  const handleSelectOpProvisoire = (opId) => {
    if (!opId) { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '', opProvisoireManuel: '' }); return; }
    const op = ops.find(o => o.id === opId);
    if (op) {
      setForm({
        ...form, opProvisoireId: opId, opProvisoireNumero: op.numero, opProvisoireManuel: '',
        beneficiaireId: op.beneficiaireId, ligneBudgetaire: op.ligneBudgetaire,
        modeReglement: op.modeReglement || 'VIREMENT',
        montant: String(-(op.montant || 0)),
        objet: `Annulation OP ${op.numero} - ${op.objet || ''}`,
        piecesJustificatives: `OP ${op.numero}`
      });
    }
  };

  // DEFINITIF : sélection multiple d'OP provisoires
  const handleSelectOpProvisoiresMulti = (opId, checked) => {
    const currentIds = form.opProvisoireIds || [];
    const newIds = checked ? [...currentIds, opId] : currentIds.filter(id => id !== opId);
    const selectedOps = newIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const numeros = selectedOps.map(o => o.numero).join(', ');
    const libelles = [...new Set(selectedOps.map(o => o.objet).filter(Boolean))].join(' / ');
    
    const updates = { ...form, opProvisoireIds: newIds, opProvisoireId: newIds[0] || '', opProvisoireManuel: '' };
    if (newIds.length > 0) {
      updates.objet = `Régularisation OP ${numeros} - ${libelles}`;
    }
    if (selectedOps.length === 1) {
      updates.beneficiaireId = selectedOps[0].beneficiaireId;
      updates.ligneBudgetaire = selectedOps[0].ligneBudgetaire;
      updates.modeReglement = selectedOps[0].modeReglement || 'VIREMENT';
    }
    setForm(updates);
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
    if (['DIRECT', 'DEFINITIF'].includes(form.type) && form.tvaRecuperable === true && (!form.montantTVA || parseFloat(form.montantTVA) === 0)) {
      showToast('error', 'Champ obligatoire', 'TVA récupérable : veuillez saisir le montant de la TVA'); return;
    }
    if (form.type === 'ANNULATION' && !form.opProvisoireId && !form.opProvisoireManuel.trim()) {
      showToast('error', 'Champ obligatoire', 'Veuillez sélectionner ou saisir le N° d\'OP Provisoire à annuler'); return;
    }
    if (form.type === 'DEFINITIF' && (form.opProvisoireIds || []).length === 0 && !form.opProvisoireManuel.trim()) {
      showToast('error', 'Champ obligatoire', 'Veuillez sélectionner ou saisir le(s) N° d\'OP Provisoire à régulariser'); return;
    }
    if (form.type !== 'ANNULATION' && getDisponible() < 0) {
      showToast('error', 'Budget insuffisant', `Disponible : ${formatMontant(getDisponible())} FCFA`); return;
    }

    setSaving(true);
    try {
      // === Vérification temps réel du budget depuis Firestore ===
      if (form.type !== 'ANNULATION') {
        const opsSnap = await getDocs(query(
          collection(db, 'ops'),
          where('sourceId', '==', activeSource),
          where('exerciceId', '==', exerciceActif.id)
        ));
        const engagementsReels = opsSnap.docs
          .map(d => d.data())
          .filter(op =>
            op.ligneBudgetaire === form.ligneBudgetaire &&
            ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
            !['REJETE', 'ANNULE', 'TRAITE'].includes(op.statut)
          )
          .reduce((sum, op) => sum + (op.montant || 0), 0);

        let engagementActuel = parseFloat(form.montant) || 0;

        const dotation = getDotation();
        const disponibleReel = dotation - engagementsReels - engagementActuel;

        if (disponibleReel < 0) {
          showToast('error', 'Budget insuffisant (vérification temps réel)', `Disponible réel : ${formatMontant(dotation - engagementsReels)} FCFA. Votre montant dépasse de ${formatMontant(Math.abs(disponibleReel))} FCFA.`);
          setSaving(false);
          return;
        }
      }

      // Avertissement si OP provisoire saisi manuellement (hors base)
      if (['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireManuel.trim() && !form.opProvisoireId && (form.opProvisoireIds || []).length === 0) {
        showToast('warning', 'OP Provisoire hors système', `Le N° ${form.opProvisoireManuel} a été saisi manuellement. Les engagements ne seront pas ajustés automatiquement.`);
      }

      // Numéro généré via transaction atomique (anti-doublon simultané)
      const numero = await genererNumeroTransaction();
      
      // Construire les champs OP provisoire selon le type
      let opProvFields = {};
      if (form.type === 'ANNULATION') {
        opProvFields.opProvisoireId = form.opProvisoireId || null;
        opProvFields.opProvisoireNumero = form.opProvisoireId 
          ? form.opProvisoireNumero 
          : form.opProvisoireManuel.trim() || null;
      } else if (form.type === 'DEFINITIF') {
        const ids = form.opProvisoireIds || [];
        const numeros = ids.map(id => ops.find(o => o.id === id)?.numero || '').filter(Boolean);
        opProvFields.opProvisoireId = ids[0] || null;
        opProvFields.opProvisoireIds = ids.length > 0 ? ids : null;
        opProvFields.opProvisoireNumero = ids.length > 0 
          ? numeros.join(', ') 
          : form.opProvisoireManuel.trim() || null;
        opProvFields.opProvisoireNumeros = numeros.length > 0 ? numeros : null;
      }

      const opData = {
        numero, type: form.type, sourceId: activeSource, exerciceId: exerciceActif.id,
        beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: selectedRib || null, ligneBudgetaire: form.ligneBudgetaire,
        objet: form.objet.trim(), piecesJustificatives: form.piecesJustificatives.trim(),
        montant: parseFloat(form.montant), montantTVA: form.montantTVA ? parseFloat(form.montantTVA) : null,
        tvaRecuperable: form.tvaRecuperable === true, statut: 'EN_COURS',
        ...opProvFields,
        dateCreation: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        creePar: userProfile?.nom || userProfile?.email || 'Inconnu'
      };

      const docRef = await addDoc(collection(db, 'ops'), opData);
      
      // Vérification post-création : s'assurer que le budget n'a pas été dépassé entre-temps
      if (form.type !== 'ANNULATION') {
        const postOpsSnap = await getDocs(query(
          collection(db, 'ops'),
          where('sourceId', '==', activeSource),
          where('exerciceId', '==', exerciceActif.id)
        ));
        const engagementTotal = postOpsSnap.docs
          .map(d => d.data())
          .filter(op =>
            op.ligneBudgetaire === form.ligneBudgetaire &&
            ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
            !['REJETE', 'ANNULE', 'TRAITE'].includes(op.statut)
          )
          .reduce((sum, op) => sum + (op.montant || 0), 0);
        const dotation = getDotation();
        if (engagementTotal > dotation) {
          showToast('warning', 'Attention : dépassement budgétaire', `Le budget de cette ligne est dépassé de ${formatMontant(engagementTotal - dotation)} FCFA suite à des saisies simultanées.`);
        }
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
  const accent = currentSourceObj?.couleur || '#2E9940';
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#6c757d', letterSpacing: 0.3 };
  const fieldStyle = { padding: '12px 14px', background: '#f8f9fa', borderRadius: 8, fontSize: 14, border: '1.5px solid #e0e0e0', width: '100%', boxSizing: 'border-box', height: 44 };
  const editFieldStyle = { ...fieldStyle, background: '#fffde7', border: `1.5px solid ${accent}40` };
  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: 13, fontWeight: 700, color: accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
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
      {/* Toasts empilés en haut à droite */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <ToastNotif key={t.uid} toast={t} onDone={() => removeToast(t.uid)} />
        ))}
      </div>

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
          <div style={{ fontSize: 14, color: '#C43E3E', fontWeight: 700 }}>Attention</div>
          <p style={{ color: '#C5961F', fontWeight: 600 }}>Aucun exercice actif</p>
          <p style={{ color: '#6c757d' }}>Veuillez définir un exercice actif dans les <span style={{ color: accent, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span></p>
        </div>
      ) : (
        <div style={{ maxWidth: 1020, margin: '0 auto', background: 'white', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${accent}` }}>
          <div style={{ padding: '24px 28px 20px' }}>

            {/* ===== LIGNE 1 : N°OP + TYPE + DATE + (OP PROV) + EFFACER ===== */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 1 auto' }}>
                <label style={labelStyle}>N° OP (auto)</label>
                <span style={{ padding: '10px 12px', background: '#f8f9fa', border: '1.5px solid #e0e0e0', borderRadius: 8, fontFamily: 'monospace', fontWeight: 800, fontSize: 13, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', height: 44 }}>{genererNumero()}</span>
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label style={labelStyle}>TYPE *</label>
                <select value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value, opProvisoireId: '', opProvisoireNumero: '', opProvisoireIds: [], opProvisoireManuel: '', tvaRecuperable: ['DIRECT', 'DEFINITIF'].includes(e.target.value) ? null : form.tvaRecuperable })}
                  style={{ padding: '10px 10px', border: `1.5px solid ${(typeColors[form.type] || '#999')}40`, borderRadius: 8, fontWeight: 700, fontSize: 13, color: typeColors[form.type] || '#999', cursor: 'pointer', background: '#fff', height: 44 }}>
                  <option value="PROVISOIRE">Provisoire</option>
                  <option value="DIRECT">Direct</option>
                  <option value="DEFINITIF">Définitif</option>
                  <option value="ANNULATION">✕ Annulation</option>
                </select>
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <label style={labelStyle}>DATE</label>
                <span style={{ padding: '10px 12px', background: '#f8f9fa', border: '1.5px solid #e0e0e0', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, display: 'inline-flex', alignItems: 'center', height: 44 }}>{new Date().toISOString().split('T')[0]}</span>
              </div>

              {/* OP Provisoire (ANNULATION = single select, DEFINITIF = checkboxes multi) */}
              {form.type === 'ANNULATION' && (
                <div style={{ flex: '1 1 auto', minWidth: 280 }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 3, color: '#C43E3E' }}>OP PROV. À ANNULER *</label>
                  <Autocomplete
                    options={opProvisoiresAnnulation.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant)] }))}
                    value={form.opProvisoireId ? opProvisoiresAnnulation.filter(o => o.id === form.opProvisoireId).map(op => ({ value: op.id, label: getOpProvLabel(op) }))[0] || null : null}
                    onChange={(option) => {
                      if (option?.value) { handleSelectOpProvisoire(option.value); }
                      else { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '' }); }
                    }}
                    placeholder="Sélectionner un OP provisoire..."
                    noOptionsMessage="Aucun OP provisoire disponible"
                    accentColor="#C43E3E"
                  />
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Hors système :</div>
                    <input type="text" value={form.opProvisoireManuel}
                      onChange={(e) => setForm({ ...form, opProvisoireManuel: e.target.value, opProvisoireId: '', opProvisoireNumero: '' })}
                      placeholder="Saisir N° manuellement..."
                      style={{ padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1.5px solid #e0e0e0', width: '100%', boxSizing: 'border-box', background: '#fffde7' }}
                    />
                  </div>
                </div>
              )}
              {form.type === 'DEFINITIF' && (
                <div style={{ flex: '1 1 auto', minWidth: 320 }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 3, color: '#2e7d32' }}>OP PROV. À RÉGULARISER *</label>
                  <Autocomplete
                    isMulti
                    options={opProvisoiresDefinitif.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant)] }))}
                    value={(form.opProvisoireIds || []).map(id => {
                      const op = ops.find(o => o.id === id);
                      return op ? { value: op.id, label: getOpProvLabel(op) } : null;
                    }).filter(Boolean)}
                    onChange={(selected) => {
                      if (!selected || selected.length === 0) {
                        handleSelectOpProvisoiresMulti(null, false);
                      } else {
                        const newIds = selected.map(s => s.value);
                        const removedId = (form.opProvisoireIds || []).find(id => !newIds.includes(id));
                        const addedId = newIds.find(id => !(form.opProvisoireIds || []).includes(id));
                        if (addedId) handleSelectOpProvisoiresMulti(addedId, true);
                        else if (removedId) handleSelectOpProvisoiresMulti(removedId, false);
                      }
                    }}
                    placeholder={form.beneficiaireId ? "Sélectionner un ou plusieurs OP provisoires..." : "Sélectionner d'abord un bénéficiaire"}
                    isDisabled={!form.beneficiaireId}
                    noOptionsMessage="Aucun OP provisoire disponible"
                    accentColor="#2e7d32"
                  />
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 3 }}>Hors système :</div>
                    <input type="text" value={form.opProvisoireManuel}
                      onChange={(e) => setForm({ ...form, opProvisoireManuel: e.target.value, opProvisoireIds: [], opProvisoireId: '' })}
                      placeholder="Saisir N° manuellement..."
                      style={{ padding: '8px 12px', fontSize: 12, borderRadius: 6, border: '1.5px solid #e0e0e0', width: '100%', boxSizing: 'border-box', background: '#fffde7' }}
                    />
                  </div>
                </div>
              )}

              {/* EFFACER — toujours en dernier */}
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={handleClear} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#C43E3E', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', whiteSpace: 'nowrap' }}>EFFACER</button>
              </div>
            </div>

            <div style={{ height: 1, background: '#f0f0f0', marginBottom: 20 }} />

            {/* ===== BÉNÉFICIAIRE + NCC + RÈGLEMENT — grille 2fr|1.5fr|3fr ===== */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('', 'Bénéficiaire & Règlement')}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, alignItems: 'end' }}>
                {/* NOM — col 1+2 = même largeur que OBJET */}
                <div style={{ gridColumn: '1 / 3' }}>
                  <label style={labelStyle}>NOM / RAISON SOCIALE *</label>
                  <Autocomplete
                    options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || '', ...(b.ribs || []).map(r => r.numero), ...(b.ribs || []).map(r => r.banque), b.rib || ''] }))}
                    value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null}
                    onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                    placeholder="Rechercher par nom ou NCC..."
                    isDisabled={form.type === 'ANNULATION' && !!form.opProvisoireId}
                    noOptionsMessage="Aucun bénéficiaire trouvé"
                    accentColor={accent}
                  />
                </div>
                {/* NCC + Règlement — col 3 */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>N°CC</label>
                    <div style={{ ...fieldStyle, height: 44, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', minWidth: 100 }}>{selectedBeneficiaire?.ncc || ''}</div>
                  </div>
                  <div>
                    <label style={labelStyle}>RÈGLEMENT</label>
                    <div style={{ display: 'flex', gap: 4, height: 44, alignItems: 'center' }}>
                      {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => {
                        const active = form.modeReglement === mode;
                        return (
                          <div key={mode} onClick={() => setForm({ ...form, modeReglement: mode })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', height: 44, borderRadius: 8, border: `1.5px solid ${active ? accent : '#e0e0e0'}`, background: active ? accent + '08' : 'white', cursor: 'pointer', boxSizing: 'border-box' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${active ? accent : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? accent : '#555' }}>{mode}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {/* RIB en dessous si VIREMENT — même largeur que OBJET */}
              {form.modeReglement === 'VIREMENT' && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>RIB</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                    <div style={{ gridColumn: '1 / 3' }}>
                      {!selectedBeneficiaire ? (
                        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', background: '#E8F5E9', border: '1.5px solid #c8e6c9', color: '#adb5bd', fontStyle: 'italic', fontSize: 13 }}>Sélectionnez un bénéficiaire</div>
                      ) : beneficiaireRibs.length === 0 ? (
                        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', background: '#fff3e0', color: '#C5961F', border: '1.5px solid #ffe0b2', fontSize: 13 }}>Aucun RIB</div>
                      ) : beneficiaireRibs.length === 1 ? (
                        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'monospace', background: '#E8F5E9', border: '1.5px solid #c8e6c9' }}>
                          {beneficiaireRibs[0].banque && <span style={{ background: '#E8F5E9', color: '#2E9940', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>{beneficiaireRibs[0].banque}</span>}
                          <span style={{ fontSize: 13 }}>{beneficiaireRibs[0].numero}</span>
                        </div>
                      ) : (
                        <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...fieldStyle, cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 }}>
                          {beneficiaireRibs.map((rib, index) => <option key={index} value={index}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Détails */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('', 'Détails de la dépense')}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / 3' }}>
                  <label style={labelStyle}>OBJET *</label>
                  <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })}
                    style={{ ...editFieldStyle, height: 'auto', minHeight: 130, resize: 'vertical', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} placeholder="Décrire l'objet de la dépense..." />
                </div>
                <div>
                  <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                  <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })}
                    style={{ ...editFieldStyle, height: 'auto', minHeight: 130, resize: 'vertical', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} placeholder="Lister les pièces jointes..." />
                </div>
              </div>
            </div>

            {/* Montant et budget */}
            <div style={{ marginBottom: 24 }}>
              {sectionTitle('', 'Montant et budget')}
              {/* Ligne 1 : Montant + Ligne budg + Libellé */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>MONTANT (FCFA) *</label>
                  <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })}
                    style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 18, textAlign: 'right' }} placeholder="0"
                    disabled={form.type === 'ANNULATION' && form.opProvisoireId} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <label style={labelStyle}>LIGNE BUDG. *</label>
                  <Autocomplete
                    options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: l.code, searchFields: [l.code, l.libelle] }))}
                    value={form.ligneBudgetaire ? { value: form.ligneBudgetaire, label: form.ligneBudgetaire } : null}
                    onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                    placeholder="Code..."
                    isDisabled={form.type === 'ANNULATION' && !!form.opProvisoireId}
                    noOptionsMessage="Aucune ligne"
                    accentColor={accent}
                  />
                </div>
                <div>
                  <label style={labelStyle}>LIBELLÉ</label>
                  <div style={{ padding: '12px 14px', background: '#E8F5E9', borderRadius: 8, fontSize: 14, color: '#555', height: 44, display: 'flex', alignItems: 'center', border: '1.5px solid #c8e6c9' }}>{selectedLigne?.libelle || ''}</div>
                </div>
              </div>
              {/* Ligne 2 : Budget sous col 1+2, TVA sous col 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                <div style={{ gridColumn: '1 / 3', background: '#f8faf9', padding: 18, borderRadius: 10, border: '1px solid #e8ece9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 16px' }}>
                    <span style={{ fontSize: 13, color: '#6c757d' }}>Dotation</span>
                    <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                    <span style={{ fontSize: 13, color: '#6c757d' }}>Engag. antérieurs</span>
                    <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                    <span style={{ fontSize: 13, color: '#6c757d' }}>Engag. actuel</span>
                    <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#2e7d32' : '#C5961F' }}>{getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}</span>
                    <span style={{ fontSize: 13, color: '#6c757d' }}>Engag. cumulés</span>
                    <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsCumules())}</span>
                    <div style={{ gridColumn: '1 / -1', height: 1, background: '#d0d8d3', margin: '6px 0' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>Disponible</span>
                    <span style={{ fontSize: 16, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: getDisponible() >= 0 ? '#2e7d32' : '#C43E3E' }}>{formatMontant(getDisponible())}</span>
                  </div>
                  {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                    <div style={{ marginTop: 10, padding: 8, background: '#ffebee', borderRadius: 6, color: '#C43E3E', fontSize: 11, fontWeight: 600 }}>Budget insuffisant</div>
                  )}
                </div>
                <div>
                  {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                    <div>
                      <label style={labelStyle}>TVA RÉCUPÉRABLE *</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {[{ val: true, lbl: 'OUI' }, { val: false, lbl: 'NON' }].map(opt => {
                          const active = form.tvaRecuperable === opt.val;
                          return (
                            <div key={opt.lbl} onClick={() => setForm({ ...form, tvaRecuperable: opt.val })}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: `1.5px solid ${active ? accent : form.tvaRecuperable === null ? '#ffcc8040' : '#e0e0e0'}`, background: active ? accent + '08' : 'white', cursor: 'pointer' }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${active ? accent : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                              </div>
                              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? accent : '#555' }}>{opt.lbl}</span>
                            </div>
                          );
                        })}
                        {form.tvaRecuperable && (
                          <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 11, textAlign: 'right', width: 90, padding: '4px 8px' }} placeholder="0" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Récap paiement DEFINITIF — compact */}
            {form.type === 'DEFINITIF' && (form.opProvisoireIds || []).length > 0 && (() => {
              const selectedProvs = (form.opProvisoireIds || []).map(id => ops.find(o => o.id === id)).filter(Boolean);
              if (selectedProvs.length === 0) return null;
              const totalPaye = selectedProvs.reduce((sum, op) => sum + Number(op.montantPaye || op.montant || 0), 0);
              const mtDef = parseFloat(form.montant) || 0;
              const ecart = totalPaye - mtDef;
              return (
                <div style={{ marginBottom: 24, padding: 12, background: '#e8f5e9', borderRadius: 8, border: '1px solid #c8e6c9' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: '#2e7d32' }}>
                    Récapitulatif — {selectedProvs.length} OP provisoire{selectedProvs.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#6c757d', marginBottom: 4 }}>Total payé (provisoire{selectedProvs.length > 1 ? 's' : ''})</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#D4722A' }}>{formatMontant(totalPaye)} F</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#6c757d', marginBottom: 4 }}>Montant définitif</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{mtDef > 0 ? formatMontant(mtDef) + ' F' : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#6c757d', marginBottom: 4 }}>Écart</div>
                      {mtDef > 0 ? (
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: ecart > 0 ? '#C43E3E' : ecart < 0 ? '#C5961F' : '#2e7d32' }}>
                          {ecart > 0 ? '+' + formatMontant(ecart) + ' F' : ecart < 0 ? formatMontant(ecart) + ' F' : '0 F'}
                          <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>
                            {ecart > 0 ? 'Trop perçu → reversement' : ecart < 0 ? 'Complément à payer' : 'Aucun écart'}
                          </div>
                        </div>
                      ) : <div style={{ fontSize: 12, color: '#999' }}>Saisir le montant définitif</div>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ENREGISTRER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 20, borderTop: '1px solid #f0f0f0' }}>
              <button onClick={handleSave} disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                style={{
                  padding: '14px 28px', borderRadius: 10, border: 'none',
                  background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? '#bdbdbd' : accent,
                  cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: `0 3px 12px ${accent}44`, transition: 'all 0.2s',
                  color: 'white', fontSize: 15, fontWeight: 700
                }}>
                {saving ? 'Enregistrement...' : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Enregistrer l'OP
                  </>
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
