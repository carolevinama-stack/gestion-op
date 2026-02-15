import { useState, useEffect, useCallback } from "react";

// ====== TOAST ======
const TOAST_STYLES = {
  success: { bg: "linear-gradient(135deg, #f0faf5 0%, #fff 100%)", iconBg: "#e8f5e9", iconBorder: "#4caf5020" },
  error: { bg: "linear-gradient(135deg, #fff5f5 0%, #fff 100%)", iconBg: "#ffebee", iconBorder: "#f4433620" },
  warning: { bg: "linear-gradient(135deg, #fffbf0 0%, #fff 100%)", iconBg: "#fff3e0", iconBorder: "#ff980020" },
};
const ToastIcon = ({ type }) => {
  if (type === "success") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === "error") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
};
const ToastNotif = ({ toast, onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3500);
    const t2 = setTimeout(onDone, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div style={{
      background: s.bg, borderRadius: 14, padding: "16px 22px",
      display: "flex", alignItems: "center", gap: 14,
      minWidth: 320, maxWidth: 420,
      boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      animation: leaving ? "toastOut 0.4s ease-in forwards" : "toastIn 0.35s ease-out",
      pointerEvents: "none"
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", background: s.iconBg,
        border: `1.5px solid ${s.iconBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 2 }}>{toast.title}</div>
        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.4 }}>{toast.message}</div>
      </div>
    </div>
  );
};

const SOURCES = [
  { id: "1", sigle: "IDA", nom: "Association Internationale de Développement", couleur: "#0f4c3a" },
  { id: "2", sigle: "ÉTAT", nom: "Contrepartie nationale", couleur: "#1565c0" },
];

const OPS_MOCK = [
  { id: "a", numero: "N°0001/PIF2-IDA/2026", type: "PROVISOIRE", statut: "VISE_CF", montant: 8750000, beneficiaire: "CABINET AUDIT XYZ", ncc: "1234567 A", objet: "Audit financier exercice 2025", pieces: "TDR, Contrat, Facture proforma", modeReglement: "VIREMENT", rib: "CI02 N 01234 00056789012 34", banque: "SGBCI", ligneBudgetaire: "5.2.1", libelle: "Services de consultants", dateCreation: "2026-01-15", creePar: "Carole", bordereauCF: "BCF-2026-003", dotation: 120000000, engAnterieurs: 45250000 },
  { id: "b", numero: "N°0002/PIF2-IDA/2026", type: "DIRECT", statut: "PAYE", montant: 3200000, beneficiaire: "SODEFOR", ncc: "9876543 B", objet: "Fournitures de bureau Q1 2026", pieces: "Bon de commande, Facture", modeReglement: "CHEQUE", ligneBudgetaire: "4.1.2", libelle: "Fournitures et consommables", dateCreation: "2026-01-22", creePar: "Carole", dotation: 50000000, engAnterieurs: 12000000, montantPaye: 3200000 },
  { id: "c", numero: "N°0003/PIF2-IDA/2026", type: "DEFINITIF", statut: "EN_COURS", montant: 15000000, beneficiaire: "OIPR", ncc: "5555555 C", objet: "Travaux de reboisement zone nord", pieces: "Contrat, PV réception, Décompte", modeReglement: "VIREMENT", rib: "CI05 N 09876 00012345678 90", banque: "BICICI", ligneBudgetaire: "6.1.1", libelle: "Travaux de génie civil", dateCreation: "2026-02-01", creePar: "Carole", opProvisoireNumero: "N°0001/PIF2-IDA/2025", dotation: 200000000, engAnterieurs: 85000000 },
  { id: "d", numero: "N°0004/PIF2-IDA/2026", type: "PROVISOIRE", statut: "DIFFERE_CF", montant: 6500000, beneficiaire: "CARE INTERNATIONAL", ncc: "7777777 D", objet: "Formation des agents forestiers", pieces: "TDR, Budget prévisionnel", modeReglement: "VIREMENT", rib: "CI08 N 05555 00098765432 10", banque: "NSIA", ligneBudgetaire: "5.3.2", libelle: "Formation et ateliers", dateCreation: "2026-02-10", creePar: "Carole", motifDiffere: "Pièces justificatives incomplètes", dotation: 80000000, engAnterieurs: 30000000 },
];

const STATUT_CONFIG = {
  EN_COURS: { bg: "#e3f2fd", color: "#1565c0", label: "En cours", icon: "🔵" },
  TRANSMIS_CF: { bg: "#fff3e0", color: "#e65100", label: "Transmis CF", icon: "📤" },
  DIFFERE_CF: { bg: "#fff8e1", color: "#f9a825", label: "Différé CF", icon: "⏸️" },
  VISE_CF: { bg: "#e8f5e9", color: "#2e7d32", label: "Visé CF", icon: "✅" },
  REJETE_CF: { bg: "#ffebee", color: "#c62828", label: "Rejeté CF", icon: "❌" },
  TRANSMIS_AC: { bg: "#f3e5f5", color: "#7b1fa2", label: "Transmis AC", icon: "📤" },
  PAYE: { bg: "#e0f2f1", color: "#00695c", label: "Payé", icon: "💰" },
  REJETE_AC: { bg: "#ffebee", color: "#c62828", label: "Rejeté AC", icon: "❌" },
};

const TYPE_CONFIG = {
  PROVISOIRE: { icon: "⏳", color: "#ff9800" },
  DIRECT: { icon: "⚡", color: "#2196f3" },
  DEFINITIF: { icon: "✅", color: "#4caf50" },
  ANNULATION: { icon: "✕", color: "#f44336" },
};

const fmt = (n) => n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "0";

export default function ConsulterOpMockup() {
  const [activeSource, setActiveSource] = useState("1");
  const [selectedOp, setSelectedOp] = useState(null);
  const [search, setSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, title, message) => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  const src = SOURCES.find(s => s.id === activeSource);
  const accent = src?.couleur || "#0f4c3a";
  const opsFiltered = OPS_MOCK.filter(op => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return op.numero.toLowerCase().includes(t) || op.beneficiaire.toLowerCase().includes(t) || String(op.montant).includes(t);
  });
  const currentIndex = selectedOp ? OPS_MOCK.findIndex(o => o.id === selectedOp.id) : -1;

  const nav = (dir) => {
    if (OPS_MOCK.length === 0) return;
    let idx = dir === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (idx < 0) idx = OPS_MOCK.length - 1;
    if (idx >= OPS_MOCK.length) idx = 0;
    setSelectedOp(OPS_MOCK[idx]);
    setSearch(OPS_MOCK[idx].numero);
    setShowDrop(false);
  };

  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, marginBottom: 6, color: "#6c757d", letterSpacing: 0.3 };
  const fieldStyle = { padding: "10px 14px", background: "#f8f9fa", borderRadius: 8, fontSize: 13, border: "1.5px solid #e0e0e0" };
  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );

  const statutInfo = selectedOp ? (STATUT_CONFIG[selectedOp.statut] || { bg: "#f5f5f5", color: "#666", label: selectedOp.statut, icon: "⚪" }) : null;
  const typeInfo = selectedOp ? (TYPE_CONFIG[selectedOp.type] || {}) : {};

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, sans-serif", background: "#f5f6fa", minHeight: "100vh", padding: "24px 40px" }}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes toastOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.9); } }
      `}</style>

      {/* TOASTS */}
      {toasts.map(t => (
        <div key={t.uid} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999 }}>
          <ToastNotif toast={t} onDone={() => removeToast(t.uid)} />
        </div>
      ))}

      {/* ====== SOURCES ====== */}
      <div style={{ maxWidth: 900, margin: "0 auto", marginBottom: 4 }}>
        <label style={{ ...labelStyle, fontSize: 12, marginBottom: 10 }}>SOURCE DE FINANCEMENT</label>
        <div style={{ display: "flex", gap: 12 }}>
          {SOURCES.map(s => {
            const isActive = activeSource === s.id;
            return (
              <div key={s.id} onClick={() => { setActiveSource(s.id); setSelectedOp(null); setSearch(""); }}
                style={{
                  flex: 1, padding: "16px 20px", borderRadius: 12, cursor: "pointer",
                  background: isActive ? s.couleur : "white",
                  border: isActive ? `2px solid ${s.couleur}` : "2px solid #e0e0e0",
                  boxShadow: isActive ? `0 4px 16px ${s.couleur}33` : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.25s"
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isActive ? "white" : s.couleur }}>{s.sigle}</div>
                    <div style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.8)" : "#999", marginTop: 2 }}>{s.nom}</div>
                  </div>
                  {isActive && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== CARD PRINCIPALE ====== */}
      <div style={{ maxWidth: 900, margin: "0 auto", background: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", borderTop: `3px solid ${accent}` }}>
        <div style={{ padding: "24px 28px 20px" }}>

          {/* ====== BARRE DE RECHERCHE ====== */}
          <div style={{ display: "flex", alignItems: "end", gap: 14, marginBottom: 24, position: "relative" }}>
            <div style={{ flex: "0 0 320px", position: "relative" }}>
              <label style={labelStyle}>🔍 RECHERCHER UN OP</label>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <input type="text" value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowDrop(true); }}
                  onFocus={() => setShowDrop(true)}
                  placeholder="N° OP, bénéficiaire, montant..."
                  style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #e0e0e0", borderRadius: "8px 0 0 8px", outline: "none", fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}
                />
                <div style={{ display: "flex", flexDirection: "column", borderRadius: "0 8px 8px 0", overflow: "hidden", border: "1.5px solid #e0e0e0", borderLeft: "none" }}>
                  <button onClick={() => nav("prev")} title="OP précédent" style={{
                    padding: "4px 10px", background: "#f8f9fa", border: "none", borderBottom: "1px solid #e0e0e0",
                    cursor: "pointer", color: accent, fontSize: 10, lineHeight: 1
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button onClick={() => nav("next")} title="OP suivant" style={{
                    padding: "4px 10px", background: "#f8f9fa", border: "none",
                    cursor: "pointer", color: accent, fontSize: 10, lineHeight: 1
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
              </div>

              {/* Dropdown */}
              {showDrop && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1.5px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 8px 8px", maxHeight: 300, overflowY: "auto", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {opsFiltered.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>Aucun OP trouvé</div>
                  ) : opsFiltered.map(op => {
                    const isSel = selectedOp?.id === op.id;
                    const tc = TYPE_CONFIG[op.type] || {};
                    return (
                      <div key={op.id} onClick={() => { setSelectedOp(op); setSearch(op.numero); setShowDrop(false); setIsEdit(false); }}
                        style={{
                          padding: "10px 14px", borderBottom: "1px solid #f0f0f0", cursor: "pointer",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          background: isSel ? accent + "0a" : "white", transition: "background 0.15s"
                        }}>
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>{op.numero}</div>
                          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{op.beneficiaire} — {op.objet.substring(0, 40)}...</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontFamily: "monospace", color: accent, fontSize: 12 }}>{fmt(op.montant)} F</div>
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700, background: tc.color + "18", color: tc.color }}>{tc.icon} {op.type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compteur */}
            <div style={{ fontSize: 12, color: "#6c757d", paddingBottom: 8 }}>
              {selectedOp ? `${currentIndex + 1} / ${OPS_MOCK.length}` : `${OPS_MOCK.length} OP`}
            </div>

            {/* Statut badge */}
            {selectedOp && statutInfo && (
              <div style={{
                marginLeft: "auto", padding: "10px 18px", borderRadius: 10,
                background: statutInfo.bg, color: statutInfo.color, fontWeight: 700, fontSize: 13
              }}>
                {statutInfo.icon} {statutInfo.label}
              </div>
            )}
          </div>

          {/* ====== CONTENU OP ====== */}
          {!selectedOp ? (
            <div style={{ textAlign: "center", padding: 60, color: "#adb5bd" }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 16, fontWeight: 500 }}>Sélectionnez un OP pour le consulter</p>
              <p style={{ fontSize: 13 }}>Utilisez la barre de recherche ou les flèches ▲ ▼</p>
            </div>
          ) : (
            <>
              {/* Bloc référence */}
              <div style={{ marginBottom: 24, padding: "14px 18px", background: "#f8faf9", borderRadius: 10, border: "1px solid #e8ece9", display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#6c757d", marginBottom: 4 }}>N° OP</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>{selectedOp.numero}</span>
                    <button style={{ border: "none", background: "transparent", cursor: "pointer", opacity: 0.4, fontSize: 13 }}>✏️</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#6c757d", marginBottom: 4 }}>TYPE</div>
                  <span style={{ padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: typeInfo.color + "15", color: typeInfo.color, border: `1.5px solid ${typeInfo.color}30` }}>
                    {typeInfo.icon} {selectedOp.type}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#6c757d", marginBottom: 4 }}>DATE</div>
                  <span style={{ fontSize: 13, color: "#333" }}>{selectedOp.dateCreation}</span>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#6c757d", marginBottom: 4 }}>CRÉÉ PAR</div>
                  <span style={{ fontSize: 13, color: "#333" }}>{selectedOp.creePar}</span>
                </div>
                {selectedOp.bordereauCF && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#6c757d", marginBottom: 4 }}>BORDEREAU CF</div>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "#333" }}>{selectedOp.bordereauCF}</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: "#f0f0f0", marginBottom: 24 }} />

              {/* 👤 Bénéficiaire */}
              <div style={{ marginBottom: 24 }}>
                {sectionTitle("👤", "Bénéficiaire")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>NOM / RAISON SOCIALE</label>
                    <div style={fieldStyle}><span style={{ fontWeight: 600 }}>{selectedOp.beneficiaire}</span></div>
                  </div>
                  <div>
                    <label style={labelStyle}>N°CC</label>
                    <div style={fieldStyle}>{selectedOp.ncc}</div>
                  </div>
                </div>
              </div>

              {/* 💳 Règlement */}
              <div style={{ marginBottom: 24 }}>
                {sectionTitle("💳", "Règlement")}
                <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                  {["ESPECES", "CHEQUE", "VIREMENT"].map(m => {
                    const active = selectedOp.modeReglement === m;
                    return (
                      <div key={m} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8,
                        border: `1.5px solid ${active ? accent : "#e0e0e0"}`, background: active ? accent + "08" : "white"
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%", border: `2px solid ${active ? accent : "#ccc"}`,
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? accent : "#555" }}>{m}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedOp.modeReglement === "VIREMENT" && selectedOp.rib && (
                  <div style={{ maxWidth: 420 }}>
                    <label style={labelStyle}>RIB</label>
                    <div style={{ ...fieldStyle, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedOp.banque && <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{selectedOp.banque}</span>}
                      <span>{selectedOp.rib}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 📝 Détails */}
              <div style={{ marginBottom: 24 }}>
                {sectionTitle("📝", "Détails de la dépense")}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>OBJET</label>
                  <div style={{ ...fieldStyle, minHeight: 70 }}>{selectedOp.objet}</div>
                </div>
                {selectedOp.pieces && (
                  <div>
                    <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                    <div style={{ ...fieldStyle, fontSize: 12, color: "#555" }}>{selectedOp.pieces}</div>
                  </div>
                )}
              </div>

              {/* 💰 Montant et budget */}
              <div style={{ marginBottom: 24 }}>
                {sectionTitle("💰", "Montant et budget")}
                <div style={{ display: "grid", gridTemplateColumns: "200px 180px 1fr", gap: 16, alignItems: "start" }}>
                  <div>
                    <label style={labelStyle}>MONTANT (FCFA)</label>
                    <div style={{ ...fieldStyle, fontFamily: "monospace", fontSize: 16, fontWeight: 700, textAlign: "right", color: accent }}>
                      {fmt(selectedOp.montant)}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>LIGNE BUDG.</label>
                    <div style={{ ...fieldStyle, fontFamily: "monospace", fontWeight: 600, fontSize: 13 }}>{selectedOp.ligneBudgetaire}</div>
                  </div>
                  <div>
                    <label style={labelStyle}>LIBELLÉ</label>
                    <div style={{ padding: "10px 14px", background: "#f0f4ff", borderRadius: 8, fontSize: 12, color: "#555" }}>{selectedOp.libelle}</div>
                  </div>

                  {/* Budget recap */}
                  <div style={{ gridColumn: "1 / 3" }}>
                    <div style={{ background: "#f8faf9", padding: 14, borderRadius: 10, border: "1px solid #e8ece9" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 5 }}>
                        <span style={{ fontSize: 11, color: "#6c757d" }}>Dotation</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", textAlign: "right", fontWeight: 500 }}>{fmt(selectedOp.dotation)}</span>
                        <span style={{ fontSize: 11, color: "#6c757d" }}>Engag. antérieurs</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", textAlign: "right", fontWeight: 500 }}>{fmt(selectedOp.engAnterieurs)}</span>
                        <span style={{ fontSize: 11, color: "#6c757d" }}>Engag. actuel</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", textAlign: "right", fontWeight: 700, color: "#e65100" }}>+{fmt(selectedOp.montant)}</span>
                        <span style={{ fontSize: 11, color: "#6c757d" }}>Engag. cumulés</span>
                        <span style={{ fontSize: 12, fontFamily: "monospace", textAlign: "right", fontWeight: 500 }}>{fmt(selectedOp.engAnterieurs + selectedOp.montant)}</span>
                        <div style={{ gridColumn: "1 / -1", height: 1, background: "#d0d8d3", margin: "6px 0" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Disponible budgétaire</span>
                        <span style={{ fontSize: 14, fontFamily: "monospace", textAlign: "right", fontWeight: 800, color: "#2e7d32" }}>
                          {fmt(selectedOp.dotation - selectedOp.engAnterieurs - selectedOp.montant)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {/* OP Provisoire si lié */}
                    {selectedOp.opProvisoireNumero && (
                      <>
                        <label style={{ ...labelStyle, color: "#2e7d32" }}>🔄 OP PROVISOIRE RÉGULARISÉ</label>
                        <div style={{ ...fieldStyle, fontFamily: "monospace", fontWeight: 600, fontSize: 12, background: "#e8f5e9", border: "1.5px solid #c8e6c9" }}>
                          {selectedOp.opProvisoireNumero}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Motif différé / rejet */}
              {selectedOp.motifDiffere && (
                <div style={{ marginBottom: 24, padding: 14, background: "#fff8e1", borderRadius: 10, border: "1.5px solid #ffe082" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f9a825", marginBottom: 6 }}>⏸️ MOTIF DU REPORT</div>
                  <div style={{ fontSize: 13, color: "#5d4037" }}>{selectedOp.motifDiffere}</div>
                </div>
              )}

              {/* ====== BOUTONS D'ACTION ====== */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: `1px solid #f0f0f0` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "8px 14px", background: accent + "10", color: accent, borderRadius: 8, fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>
                    🔍 {selectedOp.numero}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Modifier", icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>), bg: "#f57f17", action: () => showToast("error", "Mot de passe incorrect", "") },
                    { label: "Supprimer", icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>), bg: "#616161", action: () => showToast("success", "OP supprimé", selectedOp?.numero || "") },
                    { label: "Dupliquer", icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>), bg: "#ff9800", action: () => {} },
                    { label: "Imprimer", icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>), bg: accent, action: () => {} },
                  ].map((btn, i) => (
                    <button key={i} title={btn.label} onClick={btn.action} style={{
                      width: 42, height: 42, borderRadius: "50%", border: "none",
                      background: btn.bg, color: "white", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 3px 10px ${btn.bg}44`, transition: "all 0.2s"
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                      {btn.icon}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
