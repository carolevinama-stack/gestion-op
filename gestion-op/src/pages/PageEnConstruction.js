import React from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import SourceTabs from '../components/SourceTabs';

const PageEnConstruction = ({ title, icon }) => {
  const { sources } = useAppContext();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>{icon} {title}</h1>
      <SourceTabs activeSource={sources[0]?.id} onChangeSource={() => {}} />
      <div style={{ ...styles.card, textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🚧</div>
        <h2 style={{ color: '#6c757d' }}>Module en cours de développement</h2>
        <p style={{ color: '#adb5bd' }}>Cette fonctionnalité sera disponible prochainement</p>
      </div>
    </div>
  );
};

export default PageEnConstruction;
