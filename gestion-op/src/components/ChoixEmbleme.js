import React, { useRef, useState } from 'react';
import { refusFichierLogo, refusImageEnregistree, reduireImage, poidsEncode } from '../utils/imageLogo';

// Choix d'un emblème (logo de la structure, armoirie) pour les documents
// imprimés. L'image est réduite dans le navigateur, puis rangée avec les autres
// paramètres du projet — rien n'est envoyé ailleurs.
//
// `valeur` est l'image enregistrée, `defaut` celle d'origine, affichée tant
// qu'aucune n'a été choisie. Le composant ne garde rien : il rend l'image à la
// page, qui l'enregistre avec le reste du formulaire.
const ChoixEmbleme = ({ valeur, defaut, onChoisir, onErreur }) => {
  const champ = useRef(null);
  const [enCours, setEnCours] = useState(false);
  const image = valeur || defaut;

  const choisirFichier = async (evenement) => {
    const fichier = evenement.target.files && evenement.target.files[0];
    // Le champ est vidé tout de suite : sans cela, choisir deux fois le même
    // fichier ne déclencherait rien la seconde fois.
    evenement.target.value = '';
    const refus = refusFichierLogo(fichier);
    if (refus) { onErreur(refus); return; }

    setEnCours(true);
    try {
      const reduite = await reduireImage(fichier);
      const trop = refusImageEnregistree(reduite);
      if (trop) { onErreur(trop); return; }
      onChoisir(reduite);
    } catch (e) {
      onErreur(e.message || "Cette image n'a pas pu être lue.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 84, height: 84, border: '1.5px solid #e0e0e0', borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {image
          ? <img src={image} alt="Emblème" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          : <span style={{ fontSize: 11, color: '#9e9e9e' }}>Aucune</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <input ref={champ} type="file" accept="image/png,image/jpeg,image/webp"
          onChange={choisirFichier} style={{ display: 'none' }} data-testid="champ-embleme" />
        <button type="button" onClick={() => champ.current && champ.current.click()} disabled={enCours}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', background: '#fff', cursor: enCours ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600 }}>
          {enCours ? 'Lecture…' : 'Changer l’image'}
        </button>
        {valeur && (
          <button type="button" onClick={() => onChoisir(null)}
            style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#C5961F', fontWeight: 600, textAlign: 'left' }}>
            Revenir à l&apos;image d&apos;origine
          </button>
        )}
        <div style={{ fontSize: 11, color: '#9e9e9e' }}>
          PNG, JPEG ou WEBP. L&apos;image est réduite automatiquement
          {valeur ? ` (${Math.round(poidsEncode(valeur) / 1024)} Ko enregistrés)` : ''}.
        </div>
      </div>
    </div>
  );
};

export default ChoixEmbleme;
