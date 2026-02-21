export const styles = {
  // Verrouille l'espace à droite de la sidebar (260px)
  main: { 
    marginLeft: '260px', 
    flex: 1, 
    padding: '20px', 
    minHeight: '100vh',
    background: '#F7F5F2',
    display: 'flex',
    flexDirection: 'column'
  },
  
  // Grille rigide pour les filtres (évite les chevauchements)
  filterGrid: { 
    display: 'grid', 
    gridTemplateColumns: '2fr 1fr 0.8fr 1.2fr 1.2fr 1fr auto', 
    gap: '15px', 
    alignItems: 'end', 
    marginBottom: '20px' 
  },

  // En-tête de tableau réellement figé
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
    textAlign: 'left'
  },

  tableWrapper: { 
    flex: 1, 
    overflowY: 'auto', 
    background: '#fff', 
    borderRadius: 12 
  }
};
