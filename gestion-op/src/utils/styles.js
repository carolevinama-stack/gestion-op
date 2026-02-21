export const styles = {
  container: { 
    display: 'flex', 
    minHeight: '100vh', 
    background: '#F7F5F2' 
  },
  // On fixe le marginLeft à 260px pour ne JAMAIS passer sous la sidebar
  main: { 
    marginLeft: '260px', 
    flex: 1, 
    padding: '20px', 
    width: 'calc(100% - 260px)', // On s'assure que le contenu prend toute la place restante
    color: '#000000'
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1B6B2E', marginBottom: 16 },
  card: { background: '#fff', borderRadius: 12, padding: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 16 },
  
  // ALIGNEMENT DES CHAMPS : Largeurs fixes pour éviter les superpositions
  filterGrid: { display: 'flex', gap: '15px', alignItems: 'flex-end' },
  input: { padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, color: '#000', width: '100%' },
  select: { padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, color: '#000', width: '100%' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' },

  // TABLEAU ET EN-TETE FIGE
  table: { width: '100%', borderCollapse: 'collapse' },
  stickyTh: { 
    position: 'sticky', 
    top: 0, 
    zIndex: 10, 
    background: '#F4F4F4', 
    padding: '12px 10px', 
    fontSize: '11px', 
    fontWeight: 700, 
    borderBottom: '2px solid #ccc',
    textAlign: 'left',
    color: '#333'
  },
  td: { padding: '10px', borderBottom: '1px solid #f5f5f5', fontSize: '13px', color: '#000' },
  
  button: { padding: '10px 20px', background: '#2E9940', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  buttonSecondary: { padding: '8px 12px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  
  tabs: { display: 'flex', borderBottom: '2px solid #e9ecef', marginBottom: 20 },
  tab: { padding: '10px 20px', cursor: 'pointer', color: '#666' },
  tabActive: { padding: '10px 20px', cursor: 'pointer', color: '#2E9940', borderBottom: '2px solid #2E9940', fontWeight: 600 },
  
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modalContent: { background: 'white', borderRadius: 14, width: '450px', overflow: 'hidden' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }
};
