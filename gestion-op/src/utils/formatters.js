// ==================== UTILITAIRES ====================

export const formatMontant = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

export const formatDate = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('fr-FR');
};

// Export CSV (compatible Excel)
export const exportToCSV = (data, filename) => {
  // Ajouter BOM pour UTF-8 (Excel)
  const BOM = '\uFEFF';
  const csvContent = BOM + data;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
