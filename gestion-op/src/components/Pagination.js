import React from 'react';

// ==================== PAGINATION ====================
// Un seul composant pour toutes les listes de l'application : les huit paginations
// se comportaient déjà pareil mais étaient écrites huit fois, avec des styles qui
// avaient commencé à diverger.
//
// Les doubles flèches mènent directement à la première et à la dernière page. Les
// quatre boutons se grisent aux extrémités plutôt que de boucler : quelqu'un qui
// clique « précédent » en page 1 et se retrouverait à la fin croirait à un bug.

const P = { border: '#E2DFD8', textSec: '#7A7A7A', accent: '#1B6B2E' };

const btn = (actif) => ({
  width: 32,
  height: 32,
  padding: 0,
  borderRadius: 6,
  border: `1px solid ${P.border}`,
  background: '#fff',
  color: actif ? P.textSec : '#C8C8C8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  lineHeight: 1,
  cursor: actif ? 'pointer' : 'not-allowed',
  opacity: actif ? 1 : 0.5,
});

const Pagination = ({ page, totalPages, onChange, suffixe = '', accentColor = P.accent }) => {
  if (!totalPages || totalPages <= 1) return null;

  const auDebut = page <= 1;
  const aLaFin = page >= totalPages;
  const aller = (n) => onChange(Math.min(totalPages, Math.max(1, n)));

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
      <button type="button" onClick={() => aller(1)} disabled={auDebut} title="Première page" style={btn(!auDebut)}>«</button>
      <button type="button" onClick={() => aller(page - 1)} disabled={auDebut} title="Page précédente" style={btn(!auDebut)}>‹</button>

      <span style={{ fontSize: 12, color: P.textSec, fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
        Page <strong style={{ color: accentColor }}>{page}</strong> / {totalPages}{suffixe ? ` ${suffixe}` : ''}
      </span>

      <button type="button" onClick={() => aller(page + 1)} disabled={aLaFin} title="Page suivante" style={btn(!aLaFin)}>›</button>
      <button type="button" onClick={() => aller(totalPages)} disabled={aLaFin} title="Dernière page" style={btn(!aLaFin)}>»</button>
    </div>
  );
};

export default Pagination;
