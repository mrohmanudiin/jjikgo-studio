import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchQueue, callNext, startSession, sendToPrint } from '../utils/api';
import { formatWaitingTime, getStatusLabel } from '../utils/format';

// ─── Status Flow Config ────────────────────────────────────────────────────────
const STATUS_FLOW = [
    { key: 'waiting',         label: 'Wait',    icon: '⏳' },
    { key: 'called',          label: 'Called',  icon: '📣' },
    { key: 'in_session',      label: 'Session', icon: '📸' },
    { key: 'print_requested', label: 'Print',   icon: '🖨️' },
    { key: 'done',            label: 'Done',    icon: '✓'  },
];

function getFlowIndex(status) {
    return STATUS_FLOW.findIndex(s => s.key === status?.toLowerCase());
}

// ─── Status Colors ─────────────────────────────────────────────────────────────
function getStatusColors(status) {
    switch (status?.toLowerCase()) {
        case 'waiting':    return { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', border: 'rgba(245,158,11,0.2)' };
        case 'called':     return { bg: 'rgba(0,209,255,0.1)', text: '#00D1FF', border: 'rgba(0,209,255,0.2)' };
        case 'in_session': return { bg: 'rgba(16,185,129,0.1)', text: '#10B981', border: 'rgba(16,185,129,0.2)' };
        default:           return { bg: 'rgba(255,255,255,0.05)', text: '#708090', border: 'rgba(255,255,255,0.1)' };
    }
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
    Camera: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
        </svg>
    ),
    Users: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    ),
    Printer: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
        </svg>
    ),
    Bell: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
    ),
    Shuffle: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8"/>
            <line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/>
            <line x1="15" y1="15" x2="21" y2="21"/>
            <line x1="4" y1="4" x2="9" y2="9"/>
        </svg>
    ),
    Activity: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
    ),
    Palette: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
        </svg>
    ),
};

// ─── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <span className="topbar-time">
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
}

