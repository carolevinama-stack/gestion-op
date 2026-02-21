import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, updateDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// COMPOSANTS INTERNES RÉ-UTILISABLES
const Badge = ({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{children}</span>
);

const Empty = ({ text }) => (
  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>{text}</div>
);

const STab = ({ active, label, count, color, onClick }) => (
  <button onClick={onClick} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: active ? color : '#FFF', color: active ? '#fff' : '#666', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    {label} ({count})
  </button>
);

const ActionBtn = ({ label, color, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
    {label}
  </button>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
    <div style={{ background:'#FFF', padding:20, borderRadius:15, width:500 }}>
      <h3 style={{ marginTop:0 }}>{title}</h3>
      {children}
      <div style={{textAlign:'right', marginTop:15}}><button onClick={onClose}>Fermer</button></div>
    </div>
  </div>
);

const PageBordereaux = () => {
  const { projet, sources, exercices, exerciceActif, beneficiaires, ops, setOps, bordereaux, setBordereaux } = useAppContext();
  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [modalRetourCF, setModalRetourCF] = useState(false);
  const [editBtNumero, setEditBtNumero] = useState('');
  const [expandedBT, setExpandedBT] = useState(null);
  const dateRefs = useRef({});

  // DÉFINITION EXPLICITE DES STYLES POUR ÉVITER LES ERREURS VERCEL
  const P = { greenDark: '#1B6B2E', greenLight: '#E8F5E9', gold: '#C5961F', goldLight: '#FFF8E1' };
  const crd = { background: '#FFF', borderRadius: 12, padding: 20, border: '1px solid #E2DFD8', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 };
  const thS = { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#333', background: '#F9F9F8', borderBottom: '1px solid #eee' };
  const iS = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', color: '#000000', fontSize: 13 };

  const setDateRef = (key, el) => { if (el) dateRefs.current['_' + key] = el };
  const readDate = (key) => dateRefs.current['_' + key]?.value || '';
  const toggleOp = (opId) => setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  const toggleAll = (list) => setSelectedOps(prev => prev.length === list.length ? [] : list.map(o => o.id));

  const currentSrc = sources.find(s => s.id === activeSourceBT);
  const opsForSource = useMemo(() => ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActif?.id && op.statut !== 'SUPPRIME'), [ops, activeSourceBT, exerciceActif]);
  const opsEligiblesCF = useMemo(() => opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF') && !op.bordereauCF), [opsForSource]);
  const opsTransmisCF = useMemo(() => opsForSource.filter(op => op.statut === 'TRANSMIS_CF'), [opsForSource]);
  const btsFiltres = useMemo(() => bordereaux.filter(bt => bt.type === mainTab && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id && bt.statut !== 'SUPPRIME'), [bordereaux, activeSourceBT, exerciceActif, mainTab]);

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
    const d = readDate('trans_' + bt.id); if (!d) { alert('Date requise'); return; }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'bordereaux', bt.id), { dateTransmission: d, statut: 'ENVOYE' });
      bt.opsIds.forEach(opId => batch.update(doc(db, 'ops', opId), { statut: 'TRANSMIS_CF', dateTransmissionCF: d }));
      await batch.commit();
      setExpandedBT(null);
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
            upd.statut = 'ANNULE'; upd.dateVisaCF = d;
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
      <h1 style={{ color: P.greenDark, fontSize: 22, fontWeight: 800 }}>Bordereaux de transmission</h1>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {sources.map(s => (
          <button key={s.id} onClick={() => setActiveSourceBT(s.id)} style={{ padding: '8px 16px', borderRadius: 8, border: activeSourceBT === s.id ? `2px solid ${s.couleur}` : '1px solid #ddd', background: activeSourceBT === s.id ? s.couleur : '#fff', color: activeSourceBT === s.id ? '#fff' : '#000', fontWeight: 700, cursor: 'pointer' }}>
            {s.sigle}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <STab active={subTabCF === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color={P.greenDark} onClick={() => setSubTabCF('NOUVEAU')} />
        <STab active={subTabCF === 'BORDEREAUX'} label="Bordereaux" count={btsFiltres.length} color={P.green} onClick={() => setSubTabCF('BORDEREAUX')} />
        <STab active={subTabCF === 'RETOUR'} label="Traitement Visa" count={opsTransmisCF.length} color={P.gold} onClick={() => setSubTabCF('RETOUR')} />
      </div>

      {subTabCF === 'NOUVEAU' && (
        <div style={crd}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{borderBottom:'2px solid #eee'}}><th style={thS}><input type="checkbox" onChange={() => toggleAll(opsEligiblesCF)} /></th><th style={thS}>N° OP</th><th style={thS}>Bénéficiaire</th><th style={{ ...thS, textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>
              {opsEligiblesCF.map(op => (
                <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', borderBottom:'1px solid #eee', background: selectedOps.includes(op.id) ? P.greenLight : '#FFF' }}>
                  <td style={{ padding: 10 }}><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                  <td style={{ padding: 10, fontFamily: 'monospace', fontWeight: 700, color: '#000' }}>{op.numero}</td>
                  <td style={{ padding: 10, color: '#000' }}>{getBen(op)}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: '#000' }}>{formatMontant(op.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedOps.length > 0 && <div style={{marginTop:20}}><ActionBtn label={`Générer Bordereau (${selectedOps.length})`} color={P.greenDark} onClick={() => handleCreateBordereau('CF')} /></div>}
        </div>
      )}

      {subTabCF === 'BORDEREAUX' && (
        <div style={crd}>
          {btsFiltres.length === 0 ? <Empty text="Aucun bordereau" /> : 
            btsFiltres.map(bt => (
              <div key={bt.id} style={{ marginBottom: 10, border: '1px solid #DDD', padding: 15, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#000', fontFamily:'monospace' }}>{bt.numero}</span>
                  <Badge bg={bt.statut === 'EN_COURS' ? P.goldLight : P.greenLight} color={bt.statut === 'EN_COURS' ? P.gold : P.greenDark}>{bt.statut === 'EN_COURS' ? 'Brouillon' : 'Transmis'}</Badge>
                </div>
                {bt.statut === 'EN_COURS' && (
                  <div style={{ marginTop: 15, display: 'flex', gap: 10, alignItems: 'center', background: '#f9f9f9', padding: 10, borderRadius: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#000' }}>Date d'envoi :</label>
                    <input type="date" ref={el => setDateRef('trans_' + bt.id, el)} style={{padding:5, color: '#000'}} />
                    <button onClick={() => handleTransmettre(bt)} style={{ background: P.greenDark, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 5, cursor: 'pointer' }}>Transmettre au CF</button>
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}

      {subTabCF === 'RETOUR' && (
        <div style={crd}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{borderBottom:'2px solid #eee'}}><th style={thS}><input type="checkbox" onChange={() => toggleAll(opsTransmisCF)} /></th><th style={thS}>N° OP</th><th style={thS}>Bénéficiaire</th><th style={{ ...thS, textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>
              {opsTransmisCF.map(op => (
                <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', borderBottom:'1px solid #eee', background: selectedOps.includes(op.id) ? P.goldLight : '#FFF' }}>
                  <td style={{ padding: 10 }}><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                  <td style={{ padding: 10, fontFamily: 'monospace', fontWeight: 700, color: '#000' }}>{op.numero}</td>
                  <td style={{ padding: 10, color: '#000' }}>{getBen(op)}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 700, color: '#000' }}>{formatMontant(op.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedOps.length > 0 && <div style={{marginTop:20}}><ActionBtn label="Valider Visa / Retour" color={P.gold} onClick={() => setModalRetourCF(true)} /></div>}
        </div>
      )}

      {modalRetourCF && (
        <Modal title="Visa du Contrôleur Financier" onClose={() => setModalRetourCF(false)}>
          <div style={{display:'flex', flexDirection:'column', gap: 15}}>
            <div>
              <label style={{display:'block', marginBottom:5, fontWeight:700, fontSize:12, color: '#000'}}>Décision</label>
              <select value={resultatCF} onChange={e => setResultatCF(e.target.value)} style={iS}>
                <option value="VISE">VISER (Approuvé)</option>
                <option value="DIFFERE">DIFFÉRER</option>
                <option value="REJETE">REJETER</option>
              </select>
            </div>
            <div>
              <label style={{display:'block', marginBottom:5, fontWeight:700, fontSize:12, color: '#000'}}>Date du visa/décision</label>
              <input type="date" ref={el => setDateRef('retourCF', el)} defaultValue={new Date().toISOString().split('T')[0]} style={iS} />
            </div>
            {(resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && (
              <div>
                <label style={{display:'block', marginBottom:5, fontWeight:700, fontSize:12, color: '#000'}}>Motif</label>
                <textarea value={motifRetour} onChange={e => setMotifRetour(e.target.value)} style={{...iS, height: 80}} placeholder="Indiquez la raison..." />
              </div>
            )}
            <button onClick={handleRetourCF} disabled={saving} style={{ padding: 12, background: P.greenDark, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Traitement...' : 'Enregistrer la décision'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PageBordereaux;
