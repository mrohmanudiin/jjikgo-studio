import React, { useState, useEffect, useRef } from 'react';
import { callNext, startSession, sendToPrint, skipQueue, updateNotes } from '../utils/api';
import { formatWaitingTime } from '../utils/format';

// ── Normalize backend queue shape ──────────────────────────────────────────────
function norm(q) {
    if (!q) return {};
    return {
        ...q,
        id: q.id,
        status: (q.status || 'waiting').toLowerCase(),
        queue_number: q.queue_number ?? q.queueNumber ?? 0,
        created_at: q.created_at ?? q.createdAt,
        note: q.note || '',
        transaction: q.transaction ? {
            customer_name: q.transaction.customer_name ?? q.transaction.customerName ?? 'Walk-in',
            people_count: q.transaction.people_count ?? q.transaction.peopleCount ?? 1,
            package_name: q.transaction.package_name ?? q.transaction.packageName ?? '—',
        } : { customer_name: 'Walk-in', people_count: 1, package_name: '—' },
    };
}

// ── Status config ──────────────────────────────────────────────────────────────
const STEPS = [
    { key: 'waiting', emoji: '⏳' },
    { key: 'called', emoji: '📣' },
    { key: 'in_session', emoji: '📸' },
    { key: 'print_requested', emoji: '🖨️' },
    { key: 'done', emoji: '✓' },
];

