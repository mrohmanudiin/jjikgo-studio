import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchQueue, callNext, startSession, sendToPrint, skipQueue, updateNotes } from '../utils/api';
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

// ─── Helper: normalize queue object (backend uses camelCase) ──────────────────
function normalizeQueue(q) {
    if (!q) return { status: 'unknown' };
    const pkg = q.transaction?.package || q.package || {};
    return {
        ...q,
        queue_number: q.queue_number ?? q.queueNumber ?? 0,
        created_at:   q.created_at   ?? q.createdAt,
        session_start: q.session_start ?? q.sessionStart,
        theme_id:     q.theme_id     ?? q.themeId,
        duration:     pkg.duration   ?? q.package_duration ?? 15,
        transaction: q.transaction ? {
            ...q.transaction,
            customer_name: q.transaction.customer_name ?? q.transaction.customerName ?? 'Walk-in',
            people_count:  q.transaction.people_count  ?? q.transaction.peopleCount  ?? 1,
            package_name:  q.transaction.packageName   ?? q.transaction.package_name  ?? (q.transaction.items?.[0]?.name) ?? '—',
        } : null,
    };
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
    Bell: ({ size = 16, className }) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
    Package: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
    ),
    Clock: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>
    ),
    CheckCircle: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    ),
    SkipForward: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"/>
            <line x1="19" y1="5" x2="19" y2="19"/>
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

// ─── Session Elapsed Timer ────────────────────────────────────────────────────
function SessionTimer({ startedAt, duration = 15 }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isLow, setIsLow] = useState(false);
    const [isOver, setIsOver] = useState(false);

    useEffect(() => {
        if (!startedAt) return;
        const tick = () => {
            const start = new Date(startedAt);
            if (isNaN(start.getTime())) return;
            
            const durationMs = duration * 60 * 1000;
            const end = start.getTime() + durationMs;
            const remaining = end - Date.now();
            
            if (remaining <= 0) {
                const overMs = Math.abs(remaining);
                const om = Math.floor(overMs / 60000);
                const os = Math.floor((overMs % 60000) / 1000);
                setTimeLeft(`-${String(om).padStart(2, '0')}:${String(os).padStart(2, '0')}`);
                setIsOver(true);
                setIsLow(true);
            } else {
                const rm = Math.floor(remaining / 60000);
                const rs = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${String(rm).padStart(2, '0')}:${String(rs).padStart(2, '0')}`);
                setIsOver(false);
                setIsLow(remaining < 2 * 60000); // Low if < 2 mins
            }
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startedAt, duration]);

    if (!timeLeft) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 11px', borderRadius: 8,
            background: isOver ? 'rgba(239,68,68,0.2)' : (isLow ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.1)'),
            color: isOver ? '#F87171' : (isLow ? '#F59E0B' : '#10B981'),
            fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            border: `1px solid ${isOver ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
            boxShadow: isOver ? '0 0 12px rgba(239,68,68,0.2)' : 'none'
        }}>
            <Icons.Clock />
            {timeLeft}
            {isOver && <span style={{ fontSize: 9, marginLeft: 2 }}>OVERTIME</span>}
        </div>
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

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                background: 'var(--card, #1a1a2e)', borderRadius: 18,
                padding: '28px 28px 22px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                maxWidth: 380, width: '90%',
                display: 'flex', flexDirection: 'column', gap: 16,
            }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text, #fff)', letterSpacing: '-0.01em' }}>{title}</div>
                <div style={{ fontSize: 14, color: 'var(--text-s, #aaa)', lineHeight: 1.5 }}>{message}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '12px 0', borderRadius: 10,
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text-s, #aaa)', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: '12px 0', borderRadius: 10,
                            background: danger ? '#EF4444' : 'var(--accent-cyan, #00D1FF)',
                            border: 'none',
                            color: danger ? '#fff' : '#000',
                            fontSize: 14, fontWeight: 800,
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Queue Card ────────────────────────────────────────────────────────────────
function QueueCard({ queue, theme, isActive, index = 0 }) {
    const q = normalizeQueue(queue);
    const sc = getStatusColors(q.status);
    const prefix = theme.prefix || 'T';
    
    // Fix for "ALBUMundefined": ensures String conversion doesn't result in "undefined"
    const displayNum = (q.queue_number !== undefined && q.queue_number !== null) ? q.queue_number : 0;
    const queueLabel = `${prefix}${String(displayNum).padStart(2, '0')}`;
    const packageName = q.transaction?.package_name || q.transaction?.packageName || 'Standard Package';

    const estWaitMins = (index + 1) * 10;

    return (
        <div className={`queue-card animate-slideUp ${isActive ? 'is-active' : ''}`}>
            <div
                className="queue-num-badge"
                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
            >
                {queueLabel}
            </div>

            <div className="queue-info">
                <div className="flex items-center justify-between">
                    <div className="queue-customer">
                        {q.transaction?.customer_name || 'Walk-in'}
                    </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-s)', opacity: 0.85, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icons.Package />
                    <span className="truncate max-w-[140px]">{packageName}</span>
                </div>
                <div className="queue-meta" style={{ marginTop: 6 }}>
                    <div className="queue-pax">
                        <Icons.Users />
                        {q.transaction?.people_count || 1} pax
                    </div>
                    {q.status === 'waiting' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#F5A623', fontWeight: 600 }}>
                            <Icons.Clock />
                            Est. {estWaitMins}m
                        </div>
                    )}
                </div>
            </div>

            <div className="queue-wait-time">
                <div style={{ opacity: 0.6 }}>Waited</div>
                {formatWaitingTime(q.created_at)}
            </div>
        </div>
    );
}

