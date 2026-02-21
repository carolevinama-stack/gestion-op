import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, updateDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const P = {
  bg:'#F6F4F1', card:'#FFFFFF', green:'#2E9940', greenDark:'#1B6B2E', greenLight:'#E8F5E9',
  gold:'#C5961F', goldLight:'#FFF8E1', red:'#C43E3E', orange:'#D4722A', border:'#E2DFD8'
};

const I = {
  settings:()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  chevron:(c)=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
};

const Badge = ({ bg, color, children }) => <span style={{ background: bg, color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{children}</span>;
const Empty = ({ text }) => <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>{text}</div>;
const STab = ({ active, label, count, color, onClick }) => <button onClick={onClick} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: active ? color : '#FFF', color: active ? '#fff' : '#666', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>{label} ({count})</button>;
const ActionBtn = ({ label, color, onClick, disabled }) => <button onClick={onClick} disabled={disabled} style={{ padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>{label}</button>;
const IBtn = ({ icon, onClick }) => <button onClick={onClick} style={{ border: 'none', background: '#EEE', borderRadius: 8, padding: 6, cursor: 'pointer' }}>{icon}</button>;
const Modal = ({ title, onClose, children }) => <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}><div style={{ background:'#FFF', padding:20, borderRadius:15, width:500 }}><h3 style={{ marginTop:0 }}>{title}</h3>{children}<button onClick={onClose} style={{ marginTop:15 }}>Fermer</button></div></div>;

const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, setOps, bordereaux, setBordereaux } = useAppContext();
  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [modalRetourCF, setModalRetourCF] = useState(false);
  const [modalEditBT, setModalEditBT] = useState(null);
  const [editBtNumero, setEditBtNumero] = useState('');
  const [expandedBT, setExpandedBT] = useState(null);
  const dateRefs = useRef({});

  // DÉCLARATION DU STYLE MANQUANT
  const crd = { background: '#FFF', borderRadius: 14, padding: 20, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)' };
  const thS = { padding: 10, textAlign: 'left', fontSize: 11, background: '#F9F9F9', fontWeight: 700 };
  const iS = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #DDD', color: '#000' };

  const setDateRef = (key, el) => { if (el) dateRefs.current['_' + key] = el };
  const readDate = (key) => dateRefs.current['_' + key]?.value || '';
  const toggleOp = (opId) => setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  const toggleAll = (list) => setSelectedOps(prev => prev.length === list.length ? [] : list.map(o => o.id));

  const exerciceActif = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);
  const opsForSource = useMemo(() => ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActif?.id && op.statut !== 'SUPPRIME'), [ops, activeSourceBT, exerciceActif]);
  const opsEligiblesCF = useMemo(() => opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF') && !op.bordereauCF), [opsForSource]);
  const opsTransmisCF = useMemo(() => opsForSource.filter(op => op.statut === 'TRANSMIS_CF'), [opsForSource]);
  const bordereauCF = useMemo(() => bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id && bt.statut !== 'SUPPRIME'), [bordereaux, activeSourceBT, exerciceActif]);

  const getBen = (op) => op?.beneficiaireNom || beneficiaires.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';

  const genNumeroBT = async (typeBT) => {
    const pf = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const cId = `${typeBT}_${activeSourceBT}_${exerciceActif?.id}`;
    const cRef = doc(db, 'compteurs', cId);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(cRef);
      const next = (snap.exists() ? (snap.data().count || 0) : 0) + 1;
      tx.set(cRef, { count: next, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif?.id });
      return `${pf}-${String(next).padStart(4, '0')}/${projet?.sigle || 'PROJET'}-${currentSrc?.sigle || 'SRC'}/${exerciceActif?.annee}`;
    });
  };

  const handleCreateBordereau = async (typeBT) => {
    if (selectedOps.length === 0) return;
    setSaving(true);
    try {
      const num = await genNumeroBT(typeBT);
      const batch = writeBatch(db);
      const btRef = doc(collection(db, 'bordereaux'));
      const totalBT = selectedOps.reduce((s, id) => s + (ops.find(o => o.id === id)?.montant || 0), 0);
      batch.set(btRef, {
        numero: num, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif.id,
        dateCreation: new Date().toISOString().split('T')[0], opsIds: selectedOps, nbOps: selectedOps.length,
        totalMontant: totalBT, statut: 'EN_COURS', createdAt: new Date().toISOString()
      });
      const field = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';
      selectedOps.forEach(opId => batch.update(doc(db, 'ops', opId), { [field]: num }));
      await batch.commit();
      setSelectedOps([]);
      setSubTabCF('BORDEREAUX');
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleTransmettre = async (bt) => {
    const d = readDate('trans_' + bt.id); if (!d) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'bordereaux', bt.id), { dateTransmission: d, statut: 'ENVOYE' });
      bt.opsIds.forEach(opId => batch.update(doc(db, 'ops', opId), { statut: 'TRANSMIS_CF', dateTransmissionCF: d }));
      await batch.commit();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleRetourCF = async () => {
    const d = readDate('retourCF'); if (!d) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const opId of selectedOps) {
        const op = ops.find(o => o.id === opId);
        let upd = { updatedAt: new Date().toISOString() };
        if (resultatCF === 'VISE') {
          if (op.type === 'ANNULATION') {
            upd.statut = 'ANNULE'; upd.dateVisaCF = d; upd.dateArchivage = d; 
            if (op.opProvisoireId) batch.update(doc(db, 'ops', op.opProvisoireId), { statut: 'ANNULE', dateAnnulation: d });
          } else { upd.statut = 'VISE_CF'; upd.dateVisaCF = d; }
        } else if (resultatCF === 'DIFFERE') {
          upd.statut = 'DIFFERE_CF'; upd.dateDiffere = d; upd.motifDiffere = motifRetour;
        } else {
          upd.statut = 'REJETE_CF'; upd.dateRejet = d; upd.motifRejet = motifRetour;
        }
        batch.update(doc(db, 'ops', opId), upd);
      }
      await batch.commit();
      setSelectedOps([]); setModalRetourCF(false);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div className="bordereaux-page">
      <style>{` .bordereaux-page input, .bordereaux-page select, .bordereaux-page textarea { color: #000 !important; } `}</style>
      <h1 style={{ color: P.greenDark }}>Bordereaux de transmission</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {sources.map(s => <button key={s.id} onClick={() => setActiveSourceBT(s.id)} style={{ padding: 10, background: activeSourceBT === s.id ? s.couleur : '#FFF', color: activeSourceBT === s.id ? '#FFF' : '#000' }}>{s.sigle}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <STab active={subTabCF === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color={P.greenDark} onClick={() => setSubTabCF('NOUVEAU')} />
        <STab active={subTabCF === 'BORDEREAUX'} label="Bordereaux" count={bordereauCF.length} color={P.green} onClick={() => setSubTabCF('BORDEREAUX')} />
        <STab active={subTabCF === 'RETOUR'} label="Traitement Visa" count={opsTransmisCF.length} color={P.gold} onClick={() => setSubTabCF('RETOUR')} />
      </div>
      {subTabCF === 'NOUVEAU' && (
        <div style={crd}>
          <table style={{ width: '100%' }}>
            <thead><tr><th><input type="checkbox" onChange={() => toggleAll(opsEligiblesCF)} /></th><th style={thS}>N° OP</th><th style={thS}>Bénéficiaire</th><th style={{ ...thS, textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>
              {opsEligiblesCF.map(op => (
                <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: selectedOps.includes(op.id) ? P.greenLight : '#FFF' }}>
                  <td><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                  <td style={{ padding: 10 }}>{op.numero}</td>
                  <td style={{ padding: 10 }}>{getBen(op)}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{formatMontant(op.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedOps.length > 0 && <ActionBtn label="Créer Bordereau" color={P.greenDark} onClick={() => handleCreateBordereau('CF')} />}
        </div>
      )}
      {subTabCF === 'BORDEREAUX' && (
        <div style={crd}>
          {bordereauCF.map(bt => (
            <div key={bt.id} style={{ marginBottom: 10, border: '1px solid #DDD', padding: 10, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>{bt.numero}</span>
                <IBtn icon={I.settings()} onClick={() => { setEditBtNumero(bt.numero); setModalEditBT(bt); }} />
              </div>
              {bt.statut === 'EN_COURS' && (
                <div style={{ marginTop: 10 }}>
                  <input type="date" ref={el => setDateRef('trans_' + bt.id, el)} />
                  <button onClick={() => handleTransmettre(bt)}>Transmettre</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {subTabCF === 'RETOUR' && (
        <div style={crd}>
          <table style={{ width: '100%' }}>
            <thead><tr><th><input type="checkbox" onChange={() => toggleAll(opsTransmisCF)} /></th><th style={thS}>N° OP</th><th style={thS}>Bénéficiaire</th></tr></thead>
            <tbody>
              {opsTransmisCF.map(op => (
                <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: selectedOps.includes(op.id) ? P.goldLight : '#FFF' }}>
                  <td><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                  <td>{op.numero}</td>
                  <td>{getBen(op)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedOps.length > 0 && <ActionBtn label="Valider Visa" color={P.gold} onClick={() => setModalRetourCF(true)} />}
        </div>
      )}
      {modalRetourCF && (
        <Modal title="Visa CF" onClose={() => setModalRetourCF(false)}>
          <select value={resultatCF} onChange={e => setResultatCF(e.target.value)} style={iS}>
            <option value="VISE">VISER</option>
            <option value="DIFFERE">DIFFERER</option>
            <option value="REJETE">REJETER</option>
          </select>
          <input type="date" ref={el => setDateRef('retourCF', el)} style={{ ...iS, marginTop: 10 }} />
          <button onClick={handleRetourCF} style={{ marginTop: 10 }}>Confirmer</button>
        </Modal>
      )}
    </div>
  );
};

export default PageBordereaux;
