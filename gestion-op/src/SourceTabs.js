import React from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';

const SourceTabs = ({ activeSource, onChangeSource }) => {
  const { sources, setCurrentPage } = useAppContext();

  return (
    <div style={styles.sourceTabs}>
      {sources.map(source => (
        <div
          key={source.id}
          onClick={() => onChangeSource(source.id)}
          style={activeSource === source.id 
            ? { ...styles.sourceTabActive, background: source.couleur || '#0f4c3a', borderColor: source.couleur || '#0f4c3a' }
            : styles.sourceTab
          }
        >
          {source.sigle || source.nom}
        </div>
      ))}
      {sources.length === 0 && (
        <div style={{ color: '#6c757d', fontSize: 14 }}>
          Aucune source configurée. <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Ajouter une source</span>
        </div>
      )}
    </div>
  );
};

export default SourceTabs;
