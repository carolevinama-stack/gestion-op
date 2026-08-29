import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { ACTIONS_JOURNAL, nomUtilisateurJournal } from '../utils/journal';

const PAGE_SIZE = 50;
const MAX_ENTREES = 1000; // plafond de lecture, pour limiter le coût Firestore sur un journal qui grossit continuellement

const LABELS_ACTION = {
  [ACTIONS_JOURNAL.CREATION]: { label: 'Création', color: '#2e7d32', bg: '#E8F5E9' },
  [ACTIONS_JOURNAL.MODIFICATION]: { label: 'Modification', color: '#C5961F', bg: '#fff3e0' },
  [ACTIONS_JOURNAL.SUPPRESSION]: { label: 'Suppression', color: '#C43E3E', bg: '#ffebee' },
  [ACTIONS_JOURNAL.RESTAURATION]: { label: 'Restauration', color: '#1565C0', bg: '#E3F2FD' },
  [ACTIONS_JOURNAL.CHANGEMENT_STATUT]: { label: 'Changement de statut', color: '#6A1B9A', bg: '#F3E5F5' },
};

const formatDateHeure = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const PageJournal = () => {
  const [entrees, setEntrees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aRecherche, setARecherche] = useState(false);

  const [recherche, setRecherche] = useState('');
  const [filtreUtilisateur, setFiltreUtilisateur] = useState('TOUS');
  const [filtreAction, setFiltreAction] = useState('TOUS');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [page, setPage] = useState(0);
  const [utilisateurs, setUtilisateurs] = useState([]);

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then(snap => {
        const noms = snap.docs
          .map(d => nomUtilisateurJournal(d.data()))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setUtilisateurs([...new Set(noms)]);
      })
      .catch(e => console.error('Erreur chargement utilisateurs:', e));
  }, []);

  const lancerRecherche = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'journal'), orderBy('date', 'desc'), limit(MAX_ENTREES));
      const snap = await getDocs(q);
      setEntrees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Erreur chargement journal:', e);
    }
    setARecherche(true);
    setPage(0);
    setLoading(false);
  };

  const entreesFiltrees = useMemo(() => {
    const rech = recherche.trim().toLowerCase();
    return entrees.filter(e => {
      if (filtreAction !== 'TOUS' && e.action !== filtreAction) return false;
      if (filtreUtilisateur !== 'TOUS' && e.utilisateur !== filtreUtilisateur) return false;
      if (dateDebut && (e.date || '') < dateDebut) return false;
      if (dateFin && (e.date || '') > dateFin + 'T23:59:59') return false;
      if (rech && !(`${e.opNumero || ''} ${e.details || ''}`.toLowerCase().includes(rech))) return false;
      return true;
    });
  }, [entrees, recherche, filtreUtilisateur, filtreAction, dateDebut, dateFin]);

  const totalPages = Math.max(1, Math.ceil(entreesFiltrees.length / PAGE_SIZE));
  const pageAffichee = Math.min(page, totalPages - 1);
  const entreesPage = entreesFiltrees.slice(pageAffichee * PAGE_SIZE, (pageAffichee + 1) * PAGE_SIZE);

  return (
    <div>
      <div style={styles.title}>Journal des actions</div>

      <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.1fr 1.3fr 120px 120px', gap: 12 }}>
          <div>
            <label style={styles.label}>RECHERCHE (N° OP, détails)</label>
            <input
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); setPage(0); }}
              onKeyDown={(e) => { if (e.key === 'Enter') lancerRecherche(); }}
              placeholder="Rechercher..."
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>UTILISATEUR</label>
            <select value={filtreUtilisateur} onChange={(e) => { setFiltreUtilisateur(e.target.value); setPage(0); }} style={styles.select}>
              <option value="TOUS">Tous les utilisateurs</option>
              {utilisateurs.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>ACTION</label>
            <select value={filtreAction} onChange={(e) => { setFiltreAction(e.target.value); setPage(0); }} style={styles.select}>
              <option value="TOUS">Toutes les actions</option>
              {Object.entries(LABELS_ACTION).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={styles.label}>DU</label>
            <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); setPage(0); }} style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>AU</label>
            <input type="date" value={dateFin} onChange={(e) => { setDateFin(e.target.value); setPage(0); }} style={styles.input} />
          </div>
        </div>

        <button onClick={lancerRecherche} disabled={loading} style={{ ...styles.button, alignSelf: 'flex-start', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Recherche...' : aRecherche ? 'Actualiser' : 'Rechercher'}
        </button>
      </div>

      {!aRecherche ? (
        <div style={{ ...styles.card, textAlign: 'center', color: '#888' }}>
          Choisissez vos critères ci-dessus puis cliquez sur "Rechercher" pour afficher le journal.
        </div>
      ) : loading ? (
        <div style={{ ...styles.card, textAlign: 'center', color: '#888' }}>Chargement du journal...</div>
      ) : entreesFiltrees.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', color: '#888' }}>Aucune entrée ne correspond à ces critères.</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.stickyTh, width: 140 }}>Date</th>
                <th style={{ ...styles.stickyTh, width: 150 }}>Utilisateur</th>
                <th style={{ ...styles.stickyTh, width: 160 }}>Action</th>
                <th style={{ ...styles.stickyTh, width: 160 }}>N° OP</th>
                <th style={{ ...styles.stickyTh, whiteSpace: 'normal' }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {entreesPage.map(e => {
                const style = LABELS_ACTION[e.action] || { label: e.action, color: '#555', bg: '#f0f0f0' };
                return (
                  <tr key={e.id}>
                    <td style={styles.td}>{formatDateHeure(e.date)}</td>
                    <td style={styles.td}>{e.utilisateur}</td>
                    <td style={styles.td}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: style.color, background: style.bg }}>
                        {style.label}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace' }}>{e.opNumero || ''}</td>
                    <td style={{ ...styles.td, whiteSpace: 'normal' }}>{e.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {aRecherche && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
          <button disabled={pageAffichee === 0} onClick={() => setPage(p => p - 1)} style={{ ...styles.buttonIcon, opacity: pageAffichee === 0 ? 0.4 : 1 }}>◀</button>
          <span style={{ fontSize: 13, color: '#666' }}>Page {pageAffichee + 1} / {totalPages} ({entreesFiltrees.length} entrées)</span>
          <button disabled={pageAffichee >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ ...styles.buttonIcon, opacity: pageAffichee >= totalPages - 1 ? 0.4 : 1 }}>▶</button>
        </div>
      )}

      {aRecherche && entrees.length >= MAX_ENTREES && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#C5961F', textAlign: 'center' }}>
          Seules les {MAX_ENTREES} entrées les plus récentes sont chargées.
        </div>
      )}
    </div>
  );
};

export default PageJournal;