// ─── Status Flow Component ─────────────────────────────────────────────────────
function StatusFlow({ currentStatus }) {
    const currentIdx = getFlowIndex(currentStatus);
    return (
        <div className="status-flow">
            {STATUS_FLOW.map((step, idx) => {
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                return (
                    <React.Fragment key={step.key}>
                        <div className="status-flow-step">
                            <div className={`status-flow-dot ${isActive ? 'is-active' : isDone ? 'is-done' : ''}`}>
                                {step.icon}
                            </div>
                        </div>
                        {idx < STATUS_FLOW.length - 1 && (
                            <div className={`status-flow-line ${isDone ? 'is-done' : ''}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Queue Card ────────────────────────────────────────────────────────────────
function QueueCard({ queue, theme, isActive }) {
    const sc = getStatusColors(queue.status);
    const prefix = theme.prefix || 'T';
    const queueLabel = `${prefix}${String(queue.queue_number).padStart(2, '0')}`;

    return (
        <div className={`queue-card animate-slideUp ${isActive ? 'is-active' : ''}`}>
            <div
                className="queue-num-badge"
                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
            >
                {queueLabel}
            </div>

            <div className="queue-info">
                <div className="queue-customer">
                    {queue.transaction?.customer_name || 'Walk-in'}
                </div>
                <div className="queue-meta">
                    <div className="queue-pax">
                        <Icons.Users />
                        {queue.transaction?.people_count || 1} pax
                    </div>
                    <div
                        className="status-pill"
                        style={{ background: sc.bg, color: sc.text }}
                    >
                        <span className="status-pill-dot" style={{ background: sc.text }} />
                        {getStatusLabel(queue.status)}
                    </div>
                </div>
            </div>

            <div className="queue-wait-time">
                {formatWaitingTime(queue.created_at)}
            </div>
        </div>
    );
}

// ─── Session Panel ─────────────────────────────────────────────────────────────
function SessionPanel({ activeQueue, theme, onAction, busy }) {
    if (!activeQueue) {
        return (
            <div className="session-panel">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div
                        className="section-label"
                        style={{ marginBottom: 0 }}
                    >
                        Active Session
                        <div className="section-label-line" />
                    </div>
                    <div className="session-empty" style={{ flex: 1 }}>
                        <div className="session-empty-icon">
                            <Icons.Camera />
                        </div>
                        <div>
                            <div className="session-empty-title">No active session</div>
                            <div className="session-empty-sub">
                                Call the next customer<br />to begin a session.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const status = activeQueue.status?.toLowerCase();
    const customerName = activeQueue.transaction?.customer_name || 'Walk-in';
    const queueLabel = `${theme.prefix || 'T'}${String(activeQueue.queue_number).padStart(2, '0')}`;
    const peopleCount = activeQueue.transaction?.people_count || 1;

    return (
        <div className="session-panel">
            {/* Header */}
            <div className="section-label" style={{ marginBottom: 0 }}>
                Active Session
                <div className="section-label-line" />
            </div>

            {/* Customer Card */}
            <div className="session-customer-card animate-slideUp">
                <div className="session-customer-card-glow" />
                <div className="session-queue-number">{queueLabel}</div>
                <div className="session-customer-name">{customerName}</div>

                <div className="session-tags-grid">
                    <div className="session-tag">
                        <span className="session-tag-label">Guests</span>
                        <span className="session-tag-value">
                            <Icons.Users />
                            {peopleCount} {peopleCount === 1 ? 'Person' : 'People'}
                        </span>
                    </div>
                    <div className="session-tag">
                        <span className="session-tag-label">Theme</span>
                        <span className="session-tag-value">
                            <Icons.Palette />
                            {theme.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Progress */}
            <div className="panel-card">
                <div className="section-label">
                    Progress
                    <div className="section-label-line" />
                </div>
                <StatusFlow currentStatus={status} />
            </div>

            {/* Controls */}
            <div className="panel-card">
                <div className="section-label">
                    Controls
                    <div className="section-label-line" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {status === 'called' && (
                        <>
                            <button
                                className="action-btn action-btn-start"
                                disabled={!!busy}
                                onClick={() => onAction('start')}
                            >
                                {busy === 'start' ? <div className="spinner" style={{ borderTopColor: '#000' }} /> : <Icons.Camera />}
                                Begin Session
                            </button>
                            <p className="action-hint">Customer has arrived at the booth</p>
                        </>
                    )}
                    {status === 'in_session' && (
                        <>
                            <button
                                className="action-btn action-btn-print"
                                disabled={!!busy}
                                onClick={() => onAction('print')}
                            >
                                {busy === 'print' ? <div className="spinner" /> : <Icons.Printer />}
                                Send to Print
                            </button>
                            <p className="action-hint">Session complete, transfer to print station</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function StaffDashboard({ theme, queueData, loading, refresh, onChangeBooth, onLogout }) {
    const [busy, setBusy] = useState(null);
    const [toast, setToast] = useState('');
    const toastTimer = useRef(null);

    // Read branch name from localStorage for display
    const branchName = (() => {
        try {
            const s = localStorage.getItem('jjikgo-staff-store');
            if (s) return JSON.parse(s)?.state?.branch?.name || null;
        } catch { /* ignore */ }
        return null;
    })();

    const myQueues = (queueData || {})[theme.name] || [];
    const activeQueue = myQueues.find(q => ['called', 'in_session'].includes(q.status?.toLowerCase())) || null;
    const waitingQueues = myQueues.filter(q => q.status?.toLowerCase() === 'waiting');
    const doneToday = myQueues.filter(q => q.status?.toLowerCase() === 'done').length;

    const showToast = (msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 3000);
    };

    const handleCallNext = async () => {
        if (busy || waitingQueues.length === 0) return;
        setBusy('call');
        try {
            await callNext(theme.id);
            await refresh();
            showToast('Next customer called');
        } catch {
            showToast('Failed to call next customer');
        } finally {
            setBusy(null);
        }
    };

    const handleAction = async (action) => {
        if (!activeQueue || busy) return;
        setBusy(action);
        try {
            if (action === 'start') {
                await startSession(activeQueue.id, null);
                showToast('Session started');
            } else if (action === 'print') {
                await sendToPrint(activeQueue.id);
                showToast('Transferred to print station');
            }
            await refresh();
        } catch {
            showToast('Action failed — please try again');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Ambient BG */}
            <div className="ambient-bg">
                <div className="ambient-orb ambient-orb-1" style={{ opacity: 0.04 }} />
                <div className="ambient-orb ambient-orb-2" style={{ opacity: 0.04 }} />
            </div>

            <div className="app-layout">
                {/* ── Topbar ── */}
                <header className="topbar">
                    <div className="topbar-brand">
                        <img
                            src="/logo.png"
                            alt="JJIKGO"
                            className="topbar-brand-logo"
                            onError={e => { e.target.style.display = 'none'; }}
                        />
                        <span className="topbar-brand-dot" />
                        {branchName && (
                            <span style={{
                                fontSize: 11, fontWeight: 700, color: 'var(--text-s)',
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                opacity: 0.7, marginLeft: 2
                            }}>
                                {branchName}
                            </span>
                        )}
                    </div>

                    <div className="topbar-station-pill">
                        <div className="topbar-station-dot" />
                        <span className="topbar-station-name">{theme.name}</span>
                    </div>

                    <div className="topbar-spacer" />

                    <LiveClock />

                    <button className="topbar-btn" onClick={onChangeBooth}>
                        <Icons.Shuffle />
                        Switch Booth
                    </button>
                    <button className="topbar-btn" onClick={onLogout} style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.2)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                    </button>
                </header>

                {/* ── Queue Panel (left) ── */}
                <main className="queue-panel">
                    {/* Stats */}
                    <div className="stats-row">
                        <div className="stat-card" style={{ '--stat-color': 'var(--s-waiting)' }}>
                            <span className="stat-value">{waitingQueues.length}</span>
                            <span className="stat-label">Waiting</span>
                        </div>
                        <div className="stat-card" style={{ '--stat-color': 'var(--s-session)' }}>
                            <span className="stat-value">{activeQueue ? 1 : 0}</span>
                            <span className="stat-label">In Session</span>
                        </div>
                        <div className="stat-card" style={{ '--stat-color': 'var(--s-done)' }}>
                            <span className="stat-value">{doneToday}</span>
                            <span className="stat-label">Completed</span>
                        </div>
                    </div>

                    {/* Call Next */}
                    <div className="panel-card">
                        <button
                            className="call-next-btn"
                            disabled={!!busy || waitingQueues.length === 0 || !!activeQueue}
                            onClick={handleCallNext}
                        >
                            {busy === 'call' ? (
                                <><div className="spinner" /> Calling...</>
                            ) : (
                                <><Icons.Bell /> Call Next Customer</>
                            )}
                        </button>
                        {activeQueue && (
                            <div className="occupied-hint">
                                <Icons.Activity />
                                Session in progress — complete it first
                            </div>
                        )}
                    </div>

                    {/* Queue List */}
                    <div className="panel-card" style={{ flex: 1, minHeight: 300 }}>
                        <div className="section-label">
                            Queue
                            <div className="section-label-line" />
                            <span style={{ color: 'var(--text-s)', fontSize: 10 }}>
                                {waitingQueues.length} waiting
                            </span>
                        </div>

                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="skeleton" style={{ height: 88 }} />
                                ))}
                            </div>
                        ) : waitingQueues.length === 0 ? (
                            <div className="queue-empty">
                                <div className="queue-empty-icon">
                                    <Icons.Activity />
                                </div>
                                <div className="queue-empty-text">
                                    Queue is empty<br />
                                    <span style={{ fontSize: 12 }}>New customers will appear here</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {waitingQueues.map((q, i) => (
                                    <div key={q.id} style={{ animationDelay: `${i * 0.06}s` }}>
                                        <QueueCard queue={q} theme={theme} isActive={false} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* ── Session Panel (right) ── */}
                <aside>
                    <SessionPanel
                        activeQueue={activeQueue}
                        theme={theme}
                        onAction={handleAction}
                        busy={busy}
                    />
                </aside>
            </div>

            {/* Toast */}
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
