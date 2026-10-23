import React from 'react';
import { render, screen } from '@testing-library/react';
import HistoriqueRejets, { BadgeRejets } from './HistoriqueRejets';

// Le pendant du bloc des différés, pour les rejets. Avant, annuler un rejet
// effaçait sa date et son motif définitivement : plus rien ne disait qu'un OP
// avait été rejeté, ni pourquoi. Ces tests verrouillent la trace.

const opRejetAnnule = () => ({
  numero: 'N°0042/SP',
  statut: 'TRANSMIS_CF',
  historiqueRejets: [{
    dateRejet: '2026-04-15',
    motifRejet: 'Facture non conforme',
    dateAnnulation: '2026-04-20',
    type: 'CF',
    parQui: 'Awa',
  }],
});

describe('HistoriqueRejets', () => {
  test('un OP jamais rejeté n\'affiche aucun bloc', () => {
    const { container } = render(<HistoriqueRejets op={{ numero: 'N°0001/SP' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('op absent ou nul : aucun bloc, aucune erreur', () => {
    expect(render(<HistoriqueRejets op={null} />).container).toBeEmptyDOMElement();
    expect(render(<HistoriqueRejets op={undefined} />).container).toBeEmptyDOMElement();
  });

  test('un rejet annulé garde sa date, son motif et son auteur', () => {
    render(<HistoriqueRejets op={opRejetAnnule()} />);
    expect(screen.getByText('15/04/2026')).toBeInTheDocument();
    expect(screen.getByText('Facture non conforme')).toBeInTheDocument();
    expect(screen.getByText('20/04/2026')).toBeInTheDocument();
    expect(screen.getByText('Awa')).toBeInTheDocument();
    expect(screen.getByText('ANNULÉ')).toBeInTheDocument();
  });

  test('le circuit d\'où venait le rejet est nommé', () => {
    render(<HistoriqueRejets op={opRejetAnnule()} />);
    expect(screen.getByText('CONTRÔLEUR FINANCIER')).toBeInTheDocument();
  });

  test('un rejet de l\'AC est nommé comme tel', () => {
    const op = opRejetAnnule();
    op.historiqueRejets[0].type = 'AC';
    render(<HistoriqueRejets op={op} />);
    expect(screen.getByText('AGENT COMPTABLE')).toBeInTheDocument();
  });

  // Par défaut le bloc ne montre que les rejets ANNULÉS : le rejet en cours a
  // déjà son encadré rouge dans Liste OP comme dans Consulter OP, et l'afficher
  // ici en plus ferait doublon.
  test('un rejet en cours n\'est pas repris par défaut', () => {
    const { container } = render(<HistoriqueRejets op={{
      statut: 'REJETE_CF', dateRejet: '2026-04-15', motifRejet: 'Facture non conforme',
    }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('avecEnCours montre le rejet en cours, sans date d\'annulation', () => {
    render(<HistoriqueRejets avecEnCours op={{
      statut: 'REJETE_CF', dateRejet: '2026-04-15', motifRejet: 'Facture non conforme',
    }} />);
    expect(screen.getByText('EN COURS')).toBeInTheDocument();
    expect(screen.queryByText('Rejet annulé le :')).not.toBeInTheDocument();
  });

  test('un rejet sans motif s\'affiche quand même', () => {
    const op = opRejetAnnule();
    delete op.historiqueRejets[0].motifRejet;
    render(<HistoriqueRejets op={op} />);
    expect(screen.getByText('15/04/2026')).toBeInTheDocument();
    expect(screen.queryByText('MOTIF')).not.toBeInTheDocument();
  });

  test('deux rejets annulés sont tous les deux affichés, le plus récent d\'abord', () => {
    render(<HistoriqueRejets op={{
      historiqueRejets: [
        { dateRejet: '2026-04-15', motifRejet: 'Premier motif', dateAnnulation: '2026-04-20', type: 'CF' },
        { dateRejet: '2026-06-01', motifRejet: 'Second motif', dateAnnulation: '2026-06-05', type: 'CF' },
      ],
    }} />);
    const motifs = screen.getAllByText(/^(Premier|Second) motif$/).map(e => e.textContent);
    expect(motifs).toEqual(['Second motif', 'Premier motif']);
  });
});

describe('BadgeRejets', () => {
  test('un OP jamais rejeté n\'a pas de pastille', () => {
    expect(render(<BadgeRejets op={{ numero: 'N°0001/SP' }} />).container).toBeEmptyDOMElement();
  });

  test('la pastille compte les rejets annulés', () => {
    render(<BadgeRejets op={opRejetAnnule()} />);
    expect(screen.getByText('1 rejet annulé')).toBeInTheDocument();
  });

  test('le détail du rejet est dans l\'infobulle', () => {
    render(<BadgeRejets op={opRejetAnnule()} />);
    expect(screen.getByTitle(/rejeté le 15\/04\/2026.*Facture non conforme/)).toBeInTheDocument();
  });
});
