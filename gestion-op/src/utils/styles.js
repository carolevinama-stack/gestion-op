export const styles = {
  // Le contenu principal s'adapte dynamiquement
  main: { 
    flex: 1, 
    padding: '20px', 
    minHeight: '100vh',
    background: '#F7F5F2',
    color: '#000000',
    transition: 'margin-left 0.3s ease', // Suit l'animation de la sidebar
    display: 'flex',
    flexDirection: 'column'
  },
  
  // Conteneur de filtres qui occupe TOUTE la largeur
  filterGrid: { 
    display: 'flex', 
    gap: '15px', 
    alignItems: 'flex-end', 
    width: '100%',
    flexWrap: 'nowrap' // Garde tout sur une ligne si possible
  },

  // Groupes de filtres flexibles
  groupRecherche: { flex: 3, minWidth: '200px' }, // Prend 3x plus de place
  groupType: { flex: 1, minWidth: '100px' },
  groupLigne: { flex: 0.8, minWidth: '80px' },
  groupDate: { flex: 1.2, minWidth: '130px' },
  groupStatut: { flex: 1.2, minWidth: '130px' },

  input: { 
    padding: '8px 10px', 
    border: '1.5px solid #e0e0e0', 
    borderRadius: 8, 
    fontSize: 13, 
    width: '100%', // L'input prend 100% de son groupe flexible
    color: '#000000', 
    background: '#ffffff',
    boxSizing: 'border-box'
  },

  // En-tête de tableau figé amélioré
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
  }
};
