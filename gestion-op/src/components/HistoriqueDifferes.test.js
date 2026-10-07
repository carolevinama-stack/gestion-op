import React from 'react';
import { render, screen } from '@testing-library/react';
import HistoriqueDifferes, { BadgeDifferes } from './HistoriqueDifferes';

// Ce composant est celui qui affiche, dans trois pages, les différés qu'un OP a
// subis. Son défaut d'origine — le motif disparaissait après réintroduction —
// n'avait été vu qu'en production. Ces tests le verrouillent.

const opReintroduit = () => ({
  numero: '0042',
  statut: 'TRANSMIS_CF',
  dateTransmissionCF: '2026-03-20',
  historiqueDifferes: [{
    dateDiffere: '2026-03-03',
    motifDiffere: 'Pièce justificative manquante',
    dateReintroduction: '2026-03-20',
    type: 'CF',
    dateTransmissionPrecedente: '2026-03-01',
  }],
});

describe('HistoriqueDifferes', () => {
  test('un OP jamais différé n\'affiche aucun bloc', () => {
    const { container } = render(<HistoriqueDifferes op={{ numero: '0001' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('op absent ou nul : aucun bloc, aucune erreur', () => {
    expect(render(<HistoriqueDifferes op={null} />).container).toBeEmptyDOMElement();
    expect(render(<HistoriqueDifferes op={undefined} />).container).toBeEmptyDOMElement();
  });

  // Le cœur du défaut signalé : après réintroduction, le motif doit rester lisible.
  test('le motif d\'un différé passé reste affiché après réintroduction', () => {
    render(<HistoriqueDifferes op={opReintroduit()} />);
    expect(screen.getByText('Pièce justificative manquante')).toBeInTheDocument();
    expect(screen.getByText('HISTORIQUE DES DIFFÉRÉS')).toBeInTheDocument();
  });

  test('un différé réintroduit est marqué comme tel, pas comme en cours', () => {
    render(<HistoriqueDifferes op={opReintroduit()} />);
    expect(screen.getByText('RÉINTRODUIT')).toBeInTheDocument();
    expect(screen.queryByText('EN COURS')).not.toBeInTheDocument();
  });

  test('un différé encore en cours est marqué EN COURS', () => {
    const op = { statut: 'DIFFERE_CF', dateDiffere: '2026-05-04', motifDiffere: 'En attente de pièce' };
    render(<HistoriqueDifferes op={op} />);
    expect(screen.getByText('EN COURS')).toBeInTheDocument();
    expect(screen.getByText('En attente de pièce')).toBeInTheDocument();
  });

  test('le circuit concerné est nommé en toutes lettres', () => {
    render(<HistoriqueDifferes op={opReintroduit()} />);
    expect(screen.getByText('CONTRÔLEUR FINANCIER')).toBeInTheDocument();
  });

  test('un différé côté AC est attribué à l\'Agent Comptable', () => {
    const op = { statut: 'DIFFERE_AC', dateTransmissionAC: '2026-05-01', dateDiffere: '2026-05-04', motifDiffere: 'Solde' };
    render(<HistoriqueDifferes op={op} />);
    expect(screen.getByText('AGENT COMPTABLE')).toBeInTheDocument();
  });

  test('plusieurs différés sont tous affichés, le plus récent en premier', () => {
    const op = {
      historiqueDifferes: [
        { dateDiffere: '2026-03-03', motifDiffere: 'Premier motif', dateReintroduction: '2026-03-20', type: 'CF' },
        { dateDiffere: '2026-03-25', motifDiffere: 'Second motif', dateReintroduction: '2026-04-02', type: 'CF' },
      ],
    };
    render(<HistoriqueDifferes op={op} />);
    const motifs = screen.getAllByText(/^(Premier|Second) motif$/).map(n => n.textContent);
    expect(motifs).toEqual(['Second motif', 'Premier motif']);
  });

  test('le compteur annonce le nombre de différés', () => {
    const op = {
      historiqueDifferes: [
        { dateDiffere: '2026-03-03', dateReintroduction: '2026-03-20', type: 'CF' },
        { dateDiffere: '2026-03-25', dateReintroduction: '2026-04-02', type: 'CF' },
      ],
    };
    render(<HistoriqueDifferes op={op} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // Les différés enregistrés avant la correction n'ont pas ce champ : l'affichage
  // doit s'en accommoder sans montrer de ligne vide.
  test('une entrée ancienne sans transmission précédente n\'affiche pas cette ligne', () => {
    const op = { historiqueDifferes: [{ dateDiffere: '2026-03-03', motifDiffere: 'x', dateReintroduction: '2026-03-20', type: 'CF' }] };
    render(<HistoriqueDifferes op={op} />);
    expect(screen.queryByText(/Transmission précédente/)).not.toBeInTheDocument();
  });

  test('la transmission précédente est affichée quand elle existe', () => {
    render(<HistoriqueDifferes op={opReintroduit()} />);
    expect(screen.getByText(/Transmission précédente/)).toBeInTheDocument();
  });

  test('un différé sans motif n\'affiche pas d\'encadré motif vide', () => {
    const op = { historiqueDifferes: [{ dateDiffere: '2026-03-03', dateReintroduction: '2026-03-20', type: 'CF' }] };
    render(<HistoriqueDifferes op={op} />);
    expect(screen.queryByText('MOTIF')).not.toBeInTheDocument();
  });
});

describe('BadgeDifferes', () => {
  test('rien à signaler sur un OP jamais différé', () => {
    const { container } = render(<BadgeDifferes op={{ numero: '0001' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('le singulier et le pluriel sont corrects', () => {
    const un = { historiqueDifferes: [{ dateDiffere: '2026-03-03', dateReintroduction: '2026-03-20', type: 'CF' }] };
    render(<BadgeDifferes op={un} />);
    expect(screen.getByText('1 différé')).toBeInTheDocument();

    const deux = {
      historiqueDifferes: [
        { dateDiffere: '2026-03-03', dateReintroduction: '2026-03-20', type: 'CF' },
        { dateDiffere: '2026-03-25', dateReintroduction: '2026-04-02', type: 'CF' },
      ],
    };
    render(<BadgeDifferes op={deux} />);
    expect(screen.getByText('2 différés')).toBeInTheDocument();
  });

  // La pastille ne tient pas le détail : il est dans l'infobulle, donc il doit y être.
  test('l\'infobulle porte le motif et les deux dates', () => {
    render(<BadgeDifferes op={opReintroduit()} />);
    const infobulle = screen.getByText('1 différé').getAttribute('title');
    expect(infobulle).toContain('Pièce justificative manquante');
    expect(infobulle).toContain('CF');
  });

  // Un différé EN COURS n'est pas dans l'historique : la pastille ne doit pas le compter.
  test('un différé en cours n\'est pas compté par la pastille', () => {
    const op = { statut: 'DIFFERE_CF', dateDiffere: '2026-05-04', motifDiffere: 'En attente' };
    const { container } = render(<BadgeDifferes op={op} />);
    expect(container).toBeEmptyDOMElement();
  });
});
