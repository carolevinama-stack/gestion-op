import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== PAGE NOUVEL OP ====================
const PageNouvelOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
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
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultSearch, setConsultSearch] = useState('');
  const [isConsultMode, setIsConsultMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // Mode modification d'un OP existant
  const [consultedOp, setConsultedOp] = useState(null); // L'OP en consultation

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);

  // Charger un OP en mode consultation
  const loadOpForConsult = (op) => {
    if (!op) return;
    setConsultedOp(op);
    setIsConsultMode(true);
    // Changer la source active
    if (op.sourceId) setActiveSource(op.sourceId);
    // Trouver l'index du RIB
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ribs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    const ribIndex = ribs.findIndex(r => r.numero === (typeof op.rib === 'object' ? op.rib?.numero : op.rib)) || 0;
    // Remplir le formulaire
    setForm({
      type: op.type || 'PROVISOIRE',
      beneficiaireId: op.beneficiaireId || '',
      ribIndex: ribIndex >= 0 ? ribIndex : 0,
      modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '',
      piecesJustificatives: op.piecesJustificatives || '',
      montant: String(op.montant || ''),
      ligneBudgetaire: op.ligneBudgetaire || '',
      montantTVA: String(op.montantTVA || ''),
      tvaRecuperable: op.tvaRecuperable || false,
      opProvisoireNumero: op.opProvisoireNumero || '',
      opProvisoireId: op.opProvisoireId || ''
    });
  };

  // Quitter le mode consultation
  const exitConsultMode = () => {
    setIsConsultMode(false);
    setIsEditMode(false);
    setConsultedOp(null);
    if (setConsultOpData) setConsultOpData(null);
    handleClear();
  };

  // Si on vient de Liste OP avec un consultOpData - se déclenche au montage
  useEffect(() => {
    if (consultOpData) {
      if (consultOpData._duplicate) {
        // Mode duplication : pré-remplir le formulaire SANS mode consultation
        const op = consultOpData;
        if (op.sourceId) setActiveSource(op.sourceId);
        setForm({
          type: op.type === 'ANNULATION' ? 'PROVISOIRE' : op.type,
          beneficiaireId: op.beneficiaireId || '',
          ribIndex: 0,
          modeReglement: op.modeReglement || 'VIREMENT',
          objet: op.objet || '',
          piecesJustificatives: op.piecesJustificatives || '',
          montant: '', // À saisir
          ligneBudgetaire: op.ligneBudgetaire || '',
          montantTVA: '', // À saisir
          tvaRecuperable: op.tvaRecuperable || false,
          opProvisoireNumero: '',
          opProvisoireId: ''
        });
        setIsConsultMode(false);
        setIsEditMode(false);
        setConsultedOp(null);
      } else {
        loadOpForConsult(consultOpData);
      }
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);
  
  // Fonction utilitaire pour obtenir les RIB (rétrocompatibilité)
  const getBeneficiaireRibs = (ben) => {
    if (!ben) return [];
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };
  
  const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
  const selectedRib = beneficiaireRibs[form.ribIndex] || beneficiaireRibs[0] || null;

  // OP disponibles pour duplication (tous les OP de la même source/exercice)
  const opsPourDuplication = ops.filter(op => 
    op.sourceId === activeSource &&
    op.exerciceId === exerciceActif?.id
  ).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // Fonction de duplication (sans montant ni TVA)
  const handleDuplicate = (opId) => {
    const op = ops.find(o => o.id === opId);
    if (!op) return;
    
    // Pré-remplir le formulaire avec les données de l'OP sélectionné
    // Montant et TVA ne sont PAS copiés car ils peuvent varier
    setForm({
      type: op.type === 'ANNULATION' ? 'PROVISOIRE' : op.type, // Tous les types sauf Annulation
      beneficiaireId: op.beneficiaireId || '',
      ribIndex: 0,
      modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '',
      piecesJustificatives: op.piecesJustificatives || '',
      montant: '', // À saisir
      ligneBudgetaire: op.ligneBudgetaire || '',
      montantTVA: '', // À saisir
      tvaRecuperable: op.tvaRecuperable || false,
      opProvisoireNumero: '',
      opProvisoireId: ''
    });
    
    setShowDuplicateModal(false);
  };
  
  // Budget actif pour la source et l'exercice actif
  const currentBudget = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === exerciceActif?.id)
    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];

  // Ligne budgétaire sélectionnée
  const selectedLigne = currentBudget?.lignes?.find(l => l.code === form.ligneBudgetaire);

  // Calculs budgétaires
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
    // Le montant est utilisé tel quel (négatif pour annulation, positif pour les autres)
    // Pour Définitif : remplace le provisoire, donc pas d'impact supplémentaire si même montant
    if (form.type === 'DEFINITIF' && form.opProvisoireId) {
      const opProv = ops.find(o => o.id === form.opProvisoireId);
      return montant - (opProv?.montant || 0);
    }
    return montant;
  };

  const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
  const getDisponible = () => getDotation() - getEngagementsCumules();

  // OP Provisoires disponibles pour Annulation/Définitif
  const opProvisoiresDisponibles = ops.filter(op => 
    op.sourceId === activeSource &&
    op.exerciceId === exerciceActif?.id &&
    op.type === 'PROVISOIRE' &&
    !['REJETE', 'ANNULE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && ['DEFINITIF', 'ANNULATION'].includes(o.type))
  );

  // Générer le prochain numéro
  const genererNumero = () => {
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSource = currentSourceObj?.sigle || 'OP';
    const annee = exerciceActif?.annee || new Date().getFullYear();
    const opsSource = ops.filter(op => 
      op.sourceId === activeSource && 
      op.exerciceId === exerciceActif?.id
    );
    const nextNum = opsSource.length + 1;
    return `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
  };

  // Quand on sélectionne un OP Provisoire
  const handleSelectOpProvisoire = (opId) => {
    if (!opId) {
      setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '' });
      return;
    }
    const op = ops.find(o => o.id === opId);
    if (op) {
      setForm({
        ...form,
        opProvisoireId: opId,
        opProvisoireNumero: op.numero,
        beneficiaireId: op.beneficiaireId,
        ligneBudgetaire: op.ligneBudgetaire,
        objet: op.objet,
        // Pré-remplir le montant uniquement pour ANNULATION
        montant: form.type === 'ANNULATION' ? String(op.montant) : form.montant,
        modeReglement: op.modeReglement || 'VIREMENT'
      });
    }
  };

  // Effacer le formulaire
  const handleClear = () => {
    setForm({
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
  };

  // Validation et sauvegarde
  const handleSave = async () => {
    // Validations
    if (!activeSource) {
      alert('Veuillez sélectionner une source de financement');
      return;
    }
    if (!exerciceActif) {
      alert('Aucun exercice actif. Veuillez en définir un dans les Paramètres.');
      return;
    }
    if (!form.type) {
      alert('Veuillez sélectionner le type d\'OP');
      return;
    }
    if (!form.beneficiaireId) {
      alert('Veuillez sélectionner un bénéficiaire');
      return;
    }
    if (!form.ligneBudgetaire) {
      alert('Veuillez sélectionner une ligne budgétaire');
      return;
    }
    if (!form.objet.trim()) {
      alert('Veuillez saisir l\'objet de la dépense');
      return;
    }
    if (!form.montant || parseFloat(form.montant) === 0) {
      alert('Veuillez saisir un montant valide (différent de zéro)');
      return;
    }
    if (['ANNULATION', 'DEFINITIF'].includes(form.type) && !form.opProvisoireId && !form.opProvisoireNumero.trim()) {
      alert(`Veuillez renseigner le N° d'OP Provisoire à ${form.type === 'ANNULATION' ? 'annuler' : 'régulariser'}`);
      return;
    }

    // Vérification disponible (bloquant si < 0 sauf pour Annulation)
    if (form.type !== 'ANNULATION' && getDisponible() < 0) {
      alert(`❌ Impossible de créer cet OP.\n\nLe disponible budgétaire serait négatif (${formatMontant(getDisponible())} FCFA).\n\nVeuillez réduire le montant ou augmenter la dotation.`);
      return;
    }

    setSaving(true);
    try {
      const sigleProjet = projet?.sigle || 'PROJET';
      const sigleSource = currentSourceObj?.sigle || 'OP';
      const annee = exerciceActif?.annee || new Date().getFullYear();
      
      // Récupérer TOUS les OP de cette source/exercice depuis Firebase (pas le state local)
      const allOpsSnap = await getDocs(query(
        collection(db, 'ops'),
        where('sourceId', '==', activeSource),
        where('exerciceId', '==', exerciceActif.id)
      ));
      const allNumerosExistants = allOpsSnap.docs.map(d => d.data().numero);
      
      // Trouver le prochain numéro VRAIMENT disponible
      let nextNum = allOpsSnap.size + 1;
      let numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
      let tentatives = 0;
      while (allNumerosExistants.includes(numero) && tentatives < 50) {
        nextNum++;
        numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
        tentatives++;
      }
      
      const numeroInitial = genererNumero();
      if (numero !== numeroInitial) {
        alert(`⚠️ Le numéro ${numeroInitial} a déjà été utilisé par un autre utilisateur.\n\nVotre OP prendra le numéro : ${numero}`);
      }
      
      const opData = {
        numero,
        type: form.type,
        sourceId: activeSource,
        exerciceId: exerciceActif.id,
        beneficiaireId: form.beneficiaireId,
        modeReglement: form.modeReglement,
        rib: selectedRib ? selectedRib : null,
        ligneBudgetaire: form.ligneBudgetaire,
        objet: form.objet.trim(),
        piecesJustificatives: form.piecesJustificatives.trim(),
        montant: parseFloat(form.montant),
        montantTVA: form.montantTVA ? parseFloat(form.montantTVA) : null,
        tvaRecuperable: form.tvaRecuperable,
        statut: 'CREE',
        opProvisoireId: form.opProvisoireId || null,
        opProvisoireNumero: form.opProvisoireNumero || null,
        dateCreation: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'ops'), opData);
      
      // Re-vérification après écriture : détecter si un doublon a été créé au même instant
      const doublonSnap = await getDocs(query(
        collection(db, 'ops'),
        where('numero', '==', numero)
      ));
      if (doublonSnap.size > 1) {
        // Doublon détecté ! Corriger en prenant le numéro suivant
        const allOpsSnap2 = await getDocs(query(
          collection(db, 'ops'),
          where('sourceId', '==', activeSource),
          where('exerciceId', '==', exerciceActif.id)
        ));
        const allNums2 = allOpsSnap2.docs.map(d => d.data().numero);
        let fixNum = allOpsSnap2.size + 1;
        let fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
        while (allNums2.includes(fixNumero)) {
          fixNum++;
          fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
        }
        await updateDoc(doc(db, 'ops', docRef.id), { numero: fixNumero, updatedAt: new Date().toISOString() });
        opData.numero = fixNumero;
        alert(`⚠️ Doublon détecté et corrigé automatiquement.\n\nNouveau numéro attribué : ${fixNumero}`);
      }
      
      setOps([...ops, { id: docRef.id, ...opData }]);

      alert(`✅ OP ${numero} créé avec succès !`);
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
      {/* En-tête */}
      <div style={{ 
        background: currentSourceObj?.couleur || '#0f4c3a', 
        color: 'white', 
        padding: '20px 24px', 
        borderRadius: '10px 10px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          FORMULAIRE OP {currentSourceObj?.sigle || ''}
        </h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {sources.map(source => (
            <button
              key={source.id}
              onClick={() => setActiveSource(source.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: activeSource === source.id ? 'white' : 'rgba(255,255,255,0.2)',
                color: activeSource === source.id ? (source.couleur || '#0f4c3a') : 'white',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
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
            {/* Ligne 1 : N°OP + Boutons Consulter/Dupliquer/Effacer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 20 }}>
              <div style={{ width: 250 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>{isEditMode ? 'N° OP (modification)' : isConsultMode ? 'N° OP (consultation)' : 'N° OP'}</label>
                <input 
                  type="text" 
                  value={isConsultMode ? (consultedOp?.numero || '') : genererNumero()} 
                  readOnly 
                  style={{ ...styles.input, marginBottom: 0, background: isEditMode ? '#fff3e0' : isConsultMode ? '#e8f5e9' : '#f8f9fa', fontWeight: 700, fontFamily: 'monospace', fontSize: 16, border: isEditMode ? '2px solid #f57f17' : isConsultMode ? '2px solid #4caf50' : undefined }} 
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {(isConsultMode || isEditMode) ? (
                  <button 
                    onClick={exitConsultMode} 
                    style={{ ...styles.buttonSecondary, padding: '12px 20px', background: '#ffebee', color: '#c62828' }}
                  >
                    ✕ Quitter {isEditMode ? 'modification' : 'consultation'}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { setConsultSearch(''); setShowConsultModal(true); }} 
                      style={{ ...styles.buttonSecondary, padding: '12px 20px', background: '#e3f2fd', color: '#1565c0' }}
                    >
                      🔍 Consulter un OP
                    </button>
                    <button 
                      onClick={() => setShowDuplicateModal(true)} 
                      style={{ ...styles.buttonSecondary, padding: '12px 20px', background: '#fff3e0', color: '#e65100' }}
                    >
                      📋 Dupliquer un OP
                    </button>
                  </>
                )}
                <button onClick={() => { exitConsultMode(); handleClear(); }} style={{ ...styles.buttonSecondary, padding: '12px 24px' }}>
                  EFFACER
                </button>
              </div>
            </div>

            {/* Wrapper lecture seule en mode consultation */}
            <div style={(isConsultMode && !isEditMode) ? { pointerEvents: 'none', opacity: 0.85 } : {}}>
            {/* Ligne 2 : Type d'OP en boutons compacts */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>TYPE D'OP *</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { value: 'PROVISOIRE', label: 'Provisoire', color: '#ff9800' },
                  { value: 'DIRECT', label: 'Direct', color: '#2196f3' },
                  { value: 'DEFINITIF', label: 'Définitif', color: '#4caf50' },
                  { value: 'ANNULATION', label: 'Annulation', color: '#f44336' }
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: type.value, opProvisoireId: '', opProvisoireNumero: '' })}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: form.type === type.value ? type.color : '#f0f0f0',
                      color: form.type === type.value ? 'white' : '#555',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ligne 3 : Bénéficiaire, NCC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>BÉNÉFICIAIRE *</label>
                <Autocomplete
                  options={beneficiaires.map(b => ({
                    value: b.id,
                    label: b.nom,
                    searchFields: [b.nom, b.ncc || '', ...(b.ribs || []).map(r => r.numero), ...(b.ribs || []).map(r => r.banque), b.rib || '']
                  }))}
                  value={form.beneficiaireId ? {
                    value: form.beneficiaireId,
                    label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || ''
                  } : null}
                  onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                  placeholder="🔍 Rechercher par nom ou NCC..."
                  isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                  noOptionsMessage="Aucun bénéficiaire trouvé"
                  accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N°CC</label>
                <input 
                  type="text" 
                  value={selectedBeneficiaire?.ncc || ''} 
                  readOnly 
                  style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} 
                />
              </div>
            </div>

            {/* Ligne 3 : Mode de règlement */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>MODE DE RÈGLEMENT</label>
              <div style={{ display: 'flex', gap: 30 }}>
                {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => (
                  <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="modeReglement" 
                      checked={form.modeReglement === mode}
                      onChange={() => setForm({ ...form, modeReglement: mode })}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14 }}>{mode}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ligne 4 : Références bancaires */}
            {form.modeReglement === 'VIREMENT' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>
                  RÉFÉRENCES BANCAIRES (RIB) {beneficiaireRibs.length > 1 && '*'}
                </label>
                {!selectedBeneficiaire ? (
                  <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', color: '#adb5bd', fontStyle: 'italic' }}>
                    Sélectionnez d'abord un bénéficiaire
                  </div>
                ) : beneficiaireRibs.length === 0 ? (
                  <div style={{ ...styles.input, marginBottom: 0, background: '#fff3e0', color: '#e65100' }}>
                    ⚠️ Aucun RIB enregistré pour ce bénéficiaire
                  </div>
                ) : beneficiaireRibs.length === 1 ? (
                  <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {beneficiaireRibs[0].banque && (
                      <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                        {beneficiaireRibs[0].banque}
                      </span>
                    )}
                    <span>{beneficiaireRibs[0].numero}</span>
                  </div>
                ) : (
                  <select
                    value={form.ribIndex}
                    onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })}
                    style={{ ...styles.input, marginBottom: 0 }}
                  >
                    {beneficiaireRibs.map((rib, index) => (
                      <option key={index} value={index}>
                        {rib.banque ? `${rib.banque} - ` : ''}{rib.numero}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Ligne 5 : Objet de la dépense */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>OBJET DE LA DÉPENSE *</label>
              <textarea 
                value={form.objet} 
                onChange={(e) => setForm({ ...form, objet: e.target.value })}
                style={{ ...styles.input, marginBottom: 0, minHeight: 80, resize: 'vertical', background: '#fff0f0' }} 
                placeholder="Décrire l'objet de la dépense..."
              />
            </div>

            {/* Ligne 6 : Pièces justificatives */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>PIÈCES JUSTIFICATIVES</label>
              <textarea 
                value={form.piecesJustificatives} 
                onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })}
                style={{ ...styles.input, marginBottom: 0, minHeight: 60, resize: 'vertical', background: '#fff0f0' }} 
                placeholder="Lister les pièces jointes..."
              />
            </div>

            {/* Ligne 7 : Montant et Ligne budgétaire */}
            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT (FCFA) *</label>
                <MontantInput 
                  value={form.montant} 
                  onChange={(val) => setForm({ ...form, montant: val })}
                  style={{ ...styles.input, marginBottom: 0, background: '#fff0f0', fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} 
                  placeholder="0"
                  disabled={form.type === 'ANNULATION' && form.opProvisoireId}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>LIGNE BUDGÉTAIRE *</label>
                <Autocomplete
                  options={(currentBudget?.lignes || []).map(l => ({
                    value: l.code,
                    label: `${l.code} - ${l.libelle}`,
                    searchFields: [l.code, l.libelle]
                  }))}
                  value={form.ligneBudgetaire ? 
                    (currentBudget?.lignes || []).filter(x => x.code === form.ligneBudgetaire).map(l => ({
                      value: l.code,
                      label: `${l.code} - ${l.libelle}`
                    }))[0] || null
                  : null}
                  onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                  placeholder="🔍 Rechercher par code ou libellé..."
                  isDisabled={['ANNULATION', 'DEFINITIF'].includes(form.type) && form.opProvisoireId}
                  noOptionsMessage="Aucune ligne trouvée"
                  accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                />
              </div>
            </div>

            {/* Ligne 8 : Infos budgétaires + Date + TVA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Colonne gauche : Infos budget */}
              <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Dotation budgétaire</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                  
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements antérieurs</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                  
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Engagement actuel</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#2e7d32' : '#e65100' }}>
                    {getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}
                  </span>
                  
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements cumulés</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsCumules())}</span>
                  
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Disponible budgétaire</span>
                  <span style={{ 
                    fontSize: 14, 
                    fontFamily: 'monospace', 
                    textAlign: 'right', 
                    fontWeight: 700,
                    color: getDisponible() >= 0 ? '#2e7d32' : '#c62828'
                  }}>
                    {formatMontant(getDisponible())}
                  </span>
                </div>
                {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                  <div style={{ marginTop: 12, padding: 8, background: '#ffebee', borderRadius: 4, color: '#c62828', fontSize: 12, fontWeight: 600 }}>
                    ⚠️ Budget insuffisant - OP non validable
                  </div>
                )}
              </div>

              {/* Colonne droite : Date + TVA */}
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>DATE</label>
                  <input 
                    type="date" 
                    value={new Date().toISOString().split('T')[0]} 
                    readOnly
                    style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} 
                  />
                </div>

                {/* TVA pour OP Direct ou Définitif */}
                {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                      <div style={{ display: 'flex', gap: 20 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            checked={form.tvaRecuperable === true}
                            onChange={() => setForm({ ...form, tvaRecuperable: true })}
                          />
                          <span>OUI</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            checked={form.tvaRecuperable === false}
                            onChange={() => setForm({ ...form, tvaRecuperable: false })}
                          />
                          <span>NON</span>
                        </label>
                      </div>
                    </div>
                    {form.tvaRecuperable && (
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT TVA</label>
                        <MontantInput 
                          value={form.montantTVA} 
                          onChange={(val) => setForm({ ...form, montantTVA: val })}
                          style={{ ...styles.input, marginBottom: 0, fontFamily: 'monospace', textAlign: 'right' }} 
                          placeholder="0"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Ligne 9 : N° OP Provisoire (pour Annulation/Définitif) */}
            {['ANNULATION', 'DEFINITIF'].includes(form.type) && (
              <div style={{ marginBottom: 20, padding: 16, background: form.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>
                  N° OP PROVISOIRE À {form.type === 'ANNULATION' ? 'ANNULER' : 'RÉGULARISER'} *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, marginBottom: 4, color: '#6c757d' }}>Saisie manuelle</label>
                    <input 
                      type="text" 
                      value={form.opProvisoireNumero} 
                      onChange={(e) => setForm({ ...form, opProvisoireNumero: e.target.value, opProvisoireId: '' })}
                      style={{ ...styles.input, marginBottom: 0 }} 
                      placeholder="Ex: ETAT-2025-0012"
                    />
                  </div>
                  <div style={{ padding: '0 8px', color: '#6c757d', fontSize: 12 }}>ou</div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, marginBottom: 4, color: '#6c757d' }}>Sélectionner un OP existant</label>
                    <Autocomplete
                      options={opProvisoiresDisponibles.map(op => {
                        const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                        return {
                          value: op.id,
                          label: `${op.numero} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`,
                          searchFields: [op.numero, ben?.nom || '', String(op.montant), op.objet || '']
                        };
                      })}
                      value={form.opProvisoireId ? 
                        opProvisoiresDisponibles.filter(o => o.id === form.opProvisoireId).map(op => {
                          const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                          return {
                            value: op.id,
                            label: `${op.numero} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`
                          };
                        })[0] || null
                      : null}
                      onChange={(option) => handleSelectOpProvisoire(option?.value || '')}
                      placeholder="🔍 Rechercher par N°, bénéficiaire..."
                      noOptionsMessage="Aucun OP Provisoire disponible"
                      accentColor={form.type === 'ANNULATION' ? '#c62828' : '#2e7d32'}
                    />
                  </div>
                </div>
              </div>
            )}

            </div>{/* Fin wrapper lecture seule */}
            
            {/* Boutons selon le mode */}
            {(isConsultMode && !isEditMode) ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '2px solid #4caf50' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ padding: '10px 16px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                    🔍 Mode consultation — {consultedOp?.numero}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedRib = beneficiaireRibs[form.ribIndex] || {};
                      const engagementActuel = parseFloat(form.montant) || 0;
                      const engagementsCumules = getEngagementsAnterieurs() + engagementActuel;
                      const isBailleur = currentSourceObj?.sigle?.includes('IDA') || currentSourceObj?.sigle?.includes('BAD') || currentSourceObj?.sigle?.includes('UE');
                      const isTresor = currentSourceObj?.sigle?.includes('BN') || currentSourceObj?.sigle?.includes('TRESOR') || currentSourceObj?.sigle?.includes('ETAT');
                      const codeImputationComplet = (currentSourceObj?.codeImputation || '') + ' ' + (form.ligneBudgetaire || '');
                  
                  const printContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>OP ${isConsultMode ? (consultedOp?.numero || '') : genererNumero()}</title>
<style>
  @page { size: A4; margin: 10mm; }
  @media print {
    .toolbar { display: none !important; }
    body { background: #fff !important; padding: 0 !important; }
    .page-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: 'Century Gothic', 'Trebuchet MS', sans-serif; 
    font-size: 11px; 
    line-height: 1.4;
    background: #e0e0e0;
    padding: 0;
  }
  .toolbar {
    background: #1a1a2e;
    padding: 12px 20px;
    display: flex;
    gap: 12px;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .toolbar button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-print { background: #2196F3; color: #fff; }
  .btn-print:hover { background: #1976D2; }
  .btn-pdf { background: #4CAF50; color: #fff; }
  .btn-pdf:hover { background: #388E3C; }
  .toolbar-title { color: #fff; font-size: 14px; margin-left: auto; }
  .page-container {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    background: #fff;
    padding: 8mm;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .inner-frame {
    border: 2px solid #000;
    height: 100%;
  }
  .header {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .header-logo {
    width: 22%;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #000;
  }
  .header-logo img { max-height: 75px; max-width: 100%; }
  .header-center {
    width: 56%;
    padding: 6px;
    text-align: center;
    border-right: 1px solid #000;
  }
  .header-center .republic { font-weight: bold; font-size: 11px; }
  .header-center .sep { font-size: 8px; letter-spacing: 0.5px; color: #333; }
  .header-center .ministry { font-style: italic; font-size: 10px; }
  .header-center .project { font-weight: bold; font-size: 10px; }
  .header-right {
    width: 22%;
    padding: 8px;
    font-size: 10px;
    text-align: right;
  }
  .op-title-section {
    text-align: center;
    padding: 6px 10px;
    border-bottom: 1px solid #000;
  }
  .op-title { font-weight: bold; text-decoration: underline; font-size: 11px; }
  .op-numero { font-size: 10px; margin-top: 2px; }
  .body-content {
    padding: 12px 15px;
    border-bottom: 1px solid #000;
  }
  .exercice-line {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .type-red { color: #c00; font-weight: bold; }
  .field { margin-bottom: 8px; }
  .field-title { text-decoration: underline; font-size: 10px; margin-bottom: 6px; }
  .field-value { font-weight: bold; }
  .field-large {
    margin: 15px 0;
    min-height: 45px;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .checkbox-line {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .checkbox-label { min-width: 230px; }
  .checkbox-options { display: flex; gap: 50px; }
  .check-item { display: flex; align-items: center; gap: 6px; }
  .box { 
    width: 18px; 
    height: 14px; 
    border: 1px solid #000; 
    display: inline-flex; 
    align-items: center; 
    justify-content: center;
    font-size: 10px;
  }
  .budget-section { margin-top: 15px; }
  .budget-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .budget-row .col-left { width: 33.33%; }
  .budget-row .col-center { width: 33.33%; }
  .budget-row .col-right { width: 33.33%; }
  .value-box {
    border: 1px solid #000;
    padding: 4px 10px;
    text-align: right;
    font-weight: bold;
    white-space: nowrap;
    font-size: 10px;
  }
  .budget-table {
    width: 100%;
    border-collapse: collapse;
  }
  .budget-table td {
    border: 1px solid #000;
    padding: 4px 8px;
    font-size: 10px;
  }
  .budget-table .col-letter { 
    width: 4%;
    text-align: center; 
    font-weight: bold; 
  }
  .budget-table .col-label { width: 29.33%; }
  .budget-table .col-amount { 
    width: 33.33%;
    text-align: right;
    padding-right: 10px;
  }
  .budget-table .col-empty {
    width: 33.33%;
    border: none;
  }
  .signatures-section {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .sig-box {
    width: 33.33%;
    min-height: 160px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #000;
  }
  .sig-box:last-child { border-right: none; }
  .sig-header {
    text-align: center;
    font-weight: bold;
    font-size: 9px;
    padding: 6px;
    border-bottom: 1px solid #000;
    line-height: 1.3;
  }
  .sig-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 8px;
  }
  .sig-name {
    text-align: right;
    font-weight: bold;
    text-decoration: underline;
    font-size: 9px;
  }
  .abidjan-row {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .abidjan-cell {
    width: 33.33%;
    padding: 4px 10px;
    font-size: 9px;
    border-right: 1px solid #000;
  }
  .abidjan-cell:last-child { border-right: none; }
  .acquit-section { display: flex; }
  .acquit-empty { 
    width: 66.66%;
    border-right: 1px solid #000;
  }
  .acquit-box {
    width: 33.33%;
    min-height: 110px;
    display: flex;
    flex-direction: column;
  }
  .acquit-header {
    text-align: center;
    font-size: 9px;
    padding: 6px;
    border-bottom: 1px solid #000;
  }
  .acquit-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 8px;
  }
  .acquit-date {
    font-size: 9px;
    text-align: left;
  }
  @media print { 
    body { padding: 0; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
  <button class="btn-pdf" onclick="window.print()">📄 Exporter PDF</button>
  <span class="toolbar-title">Aperçu – OP ${isConsultMode ? (consultedOp?.numero || '') : genererNumero()}</span>
</div>
<div class="page-container">
<div class="inner-frame">
  <div class="header">
    <div class="header-logo">
      <img src="${LOGO_PIF2}" alt="PIF2" />
    </div>
    <div class="header-center">
      <div class="republic">REPUBLIQUE DE CÔTE D'IVOIRE</div>
      <div class="sep">------------------------</div>
      <div class="ministry">MINISTERE DES EAUX ET FORETS</div>
      <div class="sep">------------------------</div>
      <div class="project">PROJET D'INVESTISSEMENT FORESTIER 2</div>
      <div class="sep">------------------------</div>
    </div>
    <div class="header-right">
      <div style="text-align: center;">
        <img src="${ARMOIRIE}" alt="Armoirie" style="max-height: 50px; max-width: 60px; margin-bottom: 3px;" />
        <div>Union – Discipline – Travail</div>
      </div>
    </div>
  </div>
  
  <div class="op-title-section">
    <div class="op-title">ORDRE DE PAIEMENT</div>
    <div class="op-numero">N°${isConsultMode ? (consultedOp?.numero || '') : genererNumero()}</div>
  </div>
  
  <div class="body-content">
    <div class="exercice-line">
      <div>EXERCICE&nbsp;&nbsp;&nbsp;&nbsp;<strong>${exerciceActif?.annee || ''}</strong></div>
      <div class="type-red">${form.type}</div>
    </div>
    
    <div class="field">
      <div class="field-title">REFERENCE DU BENEFICIAIRE</div>
    </div>
    
    <div class="field">
      BENEFICIAIRE :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedBeneficiaire?.nom || ''}</span>
    </div>
    
    <div class="field">
      COMPTE CONTRIBUABLE :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedBeneficiaire?.ncc || ''}</span>
    </div>
    
    <div class="checkbox-line">
      <span class="checkbox-label">COMPTE DE DISPONIBILITE A DEBITER :</span>
      <div class="checkbox-options">
        <span class="check-item">BAILLEUR <span class="box">${isBailleur ? 'x' : ''}</span></span>
        <span class="check-item">TRESOR <span class="box">${isTresor ? 'x' : ''}</span></span>
      </div>
    </div>
    
    <div class="checkbox-line">
      <span class="checkbox-label">MODE DE REGLEMENT :</span>
      <div class="checkbox-options">
        <span class="check-item">ESPECE <span class="box">${form.modeReglement === 'ESPECES' ? 'x' : ''}</span></span>
        <span class="check-item">CHEQUE <span class="box">${form.modeReglement === 'CHEQUE' ? 'x' : ''}</span></span>
        <span class="check-item">VIREMENT <span class="box">${form.modeReglement === 'VIREMENT' ? 'x' : ''}</span></span>
      </div>
    </div>
    
    <div class="field">
      REFERENCES BANCAIRES :&nbsp;&nbsp;&nbsp;<span class="field-value">${form.modeReglement === 'VIREMENT' ? (selectedRib.banque ? selectedRib.banque + ' - ' : '') + (selectedRib.numero || '') : ''}</span>
    </div>
    
    <div class="field-large">
      OBJET DE LA DEPENSE :&nbsp;&nbsp;&nbsp;<span class="field-value">${form.objet || ''}</span>
    </div>
    
    <div class="field-large">
      PIECES JUSTIFICATIVES :&nbsp;&nbsp;&nbsp;<span class="field-value">${form.piecesJustificatives || ''}</span>
    </div>
    
    <div class="budget-section">
      <div class="budget-row">
        <div class="col-left">MONTANT TOTAL :</div>
        <div class="col-center">
          <div class="value-box">${formatMontant(Math.abs(engagementActuel))}</div>
        </div>
        <div class="col-right"></div>
      </div>
      
      <div class="budget-row">
        <div class="col-left">IMPUTATION BUDGETAIRE :</div>
        <div class="col-center">
          <div class="value-box">${codeImputationComplet.trim()}</div>
        </div>
        <div class="col-right"></div>
      </div>
      
      <table class="budget-table">
        <tr>
          <td class="col-letter">A</td>
          <td class="col-label">Dotation budgétaire</td>
          <td class="col-amount">${formatMontant(getDotation())}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">B</td>
          <td class="col-label">Engagements antérieurs</td>
          <td class="col-amount">${formatMontant(getEngagementsAnterieurs())}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">C</td>
          <td class="col-label">Engagement actuel</td>
          <td class="col-amount">${formatMontant(Math.abs(engagementActuel))}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">D</td>
          <td class="col-label">Engagements cumulés (B + C)</td>
          <td class="col-amount">${formatMontant(engagementsCumules)}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">E</td>
          <td class="col-label">Disponible budgétaire (A - D)</td>
          <td class="col-amount">${formatMontant(getDisponible())}</td>
          <td class="col-empty"></td>
        </tr>
      </table>
    </div>
  </div>
  
  <div class="signatures-section">
    <div class="sig-box">
      <div class="sig-header">VISA<br/>COORDONNATRICE</div>
      <div class="sig-content">
        <div class="sig-name">ABE-KOFFI Thérèse</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-header">VISA<br/>CONTRÔLEUR FINANCIER</div>
      <div class="sig-content"></div>
    </div>
    <div class="sig-box">
      <div class="sig-header">VISA AGENT<br/>COMPTABLE</div>
      <div class="sig-content"></div>
    </div>
  </div>
  
  <div class="abidjan-row">
    <div class="abidjan-cell">Abidjan, le</div>
    <div class="abidjan-cell">Abidjan, le</div>
    <div class="abidjan-cell">Abidjan, le</div>
  </div>
  
  <div class="acquit-section">
    <div class="acquit-empty"></div>
    <div class="acquit-box">
      <div class="acquit-header">ACQUIT LIBERATOIRE</div>
      <div class="acquit-content">
        <div class="acquit-date">Abidjan, le</div>
      </div>
    </div>
  </div>
</div>
</div>
</body>
</html>`;
                  const printWindow = window.open('', '_blank', 'width=900,height=700');
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                }}
                style={{ ...styles.buttonSecondary, padding: '14px 24px', fontSize: 14 }}
              >
                🖨️ Imprimer
              </button>
                  <button
                    onClick={() => {
                      const pwd = window.prompt('🔒 Mot de passe requis pour modifier :');
                      if (pwd === (projet?.motDePasseAdmin || 'admin123')) {
                        setIsEditMode(true);
                      } else if (pwd !== null) {
                        alert('❌ Mot de passe incorrect');
                      }
                    }}
                    style={{ ...styles.button, padding: '14px 24px', fontSize: 14, background: '#f57f17' }}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => {
                      const pwd = window.prompt('🔒 Mot de passe requis pour rejeter :');
                      if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
                        if (pwd !== null) alert('❌ Mot de passe incorrect');
                        return;
                      }
                      const motif = window.prompt('Motif du rejet :');
                      if (motif !== null) {
                        updateDoc(doc(db, 'ops', consultedOp.id), { 
                          statut: 'REJETE_CF', 
                          motifRejet: motif,
                          updatedAt: new Date().toISOString()
                        });
                        setOps(ops.map(o => o.id === consultedOp.id ? { ...o, statut: 'REJETE_CF', motifRejet: motif } : o));
                        alert(`OP ${consultedOp.numero} rejeté.`);
                        exitConsultMode();
                      }
                    }}
                    style={{ ...styles.button, padding: '14px 24px', fontSize: 14, background: '#c62828' }}
                  >
                    ❌ Rejeter
                  </button>
                  <button
                    onClick={async () => {
                      const pwd = window.prompt('🔒 Mot de passe requis pour supprimer :');
                      if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
                        if (pwd !== null) alert('❌ Mot de passe incorrect');
                        return;
                      }
                      
                      // Vérifier si la suppression impacte des OP suivants
                      const opsSuivants = ops.filter(o => 
                        o.sourceId === consultedOp.sourceId &&
                        o.exerciceId === consultedOp.exerciceId &&
                        o.ligneBudgetaire === consultedOp.ligneBudgetaire &&
                        (o.createdAt || '') > (consultedOp.createdAt || '') &&
                        o.id !== consultedOp.id
                      );
                      
                      let confirmMsg = `Voulez-vous vraiment supprimer l'OP ${consultedOp.numero} ?`;
                      if (opsSuivants.length > 0) {
                        const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
                        confirmMsg = `⚠️ ATTENTION : Cette suppression impactera le cumul des engagements des OP suivants sur la même ligne budgétaire :\n${numeros}${opsSuivants.length > 5 ? '...' : ''}\n\nVoulez-vous continuer ?`;
                      }
                      
                      if (window.confirm(confirmMsg)) {
                        try {
                          await deleteDoc(doc(db, 'ops', consultedOp.id));
                          setOps(ops.filter(o => o.id !== consultedOp.id));
                          alert(`✅ OP ${consultedOp.numero} supprimé.`);
                          exitConsultMode();
                        } catch (error) {
                          alert('Erreur : ' + error.message);
                        }
                      }
                    }}
                    style={{ ...styles.button, padding: '14px 24px', fontSize: 14, background: '#424242' }}
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </div>
            ) : isEditMode ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '2px solid #f57f17' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ padding: '10px 16px', background: '#fff3e0', color: '#e65100', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                    ✏️ Modification — {consultedOp?.numero}
                  </span>
                  <button
                    onClick={() => setIsEditMode(false)}
                    style={{ ...styles.buttonSecondary, padding: '10px 16px', fontSize: 12 }}
                  >
                    Annuler
                  </button>
                </div>
                <button
                  onClick={async () => {
                    try {
                      if (!consultedOp?.id) return;
                      const ben = beneficiaires.find(b => b.id === form.beneficiaireId);
                      const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
                      const selectedRib = benRibs[form.ribIndex || 0];
                      
                      const newMontant = parseFloat(form.montant) || consultedOp.montant;
                      
                      // Vérifier si la modification du montant impacte les OP suivants
                      if (newMontant !== consultedOp.montant) {
                        const opsSuivants = ops.filter(o => 
                          o.sourceId === consultedOp.sourceId &&
                          o.exerciceId === consultedOp.exerciceId &&
                          o.ligneBudgetaire === consultedOp.ligneBudgetaire &&
                          (o.createdAt || '') > (consultedOp.createdAt || '') &&
                          o.id !== consultedOp.id
                        );
                        
                        if (opsSuivants.length > 0) {
                          const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
                          const diff = newMontant - consultedOp.montant;
                          const confirmMsg = `⚠️ ATTENTION : Cette modification de montant (${diff > 0 ? '+' : ''}${formatMontant(diff)} F) impactera le cumul des engagements des OP suivants sur la même ligne budgétaire :\n${numeros}${opsSuivants.length > 5 ? '...' : ''}\n\nVoulez-vous continuer ?`;
                          if (!window.confirm(confirmMsg)) return;
                        }
                      }
                      
                      const updates = {
                        type: form.type,
                        beneficiaireId: form.beneficiaireId,
                        modeReglement: form.modeReglement,
                        rib: form.modeReglement === 'VIREMENT' ? (selectedRib?.numero || '') : '',
                        banque: form.modeReglement === 'VIREMENT' ? (selectedRib?.banque || '') : '',
                        objet: form.objet,
                        piecesJustificatives: form.piecesJustificatives,
                        montant: newMontant,
                        ligneBudgetaire: form.ligneBudgetaire,
                        tvaRecuperable: form.tvaRecuperable || false,
                        montantTVA: form.tvaRecuperable ? (parseFloat(form.montantTVA) || 0) : 0,
                        updatedAt: new Date().toISOString()
                      };
                      
                      await updateDoc(doc(db, 'ops', consultedOp.id), updates);
                      setOps(ops.map(o => o.id === consultedOp.id ? { ...o, ...updates } : o));
                      setConsultedOp({ ...consultedOp, ...updates });
                      setIsEditMode(false);
                      alert(`✅ OP ${consultedOp.numero} modifié avec succès !`);
                    } catch (error) {
                      alert('Erreur : ' + error.message);
                    }
                  }}
                  style={{ ...styles.button, padding: '14px 40px', fontSize: 16, background: '#f57f17' }}
                >
                  💾 ENREGISTRER LES MODIFICATIONS
                </button>
              </div>
            ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
              <button
                type="button"
                onClick={() => {
                  // Réutilise la même logique d'impression que le mode consultation
                  const selectedRib = beneficiaireRibs[form.ribIndex] || {};
                  const engagementActuel = parseFloat(form.montant) || 0;
                  const engagementsCumules = getEngagementsAnterieurs() + engagementActuel;
                  const isBailleur = currentSourceObj?.sigle?.includes('IDA') || currentSourceObj?.sigle?.includes('BAD') || currentSourceObj?.sigle?.includes('UE');
                  const isTresor = currentSourceObj?.sigle?.includes('BN') || currentSourceObj?.sigle?.includes('TRESOR') || currentSourceObj?.sigle?.includes('ETAT');
                  const codeImputationComplet = (currentSourceObj?.codeImputation || '') + ' ' + (form.ligneBudgetaire || '');
                  if (!form.beneficiaireId || !form.montant) { alert('Remplissez au minimum le bénéficiaire et le montant pour imprimer.'); return; }
                  alert('Pour imprimer, enregistrez d\'abord l\'OP puis consultez-le via le bouton 🔍 Consulter un OP.');
                }}
                style={{ ...styles.buttonSecondary, padding: '14px 24px', fontSize: 14 }}
              >
                🖨️ Imprimer
              </button>
              <button
                onClick={handleSave}
                disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                style={{
                  ...styles.button,
                  padding: '14px 40px',
                  fontSize: 16,
                  background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? '#bdbdbd' : (currentSourceObj?.couleur || '#0f4c3a'),
                  cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Enregistrement...' : 'ENREGISTRER'}
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Consulter un OP */}
      {showConsultModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 700 }}>
            <div style={{ padding: 20, borderBottom: '1px solid #e9ecef', background: '#e3f2fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1565c0' }}>🔍 Consulter un OP</h2>
                <button onClick={() => setShowConsultModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <input
                type="text"
                placeholder="Tapez le N° OP, bénéficiaire, objet ou montant..."
                value={consultSearch}
                onChange={e => setConsultSearch(e.target.value)}
                style={{ ...styles.input, marginBottom: 12, fontSize: 14 }}
                autoFocus
              />
              {consultSearch.trim().length >= 2 ? (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {ops
                  .filter(op => {
                    const term = consultSearch.toLowerCase();
                    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                    return (
                      (op.numero || '').toLowerCase().includes(term) ||
                      (ben?.nom || '').toLowerCase().includes(term) ||
                      (op.objet || '').toLowerCase().includes(term) ||
                      String(op.montant || '').includes(term)
                    );
                  })
                  .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                  .slice(0, 20)
                  .map(op => {
                    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                    const src = sources.find(s => s.id === op.sourceId);
                    return (
                      <div
                        key={op.id}
                        onClick={() => { loadOpForConsult(op); setShowConsultModal(false); setConsultSearch(''); }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#e3f2fd'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{op.numero}</div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{ben?.nom || 'N/A'} — {op.objet?.substring(0, 60) || ''}{(op.objet || '').length > 60 ? '...' : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f4c3a' }}>{formatMontant(op.montant)} F</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: src?.couleur || '#999', color: '#fff' }}>{src?.sigle || ''}</span>
                            <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: op.type === 'PROVISOIRE' ? '#ff9800' : op.type === 'DIRECT' ? '#2196f3' : op.type === 'DEFINITIF' ? '#4caf50' : '#f44336', color: '#fff' }}>{op.type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
                {ops.filter(op => {
                  const term = consultSearch.toLowerCase();
                  const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                  return (op.numero || '').toLowerCase().includes(term) || (ben?.nom || '').toLowerCase().includes(term) || (op.objet || '').toLowerCase().includes(term);
                }).length === 0 && (
                  <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>Aucun OP trouvé</div>
                )}
              </div>
              ) : (
                <div style={{ padding: 30, textAlign: 'center', color: '#999' }}>
                  Saisissez au moins 2 caractères pour rechercher
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Dupliquer un OP */}
      {showDuplicateModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 500 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#fff3e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#e65100' }}>📋 Dupliquer un OP</h2>
                <button onClick={() => setShowDuplicateModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Rechercher un OP à dupliquer</label>
              <Autocomplete
                options={opsPourDuplication.map(op => {
                  const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                  return {
                    value: op.id,
                    label: `${op.numero} - ${ben?.nom || 'N/A'} (${op.type})`,
                    searchFields: [op.numero, ben?.nom || '', op.objet || '', op.type]
                  };
                })}
                value={null}
                onChange={(option) => option && handleDuplicate(option.value)}
                placeholder="🔍 Rechercher par N°, bénéficiaire, objet..."
                noOptionsMessage="Aucun OP trouvé"
                accentColor="#e65100"
              />

              {opsPourDuplication.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p>Aucun OP créé pour cette source et cet exercice.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PageNouvelOp;
