import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// ============================================================
// UTILITAIRES
// ============================================================

// Calcul jours ouvrés entre 2 dates
const joursOuvres = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return null;
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  if (isNaN(d1) || isNaN(d2)) return null;
  let count = 0;
  const current = new Date(d1);
  while (current < d2) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

// Calcul jours calendaires
const joursCalendaires = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return null;
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

// Badge délai avec couleur
const DelaiDisplay = ({ jours, seuilOrange, seuilRouge, unite = 'j ouvrés' }) => {
  if (jours === null || jours === undefined) return <span style={{ color: '#999', fontSize: 10 }}>—</span>;
  let bg = '#e8f5e9', color = '#2e7d32'; // vert
  if (jours > seuilOrange) { bg = '#fff3e0'; color = '#e65100'; } // orange
  if (jours > seuilRouge) { bg = '#ffebee'; color = '#c62828'; } // rouge
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {jours} {unite}
    </span>
  );
};

// Badge statut
const StatutBadge = ({ statut }) => {
  const map = {
    CREE: { bg: '#e3f2fd', color: '#1565c0', label: 'Créé' },
    TRANSMIS_CF: { bg: '#fff3e0', color: '#e65100', label: 'Transmis CF' },
    VISE_CF: { bg: '#e8f5e9', color: '#2e7d32', label: 'Visé CF' },
    REJETE_CF: { bg: '#ffebee', color: '#c62828', label: 'Rejeté CF' },
    RETOURNE_CF: { bg: '#fce4ec', color: '#ad1457', label: 'Retourné CF' },
    DIFFERE_CF: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Différé CF' },
    TRANSMIS_AC: { bg: '#fff3e0', color: '#e65100', label: 'Transmis AC' },
    REJETE_AC: { bg: '#ffebee', color: '#c62828', label: 'Rejeté AC' },
    RETOURNE_AC: { bg: '#fce4ec', color: '#ad1457', label: 'Retourné AC' },
    DIFFERE_AC: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Différé AC' },
    PAYE: { bg: '#e8f5e9', color: '#1b5e20', label: 'Payé' },
    PAYE_PARTIEL: { bg: '#f1f8e9', color: '#33691e', label: 'Payé partiel' },
    ARCHIVE: { bg: '#eceff1', color: '#546e6a', label: 'Archivé' },
  };
  const s = map[statut] || { bg: '#eee', color: '#666', label: statut };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{s.label}</span>;
};

