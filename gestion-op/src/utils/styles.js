export const styles = {
  container: { 
    minHeight: '100vh', 
    background: '#F7F5F2', 
    fontFamily: "'Segoe UI', system-ui, sans-serif" 
  },
  main: { 
    marginLeft: 'var(--sidebar-w, 240px)', 
    flex: 1, 
    padding: '20px', // Réduit pour gagner de l'espace
    transition: 'margin-left 0.25s cubic-bezier(.4,0,.2,1)' 
  },
  pageContainer: { 
    padding: '10px 20px', 
    maxWidth: 1400, // Élargi pour que les colonnes tiennent sur une ligne
    margin: '0 auto' 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 700, 
    color: '#1B6B2E', 
    marginBottom: 16 
  },
  sidebar: { 
    width: 260, 
    background: '#2E9940', 
    color: 'white', 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100vh', 
    position: 'fixed' 
  },
  card: { 
    background: '#fff', 
    borderRadius: 12, 
    padding: '16px', // Plus compact
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)', 
    marginBottom: 16 
  },
  // --- SAISIE ET TEXTES (NOIR PUR #000000) ---
  input: { 
    padding: '8px 12px', 
    border: '1.5px solid #e0e0e0', 
    borderRadius: 8, 
    fontSize: 13, 
    width: '100%', 
    outline: 'none', 
    background: '#fff', 
    color: '#000000', 
    fontFamily: 'inherit' 
  },
  select: { 
    padding: '8px 12px', 
    border: '1.5px solid #e0e0e0', 
    borderRadius: 8, 
    fontSize: 13, 
    width: '100%', 
    outline: 'none', 
    background: '#fff',
    color: '#000000'
  },
  textarea: { 
    padding: '10px 14px', 
    border: '1.5px solid #e0e0e0', 
    borderRadius: 8, 
    fontSize: 13, 
    width: '100%', 
    outline: 'none', 
    minHeight: 80, 
    fontFamily: 'inherit', 
    resize: 'vertical', 
    background: '#fff',
    color: '#000000'
  },
  label: { 
    display: 'block', 
    fontSize: 12, 
    fontWeight: 600, 
    marginBottom: 4, 
    color: '#333' 
  },
  // --- BOUTONS ---
  button: { 
    padding: '10px 20px', 
    background: '#2E9940', 
    color: 'white', 
    border: 'none', 
    borderRadius: 8, 
    cursor: 'pointer', 
    fontSize: 13, 
    fontWeight: 600 
  },
  buttonSecondary: { 
    padding: '10px 20px', 
    background: '#f5f5f5', 
    color: '#000000', 
    border: '1px solid #e0e0e0', 
    borderRadius: 8, 
    cursor: 'pointer', 
    fontSize: 13, 
    fontWeight: 500 
  },
  // --- TABLEAUX COMPACTS ---
  table: { 
    width: '100%', 
    borderCollapse: 'collapse',
    color: '#000000'
  },
  th: { 
    padding: '10px 8px', // Plus serré pour éviter le passage à la ligne
    textAlign: 'left', 
    fontSize: 11, 
    fontWeight: 700, 
    color: '#666', 
    borderBottom: '2px solid #eee', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    background: '#fafafa',
    whiteSpace: 'nowrap'
  },
  td: { 
    padding: '8px 8px', // Réduit pour éviter l'effet "plusieurs lignes"
    borderBottom: '1px solid #f5f5f5', 
    fontSize: 12, // Légèrement réduit pour la densité
    color: '#000000',
    verticalAlign: 'middle'
  },
  // --- NAVIGATION ET TABS ---
  tabs: { display: 'flex', gap: 0, borderBottom: '2px solid #e9ecef', marginBottom: 20 },
  tab: { padding: '10px 20px', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2, fontSize: 13, color: '#6c757d' },
  tabActive: { padding: '10px 20px', cursor: 'pointer', borderBottom: '2px solid #2E9940', marginBottom: -2, fontSize: 13, fontWeight: 600, color: '#2E9940' },
  // --- MODALES ---
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(2px)' },
  modalContent: { background: 'white', borderRadius: 14, width: '90%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', color: '#000000' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 },
};