// ── Live clock ─────────────────────────────────────────────────────────────────
function Clock() {
    const [t, setT] = useState(new Date());
    useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
    return <span className="topbar-time">{t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
}

// ── Session timer ──────────────────────────────────────────────────────────────
function Timer({ startedAt }) {
    const [label, setLabel] = useState('');
    const [cls, setCls] = useState('ok');
    useEffect(() => {
        if (!startedAt) return;
        const tick = () => {
            const diff = Date.now() - new Date(startedAt).getTime();
            const totalSec = Math.floor(diff / 1000);
            const m = Math.floor(Math.abs(totalSec) / 60);
            const s = Math.abs(totalSec) % 60;
            const str = `${totalSec < 0 ? '-' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            setLabel(str);
            setCls(totalSec > 15 * 60 ? 'over' : totalSec > 12 * 60 ? 'low' : 'ok');
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startedAt]);
    if (!label) return null;
    return <span className={`timer ${cls}`}>⏱ {label}</span>;
}

// ── Progress steps ─────────────────────────────────────────────────────────────
function Progress({ status }) {
    const cur = STEPS.findIndex(s => s.key === status);
    return (
        <div className="progress-steps">
            {STEPS.map((step, i) => (
                <React.Fragment key={step.key}>
                    <div className="progress-step">
                        <div className={`progress-dot ${i < cur ? 'done' : i === cur ? 'active' : ''}`}>
                            {step.emoji}
                        </div>
                    </div>
                    {i < STEPS.length - 1 && <div className={`progress-line ${i < cur ? 'done' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function Dialog({ title, msg, confirmLabel, danger, onConfirm, onCancel }) {
    return (
        <div className="dialog-overlay" onClick={onCancel}>
            <div className="dialog" onClick={e => e.stopPropagation()}>
                <div className="dialog-title">{title}</div>
                <div className="dialog-msg">{msg}</div>
                <div className="dialog-actions">
                    <button className="dialog-cancel" onClick={onCancel}>Cancel</button>
                    <button className={`dialog-confirm ${danger ? 'danger' : 'normal'}`} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

// ── Right panel: idle ──────────────────────────────────────────────────────────
function IdlePanel({ waitingCount }) {
    return (
        <div className="idle-state fade-in">
            <div className="idle-icon">📷</div>
            <div className="idle-title">Ready for Next Session</div>
            <div className="idle-sub">
                {waitingCount > 0
                    ? `${waitingCount} customer${waitingCount > 1 ? 's' : ''} waiting. Press "Call Next" to begin.`
                    : 'No customers in queue. Waiting for new check-ins.'}
            </div>
            {waitingCount > 0 && (
                <div className="idle-waiting-badge">
                    <span>●</span> {waitingCount} waiting
                </div>
            )}
        </div>
    );
}

// ── Right panel: active session ────────────────────────────────────────────────
function SessionPanel({ queue, theme, onAction, onSkip, onNote, busy }) {
    const q = norm(queue);
    const [note, setNote] = useState(q.note || '');
    const [savingNote, setSavingNote] = useState(false);
    const prefix = theme?.prefix || 'T';
    const qNum = `${prefix}${String(q.queue_number).padStart(2, '0')}`;
    const status = q.status;

    useEffect(() => { setNote(q.note || ''); }, [q.id, q.note]);

    const handleSaveNote = async () => {
        setSavingNote(true);
        try { await onNote(q.id, note); } finally { setSavingNote(false); }
    };

    return (
        <div className="fade-up">
            <div className="session-card">
                {/* Top: queue number + customer */}
                <div className="session-card-top">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div className="session-queue-num">{qNum}</div>
                        {status === 'in_session' && <Timer startedAt={q.created_at} />}
                    </div>
                    <div className="session-customer">{q.transaction.customer_name}</div>
                </div>

                {/* Tags */}
                <div className="session-tags">
                    <div className="session-tag">
                        <div className="session-tag-label">Guests</div>
                        <div className="session-tag-value">👥 {q.transaction.people_count} {q.transaction.people_count === 1 ? 'person' : 'people'}</div>
                    </div>
                    <div className="session-tag">
                        <div className="session-tag-label">Theme</div>
                        <div className="session-tag-value">🎨 {theme?.name || '—'}</div>
                    </div>
                    <div className="session-tag full">
                        <div className="session-tag-label">Package</div>
                        <div className="session-tag-value">📦 {q.transaction.package_name}</div>
                    </div>
                </div>

                {/* Progress */}
                <div className="progress-section">
                    <div className="progress-label">Progress</div>
                    <Progress status={status} />
                </div>

                {/* Controls */}
                <div className="controls">
                    <div className="controls-label">Controls</div>

                    {status === 'called' && (
                        <>
                            <div className="status-banner called">📣 Customer called — waiting at booth</div>
                            <button className="btn-primary" disabled={!!busy} onClick={() => onAction('start')}>
                                {busy === 'start' ? <><span className="spinner dark" /> Starting…</> : <>📸 Begin Session</>}
                            </button>
                            <button className="btn-secondary" disabled={!!busy} onClick={() => onSkip(q.id)}>
                                ⏭ Skip — move to end of queue
                            </button>
                        </>
                    )}

                    {status === 'in_session' && (
                        <>
                            <div className="status-banner in_session">📸 Session in progress</div>
                            <button className="btn-print" disabled={!!busy} onClick={() => onAction('print')}>
                                {busy === 'print' ? <><span className="spinner" /> Sending…</> : <>🖨️ Send to Print</>}
                            </button>
                            <div className="action-hint">Session complete — transfer to print station</div>
                        </>
                    )}

                    {status === 'print_requested' && (
                        <div className="status-banner print_requested">🖨️ Awaiting print confirmation from cashier…</div>
                    )}
                </div>

                {/* Notes */}
                <div className="notes-section">
                    <div className="notes-label">Staff Notes</div>
                    <textarea
                        className="notes-textarea"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add session notes (e.g. backdrop request)…"
                    />
                    <button
                        className="notes-save"
                        disabled={savingNote || note === (q.note || '')}
                        onClick={handleSaveNote}
                    >
                        {savingNote ? 'Saving…' : 'Save Note'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function StaffDashboard({ theme, queueData, loading, refresh, onChangeBooth, onLogout }) {
    const [busy, setBusy] = useState(null);
    const [toast, setToast] = useState('');
    const [dialog, setDialog] = useState(null);
    const toastRef = useRef(null);

    const branchName = (() => {
        try { return JSON.parse(localStorage.getItem('jjikgo-staff-store'))?.state?.branch?.name || null; } catch { return null; }
    })();

    const themeName = theme?.name || '';
    const rawQueues = (queueData && themeName) ? (queueData[themeName] || []) : [];
    const queues = Array.isArray(rawQueues) ? rawQueues.map(norm) : [];
    const activeQueue = queues.find(q => ['called', 'in_session', 'print_requested'].includes(q.status)) || null;
    const waitingQueues = queues.filter(q => q.status === 'waiting');
    const doneCount = queues.filter(q => q.status === 'done').length;
    const canCall = !busy && waitingQueues.length > 0 && !activeQueue;

    const showToast = (msg) => {
        setToast(msg);
        clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(''), 3000);
    };

    const handleCallNext = () => {
        if (!canCall) return;
        setDialog({ type: 'call', title: 'Call Next Customer', msg: `Call the next customer for "${theme.name}"?`, label: '📣 Call Now' });
    };

    const handleSkip = (id) => {
        setDialog({ type: 'skip', id, title: 'Skip Customer', msg: 'Move this customer to the end of the queue? They can still be called again.', label: '⏭ Skip to End', danger: false });
    };

    const handleAction = async (action) => {
        if (!activeQueue || busy) return;
        if (action === 'print') {
            setDialog({ type: 'print', title: 'Send to Print', msg: 'Transfer to print station? Cashier will be notified.', label: '🖨️ Send to Print' });
            return;
        }
        setBusy(action);
        try {
            if (action === 'start') { await startSession(activeQueue.id, null); showToast('📸 Session started!'); }
            await refresh();
        } catch { showToast('❌ Action failed — try again'); }
        finally { setBusy(null); }
    };

    const handleNote = async (id, text) => {
        try { await updateNotes(id, text); await refresh(); showToast('📝 Note saved'); }
        catch { showToast('❌ Failed to save note'); }
    };

    const confirmDialog = async () => {
        if (!dialog) return;
        const { type, id } = dialog;
        setDialog(null);

        if (type === 'call') {
            setBusy('call');
            try { await callNext(parseInt(theme.id, 10)); await refresh(); showToast('✅ Customer called!'); }
            catch (e) { showToast(`❌ ${e?.response?.data?.error || 'Failed to call'}`); }
            finally { setBusy(null); }
        } else if (type === 'skip') {
            setBusy('skip');
            try { await skipQueue(id); await refresh(); showToast('⏭ Customer skipped'); }
            catch { showToast('❌ Failed to skip'); }
            finally { setBusy(null); }
        } else if (type === 'print') {
            setBusy('print');
            try { await sendToPrint(activeQueue.id); await refresh(); showToast('🖨️ Sent to print!'); }
            catch { showToast('❌ Failed to send print'); }
            finally { setBusy(null); }
        }
    };

    return (
        <div className="app fade-in">
            {/* Topbar */}
            <header className="topbar">
                <img src="/logo.png" alt="JJIKGO" className="topbar-logo" onError={e => e.target.style.display = 'none'} />
                {branchName && <><div className="topbar-sep" /><span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{branchName}</span></>}
                <div className="topbar-booth">
                    <div className="topbar-booth-dot" />
                    {theme.name}
                </div>
                <div className="topbar-spacer" />
                <Clock />
                <button className="topbar-btn" onClick={onChangeBooth}>⇄ Switch</button>
                <button className="topbar-btn danger" onClick={onLogout}>Sign Out</button>
            </header>

            {/* Main */}
            <div className="main">
                {/* Left: queue list */}
                <div className="left-panel">
                    {/* Stats */}
                    <div className="stats">
                        <div className="stat">
                            <div className="stat-num" style={{ color: waitingQueues.length > 0 ? 'var(--amber)' : 'var(--text)' }}>{waitingQueues.length}</div>
                            <div className="stat-label">Waiting</div>
                        </div>
                        <div className="stat">
                            <div className="stat-num" style={{ color: activeQueue ? 'var(--green)' : 'var(--text)' }}>{activeQueue ? 1 : 0}</div>
                            <div className="stat-label">In Session</div>
                        </div>
                        <div className="stat">
                            <div className="stat-num">{doneCount}</div>
                            <div className="stat-label">Done Today</div>
                        </div>
                    </div>

                    {/* Call Next */}
                    <button
                        className={`call-btn ${canCall ? 'active' : 'disabled'}`}
                        onClick={handleCallNext}
                        disabled={!canCall}
                    >
                        {busy === 'call'
                            ? <><span className="spinner dark" /> Calling…</>
                            : <>
                                📣 Call Next Customer
                                {waitingQueues.length > 0 && <span className="call-btn-badge">{waitingQueues.length}</span>}
                            </>
                        }
                    </button>
                    {activeQueue && (
                        <div style={{ fontSize: 12, color: 'var(--green)', textAlign: 'center', marginTop: -10, marginBottom: 12, fontWeight: 500 }}>
                            ● Session in progress — complete it first
                        </div>
                    )}

                    {/* Queue list */}
                    <div className="queue-section">
                        <div className="queue-header">
                            <span className="queue-header-title">Queue</span>
                            <span className="queue-header-count">{waitingQueues.length} waiting</span>
                        </div>
                        <div className="queue-list">
                            {loading ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
                            ) : waitingQueues.length === 0 ? (
                                <div className="queue-empty">
                                    <div className="queue-empty-icon">✓</div>
                                    <div className="queue-empty-text">Queue is empty<br /><span style={{ fontSize: 11 }}>New customers appear here automatically</span></div>
                                </div>
                            ) : waitingQueues.map((q, i) => {
                                const prefix = theme?.prefix || 'T';
                                const qNum = `${prefix}${String(q.queue_number).padStart(2, '0')}`;
                                return (
                                    <div key={q.id} className="queue-item fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div className="queue-num">{qNum}</div>
                                        <div className="queue-info">
                                            <div className="queue-name">{q.transaction.customer_name}</div>
                                            <div className="queue-meta">
                                                <span className="queue-meta-item">👥 {q.transaction.people_count} pax</span>
                                                <span className="queue-meta-item">📦 {q.transaction.package_name}</span>
                                            </div>
                                        </div>
                                        <div className="queue-wait">{formatWaitingTime(q.created_at)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: session panel */}
                <div className="right-panel">
                    <div className="session-header">Active Session</div>
                    {activeQueue
                        ? <SessionPanel queue={activeQueue} theme={theme} onAction={handleAction} onSkip={handleSkip} onNote={handleNote} busy={busy} />
                        : <IdlePanel waitingCount={waitingQueues.length} />
                    }
                </div>
            </div>

            {/* Dialog */}
            {dialog && (
                <Dialog
                    title={dialog.title} msg={dialog.msg}
                    confirmLabel={dialog.label} danger={dialog.danger}
                    onConfirm={confirmDialog} onCancel={() => setDialog(null)}
                />
            )}

            {/* Toast */}
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