// Style tableau
const thStyle = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: 'left', borderBottom: '2px solid #ddd', background: '#f5f7fa', whiteSpace: 'nowrap' };
const tdStyle = { padding: '7px 10px', fontSize: 11, borderBottom: '1px solid #eee' };
const tdRight = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 };

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function PageRapport() {
  const { ops, beneficiaires, sources, bordereaux } = useAppContext();
  const [activeTab, setActiveTab] = useState('compta');
  const [dateRef, setDateRef] = useState(new Date().toISOString().split('T')[0]);

  // Helper
  const getBen = (op) => beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '—';
  const getSource = (op) => sources.find(s => s.id === op.sourceId)?.sigle || '—';
  const getBT = (op, type) => {
    if (type === 'CF') return op.bordereauCF || '—';
    return op.bordereauAC || '—';
  };

  // ============================================================
  // 1. OP en cours à la comptabilité
  // ============================================================
  const opsCompta = useMemo(() => {
    return ops.filter(op =>
      ['CREE', 'VISE_CF', 'RETOURNE_CF', 'RETOURNE_AC', 'DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut)
    );
  }, [ops]);

  // ============================================================
  // 2. OP non visés par le CF
  // ============================================================
  const opsNonVisesCF = useMemo(() => {
    return ops.filter(op => op.statut === 'TRANSMIS_CF').map(op => ({
      ...op,
      delai: joursOuvres(op.dateTransmissionCF, dateRef)
    }));
  }, [ops, dateRef]);

  // ============================================================
  // 3. OP non soldés (transmis AC) + suivi provisoire/définitif
  // ============================================================
  const opsNonSoldes = useMemo(() => {
    return ops.filter(op => ['TRANSMIS_AC'].includes(op.statut)).map(op => {
      const delai = joursOuvres(op.dateTransmissionAC, dateRef);
      // Pour les OP définitifs, retrouver les provisoires rattachés
      let opsProvRattaches = [];
      let ecart = null;
      if (op.type === 'DEFINITIF' && op.opProvisoireId) {
        const prov = ops.find(o => o.id === op.opProvisoireId);
        if (prov) opsProvRattaches.push(prov);
      }
      // Chercher aussi les provisoires qui pointent vers cet OP
      if (op.type === 'DEFINITIF') {
        const provLies = ops.filter(o => o.opProvisoireId === op.id || 
          (o.opProvisoireNumero && o.opProvisoireNumero === op.numero));
        opsProvRattaches = [...opsProvRattaches, ...provLies.filter(p => !opsProvRattaches.find(x => x.id === p.id))];
      }
      // Calcul écart
      if (op.type === 'DEFINITIF' && opsProvRattaches.length > 0) {
        const totalPaye = opsProvRattaches.reduce((sum, p) => sum + Number(p.montantPaye || p.montant || 0), 0);
        ecart = totalPaye - Number(op.montant || 0);
      }
      return { ...op, delai, opsProvRattaches, ecart };
    });
  }, [ops, dateRef]);

  // ============================================================
  // 4. OP à annuler (provisoires visés CF, pas encore d'OP annulation)
  // ============================================================
  const opsAAnnuler = useMemo(() => {
    return ops.filter(op => {
      if (op.type !== 'PROVISOIRE') return false;
      if (!['VISE_CF', 'TRANSMIS_AC', 'PAYE'].includes(op.statut)) return false;
      // Vérifier qu'il n'existe pas déjà un OP d'annulation rattaché
      const hasAnnulation = ops.some(o => o.type === 'ANNULATION' && o.opProvisoireId === op.id);
      return !hasAnnulation;
    }).map(op => ({
      ...op,
      delai: joursOuvres(op.dateVisaCF, dateRef)
    }));
  }, [ops, dateRef]);

  // ============================================================
  // 5. OP à régulariser (provisoires payés, pas de définitif)
  // ============================================================
  const opsARegulariser = useMemo(() => {
    return ops.filter(op => {
      if (op.type !== 'PROVISOIRE') return false;
      if (!['PAYE', 'PAYE_PARTIEL'].includes(op.statut)) return false;
      // Vérifier qu'il n'existe pas déjà un OP définitif rattaché
      const hasDefinitif = ops.some(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
      return !hasDefinitif;
    }).map(op => ({
      ...op,
      delaiJours: joursCalendaires(op.datePaiement, dateRef),
    }));
  }, [ops, dateRef]);

  // ============================================================
  // TABS CONFIG
  // ============================================================
  const tabs = [
    { id: 'compta', label: 'En cours compta', icon: '🏢', count: opsCompta.length },
    { id: 'nonvise', label: 'Non visés CF', icon: '⏳', count: opsNonVisesCF.length },
    { id: 'nonsolde', label: 'Non soldés', icon: '💰', count: opsNonSoldes.length },
    { id: 'annuler', label: 'À annuler', icon: '🚫', count: opsAAnnuler.length },
    { id: 'regulariser', label: 'À régulariser', icon: '📋', count: opsARegulariser.length },
  ];

  // ============================================================
  // EXPORT EXCEL
  // ============================================================
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');

      // Feuille 1 : OP en cours compta
      const data1 = opsCompta.map(op => ({
        'N° OP': op.numero,
        'Bénéficiaire': getBen(op),
        'Objet': op.objet || '',
        'Montant': Number(op.montant || 0),
        'Source': getSource(op),
        'Date création': op.dateCreation || '',
        'Statut': op.statut,
      }));

      // Feuille 2 : OP non visés CF
      const data2 = opsNonVisesCF.map(op => ({
        'N° OP': op.numero,
        'Bénéficiaire': getBen(op),
        'Objet': op.objet || '',
        'Montant': Number(op.montant || 0),
        'Source': getSource(op),
        'N° Bordereau CF': getBT(op, 'CF'),
        'Date transmission CF': op.dateTransmissionCF || '',
        'Délai (j ouvrés)': op.delai ?? '',
        'Statut délai': op.delai > 5 ? '⛔ DÉPASSÉ' : op.delai > 3 ? '⚠️ PROCHE' : '✅ OK',
      }));

      // Feuille 3 : OP non soldés + suivi
      const data3 = opsNonSoldes.map(op => ({
        'N° OP': op.numero,
        'Type': op.type || '',
        'Bénéficiaire': getBen(op),
        'Objet': op.objet || '',
        'Montant OP': Number(op.montant || 0),
        'Montant payé': Number(op.montantPaye || op.montant || 0),
        'N° Bordereau AC': getBT(op, 'AC'),
        'Date transmission AC': op.dateTransmissionAC || '',
        'Délai (j ouvrés)': op.delai ?? '',
        'Statut délai': op.delai > 5 ? '⛔ DÉPASSÉ' : op.delai > 3 ? '⚠️ PROCHE' : '✅ OK',
        'OP provisoires rattachés': op.opsProvRattaches?.map(p => p.numero).join(', ') || '',
        'Écart': op.ecart ?? '',
      }));

      // Feuille 4 : OP à annuler
      const data4 = opsAAnnuler.map(op => ({
        'N° OP': op.numero,
        'Bénéficiaire': getBen(op),
        'Objet': op.objet || '',
        'Montant': Number(op.montant || 0),
        'Source': getSource(op),
        'Date visa CF': op.dateVisaCF || '',
        'Délai (j ouvrés)': op.delai ?? '',
        'Statut délai': op.delai > 2 ? '⛔ DÉPASSÉ' : '✅ OK',
      }));

      // Feuille 5 : OP à régulariser
      const data5 = opsARegulariser.map(op => {
        const defLie = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
        return {
          'N° OP provisoire': op.numero,
          'Bénéficiaire': getBen(op),
          'Objet': op.objet || '',
          'Montant': Number(op.montant || 0),
          'Montant payé': Number(op.montantPaye || op.montant || 0),
          'Date paiement': op.datePaiement || '',
          'Délai (jours)': op.delaiJours ?? '',
          'Statut délai': op.delaiJours > 60 ? '⛔ DÉPASSÉ' : op.delaiJours > 45 ? '⚠️ PROCHE' : '✅ OK',
          'N° OP définitif': defLie?.numero || '',
        };
      });

      const wb = XLSX.utils.book_new();
      const addSheet = (data, name) => {
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Aucune donnée': '' }]);
        // Largeur colonnes auto
        if (data.length > 0) {
          ws['!cols'] = Object.keys(data[0]).map(key => ({
            wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length)) + 2
          }));
        }
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet(data1, 'En cours compta');
      addSheet(data2, 'Non visés CF');
      addSheet(data3, 'Non soldés');
      addSheet(data4, 'À annuler');
      addSheet(data5, 'À régulariser');

      XLSX.writeFile(wb, `Rapport_OP_${dateRef}.xlsx`);
    } catch (e) {
      alert('Erreur export Excel. Vérifiez que la librairie xlsx est installée (npm install xlsx).\n' + e.message);
    }
  };

  // ============================================================
  // RENDU TABLEAUX
  // ============================================================

  const renderCompta = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>N° OP</th>
          <th style={thStyle}>Bénéficiaire</th>
          <th style={thStyle}>Objet</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
          <th style={thStyle}>Source</th>
          <th style={thStyle}>Date création</th>
          <th style={thStyle}>Statut</th>
        </tr>
      </thead>
      <tbody>
        {opsCompta.length === 0 && <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP en cours</td></tr>}
        {opsCompta.map(op => (
          <tr key={op.id}>
            <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 }}>{op.numero}</td>
            <td style={tdStyle}>{getBen(op)}</td>
            <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td>
            <td style={tdStyle}>{getSource(op)}</td>
            <td style={tdStyle}>{op.dateCreation || '—'}</td>
            <td style={tdStyle}><StatutBadge statut={op.statut} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderNonVisesCF = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>N° OP</th>
          <th style={thStyle}>Bénéficiaire</th>
          <th style={thStyle}>Objet</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
          <th style={thStyle}>Source</th>
          <th style={thStyle}>N° Bordereau</th>
          <th style={thStyle}>Date transm. CF</th>
          <th style={thStyle}>Délai</th>
        </tr>
      </thead>
      <tbody>
        {opsNonVisesCF.length === 0 && <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP en attente de visa CF</td></tr>}
        {opsNonVisesCF.map(op => (
          <tr key={op.id}>
            <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 }}>{op.numero}</td>
            <td style={tdStyle}>{getBen(op)}</td>
            <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td>
            <td style={tdStyle}>{getSource(op)}</td>
            <td style={tdStyle}>{getBT(op, 'CF')}</td>
            <td style={tdStyle}>{op.dateTransmissionCF || '—'}</td>
            <td style={tdStyle}><DelaiDisplay jours={op.delai} seuilOrange={3} seuilRouge={5} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderNonSoldes = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>N° OP</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Bénéficiaire</th>
          <th style={thStyle}>Objet</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant payé</th>
          <th style={thStyle}>N° Bordereau</th>
          <th style={thStyle}>Date transm. AC</th>
          <th style={thStyle}>Délai</th>
          <th style={thStyle}>OP prov. rattachés</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Écart</th>
        </tr>
      </thead>
      <tbody>
        {opsNonSoldes.length === 0 && <tr><td colSpan={11} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP non soldé</td></tr>}
        {opsNonSoldes.map(op => (
          <tr key={op.id}>
            <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 }}>{op.numero}</td>
            <td style={tdStyle}>
              <span style={{ background: op.type === 'PROVISOIRE' ? '#e3f2fd' : op.type === 'DEFINITIF' ? '#f3e5f5' : '#fff3e0', color: op.type === 'PROVISOIRE' ? '#1565c0' : op.type === 'DEFINITIF' ? '#6a1b9a' : '#e65100', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>
                {op.type || '—'}
              </span>
            </td>
            <td style={tdStyle}>{getBen(op)}</td>
            <td style={{ ...tdStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td>
            <td style={tdRight}>{formatMontant(op.montantPaye || op.montant)}</td>
            <td style={tdStyle}>{getBT(op, 'AC')}</td>
            <td style={tdStyle}>{op.dateTransmissionAC || '—'}</td>
            <td style={tdStyle}><DelaiDisplay jours={op.delai} seuilOrange={3} seuilRouge={5} /></td>
            <td style={{ ...tdStyle, fontSize: 9, fontFamily: 'monospace' }}>
              {op.opsProvRattaches?.length > 0 ? op.opsProvRattaches.map(p => p.numero).join(', ') : '—'}
            </td>
            <td style={tdRight}>
              {op.ecart !== null && op.ecart !== undefined ? (
                <span style={{ color: op.ecart > 0 ? '#c62828' : op.ecart < 0 ? '#e65100' : '#2e7d32', fontWeight: 600 }}>
                  {op.ecart > 0 ? `+${formatMontant(op.ecart)} (trop perçu)` : op.ecart < 0 ? `${formatMontant(op.ecart)} (complément)` : '0'}
                </span>
              ) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAAnnuler = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>N° OP</th>
          <th style={thStyle}>Bénéficiaire</th>
          <th style={thStyle}>Objet</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
          <th style={thStyle}>Source</th>
          <th style={thStyle}>Date visa CF</th>
          <th style={thStyle}>Délai</th>
        </tr>
      </thead>
      <tbody>
        {opsAAnnuler.length === 0 && <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP à annuler</td></tr>}
        {opsAAnnuler.map(op => (
          <tr key={op.id}>
            <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 }}>{op.numero}</td>
            <td style={tdStyle}>{getBen(op)}</td>
            <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td>
            <td style={tdStyle}>{getSource(op)}</td>
            <td style={tdStyle}>{op.dateVisaCF || '—'}</td>
            <td style={tdStyle}><DelaiDisplay jours={op.delai} seuilOrange={1} seuilRouge={2} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderARegulariser = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={thStyle}>N° OP provisoire</th>
          <th style={thStyle}>Bénéficiaire</th>
          <th style={thStyle}>Objet</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Montant payé</th>
          <th style={thStyle}>Date paiement</th>
          <th style={thStyle}>Délai</th>
          <th style={thStyle}>OP définitif</th>
        </tr>
      </thead>
      <tbody>
        {opsARegulariser.length === 0 && <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP à régulariser</td></tr>}
        {opsARegulariser.map(op => {
          const defLie = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
          return (
            <tr key={op.id}>
              <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 }}>{op.numero}</td>
              <td style={tdStyle}>{getBen(op)}</td>
              <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '—'}</td>
              <td style={tdRight}>{formatMontant(op.montant)}</td>
              <td style={tdRight}>{formatMontant(op.montantPaye || op.montant)}</td>
              <td style={tdStyle}>{op.datePaiement || '—'}</td>
              <td style={tdStyle}><DelaiDisplay jours={op.delaiJours} seuilOrange={45} seuilRouge={60} unite="jours" /></td>
              <td style={{ ...tdStyle, fontSize: 9, fontFamily: 'monospace' }}>{defLie?.numero || '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div>
      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📊 Rapport</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Date de référence :</label>
          <input
            type="date"
            value={dateRef}
            onChange={e => setDateRef(e.target.value)}
            style={{ ...styles.input, width: 160, marginBottom: 0 }}
          />
          <button onClick={handleExportExcel} style={{ ...styles.button, background: '#1b5e20', display: 'flex', alignItems: 'center', gap: 6 }}>
            📥 Exporter Excel
          </button>
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeTab === tab.id ? '#1a1a2e' : '#f0f0f0',
              color: activeTab === tab.id ? '#fff' : '#333',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#ddd',
              padding: '1px 7px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TOTAUX RÉSUMÉ */}
      {activeTab !== 'compta' && (
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 12, display: 'flex', gap: 20 }}>
          {activeTab === 'nonvise' && (
            <>
              <span>Total : <strong>{formatMontant(opsNonVisesCF.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
              <span>Dépassés ({">"} 5j) : <strong style={{ color: '#c62828' }}>{opsNonVisesCF.filter(o => o.delai > 5).length}</strong></span>
            </>
          )}
          {activeTab === 'nonsolde' && (
            <>
              <span>Total : <strong>{formatMontant(opsNonSoldes.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
              <span>Dépassés ({">"} 5j) : <strong style={{ color: '#c62828' }}>{opsNonSoldes.filter(o => o.delai > 5).length}</strong></span>
            </>
          )}
          {activeTab === 'annuler' && (
            <>
              <span>Total : <strong>{formatMontant(opsAAnnuler.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
              <span>Dépassés ({">"} 2j) : <strong style={{ color: '#c62828' }}>{opsAAnnuler.filter(o => o.delai > 2).length}</strong></span>
            </>
          )}
          {activeTab === 'regulariser' && (
            <>
              <span>Total : <strong>{formatMontant(opsARegulariser.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
              <span>Dépassés ({">"} 60j) : <strong style={{ color: '#c62828' }}>{opsARegulariser.filter(o => o.delaiJours > 60).length}</strong></span>
            </>
          )}
        </div>
      )}

      {/* TABLEAU */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {activeTab === 'compta' && renderCompta()}
        {activeTab === 'nonvise' && renderNonVisesCF()}
        {activeTab === 'nonsolde' && renderNonSoldes()}
        {activeTab === 'annuler' && renderAAnnuler()}
        {activeTab === 'regulariser' && renderARegulariser()}
      </div>
    </div>
  );
}
