import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDateTime, getStatusBadgeClass, getStatusLabel } from '../utils/format';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, TrendingDown, ShoppingBag, Clock, Star, Plus, ArrowRight, Package, Layout, Coffee, Eye, EyeOff, Activity, Zap, Users, ListOrdered, LogOut, DollarSign, AlertCircle
} from 'lucide-react';

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, color, bg }) {
    return (
        <div className="card animate-fadeIn group" style={{
            padding: '24px', flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden',
            border: '1px solid #F2F2F7', transition: 'all 0.3s ease',
            cursor: 'default',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: 4,
                background: color, opacity: 0.8
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: color, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="group-hover:scale-110">
                    <Icon size={24} strokeWidth={2.5} />
                </div>
                <div style={{
                    background: '#F5F5F5', color: '#8E8E93', fontSize: 11, fontWeight: 700,
                    padding: '4px 8px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                    Today
                </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: '#111' }}>
                {value}
            </div>
            <div style={{ fontSize: 14, color: '#8E8E93', fontWeight: 600 }}>{label}</div>
            {sub && <div style={{ fontSize: 12, color: '#C7C7CC', marginTop: 8, fontWeight: 500 }}>{sub}</div>}
        </div>
    );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(17, 17, 17, 0.95)', color: 'white', padding: '12px 16px',
            borderRadius: 12, fontSize: 13, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#C7C7CC' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(payload[0].value)}</div>
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
    (Array.isArray(transactions) ? transactions : [])
        .filter((t) => {
            const ts = t.created_at || t.createdAt || '';
            return ts.startsWith(today);
        })
        .forEach((t) => {
            const ts = t.created_at || t.createdAt || '';
            const h = new Date(ts).getHours();
            const idx = h - 8;
            if (idx >= 0 && idx < hours.length) hours[idx].sales += t.total;
        });

    return hours;
}

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
    const safeTx = Array.isArray(transactions) ? transactions : [];
    const last5 = safeTx.slice(0, 5);
    const chartData = useMemo(() => buildChartData(safeTx), [transactions]);

    const currentShift = useStore((s) => s.currentShift);

    const displayCurrency = (val) => showSales ? formatCurrency(val) : 'Rp ••••••';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }} className="animate-fadeIn">

            {/* Shift Alert (if closed) */}
            {!currentShift && (
                <div style={{
                    padding: '16px 24px', borderRadius: 16, background: '#FFF1F0', border: '1px solid #FF3B3020',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#FF3B30' }}>
                        <AlertCircle size={20} />
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>Register is Closed</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>Start a shift before processing any transactions.</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/shift')}
                        className="btn" 
                        style={{ padding: '8px 16px', background: '#FF3B30', color: 'white', fontSize: 13, fontWeight: 700 }}
                    >Open Register</button>
                </div>
            )}

            {/* Header / Actions Banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 4 }}>Overview</h1>
                    <p style={{ color: '#8E8E93', fontSize: 14, fontWeight: 500 }}>Monitor your studio operations and live queues.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        className="btn"
                        style={{
                            padding: '12px 20px', fontSize: 15, fontWeight: 700,
                            background: currentShift ? '#F2F2F7' : 'white', 
                            color: currentShift ? '#111' : '#8E8E93', 
                            border: '1.5px solid #E5E5EA',
                            borderRadius: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8
                        }}
                        onClick={() => navigate('/shift')}
                    >
                        <DollarSign size={18} color={currentShift ? '#34C759' : '#8E8E93'} />
                        {currentShift ? 'Shift Active' : 'Shift Inactive'}
                    </button>
                    <button
                        className="btn"
                        style={{
                            padding: '12px 24px', fontSize: 15, fontWeight: 700,
                            background: '#111', color: 'white', border: 'none',
                            borderRadius: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 8px 24px rgba(17,17,17,0.2)'
                        }}
                        onClick={() => navigate('/transaction')}
                    >
                        <Plus size={18} />
                        New Transaction
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <SummaryCard
                    icon={TrendingUp}
                    label="Total Sales"
                    value={displayCurrency(todaySales)}
                    sub={`${todayTx.length} transactions`}
                    color="#34C759" bg="#F0FFF4"
                />
                <SummaryCard
                    icon={ShoppingBag}
                    label="Total Transactions"
                    value={todayTx.length}
                    sub="Completed today"
                    color="#007AFF" bg="#EFF6FF"
                />
                <SummaryCard
                    icon={Clock}
                    label="Active Queue"
                    value={activeQ}
                    sub="Waiting to shoot"
                    color="#FF9500" bg="#FFF8EE"
                />
                <SummaryCard
                    icon={Star}
                    label="Top Package"
                    value={mostUsed}
                    sub="Most popular today"
                    color="#AF52DE" bg="#F5EEFF"
                />
            </div>

            {/* Theme Specific Queues (Booths) */}
            {themes.length > 0 && (
                <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #E5E5EA', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#111', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Layout size={16} />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>Live Booth Status</h3>
                                <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>Current activity across all available themes</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34C759', background: '#F0FFF4', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(themes.length, 5)}, 1fr)`, gap: 1, background: '#F2F2F7' }}>
                        {themes.map((theme, idx) => {
                            // Only count live booth activity statuses
                            const IN_BOOTH_STATUSES = ['waiting', 'called', 'in_session'];
                            const count = (Array.isArray(transactions) ? transactions : []).filter(tx =>
                                (tx.theme_id === theme.id || tx.themeId === theme.id) &&
                                IN_BOOTH_STATUSES.includes((tx.order_status || tx.status)?.toLowerCase())
                            ).length;

                            const themeColor = theme.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                            const isActive = count > 0;

                            return (
                                <div key={theme.id} style={{
                                    padding: '24px 20px', position: 'relative', overflow: 'hidden',
                                    background: isActive ? 'white' : '#FAFAFA',
                                    display: 'flex', flexDirection: 'column',
                                    transition: 'all 0.2s ease',
                                    borderTop: `4px solid ${isActive ? themeColor : 'transparent'}`
                                }}>
                                    <div style={{ fontSize: 12, color: isActive ? '#111' : '#8E8E93', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                                        {theme.name || theme.label}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: isActive ? 12 : 0 }}>
                                        <div style={{ fontSize: 36, fontWeight: 900, color: isActive ? '#111' : '#C7C7CC', lineHeight: 1 }}>{count}</div>
                                        <div style={{ fontSize: 13, color: '#8E8E93', fontWeight: 600 }}>{count === 1 ? 'order' : 'orders'}</div>
                                    </div>
                                    {isActive ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF9500', background: '#FFF8EE', padding: '6px 10px', borderRadius: 6, alignSelf: 'flex-start' }}>
                                            <Clock size={12} strokeWidth={3} />
                                            <span style={{ fontSize: 12, fontWeight: 700 }}>
                                                Wait: ~{count * 7}m
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 13, color: '#C7C7CC', fontWeight: 500, marginTop: 4 }}>Empty queue</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Chart + Recent Transactions */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 20 }}>

                {/* Sales Chart */}
                <div className="card" style={{ padding: 0, minWidth: 0, border: '1px solid #E5E5EA', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 18, color: '#111' }}>Sales Analytics</div>
                            <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>Hourly performance for today</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => setShowSales(!showSales)}
                                style={{
                                    background: '#F5F5F5', border: 'none', cursor: 'pointer',
                                    color: '#8E8E93', display: 'flex', alignItems: 'center',
                                    padding: 8, borderRadius: 8, transition: 'all 0.2s'
                                }}
                                className="hover:bg-gray-200"
                                title={showSales ? "Hide sales" : "Show sales"}
                            >
                                {showSales ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#34C759', fontFeatureSettings: '"tnum"' }}>{displayCurrency(todaySales)}</div>
                        </div>
                    </div>
                    {chartData.some((d) => d.sales > 0) ? (
                        <div style={{ height: 260, paddingRight: 24, paddingLeft: 8, paddingBottom: 16 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#111" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#111" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                                    <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#8E8E93' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 12, fill: '#8E8E93', fontFeatureSettings: '"tnum"' }} axisLine={false} tickLine={false} tickFormatter={(v) => v > 0 ? `${(v / 1000).toLocaleString()}k` : '0'} dx={-10} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E5E5EA', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                    <Area
                                        type="monotone" dataKey="sales"
                                        stroke="#111" strokeWidth={3}
                                        fillOpacity={1} fill="url(#colorSales)"
                                        activeDot={{ r: 6, fill: '#111', stroke: 'white', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{
                            height: 260, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 16,
                            background: '#FAFAFA', borderRadius: '0 0 16px 16px'
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16, background: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <TrendingUp size={24} color="#C7C7CC" />
                            </div>
                            <div style={{ color: '#8E8E93', fontSize: 14, fontWeight: 600 }}>No sales data available today</div>
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="card" style={{ padding: 0, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid #E5E5EA', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F2F2F7' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 18, color: '#111' }}>Recent Orders</div>
                            <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>Last 5 transactions</div>
                        </div>
                        <button
                            onClick={() => navigate('/queue')}
                            style={{
                                background: '#F5F5F5', border: 'none', cursor: 'pointer',
                                color: '#111', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                                fontWeight: 700, padding: '8px 12px', borderRadius: 8, transition: 'background 0.2s'
                            }}
                            className="hover:bg-gray-200"
                        >
                            View all <ArrowRight size={14} />
                        </button>
                    </div>

                    {last5.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0', background: '#FAFAFA', borderRadius: '0 0 16px 16px' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: 16, background: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <Package size={28} color="#C7C7CC" />
                            </div>
                            <div style={{ fontSize: 14, color: '#8E8E93', fontWeight: 600 }}>No recent transactions</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                            {last5.map((tx, idx) => (
                                <div key={`${tx.order_id}-${idx}`} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 24px', borderBottom: idx !== last5.length - 1 ? '1px solid #F2F2F7' : 'none',
                                    transition: 'background 0.15s ease', cursor: 'pointer'
                                }} className="hover:bg-gray-50">
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ fontWeight: 800, fontSize: 14, color: '#111' }}>{tx.order_id}</span>
                                            <span className={`badge ${getStatusBadgeClass(tx.order_status)}`} style={{ padding: '4px 8px', fontSize: 11 }}>
                                                {getStatusLabel(tx.order_status)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, color: '#8E8E93', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                            <span style={{ color: '#111' }}>{tx.package}</span>
                                            {tx.cafe_snacks && tx.cafe_snacks.length > 0 && (
                                                <span style={{ color: '#FF9500', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF8EE', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                                    <Coffee size={10} /> +Cafe
                                                </span>
                                            )}
                                            <span style={{ color: '#C7C7CC' }}>•</span>
                                            {formatDateTime(tx.created_at)}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 14, marginLeft: 16, whiteSpace: 'nowrap', color: '#111', fontFeatureSettings: '"tnum"' }}>
                                        {displayCurrency(tx.total)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick action bar */}
            <div className="card group hover:shadow-2xl" style={{
                padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #111 0%, #1C1C1E 100%)', color: 'white',
                border: 'none', transition: 'all 0.3s ease', cursor: 'pointer'
            }} onClick={() => navigate('/transaction')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
                        <Zap size={28} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Fast Lane Transaction</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Process a customer order in under 30 seconds.</div>
                    </div>
                </div>
                <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: 'white', color: '#111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} className="group-hover:translate-x-2">
                    <ArrowRight size={24} strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );
}
