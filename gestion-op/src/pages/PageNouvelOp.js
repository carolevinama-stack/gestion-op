import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== PAGE NOUVEL OP ====================
const PageNouvelOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exercices, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeSource, setActiveSource] = useState(sources[0]?.id || null);
  const [form, setForm] = useState({
    type: 'PROVISOIRE',
    beneficiaireId: '',
    ribIndex: 0,
    modeReglement: 'VIREMENT',
    objet: '',
    piecesJustificatives: '',
    montant: '',
    ligneBudgetaire: '',
    montantTVA: '',
    tvaRecuperable: false,
    opProvisoireNumero: '',
    opProvisoireId: ''
  });
  const [saving, setSaving] = useState(false);

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
        tvaRecuperable: op.tvaRecuperable || false,
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

  // OP provisoires pour ANNULATION : même bénéficiaire, pas déjà annulé
  const opProvisoiresAnnulation = ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    (!form.beneficiaireId || op.beneficiaireId === form.beneficiaireId) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION')
  );

  // OP provisoires pour DEFINITIF : pas déjà régularisé (pas de définitif rattaché)
  const opProvisoiresDefinitif = ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'DEFINITIF')
  );

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
    const nextNum = opsSource.length + 1;
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
    setForm({ type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT', objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '', montantTVA: '', tvaRecuperable: false, opProvisoireNumero: '', opProvisoireId: '' });
  };

  const handleSave = async () => {
    if (!activeSource) { alert('Veuillez sélectionner une source de financement'); return; }
    if (!exerciceActif) { alert('Aucun exercice actif.'); return; }
    if (!form.beneficiaireId) { alert('Veuillez sélectionner un bénéficiaire'); return; }
    if (!form.ligneBudgetaire) { alert('Veuillez sélectionner une ligne budgétaire'); return; }
    if (!form.objet.trim()) { alert('Veuillez saisir l\'objet de la dépense'); return; }
    if (!form.montant || parseFloat(form.montant) === 0) { alert('Veuillez saisir un montant valide'); return; }
    if (['ANNULATION', 'DEFINITIF'].includes(form.type) && !form.opProvisoireId && !form.opProvisoireNumero.trim()) {
      alert(`Veuillez renseigner le N° d'OP Provisoire à ${form.type === 'ANNULATION' ? 'annuler' : 'régulariser'}`); return;
    }
    if (form.type !== 'ANNULATION' && getDisponible() < 0) {
      alert(`❌ Budget insuffisant (${formatMontant(getDisponible())} FCFA).`); return;
    }

    setSaving(true);
    try {
      const sigleProjet = projet?.sigle || 'PROJET';
      const sigleSource = currentSourceObj?.sigle || 'OP';
      const annee = exerciceActif?.annee || new Date().getFullYear();
      
      const allOpsSnap = await getDocs(query(collection(db, 'ops'), where('sourceId', '==', activeSource), where('exerciceId', '==', exerciceActif.id)));
      const allNumerosExistants = allOpsSnap.docs.map(d => d.data().numero);
      
      let nextNum = allOpsSnap.size + 1;
      let numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
      let tentatives = 0;
      while (allNumerosExistants.includes(numero) && tentatives < 50) { nextNum++; numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`; tentatives++; }
      
      const numeroInitial = genererNumero();
      if (numero !== numeroInitial) alert(`⚠️ Le numéro ${numeroInitial} déjà utilisé. Nouveau numéro : ${numero}`);
      
      const opData = {
        numero, type: form.type, sourceId: activeSource, exerciceId: exerciceActif.id,
        beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: selectedRib || null, ligneBudgetaire: form.ligneBudgetaire,
        objet: form.objet.trim(), piecesJustificatives: form.piecesJustificatives.trim(),
        montant: parseFloat(form.montant), montantTVA: form.montantTVA ? parseFloat(form.montantTVA) : null,
        tvaRecuperable: form.tvaRecuperable, statut: 'CREE',
        opProvisoireId: form.opProvisoireId || null, opProvisoireNumero: form.opProvisoireNumero || null,
        dateCreation: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'ops'), opData);
      
      const doublonSnap = await getDocs(query(collection(db, 'ops'), where('numero', '==', numero)));
      if (doublonSnap.size > 1) {
        const allOpsSnap2 = await getDocs(query(collection(db, 'ops'), where('sourceId', '==', activeSource), where('exerciceId', '==', exerciceActif.id)));
        const allNums2 = allOpsSnap2.docs.map(d => d.data().numero);
        let fixNum = allOpsSnap2.size + 1;
        let fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
        while (allNums2.includes(fixNumero)) { fixNum++; fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`; }
        await updateDoc(doc(db, 'ops', docRef.id), { numero: fixNumero, updatedAt: new Date().toISOString() });
        opData.numero = fixNumero;
        alert(`⚠️ Doublon corrigé. Nouveau numéro : ${fixNumero}`);
      }
      
      setOps([...ops, { id: docRef.id, ...opData }]);
      alert(`✅ OP ${opData.numero} créé avec succès !`);
      handleClear();
      setCurrentPage('ops');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de l\'OP');
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '20px 24px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>FORMULAIRE OP {currentSourceObj?.sigle || ''}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {sources.map(source => (
            <button key={source.id} onClick={() => setActiveSource(source.id)}
              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: activeSource === source.id ? 'white' : 'rgba(255,255,255,0.2)', color: activeSource === source.id ? (source.couleur || '#0f4c3a') : 'white', fontWeight: 600, cursor: 'pointer' }}>
              {source.sigle || source.nom}
            </button>
          ))}
        </div>
      </div>

      {!exerciceActif ? (
        <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#e65100', fontWeight: 600 }}>Aucun exercice actif</p>
          <p style={{ color: '#6c757d' }}>Veuillez définir un exercice actif dans les <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span></p>
        </div>
      ) : (
        <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', padding: 0 }}>
          <div style={{ padding: 24 }}>
            {/* N°OP + EFFACER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 20 }}>
              <div style={{ width: 250 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N° OP</label>
                <input type="text" value={genererNumero()} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontWeight: 700, fontFamily: 'monospace', fontSize: 16 }} />
              </div>
              <button onClick={handleClear} style={{ ...styles.buttonSecondary, padding: '12px 24px' }}>EFFACER</button>
            </div>

            {/* Type d'OP */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>TYPE D'OP *</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { value: 'PROVISOIRE', label: 'Provisoire', color: '#ff9800' },
                  { value: 'DIRECT', label: 'Direct', color: '#2196f3' },
                  { value: 'DEFINITIF', label: 'Définitif', color: '#4caf50' },
                  { value: 'ANNULATION', label: 'Annulation', color: '#f44336' }
                ].map(type => (
                  <button key={type.value} type="button"
                    onClick={() => setForm({ ...form, type: type.value, opProvisoireId: '', opProvisoireNumero: '' })}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: form.type === type.value ? type.color : '#f0f0f0', color: form.type === type.value ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bénéficiaire + NCC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>BÉNÉFICIAIRE *</label>
                <Autocomplete
                  options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || '', ...(b.ribs || []).map(r => r.numero), ...(b.ribs || []).map(r => r.banque), b.rib || ''] }))}
                  value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null}
                  onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                  placeholder="🔍 Rechercher par nom ou NCC..."
                  isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                  noOptionsMessage="Aucun bénéficiaire trouvé"
                  accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N°CC</label>
                <input type="text" value={selectedBeneficiaire?.ncc || ''} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
              </div>
            </div>

            {/* Mode de règlement */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>MODE DE RÈGLEMENT</label>
              <div style={{ display: 'flex', gap: 30 }}>
                {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => (
                  <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="radio" name="modeReglement" checked={form.modeReglement === mode} onChange={() => setForm({ ...form, modeReglement: mode })} style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14 }}>{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* RIB */}
            {form.modeReglement === 'VIREMENT' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>RÉFÉRENCES BANCAIRES (RIB) {beneficiaireRibs.length > 1 && '*'}</label>
                {!selectedBeneficiaire ? (
                  <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', color: '#adb5bd', fontStyle: 'italic' }}>Sélectionnez d'abord un bénéficiaire</div>
                ) : beneficiaireRibs.length === 0 ? (
                  <div style={{ ...styles.input, marginBottom: 0, background: '#fff3e0', color: '#e65100' }}>⚠️ Aucun RIB enregistré</div>
                ) : beneficiaireRibs.length === 1 ? (
                  <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {beneficiaireRibs[0].banque && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{beneficiaireRibs[0].banque}</span>}
                    <span>{beneficiaireRibs[0].numero}</span>
                  </div>
                ) : (
                  <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...styles.input, marginBottom: 0 }}>
                    {beneficiaireRibs.map((rib, index) => <option key={index} value={index}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* Objet */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>OBJET DE LA DÉPENSE *</label>
              <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} style={{ ...styles.input, marginBottom: 0, minHeight: 80, resize: 'vertical', background: '#fff0f0' }} placeholder="Décrire l'objet de la dépense..." />
            </div>

            {/* Pièces justificatives */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>PIÈCES JUSTIFICATIVES</label>
              <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })} style={{ ...styles.input, marginBottom: 0, minHeight: 60, resize: 'vertical', background: '#fff0f0' }} placeholder="Lister les pièces jointes..." />
            </div>

            {/* Montant + Ligne budgétaire */}
            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT (FCFA) *</label>
                <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })} style={{ ...styles.input, marginBottom: 0, background: '#fff0f0', fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0" disabled={form.type === 'ANNULATION' && form.opProvisoireId} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>LIGNE BUDGÉTAIRE *</label>
                <Autocomplete
                  options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}`, searchFields: [l.code, l.libelle] }))}
                  value={form.ligneBudgetaire ? (currentBudget?.lignes || []).filter(x => x.code === form.ligneBudgetaire).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}` }))[0] || null : null}
                  onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                  placeholder="🔍 Rechercher par code ou libellé..."
                  isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                  noOptionsMessage="Aucune ligne trouvée"
                  accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                />
              </div>
            </div>

            {/* Budget + Date + TVA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Dotation budgétaire</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements antérieurs</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Engagement actuel</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#2e7d32' : '#e65100' }}>{getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}</span>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements cumulés</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsCumules())}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Disponible budgétaire</span>
                  <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: getDisponible() >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(getDisponible())}</span>
                </div>
                {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                  <div style={{ marginTop: 12, padding: 8, background: '#ffebee', borderRadius: 4, color: '#c62828', fontSize: 12, fontWeight: 600 }}>⚠️ Budget insuffisant - OP non validable</div>
                )}
              </div>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>DATE</label>
                  <input type="date" value={new Date().toISOString().split('T')[0]} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
                </div>
                {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                      <div style={{ display: 'flex', gap: 20 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={form.tvaRecuperable === true} onChange={() => setForm({ ...form, tvaRecuperable: true })} /><span>OUI</span></label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={form.tvaRecuperable === false} onChange={() => setForm({ ...form, tvaRecuperable: false })} /><span>NON</span></label>
                      </div>
                    </div>
                    {form.tvaRecuperable && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT TVA</label>
                        <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...styles.input, marginBottom: 0, fontFamily: 'monospace', textAlign: 'right' }} placeholder="0" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* OP Provisoire pour Annulation/Définitif */}
            {['ANNULATION', 'DEFINITIF'].includes(form.type) && (
              <div style={{ marginBottom: 20, padding: 16, background: form.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>N° OP PROVISOIRE À {form.type === 'ANNULATION' ? 'ANNULER' : 'RÉGULARISER'} *</label>
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
                      noOptionsMessage="Aucun OP Provisoire disponible"
                      accentColor={form.type === 'ANNULATION' ? '#c62828' : '#2e7d32'}
                    />
                  </div>
                </div>
                {/* BLOC RÉCAPITULATIF PAIEMENT (DEFINITIF uniquement) */}
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

            {/* ENREGISTRER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
              <button onClick={handleSave} disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                style={{ ...styles.button, padding: '14px 40px', fontSize: 16, background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? '#bdbdbd' : (currentSourceObj?.couleur || '#0f4c3a'), cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Enregistrement...' : 'ENREGISTRER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageNouvelOp;
