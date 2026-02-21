export const styles = {
  // Verrouillage de l'espace à droite de la Sidebar
  container: { display: 'flex', minHeight: '100vh', background: '#F7F5F2' },
  
  main: { 
    marginLeft: '260px', // Taille exacte de ta Sidebar pour éviter le chevauchement
    flex: 1, 
    padding: '20px', 
    width: 'calc(100% - 260px)', 
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden'
  },

  // Ajustement de la barre de filtres (image 2, 4, 6, 7)
  filterGrid: { 
    display: 'flex', 
    gap: '10px', 
    alignItems: 'flex-end', 
    width: '100%',
    padding: '10px 0'
  },

  // En-tête de tableau STICKY (Fixé en haut quand tu scrolles)
  stickyTh: { 
    position: 'sticky', 
    top: 0, 
    zIndex: 10, 
    background: '#F4F4F4', 
    padding: '12px 10px', 
    fontSize: '11px', 
    fontWeight: 700, 
    color: '#333',
    borderBottom: '2px solid #ccc',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  },

  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  td: { padding: '12px 10px', borderBottom: '1px solid #eee', fontSize: '13px', color: '#000' }
};
