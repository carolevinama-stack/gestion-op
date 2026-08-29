import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, updateDoc, writeBatch, increment, getDocs } from 'firebase/firestore';
//                                                             ^^^^^^^^^
import { styles } from '../utils/styles';
import { formatMontant, escapeHtml, montantEnLettres, formatNumeroOp } from '../utils/formatters';
import { buildBordereauPrintHtml } from '../utils/bordereauPrint';
import { ARMOIRIE, LOGO_PIF2 } from '../utils/logos';
import { P, Badge, Empty, STab, IBtn, ActionBtn, Modal, ModalAlert, formatDate } from '../components/circuitShared';
import { enregistrerJournal, nomUtilisateurJournal, ACTIONS_JOURNAL } from '../utils/journal';

// ============================================================
// ICÔNES
// ============================================================
const I={
  print:(c=P.greenDark,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  trash:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  undo:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>,
  check:(c='#fff',s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  chevron:(c=P.green,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  plus:(c='#fff',s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  lock:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  edit:(c=P.greenDark,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  warn:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  minusCircle:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  plusCircle:(c=P.green,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  refresh:(c=P.textSec,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  chevronLeft:(c=P.textSec,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight:(c=P.textSec,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};


// ============================================================
// COMPOSANT PRINCIPAL : CF
// ============================================================
const PageCircuitCF = () => {
  const { projet, sources, exercices, beneficiaires, ops, setOps, bordereaux, setBordereaux, userProfile } = useAppContext();
  
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [subTabSuiviCF, setSubTabSuiviCF] = useState('DIFFERES');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');
  const [searchSuivi, setSearchSuivi] = useState('');
  const [pageBT, setPageBT] = useState(1);
  const BT_PAGE_SIZE = 50;
  const [triBT, setTriBT] = useState('NUM_DESC');
  const [filtreStatutBT, setFiltreStatutBT] = useState('TOUS');
  const [showAnterieurBT, setShowAnterieurBT] = useState(false);
  const [selectedExerciceBT, setSelectedExerciceBT] = useState(null);
  
  // Modales
  const [alertData, setAlertData] = useState(null); 
  const [modalRetourCF, setModalRetourCF] = useState(false);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [modalEditBT, setModalEditBT] = useState(null);
  const [editBtNumero, setEditBtNumero] = useState('');
  const [editBtDate, setEditBtDate] = useState('');
  const [expandedBT, setExpandedBT] = useState(null);

  const dateRefs = useRef({});
  const setDateRef = (key, el) => { if(el) dateRefs.current['_' + key] = el; };
  const readDate = (key) => dateRefs.current['_' + key]?.value || '';

  const notify = (type, title, message) => setAlertData({ type, title, message });
  const ask = (title, message, onConfirm, showPwd=false, showInput=false, inputLabel='') => {
    setAlertData({ type: 'confirm', title, message, onConfirm, showPwd, showInput, inputLabel });
  };

  // === DATA & CALCULS OPTIMISÉS ===
  const exerciceActif = exercices.find(e => e.actif);
  const minDateLimit = exerciceActif?.annee ? `${exerciceActif.annee}-01-01` : null;
  
  const opsForSource = useMemo(() => ops.filter(op => op.exerciceId === exerciceActif?.id && op.sourceId === activeSourceBT), [ops, activeSourceBT, exerciceActif]);

  const getNumOp = (numero) => { const m = (numero||'').match(/N°(\d+)\//); return m ? parseInt(m[1]) : 0; };
  const opsEligiblesCF = useMemo(() => opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF') && op.statut !== 'SUPPRIME' && !op.bordereauCF).sort((a,b) => getNumOp(b.numero) - getNumOp(a.numero)), [opsForSource]);
  const opsTransmisCF = useMemo(() => opsForSource.filter(op => op.statut === 'TRANSMIS_CF').sort((a,b) => (b.dateTransmissionCF||'').localeCompare(a.dateTransmissionCF||'')), [opsForSource]);
  const opsDifferesCF = useMemo(() => opsForSource.filter(op => op.statut === 'DIFFERE_CF').sort((a,b) => (b.dateDiffere||'').localeCompare(a.dateDiffere||'')), [opsForSource]);
  const opsRejetesCF = useMemo(() => opsForSource.filter(op => op.statut === 'REJETE_CF' && op.type !== 'REJET').sort((a,b) => (b.dateRejet||'').localeCompare(a.dateRejet||'')), [opsForSource]);
  
  const currentExerciceIdBT = showAnterieurBT ? selectedExerciceBT : exerciceActif?.id;
  const bordereauCF = useMemo(() => bordereaux.filter(bt => bt.type === 'CF' && bt.statut !== 'SUPPRIME' && bt.exerciceId === currentExerciceIdBT && bt.sourceId === activeSourceBT), [bordereaux, activeSourceBT, currentExerciceIdBT]);

  // === HELPERS ===
  const getBen = (op) => op?.beneficiaireNom || beneficiaires.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';
  const getSigleSrc = (srcId) => sources.find(s => s.id === srcId)?.sigle || 'SRC';
  
  const isOpLockedForCF = (op) => ['VISE_CF','DIFFERE_CF','REJETE_CF','TRANSMIS_AC','PAYE_PARTIEL','PAYE','ARCHIVE','ANNULE','DIFFERE_AC','REJETE_AC'].includes(op.statut);
  const isBordereauLocked = (bt) => {
    if (!bt.opsIds) return false;
    return bt.opsIds.some(id => { const op = ops.find(o => o.id === id); return op && isOpLockedForCF(op); });
  };

  const checkPwd = (callback) => {
    if (!projet?.motDePasseAdmin) {
      notify("error", "Mot de passe non configuré", "Un administrateur doit configurer le mot de passe administrateur dans les Paramètres avant de pouvoir effectuer cette action.");
      return;
    }
    ask("Sécurité", "Veuillez saisir le mot de passe administrateur :", (pwd) => {
      if(pwd === projet.motDePasseAdmin) callback();
      else notify("error", "Erreur", "Mot de passe incorrect");
    }, true);
  };

  const filterBordereaux = (btList) => btList.filter(bt => { if(!searchBT) return true; const t = searchBT.toLowerCase(); if((bt.numero||'').toLowerCase().includes(t)) return true; return bt.opsIds?.some(opId => { const op = ops.find(o => o.id === opId); return (op?.numero||'').toLowerCase().includes(t) || getBen(op).toLowerCase().includes(t); }); });
  const filterOps = (list, term) => { if(!term) return list; const t = term.toLowerCase(); return list.filter(op => (op.numero||'').toLowerCase().includes(t) || getBen(op).toLowerCase().includes(t) || (op.objet||'').toLowerCase().includes(t)); };
  const toggleOp = (opId) => setSelectedOps(p => p.includes(opId) ? p.filter(id => id !== opId) : [...p, opId]);
  const toggleAll = (list) => { if(selectedOps.length === list.length && list.length > 0) setSelectedOps([]); else setSelectedOps(list.map(o => o.id)); };
  const totalSelected = selectedOps.reduce((s, id) => s + (ops.find(o => o.id === id)?.montant || 0), 0);
  const closeAllModals = () => { setModalRetourCF(false); setModalEditBT(null); };

  const handleFixOrphanOps = async () => {
    ask("Réparation", "Actualiser la file d'attente et libérer les OP bloqués ?", async () => {
      setSaving(true);
      try {
        const batch = writeBatch(db);
        let fixedCount = 0;
        ops.forEach(op => {
          if (op.bordereauCF && !bordereaux.find(b => b.numero === op.bordereauCF && b.statut !== 'SUPPRIME')) {
            batch.update(doc(db, 'ops', op.id), { bordereauCF: null, updatedAt: new Date().toISOString() });
            fixedCount++;
          }
        });
        if (fixedCount > 0) {
          await batch.commit();
          notify("success", "Actualisé", `${fixedCount} OP ont été synchronisés.`);
        } else {
          notify("success", "Infos", "La file d'attente est déjà à jour.");
        }
      } catch(e) {
        notify("error", "Erreur", e.message);
      }
      setSaving(false);
    });
  };

  const chgSub = (fn, v) => { fn(v); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); setSearchSuivi(''); setPageBT(1); };

  // ================================================================
  // ACTIONS
  // ================================================================

  const handleCreateBordereauMulti = async () => {
    if(selectedOps.length === 0){notify("error", "Erreur", "Sélectionnez au moins un OP."); return;}
    const bad = selectedOps.filter(opId => { const op = ops.find(o => o.id === opId); return !op || !['EN_COURS','DIFFERE_CF'].includes(op.statut) || (op.bordereauCF && op.bordereauCF !== ''); });
    if(bad.length > 0){notify("error", "Erreur", `${bad.length} OP ne sont plus disponibles.`); setSelectedOps([]); return;}
    
    ask("Génération", `Générer un bordereau CF pour ${selectedOps.length} OP ?`, async () => {
      setSaving(true);
      try{
        const batch = writeBatch(db);
        
        // MODIFICATION ICI : Calcul du numéro en temps réel pour permettre la réutilisation
        const pf = 'BT-CF';
        const sp = projet?.sigle || 'PROJET'; 
        const ss = getSigleSrc(activeSourceBT);
        const a = exerciceActif?.annee || new Date().getFullYear();
        
        // ANALYSE RÉELLE : On cherche le numéro le plus élevé parmi les bordereaux existants
        let maxNum = 0;
        bordereaux
          .filter(b => b.type === 'CF' && b.sourceId === activeSourceBT && b.exerciceId === exerciceActif?.id && b.statut !== 'SUPPRIME')
          .forEach(b => {
            const match = (b.numero || '').match(/BT-CF-(\d+)\//);
            if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
          });

        const next = maxNum + 1;
        const num = `${pf}-${String(next).padStart(4, '0')}/${sp}-${ss}/${a}`;

        const btRef = doc(collection(db, 'bordereaux'));
        batch.set(btRef, {
          numero: num, type: 'CF', sourceId: activeSourceBT, exerciceId: exerciceActif.id,
          dateCreation: new Date().toISOString().split('T')[0], dateTransmission: null,
          opsIds: selectedOps, nbOps: selectedOps.length, totalMontant: totalSelected,
          statut: 'EN_COURS', createdAt: new Date().toISOString()
        });
        selectedOps.forEach(opId => {
          batch.update(doc(db, 'ops', opId), { bordereauCF: num, updatedAt: new Date().toISOString() });
        });
        
        // On ne met PAS à jour le compteur global de l'exercice pour permettre la réutilisation si supprimé
        
        await batch.commit();
        notify("success", "Succès", "Le bordereau a été généré.");
        setSelectedOps([]);
        setSubTabCF('BORDEREAUX');
      }catch(e){notify("error", "Erreur", e.message);}
      setSaving(false);
    });
  };

  const handleTransmettre = async (bt) => {
    const d = readDate('trans_' + bt.id);
    if(!d){notify("error","Erreur","Saisissez une date."); return;}
    if(minDateLimit && d < minDateLimit) { notify("error", "Erreur", "La date de transmission ne peut pas être antérieure à l'exercice actif."); return; }
    ask("Confirmation", `Transmettre ${bt.numero} au CF le ${formatDate(d)} ?`, async () => {
      setSaving(true);
      try{
        const batch = writeBatch(db);
        batch.update(doc(db, 'bordereaux', bt.id), {dateTransmission: d, statut: 'ENVOYE', updatedAt: new Date().toISOString()});
        bt.opsIds.forEach(opId => {
          batch.update(doc(db, 'ops', opId), {statut: 'TRANSMIS_CF', dateTransmissionCF: d, updatedAt: new Date().toISOString()});
        });
        await batch.commit();
        notify("success", "Transmis", `Bordereau transmis au CF.`);
      }catch(e){notify("error", "Erreur", e.message);}
      setSaving(false);
    });
  };

  const handleAnnulerTransmission = async (bt) => {
    if(isBordereauLocked(bt)){notify("error", "Bloqué", "Impossible d'annuler : des OP ont déjà été traités."); return;}
    checkPwd(async () => {
      ask("Confirmation", `Annuler la transmission de ${bt.numero} ?`, async () => {
        setSaving(true);
        try{
          const batch = writeBatch(db);
          batch.update(doc(db, 'bordereaux', bt.id), {dateTransmission: null, statut: 'EN_COURS', updatedAt: new Date().toISOString()});
          bt.opsIds.forEach(opId => {
            const op = ops.find(o => o.id === opId);
            if(op && op.statut === 'TRANSMIS_CF') {
               batch.update(doc(db, 'ops', opId), {statut: 'EN_COURS', dateTransmissionCF: null, updatedAt: new Date().toISOString()});
            }
          });
          await batch.commit();
          notify("success", "Annulé", "Transmission annulée.");
          setModalEditBT(prev => prev ? {...prev, dateTransmission: null, statut: 'EN_COURS'} : null);
        }catch(e){notify("error", "Erreur", e.message);}
        setSaving(false);
      });
    });
  };

// ============================================================
  // handleOpenEditBT CORRIGÉE : Force le rafraîchissement des OPs
  // ============================================================
  // ====================================================================
  // handleOpenEditBT CORRIGÉE V2 : Force le rafraîchissement + injection directe
  // ====================================================================
  const handleOpenEditBT = async (bt) => {
    // 1. On active l'état de chargement pour faire patienter l'utilisateur
    setSaving(true);
    
    try {
      // 2. FORCE LE RAFRAÎCHISSEMENT : On refait une requête unique à Firestore
      // pour obtenir la version la plus récente de TOUS les OPs.
      const snapshot = await getDocs(collection(db, 'ops'));
      
      // On crée la liste des OPs frais
      const freshOpsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Met à jour le contexte global (pour le reste de l'application)
      if (setOps) setOps(freshOpsList);

      // 3. MODIFICATION ICI : On stocke les données fraîches DIRECTEMENT dans l'objet de la modale.
      // Au lieu de passer juste 'bt', on passe '{ ...bt, freshOps: freshOpsList }'.
      // Cela garantit que la modale aura accès à ces données spécifiques,
      // même si le contexte global met du temps à se mettre à jour.
      setEditBtNumero(bt.numero || '');
      setEditBtDate(bt.dateTransmission || '');
      
      // On ouvre la modale en lui injectant les OPs frais qu'on vient de télécharger
      setModalEditBT({ ...bt, freshOps: freshOpsList }); // <- Injection directe de force
      
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des OPs:", error);
      notify("error", "Erreur", "Impossible de rafraîchir les données des OPs.");
    } finally {
      // 4. On désactive l'état de chargement
      setSaving(false);
    }
  };
  const handleSaveBtNumero = async (bt) => {
    const nn = editBtNumero.trim(); if(!nn){notify("error", "Erreur", "Numéro vide."); return;}
    if(nn === bt.numero) return;
    checkPwd(async () => {
      if(bordereaux.find(b => b.numero === nn && b.id !== bt.id && b.type === 'CF')){notify("error", "Doublon", "Ce numéro existe déjà."); return;}
      try{
        await updateDoc(doc(db,'bordereaux',bt.id),{numero: nn, updatedAt: new Date().toISOString()});
        for(const opId of (bt.opsIds||[])) await updateDoc(doc(db,'ops',opId),{bordereauCF: nn, updatedAt: new Date().toISOString()});
        setModalEditBT(p => p ? {...p, numero: nn} : null);
        notify("success", "Modifié", "Numéro mis à jour.");
      }catch(e){notify("error", "Erreur", e.message);}
    });
  };

  const handleSaveBtDate = async (bt) => {
    if(!editBtDate){notify("error", "Erreur", "Date requise."); return;}
    if(minDateLimit && editBtDate < minDateLimit) { notify("error", "Erreur", "La date ne peut pas être antérieure à l'année de l'exercice en cours."); return; }
    if(editBtDate === bt.dateTransmission) return;
    checkPwd(async () => {
      try{
        await updateDoc(doc(db,'bordereaux',bt.id),{dateTransmission: editBtDate, updatedAt: new Date().toISOString()});
        for(const opId of (bt.opsIds||[])) await updateDoc(doc(db,'ops',opId),{dateTransmissionCF: editBtDate, updatedAt: new Date().toISOString()});
        setModalEditBT(p => p ? {...p, dateTransmission: editBtDate} : null);
        notify("success", "Modifié", "Date de transmission mise à jour.");
      }catch(e){notify("error", "Erreur", e.message);}
    });
  };

  const handleAddOpToBT = async (bt, opId) => {
    if(isBordereauLocked(bt)){notify("error", "Bloqué", "Bordereau verrouillé."); return;}
    try{
      const nIds = [...bt.opsIds, opId]; const nT = nIds.reduce((s,id) => s + (ops.find(x=>x.id===id)?.montant||0), 0);
      await updateDoc(doc(db,'bordereaux',bt.id),{opsIds: nIds, nbOps: nIds.length, totalMontant: nT, updatedAt: new Date().toISOString()});
      await updateDoc(doc(db,'ops',opId),{bordereauCF: bt.numero, updatedAt: new Date().toISOString()});
      setModalEditBT(p => p ? {...p, opsIds: nIds, nbOps: nIds.length, totalMontant: nT} : null);
    }catch(e){notify("error", "Erreur", e.message);}
  };

  const handleRemoveOpFromBT = async (bt, opId) => {
    if(isBordereauLocked(bt)){notify("error", "Bloqué", "Bordereau verrouillé."); return;}
    const op = ops.find(o => o.id === opId);
    if(isOpLockedForCF(op)) { notify("error", "Impossible", "Cet OP a déjà avancé."); return; }
    if(bt.opsIds.length <= 1){notify("warning", "Attention", "Un bordereau ne peut pas être vide."); return;}
    ask("Retirer OP", "Retirer cet OP du bordereau ?", async () => {
      try{
        const nIds = bt.opsIds.filter(id => id !== opId); const nT = nIds.reduce((s,id) => s + (ops.find(x=>x.id===id)?.montant||0), 0);
        await updateDoc(doc(db,'bordereaux',bt.id),{opsIds: nIds, nbOps: nIds.length, totalMontant: nT, updatedAt: new Date().toISOString()});
        await updateDoc(doc(db,'ops',opId),{bordereauCF: null, statut: 'EN_COURS', updatedAt: new Date().toISOString()});
        setModalEditBT(p => p ? {...p, opsIds: nIds, nbOps: nIds.length, totalMontant: nT} : null);
      }catch(e){notify("error", "Erreur", e.message);}
    });
  };

  const handleAnnulerBordereau = async (bt) => {
    if(isBordereauLocked(bt)){notify("error", "Bloqué", "Des OP de ce bordereau sont verrouillés."); return;}
    checkPwd(() => {
      ask("Annuler le bordereau", `Voulez-vous vraiment annuler le bordereau ${bt.numero} ?\nLes OP retourneront dans la file d'attente (Nouveau BT).`, async () => {
        setSaving(true);
        try {
          const batch = writeBatch(db);
          // On marque comme SUPPRIME au lieu de supprimer physiquement pour garder trace (optionnel)
          // Mais ici la demande suggère une suppression pour réutiliser le numéro
          batch.delete(doc(db, 'bordereaux', bt.id));
          
          bt.opsIds.forEach(opId => {
            batch.update(doc(db, 'ops', opId), { bordereauCF: null, statut: 'EN_COURS', dateTransmissionCF: null, updatedAt: new Date().toISOString() });
          });
          
          await batch.commit();
          // Pas besoin de décrémenter le compteur de l'exercice car on scanne les numéros existants maintenant
          
          notify("success", "Annulé", "Le bordereau a été supprimé et les OP libérés.");
          if(expandedBT === bt.id) setExpandedBT(null); 
          setModalEditBT(null);
        } catch(e) { notify("error", "Erreur", e.message); }
        setSaving(false);
      });
    });
  };

  const handleRetourCF = async () => {
    if(selectedOps.length === 0){notify("error", "Erreur", "Sélectionnez des OP."); return;}
    const d = readDate('retourCF'); if(!d){notify("error", "Erreur", "Date requise."); return;}
    const opAvantTransmission = selectedOps.map(id => ops.find(o => o.id === id)).find(op => op?.dateTransmissionCF && d < op.dateTransmissionCF);
    if(opAvantTransmission) { notify("error", "Erreur", `La date de validation ne peut pas être antérieure à la date de transmission du bordereau (${formatDate(opAvantTransmission.dateTransmissionCF)}) pour l'OP ${opAvantTransmission.numero}.`); return; }
    if((resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && !motifRetour.trim()){notify("error", "Erreur", "Motif obligatoire."); return;}
    const exec = async () => {
      ask("Confirmation", `Marquer ${selectedOps.length} OP comme "${resultatCF}" ?`, async () => {
        setSaving(true);
        try{
          const batch = writeBatch(db);
          const entreesJournal = [];
          for(const opId of selectedOps) {
            const op = ops.find(o => o.id === opId);
            let upd = { updatedAt: new Date().toISOString() };
            if(resultatCF === 'VISE' && op.type === 'ANNULATION') {
               upd.statut = 'ANNULE'; upd.dateVisaCF = d; upd.dateArchivage = d;
            } else if(resultatCF === 'VISE'){
               upd.statut = 'VISE_CF'; upd.dateVisaCF = d;
            } else if(resultatCF === 'DIFFERE'){
               upd.statut = 'DIFFERE_CF'; upd.dateDiffere = d; upd.motifDiffere = motifRetour.trim();
            } else {
               upd.statut = 'REJETE_CF'; upd.dateRejet = d; upd.motifRejet = motifRetour.trim();
               const cloneRef = doc(collection(db, 'ops'));
               const cloneData = {
                 ...op,
                 type: 'REJET', numero: op.numero + '-R', montant: (op.montant || 0) < 0 ? Math.abs(op.montant || 0) : -Math.abs(op.montant || 0),
                 statut: 'REJETE_CF', dateRejet: d, motifRejet: motifRetour.trim(),
                 opOriginalId: op.id, bordereauCF: null, bordereauAC: null,
                 createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
               };
               delete cloneData.id;
               batch.set(cloneRef, cloneData);
            }
            batch.update(doc(db, 'ops', opId), upd);
            entreesJournal.push({ opId, opNumero: op.numero, details: `CF : ${upd.statut}${motifRetour.trim() ? ' — ' + motifRetour.trim() : ''}` });
          }
          await batch.commit();
          entreesJournal.forEach(({ opId, opNumero, details }) => enregistrerJournal({
            action: ACTIONS_JOURNAL.CHANGEMENT_STATUT, opId, opNumero, details, utilisateur: nomUtilisateurJournal(userProfile),
          }));
          notify("success", "Succès", "Mise à jour effectuée avec succès.");
          setSelectedOps([]); setMotifRetour(''); setModalRetourCF(false);
        }catch(e){notify("error", "Erreur", e.message);}
        setSaving(false);
      });
    };
    if(resultatCF === 'REJETE') checkPwd(exec); else exec();
  };

  const handleAnnulerRetour = async (opId, statut) => {
    checkPwd(() => {
      ask("Annulation", "Annuler la décision et revenir en arrière ?", async () => {
        setSaving(true);
        try{
          await updateDoc(doc(db,'ops',opId),{
            statut: 'TRANSMIS_CF', dateVisaCF: null, dateDiffere: null, motifDiffere: null, dateRejet: null, motifRejet: null, updatedAt: new Date().toISOString()
          }); 
          notify("success", "Annulé", "Retour arrière effectué.");
        }catch(e){ notify("error", "Erreur", e.message); }
        setSaving(false);
      });
    });
  };

  const handleReintroduire = async (opIds) => {
    ask("Réintroduction", `Réintroduire ${opIds.length} OP dans le circuit ?`, async () => {
      setSaving(true);
      try{
        const d = readDate('reintro') || new Date().toISOString().split('T')[0];
        const batch = writeBatch(db);
        for(const opId of opIds){
          const op = ops.find(o => o.id === opId);
          const hist = [...(op?.historiqueDifferes||[]), {dateDiffere: op?.dateDiffere, motifDiffere: op?.motifDiffere, dateReintroduction: d, type: 'CF'}];
          batch.update(doc(db,'ops',opId), { statut: 'TRANSMIS_CF', dateReintroduction: d, historiqueDifferes: hist, dateDiffere: null, motifDiffere: null, updatedAt: new Date().toISOString() });
        }
        await batch.commit();
        notify("success", "OK", `${opIds.length} OP réintroduits.`); setSelectedOps([]);
      }catch(e){notify("error", "Erreur", e.message);}
      setSaving(false);
    });
  };

const handlePrintBordereau = (bt) => {
  const html = buildBordereauPrintHtml({ bt, ops, getBen, projet, montantEnLettres, escapeHtml, LOGO_PIF2, ARMOIRIE, type: 'CF' });
  const w = window.open('','_blank','width=1100,height=700'); w.document.write(html); w.document.close();
};

  const iS = {...styles.input, marginBottom: 0, width: '100%'};
  const thS = {...styles.th, fontSize: 11, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', letterSpacing: .5, background: '#FAFAF8'};
  const crd = {...styles.card, background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)'};

  const getNumBT = (numero) => { const m = (numero||'').match(/-(\d+)\//); return m ? parseInt(m[1]) : 0; };

  const renderBordereaux = (btList) => {
    const enCoursCount = btList.filter(bt => bt.statut === 'EN_COURS').length;
    const searched = filterBordereaux(btList);
    const statusFiltered = filtreStatutBT === 'EN_COURS' ? searched.filter(bt => bt.statut === 'EN_COURS') : searched;
    const sortedBts = statusFiltered.sort((a,b)=>{
      if(triBT==='DATE_ASC') return (a.dateTransmission||a.createdAt||'').localeCompare(b.dateTransmission||b.createdAt||'');
      if(triBT==='DATE_DESC') return (b.dateTransmission||b.createdAt||'').localeCompare(a.dateTransmission||a.createdAt||'');
      return getNumBT(b.numero) - getNumBT(a.numero);
    });
    const totalPagesBT = Math.max(1, Math.ceil(sortedBts.length / BT_PAGE_SIZE));
    const pageBts = sortedBts.slice((pageBT-1)*BT_PAGE_SIZE, pageBT*BT_PAGE_SIZE);
    return (
      <div style={crd}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap',marginBottom:14}}>
          <div>
            <span style={{fontSize:13,color:P.textSec}}>Exercice : </span>
            <strong style={{fontSize:15,color:P.greenDark}}>{(showAnterieurBT ? exercices.find(e=>e.id===selectedExerciceBT) : exerciceActif)?.annee || 'Non défini'}</strong>
            {!showAnterieurBT && exerciceActif && <span style={{background:P.greenLight,color:P.greenDark,padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,marginLeft:8}}>Actif</span>}
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,color:P.textSec}}>
            <input type="checkbox" checked={showAnterieurBT} onChange={e=>{setShowAnterieurBT(e.target.checked); if(!e.target.checked) setSelectedExerciceBT(exerciceActif?.id); setPageBT(1);}} style={{accentColor:P.green}}/>
            Exercices antérieurs
          </label>
          {showAnterieurBT && (
            <select value={selectedExerciceBT || ''} onChange={e=>{setSelectedExerciceBT(e.target.value);setPageBT(1);}} style={{...styles.input,marginBottom:0,width:'auto',padding:'8px 12px'}}>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
            </select>
          )}
        </div>
        <div style={{position:'relative',maxWidth:400,marginBottom:14}}><div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}>{I.search(P.textMuted,16)}</div>
          <input type="text" placeholder="Rechercher bordereau ou OP..." value={searchBT} onChange={e=>{setSearchBT(e.target.value);setPageBT(1);}} style={{...styles.input,marginBottom:0,paddingLeft:40,borderRadius:10,border:`1px solid ${P.border}`,background:'#FAFAF8'}}/>
        </div>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',gap:8}}>
            <STab active={filtreStatutBT==='TOUS'} label="Tous" count={btList.length} color={P.green} onClick={()=>{setFiltreStatutBT('TOUS');setPageBT(1);}}/>
            <STab active={filtreStatutBT==='EN_COURS'} label="En cours" count={enCoursCount} color={P.gold} onClick={()=>{setFiltreStatutBT('EN_COURS');setPageBT(1);}}/>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:11,color:P.textMuted,fontWeight:700}}>TRIER :</span>
            <STab active={triBT==='NUM_DESC'} label="N° ↓" color={P.oliveDark} onClick={()=>{setTriBT('NUM_DESC');setPageBT(1);}}/>
            <STab active={triBT==='DATE_ASC'} label="Date ↑" color={P.oliveDark} onClick={()=>{setTriBT('DATE_ASC');setPageBT(1);}}/>
            <STab active={triBT==='DATE_DESC'} label="Date ↓" color={P.oliveDark} onClick={()=>{setTriBT('DATE_DESC');setPageBT(1);}}/>
          </div>
        </div>
        {sortedBts.length===0?<Empty text="Aucun bordereau"/>:<>
        <div style={{maxHeight:'65vh',overflowY:'auto'}}>
          {pageBts.map(bt=>{
            const isExp = expandedBT === bt.id; const isPrep = bt.statut === 'EN_COURS'; const locked = isBordereauLocked(bt);
            const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
            return (
              <div key={bt.id} style={{marginBottom:4}}>
                <div onClick={()=>setExpandedBT(isExp?null:bt.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:isExp?P.greenLight:isPrep?'#fffde7':P.card,borderRadius:isExp?'12px 12px 0 0':12,border:isExp?`2px solid ${P.green}`:isPrep?`1px dashed ${P.goldBorder}`:`1px solid ${P.border}`,borderBottom:isExp?'none':undefined,cursor:'pointer',transition:'all .15s'}}>
                  <span style={{display:'inline-flex',transform:isExp?'rotate(90deg)':'none',transition:'transform .2s'}}>{I.chevron(P.green,14)}</span>
                  <span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,minWidth:200}}>{bt.numero}</span>
                  <span style={{fontSize:12,color:P.textSec}}>{formatDate(bt.dateTransmission)||formatDate(bt.dateCreation)}</span>
                  <Badge bg={isPrep?P.goldLight:P.greenLight} color={isPrep?P.gold:P.greenDark}>{isPrep?'En cours':'Transmis'}</Badge>
                  <span style={{fontSize:12,color:P.textSec}}>{bt.nbOps} OP</span>
                  <span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,marginLeft:'auto',color:P.greenDark}}>{formatMontant(bt.totalMontant)} F</span>
                  <div style={{display:'flex',gap:8,marginLeft:16}} onClick={e=>e.stopPropagation()}>
                    <IBtn icon={I.print(P.greenDark,16)} title="Imprimer" bg={`${P.greenDark}15`} onClick={()=>handlePrintBordereau(bt)}/>
                    <IBtn icon={locked ? I.lock(P.red, 16) : I.edit(P.greenDark, 16)} title={locked ? "Verrouillé" : "Modifier"} bg={locked ? P.redLight : `${P.greenDark}15`} onClick={()=>handleOpenEditBT(bt)} />
                  </div>
                </div>
                {isExp && <div style={{border:`2px solid ${P.green}`,borderTop:'none',borderRadius:'0 0 12px 12px',padding:16,background:P.card}}>
                  {locked && <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,color:P.gold,fontSize:13,fontWeight:600}}>
                      {I.lock(P.gold,16)} <span>Bordereau verrouillé : Des OP ont avancé.</span>
                  </div>}
                  {isPrep && <div style={{background:P.goldLight,borderRadius:10,padding:14,marginBottom:14,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:600,color:P.gold}}>Date :</span>
                    <input type="date" defaultValue={bt.dateTransmission||''} ref={el=>setDateRef('trans_'+bt.id,el)} style={{...styles.input,marginBottom:0,width:170,borderRadius:8,border:`1px solid ${P.border}`}}/>
                    <ActionBtn label="Transmettre" icon={I.check('#fff',14)} color={P.greenDark} onClick={()=>handleTransmettre(bt)} disabled={saving}/>
                  </div>}
                  <table style={{...styles.table,fontSize:11}}><thead><tr><th style={{...thS,width:30}}>N°</th><th style={{...thS,width:120}}>N° OP</th><th style={{...thS,width:130}}>BÉNÉFICIAIRE</th><th style={thS}>OBJET</th><th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th></tr></thead><tbody>
                    {btOps.map((op,i)=><tr key={op.id}><td style={styles.td}>{i+1}</td><td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{formatNumeroOp(op.numero)}</td><td style={{...styles.td,fontSize:11,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={getBen(op)}>{getBen(op)}</td><td style={{...styles.td,fontSize:11,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={op.objet}>{op.objet||'-'}</td><td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td></tr>)}
                  </tbody></table>
                </div>}
              </div>
            );
          })}
        </div>
        {totalPagesBT > 1 && (
          <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:12,marginTop:14}}>
            <button onClick={()=>setPageBT(p=>Math.max(1,p-1))} disabled={pageBT<=1} title="Page précédente" style={{width:32,height:32,padding:0,borderRadius:6,border:`1px solid ${P.border}`,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:pageBT<=1?'not-allowed':'pointer',opacity:pageBT<=1?0.4:1}}>{I.chevronLeft()}</button>
            <span style={{fontSize:12,color:P.textSec,fontWeight:600}}>Page {pageBT} / {totalPagesBT}</span>
            <button onClick={()=>setPageBT(p=>Math.min(totalPagesBT,p+1))} disabled={pageBT>=totalPagesBT} title="Page suivante" style={{width:32,height:32,padding:0,borderRadius:6,border:`1px solid ${P.border}`,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:pageBT>=totalPagesBT?'not-allowed':'pointer',opacity:pageBT>=totalPagesBT?0.4:1}}>{I.chevronRight()}</button>
          </div>
        )}
        </>}
      </div>
    );
  };

  const renderSuivi = (differes, rejetes, subTab, setSubTab) => <div>
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      <STab active={subTab==='DIFFERES'} label="Différés" count={differes.length} color={P.gold} onClick={()=>{setSubTab('DIFFERES');setSelectedOps([]);}}/>
      <STab active={subTab==='REJETES'} label="Rejetés" count={rejetes.length} color={P.red} onClick={()=>{setSubTab('REJETES');setSelectedOps([]);}}/>
    </div>
    <div style={{marginBottom:12}}><input type="text" placeholder="Rechercher..." value={searchSuivi} onChange={e=>setSearchSuivi(e.target.value)} style={{...styles.input,maxWidth:400,marginBottom:0,borderRadius:10,border:`1px solid ${P.border}`}}/></div>
    {subTab==='DIFFERES' && <div style={crd}>
      {filterOps(differes,searchSuivi).length===0?<Empty text="Aucun différé"/>:<>
      <div style={{maxHeight:'65vh',overflowY:'auto'}}><table style={styles.table}><thead><tr>
        <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(differes,searchSuivi).length&&selectedOps.length>0} onChange={()=>toggleAll(filterOps(differes,searchSuivi))}/></th>
        <th style={{...thS,width:110}}>N° OP</th>
        <th style={{...thS,width:70}}>TYPE</th>
        <th style={{...thS,width:130}}>BÉNÉFICIAIRE</th>
        <th style={thS}>OBJET</th>
        <th style={{...thS,width:90,textAlign:'right'}}>MONTANT</th>
        <th style={{...thS,width:80}}>DATE</th>
        <th style={thS}>MOTIF</th>
        <th style={{...thS,width:36}}></th>
      </tr></thead><tbody>{filterOps(differes,searchSuivi).map(op=>{const ch=selectedOps.includes(op.id);
        return <tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.goldLight:'transparent'}}>
          <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
          <td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{formatNumeroOp(op.numero)}</td>
          <td style={{...styles.td,fontSize:10,fontWeight:600}}>{op.type}</td>
          <td style={{...styles.td,fontSize:11,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={getBen(op)}>{getBen(op)}</td>
          <td style={{...styles.td,fontSize:11,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={op.objet}>{op.objet||'-'}</td>
          <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
          <td style={{...styles.td,fontSize:11}}>{formatDate(op.dateDiffere)}</td>
          <td style={{...styles.td,fontSize:11}}>{op.motifDiffere||'-'}</td>
          <td style={styles.td} onClick={e=>e.stopPropagation()}><IBtn icon={I.undo(P.gold,14)} title="Annuler" bg={`${P.gold}15`} onClick={()=>handleAnnulerRetour(op.id,'DIFFERE_CF')}/></td>
        </tr>;})}</tbody></table></div>
      
      {selectedOps.length > 0 && selectedOps.some(id=>differes.find(o=>o.id===id)) && <div style={{marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px'}}>
        <div style={{display:'flex', alignItems:'center', gap: '10px'}}>
           <label style={{fontSize:13,fontWeight:600,color:P.text}}>Date de réintroduction :</label>
           <input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el=>setDateRef('reintro',el)} style={{...styles.input,marginBottom:0,width:150,borderRadius:8,border:`1px solid ${P.border}`}}/>
        </div>
        <ActionBtn label={`Réintroduire (${selectedOps.length})`} color={P.gold} onClick={()=>handleReintroduire(selectedOps)} disabled={saving}/>
      </div>}</>}
    </div>}
    {subTab==='REJETES' && <div style={crd}>
      {filterOps(rejetes,searchSuivi).length===0?<Empty text="Aucun rejeté"/>:
      <div style={{maxHeight:'65vh',overflowY:'auto'}}><table style={styles.table}><thead><tr>
        <th style={{...thS,width:110}}>N° OP</th>
        <th style={{...thS,width:70}}>TYPE</th>
        <th style={{...thS,width:130}}>BÉNÉFICIAIRE</th>
        <th style={thS}>OBJET</th>
        <th style={{...thS,width:90,textAlign:'right'}}>MONTANT</th>
        <th style={{...thS,width:80}}>DATE</th>
        <th style={thS}>MOTIF</th>
        <th style={{...thS,width:36}}></th>
      </tr></thead><tbody>{filterOps(rejetes,searchSuivi).map(op=><tr key={op.id} style={{background:P.redLight}}>
        <td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{formatNumeroOp(op.numero)}</td>
        <td style={{...styles.td,fontSize:10,fontWeight:600}}>{op.type}</td>
        <td style={{...styles.td,fontSize:11,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={getBen(op)}>{getBen(op)}</td>
        <td style={{...styles.td,fontSize:11,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={op.objet}>{op.objet||'-'}</td>
        <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:P.red}}>{formatMontant(op.montant)}</td>
        <td style={{...styles.td,fontSize:11}}>{formatDate(op.dateRejet)}</td>
        <td style={{...styles.td,fontSize:11}}>{op.motifRejet||'-'}</td>
        <td style={styles.td}><IBtn icon={I.undo(P.red,14)} title="Annuler" bg={P.redLight} onClick={()=>handleAnnulerRetour(op.id,'REJETE_CF')}/></td>
      </tr>)}</tbody></table></div>}
    </div>}
  </div>;

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
      <h1 style={{fontSize:22,fontWeight:700,color:P.greenDark,margin:0}}>Contrôle Financier (CF)</h1>
      <button onClick={handleFixOrphanOps} style={{padding:'8px 12px',background:P.goldLight,border:`1px solid ${P.goldBorder}`,borderRadius:8,display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:11,fontWeight:700,color:P.gold,boxShadow:'0 1px 2px rgba(0,0,0,.05)'}}>
        {I.refresh(P.gold,14)} Actualiser
      </button>
    </div>
    
    <div style={{display:'flex',gap:8,padding:'16px 0',flexWrap:'wrap'}}>
      {sources.map(src=>{
        const isActif = activeSourceBT === src.id;
        const srcColor = src.couleur || P.greenDark; 
        return (
          <button key={src.id} onClick={()=>{setActiveSourceBT(src.id);setSelectedOps([]);setExpandedBT(null);closeAllModals();setPageBT(1);}}
            style={{padding:'8px 20px',borderRadius:10,border:isActif?`2px solid ${srcColor}`:'2px solid transparent',background:isActif?srcColor:'#EDEAE5',color:isActif?'#fff':P.textSec,fontWeight:700,cursor:'pointer',fontSize:13,boxShadow:isActif?`0 2px 8px ${srcColor}55`:'none'}}>
            {src.sigle}
          </button>
        )
      })}
    </div>

    <ModalAlert data={alertData} onClose={() => setAlertData(null)} />

    <div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <STab active={subTabCF==='NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color={P.greenDark} onClick={()=>chgSub(setSubTabCF,'NOUVEAU')}/>
        <STab active={subTabCF==='BORDEREAUX'} label="Bordereaux" count={bordereauCF.length} color={P.green} onClick={()=>chgSub(setSubTabCF,'BORDEREAUX')}/>
        <STab active={subTabCF==='RETOUR'} label="Retour CF" count={opsTransmisCF.length} color={P.gold} onClick={()=>chgSub(setSubTabCF,'RETOUR')}/>
        <STab active={subTabCF==='SUIVI'} label="Suivi" count={opsDifferesCF.length+opsRejetesCF.length} color={P.red} onClick={()=>chgSub(setSubTabCF,'SUIVI')}/>
      </div>
      
      {subTabCF==='NOUVEAU' && <div style={crd}>
        <h3 style={{margin:'0 0 16px',color:P.greenDark,fontSize:15}}>Sélectionner les OP pour un bordereau au CF</h3>
        <input type="text" placeholder="Rechercher OP..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsEligiblesCF,searchBT).length===0?<Empty text="Aucun OP éligible"/>:
        <div style={{maxHeight:'65vh',overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsEligiblesCF,searchBT).length&&filterOps(opsEligiblesCF,searchBT).length>0} onChange={()=>toggleAll(filterOps(opsEligiblesCF,searchBT))}/></th>
          <th style={{...thS,width:110}}>N° OP</th>
          <th style={{...thS,width:70}}>TYPE</th>
          <th style={{...thS,width:130}}>BÉNÉFICIAIRE</th>
          <th style={{...thS,width:250}}>OBJET</th>
          <th style={{...thS,width:70}}>LIGNE</th>
          <th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th>
          <th style={{...thS,width:80}}>STATUT</th>
        </tr></thead><tbody>
          {filterOps(opsEligiblesCF,searchBT).map(op=>{const ch=selectedOps.includes(op.id);
            return <tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.greenLight:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{formatNumeroOp(op.numero)}</td>
              <td style={{...styles.td,fontSize:10,fontWeight:600}}>{op.type}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={getBen(op)}>{getBen(op)}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={op.objet}>{op.objet||'-'}</td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:11}}>{op.ligneBudgetaire||'-'}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={styles.td}><Badge bg={op.statut==='DIFFERE_CF'?P.goldLight:P.greenLight} color={op.statut==='DIFFERE_CF'?P.gold:P.greenDark}>{op.statut==='DIFFERE_CF'?'Différé':'En cours'}</Badge></td>
            </tr>;})}
        </tbody></table></div>}
        
        {selectedOps.length > 0 && <div style={{marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16}}>
          <div style={{fontWeight:700,fontSize:14,color:P.text}}>{selectedOps.length} OP sélectionnés — <span style={{fontSize: 16, color: P.greenDark}}>{formatMontant(totalSelected)} F</span></div>
          <ActionBtn label="Générer Bordereau" icon={I.plus('#fff',14)} color={P.greenDark} onClick={handleCreateBordereauMulti} disabled={saving}/>
        </div>}
      </div>}

      {subTabCF==='BORDEREAUX' && renderBordereaux(bordereauCF)}

      {subTabCF==='RETOUR' && <div style={crd}>
        <h3 style={{margin:'0 0 6px',color:P.gold,fontSize:15}}>OP transmis au CF ({opsTransmisCF.length})</h3>
        <p style={{fontSize:12,color:P.textMuted,marginBottom:16}}>Sélectionnez puis cliquez Retour CF.</p>
        <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsTransmisCF,searchBT).length===0?<Empty text="Aucun OP"/>:
        <div style={{maxHeight:'65vh',overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsTransmisCF,searchBT).length&&filterOps(opsTransmisCF,searchBT).length>0} onChange={()=>toggleAll(filterOps(opsTransmisCF,searchBT))}/></th>
          <th style={{...thS,width:110}}>N° OP</th>
          <th style={{...thS,width:70}}>TYPE</th>
          <th style={{...thS,width:130}}>BÉNÉFICIAIRE</th>
          <th style={{...thS,width:250}}>OBJET</th>
          <th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th>
          <th style={{...thS,width:100}}>N° BT</th>
          <th style={{...thS,width:90}}>TRANSMIS</th>
        </tr></thead><tbody>
          {filterOps(opsTransmisCF,searchBT).map(op=>{const ch=selectedOps.includes(op.id);
            return <tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?`${P.gold}10`:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{formatNumeroOp(op.numero)}</td>
              <td style={{...styles.td,fontSize:10,fontWeight:600}}>{op.type}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={getBen(op)}>{getBen(op)}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={op.objet}>{op.objet||'-'}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:9}}>{op.bordereauCF||'-'}</td>
              <td style={{...styles.td,fontSize:11}}>{formatDate(op.dateTransmissionCF)}</td>
            </tr>;})}
        </tbody></table></div>}
        {selectedOps.length > 0 && <div style={{marginTop:14,textAlign:'right'}}><ActionBtn label="Retour CF" count={selectedOps.length} color={P.gold} onClick={()=>{setModalRetourCF(true);setResultatCF('VISE');setMotifRetour('');}}/></div>}
      </div>}

      {subTabCF==='SUIVI' && renderSuivi(opsDifferesCF, opsRejetesCF, subTabSuiviCF, setSubTabSuiviCF)}
    </div>

    {/* MODALES SPECIFIQUES CF */}
    {modalRetourCF && selectedOps.length > 0 && <Modal title={`Retour CF — ${selectedOps.length} OP`} titleColor={P.gold} onClose={()=>setModalRetourCF(false)}>
      <div style={{marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${P.border}`}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>OP sélectionnés</div>
        {selectedOps.map(opId=>{const op=ops.find(o=>o.id===opId);if(!op)return null;
          return <div key={opId} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:`${P.gold}10`,borderRadius:8,marginBottom:3,fontSize:12}}><span><strong style={{fontFamily:'monospace'}}>{formatNumeroOp(op.numero)}</strong> — {getBen(op)}</span><span style={{fontFamily:'monospace',fontWeight:700}}>{formatMontant(op.montant)} F</span></div>;})}
        <div style={{fontSize:15,fontWeight:800,color:P.gold,marginTop:10,textAlign:'right'}}>Total : {formatMontant(totalSelected)} F</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
        <div>
            <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Décision</div>
            <div style={{display:'flex',gap:8}}>
              {[{v:'VISE',l:'Visé',c:P.green,bg:P.greenLight},{v:'DIFFERE',l:'Différé',c:P.gold,bg:P.goldLight},{v:'REJETE',l:'Rejeté',c:P.red,bg:P.redLight}].map(o=><button key={o.v} onClick={()=>setResultatCF(o.v)} style={{flex:1,padding:'10px 6px',borderRadius:8,fontWeight:700,fontSize:12,cursor:'pointer',border:resultatCF===o.v?`2px solid ${o.c}`:`1px solid ${P.border}`,background:resultatCF===o.v?o.bg:P.card,color:resultatCF===o.v?o.c:P.textMuted,transition:'all .15s'}}>{o.l}</button>)}
            </div>
        </div>
        <div><label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:6}}>Date d'action</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el=>setDateRef('retourCF',el)} style={iS}/></div>
      </div>
      {(resultatCF==='DIFFERE'||resultatCF==='REJETE') && <div style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:6,color:P.red}}>Motif (obligatoire) *</label><textarea value={motifRetour} onChange={e=>setMotifRetour(e.target.value)} placeholder="Justification du retour..." style={{...styles.input,height:60,resize:'vertical',marginBottom:0}}/></div>}
      {resultatCF==='REJETE' && <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:P.redLight,borderRadius:8,marginBottom:14}}>{I.warn(P.red,16)}<span style={{fontSize:12,color:P.red,fontWeight:600}}>La validation demandera le mot de passe admin.</span></div>}
      <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:20}}>
         <button onClick={()=>setModalRetourCF(false)} style={{padding:'10px 20px',border:`1px solid ${P.border}`,borderRadius:8,background:'#fff',color:P.text,fontWeight:600,cursor:'pointer'}}>Annuler</button>
         <button onClick={handleRetourCF} disabled={saving} style={{padding:'10px 24px',border:'none',borderRadius:8,background:resultatCF==='VISE'?P.green:resultatCF==='DIFFERE'?P.gold:P.red,color:'white',fontWeight:700,fontSize:14,cursor:'pointer',minWidth: 150}}>{saving?'Patientez...':`Valider (${selectedOps.length})`}</button>
      </div>
    </Modal>}

    {modalEditBT && <Modal title={`Gestion Bordereau CF — ${modalEditBT.numero}`} titleColor={P.text} onClose={()=>setModalEditBT(null)} width={580}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Numéro du bordereau</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}><input type="text" value={editBtNumero} onChange={e=>setEditBtNumero(e.target.value)} style={{flex:1,...iS,fontFamily:'monospace',fontWeight:700,borderRadius:8}}/><ActionBtn label="Sauver" color={P.gold} onClick={()=>handleSaveBtNumero(modalEditBT)} disabled={saving}/></div>
      </div>
      {modalEditBT.statut === 'ENVOYE' && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Date de transmission (Correction)</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
             <input type="date" value={editBtDate} onChange={e=>setEditBtDate(e.target.value)} style={{flex:1,...iS,borderRadius:8}}/>
             <ActionBtn label="Sauver Date" color={P.goldBorder} onClick={()=>handleSaveBtDate(modalEditBT)} disabled={saving}/>
          </div>
          <p style={{fontSize:11,color:P.textMuted,marginTop:6}}>Ne peut être antérieure à l'année de l'exercice en cours.</p>
        </div>
      )}
   
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>OP du bordereau ({modalEditBT.opsIds?.length||0})</div>
        
        {/* ✅ NOUVELLE LOGIQUE RÉACTIVE */}
        {(modalEditBT.opsIds||[]).map(id=>{
          const targetOpsList = modalEditBT.freshOps || ops; 
          const op = targetOpsList.find(o => o.id === id);
          
          if(!op) return null;
          
          return <div key={id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#FAFAF8',borderRadius:10,marginBottom:4,border:`1px solid ${P.border}`}}>
            <div><div style={{fontFamily:'monospace',fontWeight:700,fontSize:11}}>{formatNumeroOp(op.numero)}</div><div style={{fontSize:12,color:P.textSec}}>{getBen(op)} — {op.objet||'-'}</div></div>
            <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontFamily:'monospace',fontWeight:700,fontSize:12}}>{formatMontant(op.montant)} F</span>
            {!isBordereauLocked(modalEditBT) && <IBtn icon={I.minusCircle(P.red,16)} title="Retirer" bg={P.redLight} onClick={()=>handleRemoveOpFromBT(modalEditBT,op.id)}/>}
            </div>
          </div>;})}
      </div>
      {!isBordereauLocked(modalEditBT) && <div>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Ajouter un OP</div>
        {(()=>{const avails = opsForSource.filter(op=>op.sourceId===modalEditBT.sourceId&&(op.statut==='EN_COURS'||op.statut==='DIFFERE_CF')&&!op.bordereauCF&&!(modalEditBT.opsIds||[]).includes(op.id));
          return <div style={{background:P.greenLight,borderRadius:10,padding:12,maxHeight:200,overflowY:'auto'}}>{avails.length===0?<span style={{fontSize:12,color:P.textMuted}}>Aucun OP disponible</span>:avails.map(op=><div key={op.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderBottom:`1px solid ${P.border}`}}><span style={{fontSize:11}}><strong style={{fontFamily:'monospace'}}>{formatNumeroOp(op.numero)}</strong> — {getBen(op)} — {formatMontant(op.montant)} F</span><IBtn icon={I.plusCircle(P.green,16)} title="Ajouter" bg={P.greenLight} onClick={()=>handleAddOpToBT(modalEditBT,op.id)}/></div>)}</div>;})()}
      </div>}
      {modalEditBT.statut === 'ENVOYE' && !isBordereauLocked(modalEditBT) && (
        <div style={{marginTop:20,borderTop:`1px solid ${P.border}`,paddingTop:16, textAlign:'center'}}>
           <button onClick={()=>handleAnnulerTransmission(modalEditBT)} style={{background:'transparent', border:'none', color:P.gold, fontSize:13, fontWeight:700, cursor:'pointer', textDecoration:'underline'}}>Annuler la transmission globale</button>
        </div>
      )}
      {!isBordereauLocked(modalEditBT) && (
        <div style={{borderTop:`1px solid ${P.border}`,paddingTop:16,marginTop:20}}>
          <button onClick={()=>handleAnnulerBordereau(modalEditBT)} style={{width:'100%',padding:12,border:`1px solid ${P.red}33`,borderRadius:10,background:P.redLight,color:P.red,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{I.trash(P.red,15)} Annuler le bordereau</button>
        </div>
      )}
      {isBordereauLocked(modalEditBT) && (
        <div style={{marginTop:20, display:'flex', alignItems:'center', gap:10, color:P.textSec, fontSize:12, borderTop:`1px solid ${P.border}`, paddingTop:16}}>
          {I.lock(P.gold, 20)}
          <div>
            <strong style={{color: P.gold}}>Bordereau verrouillé.</strong><br/>
            Certains OP ont avancé. Annulez les étapes sur les OP individuels pour débloquer.
          </div>
        </div>
      )}
    </Modal>}
  </div>;
};

export default PageCircuitCF;
