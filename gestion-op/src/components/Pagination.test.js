import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

// Un seul composant sert les huit paginations de l'application. Une erreur ici
// se verrait partout à la fois — d'où ces tests.

const boutons = () => ({
  premiere: screen.getByTitle('Première page'),
  precedente: screen.getByTitle('Page précédente'),
  suivante: screen.getByTitle('Page suivante'),
  derniere: screen.getByTitle('Dernière page'),
});

describe('Pagination', () => {
  test('une seule page : rien ne s\'affiche', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('aucune page : rien ne s\'affiche, aucune erreur', () => {
    expect(render(<Pagination page={1} totalPages={0} onChange={() => {}} />).container).toBeEmptyDOMElement();
    expect(render(<Pagination page={1} totalPages={undefined} onChange={() => {}} />).container).toBeEmptyDOMElement();
  });

  test('la position courante est annoncée', () => {
    render(<Pagination page={3} totalPages={7} onChange={() => {}} />);
    expect(screen.getByText(/Page/)).toHaveTextContent('Page 3 / 7');
  });

  test('le suffixe est repris quand il est fourni', () => {
    render(<Pagination page={1} totalPages={4} onChange={() => {}} suffixe="(120 OP)" />);
    expect(screen.getByText(/Page/)).toHaveTextContent('(120 OP)');
  });

  // Le comportement demandé : les doubles flèches mènent aux extrémités.
  test('la double flèche gauche ramène à la première page', async () => {
    const onChange = jest.fn();
    render(<Pagination page={5} totalPages={9} onChange={onChange} />);
    await userEvent.click(boutons().premiere);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('la double flèche droite mène à la dernière page', async () => {
    const onChange = jest.fn();
    render(<Pagination page={5} totalPages={9} onChange={onChange} />);
    await userEvent.click(boutons().derniere);
    expect(onChange).toHaveBeenCalledWith(9);
  });

  test('les flèches simples avancent et reculent d\'une page', async () => {
    const onChange = jest.fn();
    render(<Pagination page={5} totalPages={9} onChange={onChange} />);
    await userEvent.click(boutons().precedente);
    expect(onChange).toHaveBeenCalledWith(4);
    await userEvent.click(boutons().suivante);
    expect(onChange).toHaveBeenCalledWith(6);
  });

  // Le choix explicite : on grise aux extrémités, on ne boucle pas. Quelqu'un qui
  // clique « précédent » en page 1 et se retrouverait à la fin croirait à un bug.
  test('en première page, les deux boutons de gauche sont désactivés', () => {
    render(<Pagination page={1} totalPages={5} onChange={() => {}} />);
    const b = boutons();
    expect(b.premiere).toBeDisabled();
    expect(b.precedente).toBeDisabled();
    expect(b.suivante).toBeEnabled();
    expect(b.derniere).toBeEnabled();
  });

  test('en dernière page, les deux boutons de droite sont désactivés', () => {
    render(<Pagination page={5} totalPages={5} onChange={() => {}} />);
    const b = boutons();
    expect(b.premiere).toBeEnabled();
    expect(b.precedente).toBeEnabled();
    expect(b.suivante).toBeDisabled();
    expect(b.derniere).toBeDisabled();
  });

  test('un clic sur un bouton désactivé ne déclenche rien', async () => {
    const onChange = jest.fn();
    render(<Pagination page={1} totalPages={5} onChange={onChange} />);
    await userEvent.click(boutons().precedente);
    expect(onChange).not.toHaveBeenCalled();
  });

  // Garde-fou interne : même appelé avec une page hors bornes, le composant ne
  // renvoie jamais une page qui n'existe pas.
  test('la page demandée reste toujours dans les bornes', async () => {
    const onChange = jest.fn();
    render(<Pagination page={0} totalPages={3} onChange={onChange} />);
    await userEvent.click(screen.getByTitle('Page suivante'));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('les quatre boutons sont bien des boutons, pas des liens', () => {
    render(<Pagination page={2} totalPages={5} onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
});
