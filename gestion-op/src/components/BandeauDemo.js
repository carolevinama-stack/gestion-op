import React from 'react';

// ==================== BANDEAU DE DÉMONSTRATION ====================
// Les deux sites — production et démonstration — sont visuellement identiques.
// Sans repère, quelqu'un finit par saisir de vrais OP dans la démonstration, ou
// par croire qu'il est en démonstration alors qu'il touche aux vraies données.
//
// Ce bandeau n'apparaît QUE si REACT_APP_MODE_DEMO vaut 'true'. Cette variable
// n'est définie que sur l'environnement de préversion dans Vercel : la
// production ne peut donc pas l'afficher, même par erreur.
//

export const estModeDemo = () => process.env.REACT_APP_MODE_DEMO === 'true';

const BandeauDemo = () => {
  if (!estModeDemo()) return null;

  return (
    <div
      role="status"
      style={{
        position: 'sticky', top: 0, zIndex: 50000,
        background: '#D4722A', color: '#fff',
        padding: '8px 16px', textAlign: 'center',
        fontSize: 13, fontWeight: 800, letterSpacing: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}
    >
      DÉMO
    </div>
  );
};

export default BandeauDemo;
