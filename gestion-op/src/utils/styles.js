export const styles = {
  // Verrouille le contenu à droite de la sidebar (260px)
  main: { 
    marginLeft: '260px', 
    flex: 1, 
    padding: '20px', 
    minHeight: '100vh',
    background: '#F7F5F2',
    color: '#000000' 
  },
  
  // Barre de filtres : Empêche l'écrasement à gauche
  filterGrid: { 
    display: 'flex', 
    gap: '20px', 
    alignItems: 'flex-end', 
    justifyContent: 'flex-start', // Aligne au début mais avec des tailles fixes
    width: '100%' 
  },

  // Tailles de champs demandées
  groupRecherche: { width: '250px' }, 
  groupType: { width: '130px' },
  groupLigne: { width: '80px' }, // Compact pour 5 caractères
  groupDate: { width: '140px' },
  groupStatut: { width: '140px' },

  // En-tête de tableau FIGÉ (Vrai Sticky)
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

  input: { 
    padding: '8px 10px', 
    border: '1.5px solid #e0e0e0', 
    borderRadius: 8, 
    fontSize: 13, 
    width: '100%', 
    color: '#000000', 
    background: '#ffffff' 
  },
  
  tableWrapper: { 
    flex: 1, 
    overflowY: 'auto', 
    background: '#ffffff', 
    borderRadius: 12,
    marginTop: '10px'
  }
};
