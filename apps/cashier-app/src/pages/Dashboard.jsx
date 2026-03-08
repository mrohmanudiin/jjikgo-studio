import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDateTime, getStatusBadgeClass, getStatusLabel } from '../utils/format';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, ShoppingBag, Clock, Star, Plus, ArrowRight, Package, Layout, Coffee, Eye, EyeOff
} from 'lucide-react';

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, color = '#111111', bg = '#F5F5F5' }) {
    return (
        <div className="card animate-fadeIn" style={{
            padding: '20px 22px', flex: 1, minWidth: 0,
            position: 'relative', overflow: 'hidden'
        }}>
            {/* Accent bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: 3,
                background: color, opacity: 0.6
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={19} color={color} />
                </div>
                <span style={{ fontSize: 10, color: '#C7C7CC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Today
                </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2, color: '#111111' }}>{value}</div>
            <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 500 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: '#C7C7CC', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#111', color: 'white', padding: '10px 14px',
            borderRadius: 10, fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
            <div>{formatCurrency(payload[0].value)}</div>
        </div>
    );
}

// ─── Chart data builder ───────────────────────────────────────────────────
function buildChartData(transactions) {
    const hours = Array.from({ length: 13 }, (_, i) => {
        const h = i + 8;
        return { hour: `${String(h).padStart(2, '0')}:00`, sales: 0 };
    });

    const today = new Date().toISOString().split('T')[0];
    transactions
        .filter((t) => t.created_at.startsWith(today))
        .forEach((t) => {
            const h = new Date(t.created_at).getHours();
            const idx = h - 8;
            if (idx >= 0 && idx < hours.length) hours[idx].sales += t.total;
        });

    return hours;
}

// ─── Default theme colors ─────────────────────────────────────────────────
const FALLBACK_COLORS = ['#C9A96E', '#8B9E8E', '#B08A7E', '#7E9BB5', '#9B7EB0', '#B07E8A', '#71717A'];

export default function Dashboard() {
    const navigate = useNavigate();
    const transactions = useStore((s) => s.transactions);
    const getTodayTx = useStore((s) => s.getTodayTransactions);
    const getTodaySales = useStore((s) => s.getTodaySales);
    const getActiveQ = useStore((s) => s.getActiveQueueCount);
    const getMostUsed = useStore((s) => s.getMostUsedPackage);
    const showSales = useStore((s) => s.showSales);
    const setShowSales = useStore((s) => s.setShowSales);
    const themes = useStore((s) => s.themes);

    const todayTx = getTodayTx();
    const todaySales = getTodaySales();
    const activeQ = getActiveQ();
    const mostUsed = getMostUsed();
    const last5 = transactions.slice(0, 5);
    const chartData = useMemo(() => buildChartData(transactions), [transactions]);

    const displayCurrency = (val) => showSales ? formatCurrency(val) : 'Rp ••••••';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} className="animate-fadeIn">

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <SummaryCard
                    icon={TrendingUp}
                    label="Total Sales"
                    value={displayCurrency(todaySales)}
                    sub={`${todayTx.length} transactions`}
                    color="#34C759"
                    bg="#F0FFF4"
                />
                <SummaryCard
                    icon={ShoppingBag}
                    label="Total Transactions"
                    value={todayTx.length}
                    sub="Completed today"
                    color="#007AFF"
                    bg="#EFF6FF"
                />
                <SummaryCard
                    icon={Clock}
                    label="Active Queue"
                    value={activeQ}
                    sub="Waiting to shoot"
                    color="#FF9500"
                    bg="#FFF8EE"
                />
                <SummaryCard
                    icon={Star}
                    label="Top Package"
                    value={mostUsed}
                    sub="Most popular today"
                    color="#AF52DE"
                    bg="#F5EEFF"
                />
            </div>

            {/* Theme Specific Queues */}
            {themes.length > 0 && (
                <div className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Layout size={18} color="#111" />
                        <span style={{ fontWeight: 700, fontSize: 15 }}>Theme Queues</span>
                        <span style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500, marginLeft: 'auto' }}>
                            Active orders per booth
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(themes.length, 5)}, 1fr)`, gap: 12 }}>
                        {themes.map((theme, idx) => {
                            const count = transactions.filter(tx =>
                                tx.theme_id === theme.id && tx.order_status !== 'DONE'
                            ).length;
                            const themeColor = theme.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

                            return (
                                <div key={theme.id} style={{
                                    padding: '16px 18px', position: 'relative', overflow: 'hidden',
                                    borderRadius: 12, border: '1.5px solid #F2F2F7',
                                    background: count > 0 ? `${themeColor}08` : 'white',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
                                        background: themeColor, borderRadius: '4px 0 0 4px'
                                    }} />
                                    <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>
                                        {theme.name || theme.label}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: '#111' }}>{count}</div>
                                        <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500 }}>orders</div>
                                    </div>
                                    {count > 0 && (
                                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: '#FF9500' }}>
                                            <Clock size={11} />
                                            <span style={{ fontSize: 11, fontWeight: 700 }}>
                                                Est. {count * 7}-{count * 10} min
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Chart + Recent Transactions */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

                {/* Line Chart */}
                <div className="card" style={{ padding: '24px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Sales Overview</div>
                            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>Revenue per hour — today</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => setShowSales(!showSales)}
                                style={{
                                    background: '#F5F5F5', border: 'none', cursor: 'pointer',
                                    color: '#8E8E93', display: 'flex', alignItems: 'center',
                                    padding: 8, borderRadius: 8
                                }}
                                title={showSales ? "Hide sales" : "Show sales"}
                            >
                                {showSales ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#34C759' }}>{displayCurrency(todaySales)}</div>
                        </div>
                    </div>
                    {chartData.some((d) => d.sales > 0) ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} axisLine={false} tickLine={false} tickFormatter={(v) => v > 0 ? `${v / 1000}k` : '0'} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone" dataKey="sales"
                                    stroke="#111111" strokeWidth={2.5}
                                    dot={{ fill: '#111', r: 4, strokeWidth: 0 }}
                                    activeDot={{ r: 6, fill: '#111' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{
                            height: 220, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 16,
                            background: '#FAFAFA', borderRadius: 12
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, background: '#F0F0F0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TrendingUp size={24} color="#C7C7CC" />
                            </div>
                            <div style={{ color: '#8E8E93', fontSize: 14, fontWeight: 500 }}>No sales data yet today</div>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/transaction')}
                                style={{ fontSize: 13, padding: '10px 20px' }}
                            >
                                <Plus size={14} /> Create First Transaction
                            </button>
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="card" style={{ padding: '24px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>Recent</div>
                            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>Last 5 transactions</div>
                        </div>
                        <button
                            onClick={() => navigate('/queue')}
                            style={{
                                background: '#F5F5F5', border: 'none', cursor: 'pointer',
                                color: '#8E8E93', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                                fontWeight: 600, padding: '6px 12px', borderRadius: 8
                            }}
                        >
                            View all <ArrowRight size={12} />
                        </button>
                    </div>

                    {last5.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0' }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 14, background: '#F5F5F5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Package size={24} color="#C7C7CC" />
                            </div>
                            <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 500 }}>No transactions yet</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', flex: 1 }}>
                            {last5.map((tx, idx) => (
                                <div key={`${tx.order_id}-${idx}`} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 12px', borderRadius: 10,
                                    background: '#FAFAFA', border: '1px solid #F2F2F7',
                                    transition: 'background 0.15s ease'
                                }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{tx.order_id}</span>
                                            <span className={`badge ${getStatusBadgeClass(tx.order_status)}`}>
                                                {getStatusLabel(tx.order_status)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {tx.package}
                                            {tx.cafe_snacks && tx.cafe_snacks.length > 0 && (
                                                <span style={{ color: '#FF9500', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                    <Coffee size={10} /> + Cafe
                                                </span>
                                            )}
                                            <span style={{ margin: '0 4px' }}>·</span>
                                            {formatDateTime(tx.created_at)}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginLeft: 12, whiteSpace: 'nowrap', color: '#111' }}>
                                        {displayCurrency(tx.total)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick action bar */}
            <div className="card" style={{
                padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #111 0%, #1C1C1E 100%)', color: 'white',
                border: 'none'
            }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Ready to serve customers?</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Create a new transaction in under 30 seconds.</div>
                </div>
                <button
                    id="dashboard-new-transaction"
                    className="btn"
                    style={{
                        padding: '12px 24px', fontSize: 14, fontWeight: 700,
                        background: 'white', color: '#111', border: 'none',
                        borderRadius: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8
                    }}
                    onClick={() => navigate('/transaction')}
                >
                    <Plus size={16} />
                    New Transaction
                </button>
            </div>
        </div>
    );
}
