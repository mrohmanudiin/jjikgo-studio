import React, { useState } from 'react';
import { useStore, ORDER_STATUSES } from '../store/useStore';
import { formatCurrency, formatDateTime, getStatusBadgeClass, getStatusLabel } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Package, Coffee, ArrowRight } from 'lucide-react';

const STATUS_COLORS = {
    WAITING_SHOOT: { bg: '#FFF8EE', border: '#FFD580', text: '#9A6700', icon: '⏳' },
    SHOOTING: { bg: '#EFF6FF', border: '#93C5FD', text: '#003F7D', icon: '📸' },
    EDITING: { bg: '#F5EEFF', border: '#C4B5FD', text: '#432874', icon: '🎨' },
    PRINTING: { bg: '#ECFDF5', border: '#6EE7B7', text: '#1A6651', icon: '🖨️' },
    DONE: { bg: '#F0FFF4', border: '#86EFAC', text: '#155724', icon: '✅' },
};

export default function ProductionQueue() {
    const navigate = useNavigate();
    const transactions = useStore((s) => s.transactions);
    const updateOrderStatus = useStore((s) => s.updateOrderStatus);
    const themes = useStore((s) => s.themes);

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [themeFilter, setThemeFilter] = useState('ALL');

    const filtered = transactions.filter((t) => {
        const matchesStatus = statusFilter === 'ALL' || t.order_status === statusFilter;
        const matchesTheme = themeFilter === 'ALL' || t.theme_id === themeFilter;
        return matchesStatus && matchesTheme;
    });

    const counts = {};
    ORDER_STATUSES.forEach((s) => {
        counts[s] = transactions.filter((t) => t.order_status === s).length;
    });

    return (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Production Queue</h2>
                    <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>
                        {transactions.length} total orders · {counts.WAITING_SHOOT || 0} waiting
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
                        All ({transactions.length})
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
                            const sc = STATUS_COLORS[tx.order_status] || STATUS_COLORS.WAITING_SHOOT;
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
                                            <div style={{ fontSize: 28, fontWeight: 900, color: '#111', letterSpacing: '-0.02em', lineHeight: 1 }}>{tx.queue_number}</div>
                                        </div>
                                        <span className={`badge ${getStatusBadgeClass(tx.order_status)}`} style={{ fontSize: 12, padding: '6px 12px' }}>
                                            {sc.icon} {getStatusLabel(tx.order_status)}
                                        </span>
                                    </div>

                                    {/* Customer & Time */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: '#FAFAFA', padding: '12px 14px', borderRadius: 10
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: '#111', color: 'white',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 14, fontWeight: 700
                                            }}>
                                                {tx.customer_name?.[0]?.toUpperCase() || 'C'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{tx.customer_name || 'Walk-in'}</div>
                                                <div style={{ fontSize: 12, color: '#8E8E93' }}>
                                                    <span style={{ fontWeight: 600 }}>{tx.order_id}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#8E8E93', textAlign: 'right', fontWeight: 500 }}>
                                            {formatDateTime(tx.created_at)}
                                        </div>
                                    </div>

                                    {/* Order Details */}
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>📦 {tx.package}</div>

                                        {tx.theme && (
                                            <div style={{ fontSize: 13, color: '#636366', fontWeight: 500, marginBottom: 4 }}>
                                                🎨 Theme: <span style={{ fontWeight: 600, color: '#111' }}>{tx.theme}</span>
                                            </div>
                                        )}

                                        {tx.cafe_snacks && tx.cafe_snacks.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                {tx.cafe_snacks.map((s, si) => (
                                                    <span key={si} style={{
                                                        fontSize: 12, fontWeight: 600,
                                                        background: '#FFF8EE', color: '#FF9500',
                                                        padding: '4px 10px', borderRadius: 6,
                                                        display: 'inline-flex', alignItems: 'center', gap: 4
                                                    }}>
                                                        <Coffee size={12} /> {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer: Total & Actions */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        marginTop: 'auto', paddingTop: 12,
                                        borderTop: '1px solid #F2F2F7'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 10, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total</span>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{formatCurrency(tx.total)}</div>
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
    const [open, setOpen] = useState(false);

    if (currentStatus === 'DONE') {
        return (
            <span style={{
                fontSize: 12, color: '#34C759', fontWeight: 700,
                background: '#F0FFF4', padding: '6px 12px', borderRadius: 8
            }}>
                ✅ Completed
            </span>
        );
    }

    const nextStatuses = ORDER_STATUSES.filter((s) => s !== currentStatus);

    return (
        <div style={{ position: 'relative' }}>
            <button
                className="btn btn-primary"
                style={{
                    fontSize: 13, padding: '10px 16px', gap: 6,
                    minHeight: 42, fontWeight: 700, borderRadius: 10
                }}
                onClick={() => setOpen((o) => !o)}
            >
                Update Status <ChevronRight size={14} />
            </button>
            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                        onClick={() => setOpen(false)}
                    />
                    <div style={{
                        position: 'absolute', right: 0, top: '100%',
                        marginTop: 6, zIndex: 100,
                        background: 'white',
                        border: '1.5px solid #E5E5EA',
                        borderRadius: 12,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                        minWidth: 180,
                        overflow: 'hidden',
                    }}>
                        <div style={{ padding: '8px 14px', fontSize: 10, color: '#8E8E93', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Move to
                        </div>
                        {nextStatuses.map((s) => {
                            const sc = STATUS_COLORS[s];
                            return (
                                <button
                                    key={s}
                                    onClick={() => { onChange(orderId, s); setOpen(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        width: '100%', padding: '12px 14px',
                                        background: 'none', border: 'none',
                                        cursor: 'pointer', textAlign: 'left',
                                        fontSize: 14, fontWeight: 600, color: sc.text,
                                        transition: 'background 0.15s ease',
                                        borderTop: '1px solid #F8F8F8',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = sc.bg)}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                >
                                    <span style={{ fontSize: 18 }}>{sc.icon}</span>
                                    <span>{getStatusLabel(s)}</span>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
