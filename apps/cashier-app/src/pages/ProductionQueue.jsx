import React, { useState } from 'react';
import { useStore, ORDER_STATUSES } from '../store/useStore';
import { formatCurrency, formatDateTime, getStatusBadgeClass, getStatusLabel } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Package, Coffee, ArrowRight, Printer } from 'lucide-react';

const STATUS_COLORS = {
    waiting: { bg: '#FFF8EE', border: '#FFD580', text: '#9A6700', icon: '⏳' },
    called: { bg: '#EFF6FF', border: '#93C5FD', text: '#003F7D', icon: '📣' },
    in_session: { bg: '#EFF6FF', border: '#93C5FD', text: '#003F7D', icon: '📸' },
    print_requested: { bg: '#FDF2F8', border: '#F9A8D4', text: '#9D174D', icon: '🖨️' },
    printing: { bg: '#ECFDF5', border: '#6EE7B7', text: '#1A6651', icon: '🖨️' },
    done: { bg: '#F0FFF4', border: '#86EFAC', text: '#155724', icon: '✅' },
};

export default function ProductionQueue() {
    const navigate = useNavigate();
    const transactions = useStore((s) => s.transactions);
    const updateOrderStatus = useStore((s) => s.updateOrderStatus);
    const confirmPrint = useStore((s) => s.confirmPrint);
    const getPrintRequests = useStore((s) => s.getPrintRequests);
    const themes = useStore((s) => s.themes);

    const printRequests = getPrintRequests();

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [themeFilter, setThemeFilter] = useState('ALL');
    const [confirmingPrint, setConfirmingPrint] = useState(null);

    const handleConfirmPrint = async (id) => {
        setConfirmingPrint(id);
        await confirmPrint(id);
        setConfirmingPrint(null);
    };

    const txList = Array.isArray(transactions) ? transactions : [];
    const filtered = txList.filter((t) => {
        const matchesStatus = statusFilter === 'ALL' || t.order_status === statusFilter;
        const matchesTheme = themeFilter === 'ALL' || t.theme_id === themeFilter;
        return matchesStatus && matchesTheme;
    });

    const counts = {};
    ORDER_STATUSES.forEach((s) => {
        counts[s] = txList.filter((t) => t.order_status === s).length;
    });

    return (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Production Queue</h2>
                    <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>
                        {(transactions || []).length} total orders · {counts.waiting || 0} waiting
                        {printRequests.length > 0 && (
                            <span style={{
                                marginLeft: 8,
                                background: '#FCE7F3', color: '#9D174D',
                                fontWeight: 700, padding: '2px 8px', borderRadius: 100, fontSize: 12
                            }}>
                                🖨️ {printRequests.length} print request{printRequests.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    id="queue-new-transaction"
                    className="btn btn-primary"
                    onClick={() => navigate('/transaction')}
                    style={{ fontSize: 13, padding: '10px 18px' }}
                >
                    <Plus size={15} /> New Transaction
                </button>
            </div>

            {/* ─── Print Requests Panel ─────────────────────────────────────── */}
            {printRequests.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #FDF2F8, #FEE2F2)',
                    border: '2px solid #F9A8D4',
                    borderRadius: 16,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    animation: 'fadeIn 0.3s ease both',
                }}>
                    {/* Section header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, flexShrink: 0,
                        }}>
                            🖨️
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#9D174D', letterSpacing: '-0.01em' }}>
                                Print Requests from Staff
                            </div>
                            <div style={{ fontSize: 12, color: '#BE185D', fontWeight: 500 }}>
                                {printRequests.length} customer{printRequests.length > 1 ? 's' : ''} ready to print — confirm to proceed
                            </div>
                        </div>
                    </div>

                    {/* Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {printRequests.map((req) => (
                            <div key={req.id} style={{
                                background: 'white',
                                borderRadius: 12,
                                border: '1.5px solid #F9A8D4',
                                padding: '16px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                boxShadow: '0 2px 8px rgba(236,72,153,0.1)',
                            }}>
                                {/* Queue Number + Customer */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        background: '#FCE7F3', color: '#9D174D',
                                        fontWeight: 900, fontSize: 18, borderRadius: 8,
                                        padding: '8px 12px', letterSpacing: '-0.02em',
                                        lineHeight: 1,
                                    }}>
                                        {req.queue_number}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 15, color: '#111', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {req.customer_name}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500, marginTop: 2 }}>
                                            👥 {req.people_count} pax · 🎨 {req.theme}
                                        </div>
                                    </div>
                                </div>

                                {/* Info row */}
                                <div style={{ fontSize: 12, color: '#636366', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Printer size={12} color="#EC4899" />
                                    Staff has selected photos — ready to print
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => handleConfirmPrint(req.id || req.session_id)}
                                        disabled={confirmingPrint === (req.id || req.session_id)}
                                        style={{
                                            flex: 1,
                                            background: confirmingPrint === (req.id || req.session_id) ? '#E5E5EA' : '#EC4899',
                                            color: confirmingPrint === (req.id || req.session_id) ? '#8E8E93' : 'white',
                                            border: 'none', borderRadius: 8,
                                            padding: '10px 0', fontWeight: 800,
                                            fontSize: 13, cursor: confirmingPrint ? 'wait' : 'pointer',
                                            fontFamily: 'inherit',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {confirmingPrint === (req.id || req.session_id)
                                            ? '⏳ Confirming…'
                                            : '✅ Confirm Print'
                                        }
                                    </button>
                                    <button
                                        onClick={() => updateOrderStatus(req.id || req.session_id, 'done')}
                                        style={{
                                            background: '#F5F5F5',
                                            color: '#636366',
                                            border: '1.5px solid #E5E5EA',
                                            borderRadius: 8,
                                            padding: '10px 14px',
                                            fontWeight: 700,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                        }}
                                        title="Mark as done (skip printing)"
                                    >
                                        Skip
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Kanban Pipeline */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ORDER_STATUSES.length}, 1fr)`, gap: 8 }}>
                {ORDER_STATUSES.map((s) => {
                    const c = STATUS_COLORS[s];
                    const count = counts[s] || 0;
                    const isActive = statusFilter === s;
                    return (
                        <div
                            key={s}
                            style={{
                                background: c.bg,
                                border: `2px solid ${isActive ? c.text : c.border}`,
                                borderRadius: 12,
                                padding: '14px 16px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: isActive ? `0 4px 12px ${c.border}40` : 'none',
                            }}
                            onClick={() => setStatusFilter(s === statusFilter ? 'ALL' : s)}
                        >
                            <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                            <div style={{ fontSize: 26, fontWeight: 900, color: c.text, lineHeight: 1 }}>{count}</div>
                            <div style={{ fontSize: 11, color: c.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>
                                {getStatusLabel(s)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Status */}
                <div style={{
                    display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
                    background: '#F5F5F5', padding: '6px 8px', borderRadius: 10
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', padding: '0 6px' }}>Status</span>
                    <button
                        className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 11, padding: '5px 12px', height: 30, borderRadius: 8 }}
                        onClick={() => setStatusFilter('ALL')}
                    >
                        All ({(transactions || []).length})
                    </button>
                    {ORDER_STATUSES.map((s) => (
                        <button
                            key={s}
                            className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: 11, padding: '5px 12px', height: 30, borderRadius: 8 }}
                            onClick={() => setStatusFilter(s)}
                        >
                            {STATUS_COLORS[s].icon} {getStatusLabel(s)} ({counts[s] || 0})
                        </button>
                    ))}
                </div>

                {/* Theme */}
                {themes.length > 0 && (
                    <div style={{
                        display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
                        background: '#F5F5F5', padding: '6px 8px', borderRadius: 10
                    }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', padding: '0 6px' }}>Theme</span>
                        <button
                            className={`btn ${themeFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: 11, padding: '5px 12px', height: 30, borderRadius: 8 }}
                            onClick={() => setThemeFilter('ALL')}
                        >
                            All
                        </button>
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                className={`btn ${themeFilter === t.id ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ fontSize: 11, padding: '5px 12px', height: 30, borderRadius: 8, gap: 6 }}
                                onClick={() => setThemeFilter(t.id)}
                            >
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color || '#ccc', flexShrink: 0 }}></div>
                                {t.name || t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Queue Cards */}
            <div className="card" style={{ padding: 0 }}>
                {filtered.length === 0 ? (
                    <div style={{
                        padding: '60px 24px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 16,
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 18,
                            background: '#F5F5F5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Package size={28} color="#C7C7CC" />
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#8E8E93' }}>No orders found</div>
                        <div style={{ fontSize: 13, color: '#C7C7CC' }}>
                            {statusFilter !== 'ALL' ? 'Try changing the filter above' : 'Create a transaction to get started'}
                        </div>
                        <button
                            className="btn btn-primary"
                            style={{ fontSize: 13, padding: '10px 20px' }}
                            onClick={() => navigate('/transaction')}
                        >
                            <Plus size={14} /> Add Transaction
                        </button>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                        gap: 0,
                    }}>
                        {filtered.map((tx, idx) => {
                            const sc = STATUS_COLORS[tx.order_status] || STATUS_COLORS.waiting;
                            return (
                                <div key={tx.id || `${tx.order_id}-${idx}`} style={{
                                    padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
                                    borderRight: '1px solid #F2F2F7',
                                    borderBottom: '1px solid #F2F2F7',
                                }}>

                                    {/* Header: Queue + Status Badge */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase' }}>Queue</div>
                                            <div style={{ fontSize: 32, fontWeight: 900, color: '#111', letterSpacing: '-0.02em', lineHeight: 1 }}>{tx.queue_number}</div>
                                        </div>
                                        <span className={`badge ${getStatusBadgeClass(tx.order_status)}`} style={{ fontSize: 13, padding: '6px 12px', fontWeight: 800 }}>
                                            {sc.icon} {getStatusLabel(tx.order_status)}
                                        </span>
                                    </div>

                                    {/* Customer & Time */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: '#FAFAFA', padding: '12px 14px', borderRadius: 12
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '50%',
                                                background: '#111', color: 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 16, fontWeight: 800
                                            }}>
                                                {tx.customer_name?.[0]?.toUpperCase() || 'C'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ fontSize: 16, fontWeight: 800, color: '#111', letterSpacing: '-0.01em' }}>
                                                    {tx.customer_name || 'Walk-in'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontWeight: 800, color: '#007AFF', background: '#E5F1FF', padding: '4px 8px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        👥 {tx.people_count || 1} people
                                                    </span>
                                                    <span style={{ fontWeight: 600, fontSize: 12, color: '#8E8E93' }}>Inv: {tx.order_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#8E8E93', textAlign: 'right', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                            <div>{formatDateTime(tx.created_at)}</div>
                                            {tx.order_status !== 'done' && (
                                                <div style={{ color: '#FF9500', fontWeight: 800, fontSize: 11, background: '#FFF8EE', padding: '4px 8px', borderRadius: 6 }}>
                                                    ⏳ Est. 7-10 mins
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {tx.theme && tx.theme !== '—' && (
                                            <div style={{ fontSize: 15, color: '#111', fontWeight: 800, background: '#F2F2F7', padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                🎨 <span style={{ letterSpacing: '-0.01em' }}>{tx.theme}</span>
                                            </div>
                                        )}
                                        {tx.package && (
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#636366', marginLeft: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                📦 {tx.package}
                                            </div>
                                        )}

                                        {tx.cafe_snacks && tx.cafe_snacks.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                                {tx.cafe_snacks.map((s, si) => (
                                                    <span key={si} style={{
                                                        fontSize: 12, fontWeight: 700,
                                                        background: '#111', color: '#FFF',
                                                        padding: '6px 12px', borderRadius: 8,
                                                        display: 'inline-flex', alignItems: 'center', gap: 6
                                                    }}>
                                                        <Coffee size={13} color="#FFF" /> {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer: Total & Actions */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        marginTop: 'auto', paddingTop: 16,
                                        borderTop: '1px solid #F2F2F7'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: 2 }}>Total</span>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: '#111', letterSpacing: '-0.02em' }}>{formatCurrency(tx.total)}</div>
                                        </div>
                                        <StatusChanger currentStatus={tx.order_status} orderId={tx.id || tx.order_id} onChange={updateOrderStatus} />
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Status Changer Dropdown ──────────────────────────────────────────────────
function StatusChanger({ currentStatus, orderId, onChange }) {
    if (currentStatus === 'done') {
        return (
            <span style={{
                fontSize: 13, color: '#34C759', fontWeight: 800,
                background: '#F0FFF4', padding: '8px 14px', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 6
            }}>
                ✅ Completed
            </span>
        );
    }

    const getNextAction = (status) => {
        const s = status?.toLowerCase();
        switch (s) {
            case 'waiting': return { next: 'called', label: 'Call Next', icon: '📣', color: '#007AFF', bg: '#E5F1FF' };
            case 'called': return { next: 'in_session', label: 'Start Session', icon: '📸', color: '#5856D6', bg: '#EEEBFF' };
            case 'in_session': return { next: 'print_requested', label: 'Request Print', icon: '🖨️', color: '#EC4899', bg: '#FDF2F8' };
            case 'print_requested': return { next: 'printing', label: 'Start Printing', icon: '🖨️', color: '#34C759', bg: '#EAFBEE' };
            case 'printing': return { next: 'done', label: 'Complete', icon: '✅', color: '#FFF', bg: '#111' };
            default: return null;
        }
    };

    const action = getNextAction(currentStatus);

    if (!action) return null;

    return (
        <button
            onClick={() => onChange(orderId, action.next)}
            style={{
                fontSize: 14, fontWeight: 800,
                padding: '12px 20px', borderRadius: 12,
                background: action.bg, color: action.color,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
        >
            {action.icon} {action.label} <ArrowRight size={16} />
        </button>
    );
}
