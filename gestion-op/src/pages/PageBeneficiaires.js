import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';

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

  const filtered = beneficiaires.filter(b => 
    b.nom?.toLowerCase().includes(search.toLowerCase()) ||
    b.ncc?.toLowerCase().includes(search.toLowerCase())
  );

  // Fonction utilitaire pour obtenir les RIB (rétrocompatibilité avec ancien format)
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
    setForm({ 
      nom: ben.nom, 
      ncc: ben.ncc || '', 
      ribs: getRibs(ben)
    });
    setNewRib({ banque: '', numero: '' });
    setEditBen(ben);
    setShowModal(true);
  };

  // Ajouter un RIB
  const addRib = () => {
    if (!newRib.numero.trim()) {
      alert('Veuillez saisir le numéro RIB');
      return;
    }
    setForm({ ...form, ribs: [...form.ribs, { banque: newRib.banque.trim(), numero: newRib.numero.trim() }] });
    setNewRib({ banque: '', numero: '' });
  };

  // Supprimer un RIB
  const removeRib = (index) => {
    setForm({ ...form, ribs: form.ribs.filter((_, i) => i !== index) });
  };

  // Import CSV/Excel
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Détecter le séparateur (virgule, point-virgule, ou tabulation)
      const firstLine = lines[0] || '';
      let separator = ';';
      if (firstLine.includes('\t')) separator = '\t';
      else if (firstLine.split(',').length > firstLine.split(';').length) separator = ',';

      const parsed = [];
      lines.forEach((line, index) => {
        const cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
        
        // Ignorer l'en-tête si présent
        if (index === 0) {
          const firstCol = cols[0]?.toLowerCase();
          if (firstCol === 'nom' || firstCol === 'name' || firstCol === 'beneficiaire' || firstCol === 'raison sociale') {
            return;
          }
        }

        if (cols[0]) {
          const nom = cols[0].toUpperCase();
          // Vérifier si le nom existe déjà
          const exists = beneficiaires.find(b => b.nom === nom);
          if (!exists) {
            // Convertir ancien format rib en nouveau format ribs
            const ribs = cols[2] ? [{ banque: '', numero: cols[2] }] : [];
            parsed.push({
              nom: nom,
              ncc: cols[1] || '',
              ribs: ribs
            });
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
      const newBeneficiaires = [];
      for (const ben of importData) {
        const docRef = await addDoc(collection(db, 'beneficiaires'), ben);
        newBeneficiaires.push({ id: docRef.id, ...ben });
      }
      setBeneficiaires([...beneficiaires, ...newBeneficiaires].sort((a, b) => a.nom.localeCompare(b.nom)));
      setShowImportModal(false);
      setImportData([]);
      alert(`${newBeneficiaires.length} bénéficiaire(s) importé(s) avec succès`);
    } catch (error) {
      console.error('Erreur import:', error);
      alert('Erreur lors de l\'import');
    }
    setImporting(false);
  };

  const handleSave = async () => {
    if (!form.nom) {
      alert('Le nom est obligatoire');
      return;
    }
    try {
      const dataToSave = {
        nom: form.nom.toUpperCase(),
        ncc: form.ncc || '',
        ribs: form.ribs || []
      };
      
      if (editBen) {
        await updateDoc(doc(db, 'beneficiaires', editBen.id), dataToSave);
        setBeneficiaires(beneficiaires.map(b => b.id === editBen.id ? { ...b, ...dataToSave } : b));
      } else {
        const docRef = await addDoc(collection(db, 'beneficiaires'), dataToSave);
        setBeneficiaires([...beneficiaires, { id: docRef.id, ...dataToSave }].sort((a, b) => a.nom.localeCompare(b.nom)));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (ben) => {
    const opsLies = ops.filter(op => op.beneficiaireId === ben.id);
    if (opsLies.length > 0) {
      alert(`❌ Impossible de supprimer "${ben.nom}".\n\nCe bénéficiaire est lié à ${opsLies.length} OP.\nVeuillez d'abord supprimer ou modifier ces OP.`);
      return;
    }
    if (!window.confirm(`Supprimer "${ben.nom}" ?`)) return;
    try {
      await deleteDoc(doc(db, 'beneficiaires', ben.id));
      setBeneficiaires(beneficiaires.filter(b => b.id !== ben.id));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>👥 Bénéficiaires</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowImportModal(true)} style={{ ...styles.buttonSecondary, background: '#e3f2fd', color: '#1565c0' }}>
            📥 Importer CSV
          </button>
          <button onClick={openNew} style={styles.button}>➕ Nouveau</button>
        </div>
      </div>

      <div style={{ ...styles.card, padding: 16, marginBottom: 20 }}>
        <input 
          type="text" 
          placeholder="🔍 Rechercher par nom ou NCC..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={{ ...styles.input, marginBottom: 0 }}
        />
      </div>

      <div style={styles.card}>
        <div style={{ marginBottom: 16, color: '#6c757d', fontSize: 14 }}>{filtered.length} bénéficiaire(s)</div>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6c757d', padding: 40 }}>Aucun bénéficiaire trouvé</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>NOM</th>
                <th style={styles.th}>NCC</th>
                <th style={styles.th}>RIB(s)</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ben => {
                const ribs = getRibs(ben);
                return (
                  <tr key={ben.id}>
                    <td style={styles.td}><strong>{ben.nom}</strong></td>
                    <td style={styles.td}>{ben.ncc || <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>-</span>}</td>
                    <td style={styles.td}>
                      {ribs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ribs.map((rib, i) => (
                            <div key={i} style={{ fontSize: 11 }}>
                              {rib.banque && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 6px', borderRadius: 4, marginRight: 6, fontWeight: 600 }}>{rib.banque}</span>}
                              <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{rib.numero}</code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#adb5bd', fontStyle: 'italic' }}>-</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => openEdit(ben)} style={{ ...styles.buttonSecondary, padding: '6px 12px', marginRight: 8 }}>✏️</button>
                      <button onClick={() => handleDelete(ben)} style={{ ...styles.buttonSecondary, padding: '6px 12px', background: '#ffebee', color: '#c62828' }}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 600 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#f8f9fa' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{editBen ? '✏️ Modifier' : '➕ Nouveau bénéficiaire'}</h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nom / Raison sociale *</label>
                <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} style={styles.input} placeholder="Ex: SOGEA SATOM" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>NCC (Compte Contribuable)</label>
                <input value={form.ncc || ''} onChange={e => setForm({...form, ncc: e.target.value})} style={styles.input} placeholder="Ex: 1904588 U" />
              </div>
              
              {/* Section RIB */}
              <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Références bancaires (RIB)</label>
                
                {/* Liste des RIB existants */}
                {form.ribs && form.ribs.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    {form.ribs.map((rib, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: 'white', padding: 10, borderRadius: 6, border: '1px solid #e9ecef' }}>
                        {rib.banque && (
                          <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                            {rib.banque}
                          </span>
                        )}
                        <code style={{ flex: 1, fontSize: 12, color: '#333' }}>{rib.numero}</code>
                        <button 
                          type="button"
                          onClick={() => removeRib(index)} 
                          style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Formulaire ajout nouveau RIB */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 8, alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Banque</label>
                    <input 
                      value={newRib.banque} 
                      onChange={e => setNewRib({...newRib, banque: e.target.value})} 
                      style={{ ...styles.input, marginBottom: 0, padding: '8px 10px' }} 
                      placeholder="SGBCI" 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Numéro RIB</label>
                    <input 
                      value={newRib.numero} 
                      onChange={e => setNewRib({...newRib, numero: e.target.value})} 
                      style={{ ...styles.input, marginBottom: 0, padding: '8px 10px', fontFamily: 'monospace' }} 
                      placeholder="CI005 01012 012345678901 25" 
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={addRib} 
                    style={{ ...styles.button, padding: '8px 16px' }}
                  >
                    ➕
                  </button>
                </div>
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={styles.buttonSecondary}>Annuler</button>
              <button onClick={handleSave} style={styles.button}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Bénéficiaires */}
      {showImportModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 700 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#1565c0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>📥 Importer des bénéficiaires</h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <strong style={{ color: '#1565c0' }}>📋 Format attendu (CSV/Excel)</strong>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>
                  3 colonnes : <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>Nom ; NCC ; RIB</code><br/>
                  <span style={{ fontSize: 12, color: '#6c757d' }}>Séparateur accepté : virgule, point-virgule ou tabulation. Les doublons seront ignorés.</span>
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Fichier à importer</label>
                <input 
                  type="file" 
                  accept=".csv,.txt,.xls,.xlsx"
                  onChange={handleFileUpload}
                  style={{ width: '100%', padding: 12, border: '2px dashed #1565c0', borderRadius: 8, cursor: 'pointer' }}
                />
              </div>

              {importData.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <strong style={{ color: '#2e7d32' }}>✓ {importData.length} bénéficiaire(s) à importer</strong>
                  </div>
                  <div style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: 8 }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.th, fontSize: 11 }}>NOM</th>
                          <th style={{ ...styles.th, fontSize: 11 }}>NCC</th>
                          <th style={{ ...styles.th, fontSize: 11 }}>RIB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 50).map((ben, i) => (
                          <tr key={i}>
                            <td style={{ ...styles.td, fontSize: 12 }}>{ben.nom}</td>
                            <td style={{ ...styles.td, fontSize: 12 }}>{ben.ncc || '-'}</td>
                            <td style={{ ...styles.td, fontSize: 12, fontFamily: 'monospace' }}>
                              {ben.ribs && ben.ribs.length > 0 ? ben.ribs[0].numero : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 50 && (
                      <div style={{ padding: 12, textAlign: 'center', color: '#6c757d', fontSize: 12 }}>
                        ... et {importData.length - 50} autre(s)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowImportModal(false); setImportData([]); }} style={styles.buttonSecondary}>Annuler</button>
              <button 
                onClick={handleImport} 
                disabled={importing || importData.length === 0}
                style={{ 
                  ...styles.button, 
                  background: '#1565c0',
                  opacity: importing || importData.length === 0 ? 0.6 : 1 
                }}
              >
                {importing ? 'Import en cours...' : `✓ Importer ${importData.length} bénéficiaire(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PageBeneficiaires;
