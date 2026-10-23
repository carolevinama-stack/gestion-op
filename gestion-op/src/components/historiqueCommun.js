import React from 'react';

// ==================== BRIQUES DES BLOCS D'HISTORIQUE ====================
// Partagées par l'historique des différés et celui des rejets : les deux blocs
// se présentent de la même façon, seules les couleurs et les libellés changent.
// Extraites pour que les deux ne divergent pas visuellement avec le temps.

export const Etiquette = ({ children, couleur, fond }) => (
  <span style={{
    background: fond, color: couleur, padding: '1px 7px', borderRadius: 4,
    fontSize: 10, fontWeight: 800, letterSpacing: '.03em', whiteSpace: 'nowrap',
  }}>{children}</span>
);

export const Ligne = ({ label, valeur, couleur }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ color: '#7A7A7A', fontWeight: 600 }}>{label} :</span>
    <span style={{ fontWeight: 700, color: couleur || '#2B2B2B' }}>{valeur || '—'}</span>
  </div>
);
