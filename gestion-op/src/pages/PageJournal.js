import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { ACTIONS_JOURNAL } from '../utils/journal';

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
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreAction, setFiltreAction] = useState('TOUS');
  const [filtreUtilisateur, setFiltreUtilisateur] = useState('TOUS');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'journal'), orderBy('date', 'desc'), limit(MAX_ENTREES));
    const unsub = onSnapshot(q, (snap) => {
      setEntrees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const utilisateurs = useMemo(() => [...new Set(entrees.map(e => e.utilisateur).filter(Boolean))].sort(), [entrees]);

  const entreesFiltrees = useMemo(() => {
    const rech = recherche.trim().toLowerCase();
    return entrees.filter(e => {
      if (filtreAction !== 'TOUS' && e.action !== filtreAction) return false;
      if (filtreUtilisateur !== 'TOUS' && e.utilisateur !== filtreUtilisateur) return false;
      if (rech && !(`${e.opNumero || ''} ${e.details || ''} ${e.utilisateur || ''}`.toLowerCase().includes(rech))) return false;
      return true;
    });
  }, [entrees, recherche, filtreAction, filtreUtilisateur]);

  useEffect(() => { setPage(0); }, [recherche, filtreAction, filtreUtilisateur]);

  const totalPages = Math.max(1, Math.ceil(entreesFiltrees.length / PAGE_SIZE));
  const entreesPage = entreesFiltrees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pillStyle = (active) => ({
    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: `1.5px solid ${active ? '#1B6B2E' : '#ddd'}`, background: active ? '#1B6B2E' : '#fff',
    color: active ? '#fff' : '#555', whiteSpace: 'nowrap',
  });

  return (
    <div>
      <div style={styles.title}>Journal des actions</div>

      <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par N° OP, détail ou utilisateur..."
          style={styles.input}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div onClick={() => setFiltreAction('TOUS')} style={pillStyle(filtreAction === 'TOUS')}>Toutes les actions</div>
          {Object.entries(LABELS_ACTION).map(([key, { label }]) => (
            <div key={key} onClick={() => setFiltreAction(key)} style={pillStyle(filtreAction === key)}>{label}</div>
          ))}
        </div>

        {utilisateurs.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div onClick={() => setFiltreUtilisateur('TOUS')} style={pillStyle(filtreUtilisateur === 'TOUS')}>Tous les utilisateurs</div>
            {utilisateurs.map(u => (
              <div key={u} onClick={() => setFiltreUtilisateur(u)} style={pillStyle(filtreUtilisateur === u)}>{u}</div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ ...styles.card, textAlign: 'center', color: '#888' }}>Chargement du journal...</div>
      ) : entreesFiltrees.length === 0 ? (
        <div style={{ ...styles.card, textAlign: 'center', color: '#888' }}>Aucune entrée dans le journal.</div>
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ ...styles.buttonIcon, opacity: page === 0 ? 0.4 : 1 }}>◀</button>
          <span style={{ fontSize: 13, color: '#666' }}>Page {page + 1} / {totalPages} ({entreesFiltrees.length} entrées)</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ ...styles.buttonIcon, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>▶</button>
        </div>
      )}

      {entrees.length >= MAX_ENTREES && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#C5961F', textAlign: 'center' }}>
          Seules les {MAX_ENTREES} entrées les plus récentes sont affichées.
        </div>
      )}
    </div>
  );
};

export default PageJournal;
