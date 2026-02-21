export const styles = {
  // Structure globale
  container: { display: 'flex', minHeight: '100vh', background: '#F7F5F2' },
  
  // Contenu principal strictement à droite de la sidebar
  main: { 
    marginLeft: '260px', 
    flex: 1, 
    padding: '20px', 
    width: 'calc(100% - 260px)', 
    display: 'flex',
    flexDirection: 'column',
    color: '#000000'
  },

  title: { fontSize: 20, fontWeight: 700, color: '#1B6B2E', marginBottom: 20 },
  card: { background: '#fff', borderRadius: 8, padding: '15px', border: '1px solid #ddd', marginBottom: 20 },

  // Grille de recherche rigide (Colonnes fixes pour éviter tout chevauchement)
  filterGrid: { 
    display: 'grid', 
    gridTemplateColumns: '1.5fr 120px 80px 130px 130px 120px 40px', 
    gap: '12px', 
    alignItems: 'end' 
  },

  input: { padding: '8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, width: '100%', color: '#000' },
  select: { padding: '8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, width: '100%', color: '#000' },
  label: { fontSize: '11px', fontWeight: 700, color: '#444', marginBottom: 4, display: 'block' },

  // Tableau avec en-tête figé (Sticky)
  tableWrapper: { flex: 1, overflowY: 'auto', background: '#fff', border: '1px solid #ddd' },
  table: { width: '100%', borderCollapse: 'collapse' },
  stickyTh: { 
    position: 'sticky', top: 0, zIndex: 10, background: '#EEE', 
    padding: '10px', fontSize: '11px', fontWeight: 700, color: '#000',
    borderBottom: '2px solid #bbb', textAlign: 'left'
  },
  td: { padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px', color: '#000' },

  button: { padding: '10px 20px', background: '#1B6B2E', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 },
  buttonIcon: { padding: '6px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' },

  tabs: { display: 'flex', borderBottom: '2px solid #ccc', marginBottom: 20 },
  tab: { padding: '10px 15px', cursor: 'pointer', color: '#666', fontSize: '13px' },
  tabActive: { padding: '10px 15px', cursor: 'pointer', color: '#1B6B2E', borderBottom: '2px solid #1B6B2E', fontWeight: 700 }
};
