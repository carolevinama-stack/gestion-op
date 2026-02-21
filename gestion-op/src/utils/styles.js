export const styles = {
  container: { minHeight: '100vh', background: '#F7F5F2', color: '#000' },
  pageContainer: { padding: '0 20px', maxWidth: '100%', display: 'flex', flexDirection: 'column', height: '100vh' },
  title: { fontSize: 20, fontWeight: 700, color: '#1B6B2E', margin: 0 },
  card: { background: '#fff', borderRadius: 12, padding: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 15 },
  
  // ALIGNEMENT DES CHAMPS (Fini les superpositions)
  filterGrid: { display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'nowrap' },
  filterGroup: (width) => ({ width: width, display: 'flex', flexDirection: 'column', gap: '4px' }),
  
  // INPUTS (Noir pur et tailles fixes)
  input: { padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, width: '100%', color: '#000', background: '#fff' },
  select: { padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 13, width: '100%', color: '#000', background: '#fff' },
  label: { fontSize: '11px', fontWeight: 600, color: '#666', whiteSpace: 'nowrap' },

  // TABLEAU FIGÉ
  tableWrapper: { flex: 1, overflowY: 'auto', background: '#fff', borderRadius: 12 },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0 },
  stickyTh: { 
    position: 'sticky', top: 0, zIndex: 10, background: '#F4F4F4', 
    padding: '12px 10px', fontSize: '11px', fontWeight: 700, color: '#333',
    borderBottom: '2px solid #ccc', textAlign: 'left'
  },
  td: { padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px', color: '#000' },
  
  // BOUTONS
  button: { padding: '10px 20px', background: '#2E9940', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  buttonSecondary: { padding: '8px 12px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' },
  
  // MODAL
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modalContent: { background: '#fff', borderRadius: 14, width: '450px', overflow: 'hidden' },
  
  // TABS
  tabs: { display: 'flex', gap: 0, borderBottom: '2px solid #e9ecef', marginBottom: 15 },
  tab: { padding: '10px 20px', cursor: 'pointer', color: '#666', borderBottom: '2px solid transparent' },
  tabActive: { padding: '10px 20px', cursor: 'pointer', color: '#2E9940', borderBottom: '2px solid #2E9940', fontWeight: 600 }
};
