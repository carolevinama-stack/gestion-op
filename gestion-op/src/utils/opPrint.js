// Gabarit d'impression d'un ordre de paiement (OP), extrait de PageConsulterOp.js
// pour réduire la taille de ce fichier. Fonction pure : ne fait que construire une
// chaîne HTML à partir des valeurs qui lui sont passées, sans effet de bord.
export const buildOpPrintHtml = ({
  selectedOp, ben, src, projet, exerciceActif, selectedRib,
  engAnterieurs, engActuel, dotation,
  formatMontant, escapeHtml, LOGO_PIF2, ARMOIRIE
}) => {
  const engCumules = engAnterieurs + engActuel;
  const disponible = dotation - engCumules;
  const fmtSigne = (val) => val < 0 ? ('-' + formatMontant(Math.abs(val))) : formatMontant(val);
  const printMontantTotal = fmtSigne(engActuel);
  const printEngActuel = fmtSigne(engActuel);
  const printEngCumules = fmtSigne(engCumules);
  const printDisponible = fmtSigne(disponible);
  const isBailleur = src?.sigle?.includes('IDA') || src?.sigle?.includes('BAD') || src?.sigle?.includes('UE');
  const isTresor = src?.sigle?.includes('BN') || src?.sigle?.includes('TRESOR') || src?.sigle?.includes('ETAT');

  const prefixeBudgetaire = projet?.codeImputation || '';
  const srcCode = src?.codeImputation || '';
  const codeImputationComplet = [prefixeBudgetaire, srcCode, selectedOp.ligneBudgetaire].filter(Boolean).join(' ').trim();

  const ribDisplay = selectedRib ? (typeof selectedRib === 'object' ? selectedRib.numero : selectedRib) : '';
  const banqueDisplay = selectedRib && typeof selectedRib === 'object' ? selectedRib.banque : '';

  const htmlParts = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OP ' + escapeHtml(selectedOp.numero) + '</title>',
    '<style>',
    '@page { size: A4 portrait; margin: 5mm; }',
    '*{box-sizing:border-box; margin:0; padding:0}',
    'html, body { font-family:"Century Gothic","Trebuchet MS",sans-serif; font-size:11px; line-height:1.3; background:#e0e0e0; height: 100%; }',

    '.toolbar { background:#3B6B8A; padding:12px 20px; display:flex; gap:12px; align-items:center; position:sticky; top:0; z-index:100 }',
    '.toolbar button { padding:8px 20px; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer }',
    '.btn-print { background:#D4722A; color:#fff } .btn-pdf { background:#D4722A; color:#fff } .toolbar-title { color:#fff; font-size:14px; margin-left:auto }',

    /* GABARIT FIXE */
    '.page-container { width: 200mm; height: 287mm; margin: 20px auto; background: #fff; padding: 2mm; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.2); box-sizing: border-box; overflow: hidden; }',

    '.inner-frame { border: 1.5px solid #000; flex: 1; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; }',

    '@media print {',
    '  body { background: #fff !important; }',
    '  .toolbar { display: none !important; }',
    '  .page-container { margin: 0 auto !important; box-shadow: none !important; width: 100% !important; height: 287mm !important; padding: 2mm !important; box-sizing: border-box !important; overflow: hidden !important; page-break-after: avoid !important;}',
    '}',

    '.header{display:flex; border-bottom:1px solid #000; padding: 5px 0;}',
    '.header-logo{width:22%; padding:4px; display:flex; align-items:center; justify-content:center}',
    '.header-logo img{max-height:85px; max-width:100%}',
    '.header-center{width:56%; padding:4px; text-align:center; line-height:1.4}',
    '.header-center .republic{font-weight:bold; font-size:13px}',
    '.header-center .sep{font-size:10px; letter-spacing:1px; color:#333; margin:2px 0}',
    '.header-center .ministry{font-style:italic; font-size:12px}',
    '.header-center .project{font-weight:bold; font-size:12px}',
    '.header-right{width:22%; padding:4px; font-size:11px; text-align:right}',
    '.header-right img{max-height:75px; max-width:90px; margin-bottom:5px}',

    '.op-title-section{text-align:center; padding:6px 10px; border-bottom:1px solid #000}',
    '.exercice-type-line{display:flex; justify-content:space-between; align-items:center}',
    '.exercice-type-line>div:first-child{width:25%; text-align:left; font-size:12px}',
    '.exercice-type-line>div:nth-child(2){width:50%; text-align:center}',
    '.exercice-type-line>div:last-child{width:25%; text-align:right}',
    '.op-title{font-weight:bold; text-decoration:underline; font-size:13px}',
    /* NUMÉRO EN GRAS ET AGRANDI */
    '.op-numero{font-size:14px; margin-top:2px; font-weight:bold;}',

    /* BODY FIGÉ : display flex column pour répartir les marges automatiquement */
    '.body-content{padding:10px 12px; border-bottom:1px solid #000; flex: 1; display: flex; flex-direction: column;}',
    '.type-red{color:#c00; font-weight:bold; font-style:italic}',
    /* ESPACEMENTS AUGMENTÉS */
    '.field{margin-bottom:8px}',
    '.field-title{text-decoration:underline; font-size:11px; margin-bottom:6px}',
    '.field-value{font-weight:bold; font-size:12px}',

    '.checkbox-line{display:flex; align-items:center; margin-bottom:12px; font-size:12px}',
    '.checkbox-label{min-width:240px}',
    '.checkbox-options{display:flex; gap:40px}',
    '.check-item{display:flex; align-items:center; gap:6px}',
    '.box{width:16px; height:14px; border:1px solid #000; display:inline-flex; align-items:center; justify-content:center; font-size:10px}',

    /* Blocs fixés (Espace réduit entre Pièces et Montant) */
    '.block-objet { margin-top: 6px; margin-bottom: 8px; height: 22mm; overflow: hidden; line-height: 1.4; text-align: justify; }',
    '.block-pieces { height: 16mm; overflow: hidden; line-height: 1.4; text-align: justify; margin-bottom: 4px; }',

    /* Le budget centré verticalement par margin: auto 0 */
    '.budget-section{ display: flex; flex-direction: column; flex: 1; margin: auto 0; justify-content: center; }',
    '.budget-row{display:flex; align-items:center; margin-bottom:4px; font-size:12px}',
    '.budget-row .col-left{width:33.33%}',
    '.budget-row .col-center{width:33.33%}',
    '.budget-row .col-right{width:33.33%}',
    '.value-box{border:1px solid #000; padding:3px 10px; text-align:right; font-weight:bold; white-space:nowrap; font-size:12px}',

    '.separator-line { border-top: 1px solid #000; margin: 8px -12px 8px -12px; }',

    /* Tableau budget avec bordures retirées autour des libellés et alignement strict au-dessus de la ligne centre */
    '.budget-table{width:100%; border-collapse:collapse; margin-top:2px;}',
    '.budget-table td{padding:4px 8px; font-size:11px; border:none;}',
    '.budget-table .col-letter{width:4%; text-align:center; font-weight:bold;}',
    '.budget-table .col-label{width:29.33%;}',
    '.budget-table .col-amount{width:33.33%; text-align:right; padding-right:10px; font-weight:bold; border:1px solid #000;}',
    '.budget-table .col-empty{width:33.34%; border:none;}',

    '.signatures-section{display:flex; border-bottom:1px solid #000; height: 50mm;}',
    '.sig-box{width:33.33%; height: 100%; display:flex; flex-direction:column; border-right:1px solid #000}',
    '.sig-box:last-child{border-right:none}',
    '.sig-header{text-align:center; font-weight:bold; font-size:10px; padding:4px; border-bottom:1px solid #000; line-height:1.2}',
    '.sig-content{flex:1; display:flex; flex-direction:column; justify-content:flex-end; padding:8px}',
    '.sig-name{text-align:right; font-weight:bold; text-decoration:underline; font-size:10px}',

    '.abidjan-row{display:flex; border-bottom:1px solid #000; height: 7mm;}',
    '.abidjan-cell{width:33.33%; padding:2px 10px; font-size:10px; border-right:1px solid #000}',
    '.abidjan-cell:last-child{border-right:none}',

    '.acquit-section{display:flex; height: 30mm;}',
    '.acquit-empty{width:66.66%; border-right:1px solid #000}',
    '.acquit-box{width:33.33%; height: 100%; display:flex; flex-direction:column}',
    '.acquit-header{text-align:center; font-size:10px; padding:4px; border-bottom:1px solid #000}',
    '.acquit-content{flex:1}',
    '.acquit-date{font-size:10px; text-align:left; border-top:1px solid #000; padding:4px 10px}',
    '</style></head><body>',
    '<div class="toolbar"><button class="btn-print" onclick="window.print()">Imprimer</button><button class="btn-pdf" onclick="window.print()">Exporter PDF</button><span class="toolbar-title">Aperçu – OP ' + escapeHtml(selectedOp.numero) + '</span></div>',
    '<div class="page-container"><div class="inner-frame">',
    '<div class="header"><div class="header-logo"><img src="' + LOGO_PIF2 + '" alt="PIF2" /></div>',
    '<div class="header-center"><div class="republic">REPUBLIQUE DE CÔTE D\'IVOIRE</div><div class="sep">------------------------</div><div class="ministry">' + escapeHtml(projet?.ministere || '') + '</div><div class="sep">------------------------</div><div class="project">' + escapeHtml(projet?.nomProjet || '') + '</div><div class="sep">------------------------</div></div>',
    '<div class="header-right"><div style="text-align:center;"><img src="' + ARMOIRIE + '" alt="Armoirie" /><div>Union – Discipline – Travail</div></div></div></div>',

    '<div class="op-title-section"><div class="exercice-type-line"><div>EXERCICE&nbsp;&nbsp;<strong>' + (exerciceActif?.annee || '') + '</strong></div><div><div class="op-title">ORDRE DE PAIEMENT</div><div class="op-numero">N° ' + escapeHtml((selectedOp.numero || '').replace(/^N°?\s*/i, '')) + '</div></div><div class="type-red">' + selectedOp.type + '</div></div></div>',

    '<div class="body-content"><div class="field"><div class="field-title">REFERENCE DU BENEFICIAIRE</div></div><div class="field">BENEFICIAIRE :&nbsp;&nbsp;&nbsp;<span class="field-value">' + escapeHtml(ben?.nom || '') + '</span></div><div class="field">COMPTE CONTRIBUABLE :&nbsp;&nbsp;&nbsp;<span class="field-value">' + escapeHtml(ben?.ncc || '') + '</span></div>',
    '<div class="checkbox-line"><span class="checkbox-label">COMPTE DE DISPONIBILITE A DEBITER :</span><div class="checkbox-options"><span class="check-item">BAILLEUR <span class="box">' + (isBailleur ? 'x' : '') + '</span></span><span class="check-item">TRESOR <span class="box">' + (isTresor ? 'x' : '') + '</span></span></div></div>',
    '<div class="checkbox-line"><span class="checkbox-label">MODE DE REGLEMENT :</span><div class="checkbox-options"><span class="check-item">ESPECE <span class="box">' + (selectedOp.modeReglement === 'ESPECES' ? 'x' : '') + '</span></span><span class="check-item">CHEQUE <span class="box">' + (selectedOp.modeReglement === 'CHEQUE' ? 'x' : '') + '</span></span><span class="check-item">VIREMENT <span class="box">' + (selectedOp.modeReglement === 'VIREMENT' ? 'x' : '') + '</span></span></div></div>',

    '<div class="field" style="margin-bottom: 16px;">REFERENCES BANCAIRES :&nbsp;&nbsp;&nbsp;<span class="field-value">' + (selectedOp.modeReglement === 'VIREMENT' ? escapeHtml((banqueDisplay ? banqueDisplay + ' - ' : '') + ribDisplay) : '') + '</span></div>',

    /* OBJET avec une hauteur limite fixe, et un espace naturel */
    '<div class="block-objet">OBJET DE LA DEPENSE :&nbsp;&nbsp;&nbsp;<span class="field-value">' + escapeHtml(selectedOp.objet || '') + '</span></div>',

    /* PIECES JUSTIFICATIVES avec une hauteur limite fixe */
    '<div class="block-pieces">PIECES JUSTIFICATIVES :&nbsp;&nbsp;&nbsp;<span class="field-value">' + escapeHtml(selectedOp.piecesJustificatives || '') + '</span></div>',

    /* Section budget centrée verticalement grâce au margin: auto 0 */
    '<div class="budget-section">',
    '<div class="budget-row"><div class="col-left">MONTANT TOTAL :</div><div class="col-center"><div class="value-box">' + printMontantTotal + '</div></div><div class="col-right"></div></div>',
    '<div class="budget-row"><div class="col-left">IMPUTATION BUDGETAIRE :</div><div class="col-center"><div class="value-box">' + escapeHtml(codeImputationComplet) + '</div></div><div class="col-right"></div></div>',

    '<div class="separator-line"></div>',

    '<table class="budget-table"><tr><td class="col-letter">A</td><td class="col-label">Dotation budgétaire</td><td class="col-amount">' + formatMontant(dotation) + '</td><td class="col-empty"></td></tr>',
    '<tr><td class="col-letter">B</td><td class="col-label">Engagements antérieurs</td><td class="col-amount">' + formatMontant(engAnterieurs) + '</td><td class="col-empty"></td></tr>',
    '<tr><td class="col-letter">C</td><td class="col-label">Engagement actuel</td><td class="col-amount">' + printEngActuel + '</td><td class="col-empty"></td></tr>',
    '<tr><td class="col-letter">D</td><td class="col-label">Engagements cumulés (B + C)</td><td class="col-amount">' + printEngCumules + '</td><td class="col-empty"></td></tr>',
    '<tr><td class="col-letter">E</td><td class="col-label">Disponible budgétaire (A - D)</td><td class="col-amount">' + printDisponible + '</td><td class="col-empty"></td></tr></table>',
    '</div></div>', // Fin budget-section et body-content

    '<div class="signatures-section">' +
    // BLOC COORDONNATRICE
    '<div class="sig-box" style="text-align: center;">' +
      '<div class="sig-header">VISA<br/>' + escapeHtml(projet?.titreCoordonnateur || 'LA COORDONNATRICE') + '</div>' +
      '<div class="sig-content" style="height: 80px;"></div>' + // Espace pour le cachet
      '<div class="sig-name" style="text-align: center; font-weight: bold; text-decoration: underline; width: 100%;">' +
        escapeHtml(projet?.coordonnateur || 'ABE-KOFFI Thérèse') +
      '</div>' +
    '</div>' +

    // AUTRES BLOCS (CF et AC)
    '<div class="sig-box" style="text-align: center;"><div class="sig-header">VISA<br/>CONTRÔLEUR FINANCIER</div><div class="sig-content" style="height: 80px;"></div></div>' +
    '<div class="sig-box" style="text-align: center;"><div class="sig-header">VISA<br/>AGENT COMPTABLE</div><div class="sig-content" style="height: 80px;"></div></div>' +
    '</div>',
    '<div class="abidjan-row"><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div></div>',
    '<div class="acquit-section"><div class="acquit-empty"></div><div class="acquit-box"><div class="acquit-header">ACQUIT LIBERATOIRE</div><div class="acquit-content"></div><div class="acquit-date">Abidjan, le</div></div></div></div></div></div></body></html>'
  ];

  return htmlParts.join('');
};
