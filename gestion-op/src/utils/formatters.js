// ==================== UTILITAIRES ====================

// Échappe les caractères HTML spéciaux pour prévenir les injections XSS
// lorsqu'une valeur est insérée dans du HTML généré dynamiquement (ex: document.write).
export const escapeHtml = (str) => String(str ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Neutralise l'injection de formules Excel/CSV : préfixe une apostrophe devant
// tout texte commençant par = + - @, pour empêcher son interprétation comme formule.
export const sanitizeForExport = (str) => {
  const s = String(str ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

export const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

// Ajoute un espace après "N°" (ex: "N°0001/..." -> "N° 0001/...") pour que le
// symbole degré ne soit pas collé aux chiffres dans les polices monospace.
export const formatNumeroOp = (numero) => String(numero ?? '').replace(/^N°(?!\s)/, 'N° ');

export const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR');
};

// Convertit un montant en toutes lettres (français), pour les bordereaux imprimés.
// Fonction identique auparavant dupliquée dans PageCircuitCF.js et PageCircuitAC.js.
export const montantEnLettres = (n) => {
  const neg=n<0;n=Math.abs(n);if(n===0)return'zéro';
  const u=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
  const d=['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
  const cb=(num)=>{
    if(num===0)return'';if(num<20)return u[num];
    if(num<100){const dz=Math.floor(num/10);const r=num%10;
      if(dz===7||dz===9)return d[dz]+(r===0?'-dix':(r===1&&dz===7?' et onze':'-'+u[10+r]));
      if(r===0)return d[dz]+(dz===8?'s':'');if(r===1&&dz<8)return d[dz]+' et un';return d[dz]+'-'+u[r];}
    const c=Math.floor(num/100);const r=num%100;
    let s=c===1?'cent':u[c]+' cent';if(r===0&&c>1)s+='s';else if(r>0)s+=' '+cb(r);return s;
  };
  const g=[{v:1e9,l:'milliard',lp:'milliards'},{v:1e6,l:'million',lp:'millions'},{v:1e3,l:'mille',lp:'mille'},{v:1,l:'',lp:''}];
  let res='';let rem=Math.floor(Math.abs(n));
  for(const x of g){const c=Math.floor(rem/x.v);rem=rem%x.v;if(c===0)continue;
    if(x.v===1){res+=(res?' ':'')+cb(c);continue;}
    if(x.v===1000&&c===1){res+=(res?' ':'')+'mille';continue;}
    res+=(res?' ':'')+cb(c)+' '+(c>1?x.lp:x.l);}
  return(neg?'moins ':'')+res.trim();
};

// Export CSV (compatible Excel)
export const exportToCSV = (data, filename) => {
  // Ajouter BOM pour UTF-8 (Excel)
  const BOM = '\uFEFF';
  const csvContent = BOM + data;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
