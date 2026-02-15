import { useState, useEffect, useCallback } from "react";

// ============================================================
// PALETTE PIF2
// ============================================================
const P = {
  bgApp: '#F6F4F1', bgSection: '#ECE2CE', bgCard: '#FDFCFA',
  sidebarDark: '#223300', olive: '#4B5D16', olivePale: '#E8F0D8',
  gold: '#C99A2B', orange: '#C04E10', labelMuted: '#8A7D6B',
  inputBg: '#FFFDF5',
  cf: '#C04E10', cfPale: '#F5E6DA',
  ac: '#4B5D16', acPale: '#E8F0D8',
  arch: '#8A7D6B', archPale: '#ECE2CE',
  red: '#9B2C2C', redPale: '#F5E1E1',
  paye: '#223300',
};

const Ic = {
  check: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  send: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  undo: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  shield: (c='currentColor',s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  alert: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  eye: (c='currentColor',s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

// ============================================================
// CIRCUIT
// ============================================================
const CIRCUIT = [
  { key: 'EN_COURS', label: 'En cours', color: P.gold },
  { key: 'VISE_CF', label: 'Visé CF', color: P.cf },
  { key: 'TRANSMIS_AC', label: 'Transmis AC', color: P.ac },
  { key: 'PAYE', label: 'Payé', color: P.paye },
  { key: 'ARCHIVE', label: 'Archivé', color: P.arch },
];

const makeOPs = () => [
  { id: 1, num: '0001/PIF2-IDA/2026', benef: 'SOGB SA', montant: 2500000, statut: 'VISE_CF' },
  { id: 2, num: '0002/PIF2-IDA/2026', benef: 'CI-ENERGIES', montant: 1800000, statut: 'VISE_CF' },
  { id: 3, num: '0003/PIF2-IDA/2026', benef: 'SOTRA', montant: 3200000, statut: 'EN_COURS' },
  { id: 4, num: '0004/PIF2-ETAT/2026', benef: 'BNETD', montant: 950000, statut: 'TRANSMIS_AC' },
  { id: 5, num: '0005/PIF2-ETAT/2026', benef: 'AGEROUTE', montant: 4100000, statut: 'PAYE' },
  { id: 6, num: '0006/PIF2-IDA/2026', benef: 'SAPH', montant: 1350000, statut: 'ARCHIVE' },
];

const fmt = n => n.toLocaleString('fr-FR') + ' F';
let _tid = 0;

// ============================================================
// TOAST
// ============================================================
const ToastContainer = ({ toasts, onRemove }) => (
  <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px',
        borderRadius: 9, background: P.bgCard,
        boxShadow: '0 4px 16px rgba(34,51,0,0.12)',
        borderLeft: `3px solid ${t.type === 'error' ? P.red : t.type === 'warning' ? P.gold : P.olive}`,
        animation: 'slideIn 0.25s ease',
      }}>
        {t.type === 'error' ? Ic.alert(P.red, 15) : t.type === 'warning' ? Ic.alert(P.gold, 15) : Ic.check(P.olive, 15)}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: P.sidebarDark }}>{t.message}</div>
          {t.detail && <div style={{ fontSize: 10, color: P.labelMuted, marginTop: 1 }}>{t.detail}</div>}
        </div>
        <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4 }}>{Ic.x(P.labelMuted, 10)}</button>
      </div>
    ))}
  </div>
);

// ============================================================
// CONFIRM BUTTON
// ============================================================
const ConfirmBtn = ({ label, confirmLabel, icon, bg, color, onConfirm, disabled, style: s }) => {
  const [c, setC] = useState(false);
  useEffect(() => { if (c) { const t = setTimeout(() => setC(false), 3000); return () => clearTimeout(t); } }, [c]);
  return (
    <button onClick={() => { if (c) { onConfirm(); setC(false); } else setC(true); }} disabled={disabled} style={{
      padding: '5px 10px', border: 'none', borderRadius: 6,
      background: c ? '#9B2C2C' : bg, color: c ? '#fff' : color,
      fontWeight: 600, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      transition: 'all 0.2s', opacity: disabled ? 0.4 : 1,
      whiteSpace: 'nowrap', width: 'fit-content', ...s,
    }}>
      {c ? <>{Ic.alert('#fff', 11)} {confirmLabel || 'Confirmer ?'}</> : <>{icon} {label}</>}
    </button>
  );
};