// ─── Session Panel ─────────────────────────────────────────────────────────────
function SessionPanel({ activeQueue, theme, onAction, onSkip, onNote, busy, waitingCount }) {
    const [note, setNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    useEffect(() => {
        setNote(activeQueue?.note || '');
    }, [activeQueue?.id, activeQueue?.note]);

    const handleNoteSave = async () => {
        if (!activeQueue) return;
        setIsSavingNote(true);
        try {
            await onNote(activeQueue.id, note);
        } finally {
            setIsSavingNote(false);
        }
    };

    if (!activeQueue) {
        return (
            <div className="session-panel">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="section-label" style={{ marginBottom: 0 }}>
                        Active Session
                        <div className="section-label-line" />
                    </div>
                    <div className="session-empty" style={{ flex: 1, border: 'none', background: 'transparent', padding: '20px 0' }}>
                        <div className="session-empty-icon" style={{ background: 'rgba(0,209,255,0.05)', borderColor: 'rgba(0,209,255,0.2)' }}>
                            <Icons.Camera style={{ color: 'var(--accent-cyan)' }} />
                        </div>
                        <div>
                            <div className="session-empty-title">Ready for Next Session</div>
                            <div className="session-empty-sub" style={{ maxWidth: 300, margin: '0 auto' }}>
                                {waitingCount > 0
                                    ? `There are ${waitingCount} people waiting in the queue. Press "Call Next" to continue.`
                                    : 'Booth is idle. Waiting for new check-ins.'
                                }
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="panel-card" style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-stroke)' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-m)', fontWeight: 800, letterSpacing: '0.05em' }}>Current Strategy</div>
                            <div style={{ fontSize: 14, color: 'var(--text-h)', fontWeight: 600, marginTop: 4 }}>Fast Turnaround</div>
                            <div style={{ fontSize: 11, color: 'var(--text-s)', marginTop: 2 }}>Target: 15m session</div>
                        </div>
                        <div className="panel-card" style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-stroke)' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-m)', fontWeight: 800, letterSpacing: '0.05em' }}>Staff Reminder</div>
                            <div style={{ fontSize: 14, color: 'var(--accent-amber)', fontWeight: 600, marginTop: 4 }}>Clean Lens</div>
                            <div style={{ fontSize: 11, color: 'var(--text-s)', marginTop: 2 }}>Keep glass fingerprint-free</div>
                        </div>
                    </div>

                    {waitingCount > 0 && (
                        <div style={{
                            background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.2)',
                            borderRadius: 12, padding: '12px 14px',
                            color: 'var(--accent-cyan)', fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 8,
                            animation: 'pulse-subtle 3s infinite'
                        }}>
                            ✨ {waitingCount} {waitingCount === 1 ? 'customer is' : 'customers are'} waiting for this booth
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const q = normalizeQueue(activeQueue);
    const status = q.status?.toLowerCase();
    const customerName = q.transaction?.customer_name || 'Walk-in';
    const displayNum = (q.queue_number !== undefined && q.queue_number !== null) ? q.queue_number : 0;
    const queueLabel = `${theme.prefix || 'T'}${String(displayNum).padStart(2, '0')}`;
    const peopleCount = q.transaction?.people_count || 1;
    const packageName = q.transaction?.package_name || q.transaction?.packageName || '—';

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
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div className="session-queue-number">{queueLabel}</div>
                    {status === 'in_session' && (
                        <SessionTimer startedAt={q.session_start || q.created_at} duration={q.duration} />
                    )}
                </div>
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
                    <div className="session-tag" style={{ gridColumn: 'span 2' }}>
                        <span className="session-tag-label">Package</span>
                        <span className="session-tag-value">
                            <Icons.Package />
                            {packageName}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Customer arrived banner */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(0,200,83,0.08)',
                                border: '1px solid rgba(0,200,83,0.2)',
                                color: '#00C853', fontSize: 12, fontWeight: 600,
                            }}>
                                <span style={{ fontSize: 16 }}>📣</span>
                                Customer has been called — waiting at booth
                            </div>

                            {/* Primary action */}
                            <button
                                className="action-btn action-btn-start"
                                disabled={!!busy}
                                onClick={() => onAction('start')}
                                style={{ padding: '14px 20px', fontSize: 14, borderRadius: 12 }}
                            >
                                {busy === 'start'
                                    ? <><div className="spinner" style={{ borderTopColor: '#000' }} /> Starting…</>
                                    : <><Icons.Camera /> Begin Session</>
                                }
                            </button>

                            {/* Secondary skip */}
                            <button
                                disabled={!!busy}
                                onClick={() => onSkip(q.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                    padding: '10px 16px', borderRadius: 10,
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--text-m)', cursor: 'pointer',
                                    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,68,68,0.3)'; e.currentTarget.style.color = '#FF4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-m)'; }}
                            >
                                <Icons.SkipForward />
                                No-show — Skip
                            </button>
                        </div>
                    )}
                    {status === 'in_session' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(16,185,129,0.08)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                color: '#10B981', fontSize: 12, fontWeight: 600,
                            }}>
                                <span style={{ fontSize: 16 }}>📸</span>
                                Session in progress
                            </div>
                            <button
                                className="action-btn action-btn-print"
                                disabled={!!busy}
                                onClick={() => onAction('print')}
                                style={{ padding: '14px 20px', fontSize: 14, borderRadius: 12 }}
                            >
                                {busy === 'print'
                                    ? <><div className="spinner" /> Sending…</>
                                    : <><Icons.Printer /> Send to Print</>
                                }
                            </button>
                            <p className="action-hint">Session complete — transfer to print station</p>
                        </div>
                    )}
                    {status === 'print_requested' && (
                        <div style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: 'rgba(236,72,153,0.08)',
                            border: '1px solid rgba(236,72,153,0.2)',
                            color: '#EC4899', fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            🖨️ Awaiting print confirmation from cashier…
                        </div>
                    )}
                    
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="section-label" style={{ fontSize: 11, marginBottom: 8 }}>
                            Staff Notes
                            <div className="section-label-line" />
                        </div>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add session notes here (e.g. backdrop request)..."
                            style={{
                                width: '100%', minHeight: 80, borderRadius: 12,
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text)', fontSize: 13, padding: 12,
                                fontFamily: 'inherit', resize: 'none',
                                marginBottom: 10, outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleNoteSave}
                            disabled={isSavingNote || note === (activeQueue?.note || '')}
                            style={{
                                width: '100%', padding: '10px 0', borderRadius: 10,
                                background: note === (activeQueue?.note || '') ? 'rgba(255,255,255,0.05)' : 'rgba(0,209,255,0.15)',
                                border: '1px solid rgba(0,209,255,0.2)',
                                color: note === (activeQueue?.note || '') ? 'rgba(255,255,255,0.3)' : 'var(--accent-cyan)',
                                fontSize: 13, fontWeight: 800,
                                cursor: note === (activeQueue?.note || '') ? 'default' : 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isSavingNote ? 'Saving...' : 'Update Note'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function StaffDashboard({ theme, queueData, loading, refresh, onChangeBooth, onLogout }) {
    const [busy, setBusy] = useState(null);
    const [toast, setToast] = useState('');
    const [confirmDialog, setConfirmDialog] = useState(null);
    const toastTimer = useRef(null);

    // Read branch name from localStorage for display
    const branchName = (() => {
        try {
            const s = localStorage.getItem('jjikgo-staff-store');
            if (s) return JSON.parse(s)?.state?.branch?.name || null;
        } catch { /* ignore */ }
        return null;
    })();

    const themeName = theme?.name || 'Unknown Booth';
    const rawQueues = (queueData && themeName) ? (queueData[themeName] || []) : [];
    const myQueues = Array.isArray(rawQueues) ? rawQueues.map(normalizeQueue) : [];
    const activeQueue = myQueues.find(q => ['called', 'in_session'].includes(q.status?.toLowerCase())) || null;
    const waitingQueues = myQueues.filter(q => q.status?.toLowerCase() === 'waiting' || !q.status);
    const doneToday = myQueues.filter(q => q.status?.toLowerCase() === 'done').length;

    const showToast = (msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 3000);
    };

    const handleCallNext = () => {
        if (busy || waitingQueues.length === 0) return;
        setConfirmDialog({
            type: 'callNext',
            title: 'Call Next Customer',
            message: `Call the next customer in queue for "${theme.name}"?`,
            confirmLabel: '📣 Call Now',
        });
    };

    const handleSkip = (queueId) => {
        setConfirmDialog({
            type: 'skip',
            queueId,
            title: 'Skip Customer',
            message: 'Mark this customer as a no-show and advance the queue?',
            confirmLabel: 'Skip Customer',
            danger: true,
        });
    };

    const executeCallNext = async () => {
        setBusy('call');
        setConfirmDialog(null);
        try {
            await callNext(parseInt(theme.id, 10));
            await refresh();
            showToast('✅ Next customer called!');
        } catch (err) {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to call next customer';
            showToast(`❌ ${msg}`);
        } finally {
            setBusy(null);
        }
    };

    const executeSkip = async () => {
        setBusy('skip');
        const qId = confirmDialog.queueId;
        setConfirmDialog(null);
        try {
            await skipQueue(qId);
            await refresh();
            showToast('⏭️ Customer skipped');
        } catch (err) {
            const msg = err?.response?.data?.error || 'Failed to skip customer';
            showToast(`❌ ${msg}`);
        } finally {
            setBusy(null);
        }
    };

    const handleNote = async (id, text) => {
        try {
            await updateNotes(id, text);
            await refresh();
            showToast('📝 Note saved');
        } catch {
            showToast('Failed to save note');
        }
    };

    const handleAction = async (action) => {
        if (!activeQueue || busy) return;
        if (action === 'print') {
            setConfirmDialog({
                type: 'print',
                title: 'Send to Print',
                message: 'Transfer this session to the print station? Cashier will be notified.',
                confirmLabel: '🖨️ Send to Print',
            });
            return;
        }
        setBusy(action);
        try {
            if (action === 'start') {
                await startSession(activeQueue.id, null);
                showToast('📸 Session started!');
            }
            await refresh();
        } catch {
            showToast('Action failed — please try again');
        } finally {
            setBusy(null);
        }
    };

    const executePrint = async () => {
        if (!activeQueue) return;
        setBusy('print');
        setConfirmDialog(null);
        try {
            await sendToPrint(activeQueue.id);
            showToast('🖨️ Transferred to print station');
            await refresh();
        } catch {
            showToast('Failed to send print request');
        } finally {
            setBusy(null);
        }
    };

    const handleConfirmDialog = () => {
        if (!confirmDialog) return;
        if (confirmDialog.type === 'callNext') executeCallNext();
        else if (confirmDialog.type === 'skip') executeSkip();
        else if (confirmDialog.type === 'print') executePrint();
    };

    const canCallNext = !busy && waitingQueues.length > 0 && !activeQueue;

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

                    {/* Call Next — Prominent Primary Button */}
                    <div className="panel-card">
                        <button
                            className="call-next-btn primary-action"
                            disabled={!canCallNext}
                            onClick={handleCallNext}
                            style={canCallNext ? {
                                background: 'linear-gradient(135deg, var(--accent-cyan, #00D1FF), #0099CC)',
                                boxShadow: '0 4px 24px rgba(0,209,255,0.35)',
                            } : {}}
                        >
                            {busy === 'call' ? (
                                <><div className="spinner" /> Calling...</>
                            ) : (
                                <>
                                    <Icons.Bell size={18} />
                                    Call Next Customer
                                    {waitingQueues.length > 0 && (
                                        <span style={{
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: 20, padding: '2px 8px',
                                            fontSize: 12, fontWeight: 700, marginLeft: 4,
                                        }}>
                                            {waitingQueues.length}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                        {activeQueue && (
                            <div className="occupied-hint">
                                <Icons.Activity />
                                Session in progress — complete it first
                            </div>
                        )}
                        {!activeQueue && waitingQueues.length === 0 && !busy && (
                            <div style={{
                                fontSize: 12, color: 'var(--text-s)', textAlign: 'center',
                                opacity: 0.6, paddingTop: 6,
                            }}>
                                No customers in queue
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
                                    <Icons.CheckCircle />
                                </div>
                                <div className="queue-empty-text">
                                    Queue is empty<br />
                                    <span style={{ fontSize: 12 }}>New customers appear here automatically</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {waitingQueues.map((q, i) => (
                                    <div key={q.id} style={{ animationDelay: `${i * 0.06}s` }}>
                                        <QueueCard queue={q} theme={theme} isActive={false} index={i} />
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
                        onSkip={handleSkip}
                        onNote={handleNote}
                        busy={busy}
                        waitingCount={waitingQueues.length}
                    />
                </aside>
            </div>

            {/* Confirmation Dialog */}
            {confirmDialog && (
                <ConfirmDialog
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmLabel={confirmDialog.confirmLabel}
                    danger={confirmDialog.danger}
                    onConfirm={handleConfirmDialog}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}

            {/* Toast */}
            {toast && <div className="toast">{toast}</div>}
        </div>
    );
}
