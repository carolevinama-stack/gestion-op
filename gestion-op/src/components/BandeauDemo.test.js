import React from 'react';
import { render, screen } from '@testing-library/react';
import BandeauDemo, { estModeDemo } from './BandeauDemo';

// Le bandeau ne doit JAMAIS apparaître en production. C'est la seule chose qui
// distingue visuellement les deux sites, et une erreur dans un sens comme dans
// l'autre conduit quelqu'un à se tromper de base.

const avecVariables = (vars, fn) => {
  const sauvegarde = { ...process.env };
  Object.assign(process.env, vars);
  try { fn(); } finally { process.env = sauvegarde; }
};

describe('Bandeau de démonstration', () => {
  test('rien ne s\'affiche quand le mode démo n\'est pas activé', () => {
    avecVariables({ REACT_APP_MODE_DEMO: undefined }, () => {
      const { container } = render(<BandeauDemo />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  // Le garde-fou : seule la valeur exacte 'true' active le bandeau. Une variable
  // oubliée à 'false', '0' ou '' ne doit pas l'allumer par accident.
  test('seule la valeur « true » active le bandeau', () => {
    for (const valeur of ['false', '0', '', 'oui', 'TRUE', 'True']) {
      avecVariables({ REACT_APP_MODE_DEMO: valeur }, () => {
        expect(estModeDemo()).toBe(false);
      });
    }
    avecVariables({ REACT_APP_MODE_DEMO: 'true' }, () => {
      expect(estModeDemo()).toBe(true);
    });
  });

  test('en mode démo, le bandeau affiche DÉMO', () => {
    avecVariables({ REACT_APP_MODE_DEMO: 'true' }, () => {
      render(<BandeauDemo />);
      expect(screen.getByText('DÉMO')).toBeInTheDocument();
    });
  });
});