// ============================================================
// PASSWORD MODAL
// ============================================================
const PwdModal = ({ onOk, onCancel }) => {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(34,51,0,0.3)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: P.bgCard, borderRadius: 14, width: 320, boxShadow: '0 12px 40px rgba(34,51,0,0.18)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${P.bgSection}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${P.orange}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.shield(P.orange, 15)}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: P.sidebarDark }}>Mot de passe requis</div>
            <div style={{ fontSize: 10, color: P.labelMuted }}>Action protégée par mot de passe</div>
          </div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setErr(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && pwd) { if (pwd === 'admin123') onOk(); else setErr('Incorrect'); } if (e.key === 'Escape') onCancel(); }}
            placeholder="Mot de passe..." autoFocus
            style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${err ? P.red : P.bgSection}`, borderRadius: 7, fontSize: 12, background: P.inputBg, boxSizing: 'border-box', outline: 'none' }} />
          {err && <div style={{ marginTop: 5, padding: '5px 8px', background: P.redPale, borderRadius: 5, fontSize: 10, color: P.red, fontWeight: 600 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={onCancel} style={{ flex: 1, padding: '6px', border: `1px solid ${P.bgSection}`, borderRadius: 6, background: P.bgCard, color: P.labelMuted, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>Annuler</button>
            <button onClick={() => { if (pwd === 'admin123') onOk(); else setErr('Incorrect'); }}
              style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 6, background: P.olive, color: '#fff', fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>OK</button>
          </div>
          <div style={{ fontSize: 9, color: P.labelMuted, marginTop: 6, textAlign: 'center' }}>Test : admin123</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN
// ============================================================
export default function App() {
  const [ops, setOps] = useState(makeOPs);
  const [toasts, setToasts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pwdCb, setPwdCb] = useState(null);
  const [tab, setTab] = useState('VISE_CF');
  const [log, setLog] = useState([]);

  const addToast = useCallback((message, type='success', detail) => {
    const id = ++_tid;
    setToasts(t => [...t, { id, message, type, detail }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 5000 : 3000);
  }, []);

  const addLog = (msg) => setLog(l => [{ t: new Date().toLocaleTimeString('fr-FR'), msg }, ...l].slice(0, 20));
  const updateOp = (id, s) => setOps(ops => ops.map(o => o.id === id ? { ...o, statut: s } : o));
  const idx = (s) => CIRCUIT.findIndex(c => c.key === s);
  const prev = (s) => { const i = idx(s); return i > 0 ? CIRCUIT[i-1] : null; };
  const next = (s) => { const i = idx(s); return i < CIRCUIT.length-1 ? CIRCUIT[i+1] : null; };
  const askPwd = (cb) => setPwdCb(() => cb);

  const filtered = ops.filter(o => o.statut === tab);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: P.bgApp, minHeight: '100vh', padding: 16 }}>
      <style>{`@keyframes slideIn { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

      <ToastContainer toasts={toasts} onRemove={id => setToasts(t => t.filter(x => x.id !== id))} />
      {pwdCb && <PwdModal onOk={() => { pwdCb(); setPwdCb(null); }} onCancel={() => setPwdCb(null)} />}

      {/* HEADER */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: P.sidebarDark }}>Simulation Bordereaux</span>
        <span style={{ fontSize: 10, color: P.labelMuted, background: P.bgSection, padding: '2px 8px', borderRadius: 12 }}>Testez les interactions</span>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 12, flexWrap: 'wrap' }}>
        {CIRCUIT.map(s => {
          const count = ops.filter(o => o.statut === s.key).length;
          const active = tab === s.key;
          return (
            <button key={s.key} onClick={() => { setTab(s.key); setSelected(null); }}
              style={{
                padding: '5px 11px', borderRadius: 7,
                background: active ? s.color : P.bgCard,
                color: active ? '#fff' : P.labelMuted,
                fontWeight: 600, fontSize: 11, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                border: active ? 'none' : `1px solid ${P.bgSection}`,
                transition: 'all 0.15s',
              }}>
              {s.label}
              <span style={{
                background: active ? 'rgba(255,255,255,0.25)' : `${s.color}15`,
                color: active ? '#fff' : s.color,
                padding: '0 5px', borderRadius: 8, fontSize: 9, fontWeight: 700,
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12, alignItems: 'start' }}>
        {/* LEFT — OP LIST */}
        <div style={{ background: P.bgCard, borderRadius: 10, border: `1px solid ${P.bgSection}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 100px 90px', padding: '6px 12px', background: P.bgSection, fontSize: 9, fontWeight: 700, color: P.labelMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            <span>N° OP</span><span>Bénéficiaire</span><span style={{ textAlign: 'right' }}>Montant</span><span style={{ textAlign: 'center' }}>Actions</span>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: P.labelMuted, fontSize: 11 }}>Aucune OP à ce statut</div>
          )}

          {filtered.map(op => {
            const isSel = selected === op.id;
            const p = prev(op.statut);
            const n = next(op.statut);
            const curCircuit = CIRCUIT[idx(op.statut)];
            return (
              <div key={op.id}>
                <div onClick={() => setSelected(isSel ? null : op.id)}
                  style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 100px 90px',
                    padding: '8px 12px', cursor: 'pointer',
                    background: isSel ? `${curCircuit.color}08` : 'transparent',
                    borderBottom: `1px solid ${P.bgSection}`,
                    alignItems: 'center',
                  }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 600, color: P.sidebarDark }}>{op.num}</span>
                  <span style={{ fontSize: 11, color: P.sidebarDark }}>{op.benef}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>{fmt(op.montant)}</span>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    {n && (
                      <ConfirmBtn label={n.label.length > 8 ? n.label.split(' ')[0] : n.label} confirmLabel="Sûr ?"
                        icon={Ic.check('#fff', 10)} bg={n.color} color="#fff"
                        onConfirm={() => {
                          updateOp(op.id, n.key);
                          addToast(`${op.num} → ${n.label}`);
                          addLog(`${op.num} → ${n.label}`);
                          setSelected(null);
                        }} />
                    )}
                    {p && (
                      <ConfirmBtn label="↩" confirmLabel="↩ ?"
                        bg={P.bgSection} color={P.labelMuted}
                        onConfirm={() => {
                          askPwd(() => {
                            updateOp(op.id, p.key);
                            addToast(`${op.num} → ${p.label}`, 'warning');
                            addLog(`↩ ${op.num} → ${p.label}`);
                            setSelected(null);
                          });
                        }} />
                    )}
                  </div>
                </div>

                {/* Expanded */}
                {isSel && (
                  <div style={{ padding: '8px 12px', background: `${P.bgSection}40`, borderBottom: `1px solid ${P.bgSection}` }}>
                    {/* Mini stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      {CIRCUIT.map((st, i) => {
                        const oIdx = idx(op.statut);
                        const done = i <= oIdx;
                        const cur = i === oIdx;
                        return (
                          <div key={st.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 1 }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%',
                                background: cur ? st.color : done ? `${st.color}25` : P.bgSection,
                                color: cur ? '#fff' : done ? st.color : P.labelMuted,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, fontWeight: 700,
                                border: cur ? `2px solid ${st.color}` : 'none',
                              }}>
                                {done ? Ic.check(cur ? '#fff' : st.color, 9) : i+1}
                              </div>
                              <span style={{ fontSize: 8, fontWeight: cur ? 700 : 400, color: cur ? st.color : P.labelMuted }}>{st.label}</span>
                            </div>
                            {i < CIRCUIT.length-1 && <div style={{ flex: 0.4, height: 1.5, background: done ? st.color : P.bgSection, margin: '0 -2px', marginBottom: 12 }} />}
                          </div>
                        );
                      })}
                    </div>

                    {p && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: P.cfPale, borderRadius: 5, fontSize: 10 }}>
                        {Ic.undo(P.cf, 11)}
                        <span style={{ color: P.sidebarDark }}>
                          <strong style={{ color: curCircuit.color }}>{curCircuit.label}</strong>
                          {' → '}<strong style={{ color: p.color }}>{p.label}</strong>
                        </span>
                        <div style={{ marginLeft: 'auto' }}>
                          <ConfirmBtn label="Revenir" confirmLabel="Sûr ?"
                            icon={Ic.undo('#fff', 9)} bg={P.cf} color="#fff"
                            onConfirm={() => askPwd(() => {
                              updateOp(op.id, p.key);
                              addToast(`${op.num} → ${p.label}`, 'warning');
                              addLog(`↩ ${op.num} → ${p.label}`);
                              setSelected(null);
                            })} />
                        </div>
                      </div>
                    )}

                    {!p && (
                      <div style={{ fontSize: 10, color: P.olive, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: P.olivePale, borderRadius: 5 }}>
                        {Ic.check(P.olive, 10)} Étape initiale — pas d'annulation
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT — LOG + HELP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: P.bgCard, borderRadius: 10, border: `1px solid ${P.bgSection}`, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.sidebarDark, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>{Ic.eye(P.olive, 12)} Journal</div>

            {log.length === 0 && <div style={{ fontSize: 10, color: P.labelMuted, padding: '8px 0' }}>Cliquez sur les boutons...</div>}

            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {log.map((l, i) => (
                <div key={i} style={{ padding: '3px 0', borderBottom: `1px solid ${P.bgSection}`, fontSize: 10 }}>
                  <span style={{ color: P.labelMuted, fontFamily: 'monospace', marginRight: 4 }}>{l.t}</span>
                  <span style={{ color: P.sidebarDark }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: P.bgCard, borderRadius: 10, border: `1px solid ${P.bgSection}`, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.olive, marginBottom: 6 }}>Mode d'emploi</div>
            <div style={{ fontSize: 10, color: P.labelMuted, lineHeight: 1.7 }}>
              <div><strong style={{ color: P.sidebarDark }}>1 clic</strong> → bouton passe en <span style={{ color: P.red, fontWeight: 600 }}>rouge "Confirmer ?"</span></div>
              <div><strong style={{ color: P.sidebarDark }}>2e clic</strong> → action exécutée + <span style={{ color: P.olive, fontWeight: 600 }}>toast</span> en haut à droite</div>
              <div><strong style={{ color: P.sidebarDark }}>↩ Annuler</strong> → mot de passe demandé, recule d'1 seule étape</div>
              <div><strong style={{ color: P.sidebarDark }}>3 sec</strong> sans cliquer → bouton revient normal</div>
              <div style={{ marginTop: 4 }}><strong style={{ color: P.sidebarDark }}>Cliquez une ligne</strong> pour voir le circuit complet</div>
            </div>
          </div>

          <button onClick={() => { setOps(makeOPs()); setLog([]); setSelected(null); setToasts([]); }}
            style={{ padding: '5px', border: `1px solid ${P.bgSection}`, borderRadius: 6, background: P.bgApp, color: P.labelMuted, fontSize: 10, cursor: 'pointer' }}>
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
