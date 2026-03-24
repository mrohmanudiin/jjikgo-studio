import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
    CircleDollarSign,
    TrendingUp,
    CreditCard,
    Activity,
    CalendarDays,
    Download,
    FileSpreadsheet,
    ArrowUpRight,
    Loader2,
    Target,
    X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { format, subDays, startOfWeek, startOfMonth, parseISO, getHours } from 'date-fns';

function getDateRange(range, customFrom, customTo) {
    const now = new Date();
    switch (range) {
        case 'Today':
            return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
        case 'Yesterday':
            return { from: format(subDays(now, 1), 'yyyy-MM-dd'), to: format(subDays(now, 1), 'yyyy-MM-dd') };
        case '7 Days':
            return { from: format(subDays(now, 7), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
        case '30 Days':
            return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
        case 'This Month':
            return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
        case 'Custom':
            return { from: customFrom, to: customTo };
        default:
            return {};
    }
}

function StatCard({ title, value, subtext, icon: Icon, trend, colorClass = 'text-primary', bgClass = 'bg-primary/10' }) {
    const positive = trend !== undefined && trend >= 0;
    return (
        <div className="bg-card/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
            <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`${bgClass} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-6 w-6 ${colorClass}`} />
                    </div>
                    {trend !== undefined && trend !== null && (
                        <div className={`flex items-center gap-1 text-xs font-bold ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3 rotate-90" />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
                <div className="text-3xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{value}</div>
                <div className="text-sm text-muted-foreground font-medium">{title}</div>
                {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
            </div>
        </div>
    );
}

export function FinanceDashboard() {
    const { selectedBranch } = useBranch();
    const [dateRange, setDateRange] = useState('Today');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targets, setTargets] = useState({ daily: 1000000, monthly: 30000000, yearly: 360000000 });

    const fetchSettings = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch) params.append('branchFilter', selectedBranch.id);
            const { data } = await api.get(`/studio/settings?${params}`);
            setTargets({
                daily: Number(data.daily_target_revenue) || 1000000,
                monthly: Number(data.monthly_target_revenue) || 30000000,
                yearly: Number(data.yearly_target_revenue) || 360000000,
            });
        } catch(err) {
            console.error('Failed to fetch settings', err);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleSaveTargets = async () => {
        try {
            const payloadDaily = { key: 'daily_target_revenue', value: targets.daily };
            const payloadMonthly = { key: 'monthly_target_revenue', value: targets.monthly };
            const payloadYearly = { key: 'yearly_target_revenue', value: targets.yearly };

            if (selectedBranch) {
                payloadDaily.branch_id = selectedBranch.id;
                payloadMonthly.branch_id = selectedBranch.id;
                payloadYearly.branch_id = selectedBranch.id;
            }

            await Promise.all([
                api.post('/studio/settings', payloadDaily),
                api.post('/studio/settings', payloadMonthly),
                api.post('/studio/settings', payloadYearly),
            ]);
            setShowTargetModal(false);
            fetchSettings();
        } catch(e) {
            console.error(e);
            alert('Failed to save targets');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedBranch) params.append('branch_id', selectedBranch.id);
            const rangeObj = getDateRange(dateRange, null, null);
            if (rangeObj.from) params.append('date_from', rangeObj.from);
            if (rangeObj.to) params.append('date_to', rangeObj.to);

            const { data } = await api.get(`/transactions?${params}`);
            // Only consider 'done' transactions for finance 
            setTransactions(data.filter(t => t.status === 'done'));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch, dateRange]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        let isMounted = true;
        import('../utils/socket').then(({ socket }) => {
            if (!isMounted) return;
            const handleUpdate = () => {
                fetchTransactions();
            };
            socket.on('queueUpdated', handleUpdate);
            socket.on('adminEvent', handleUpdate);
            
            return () => {
                socket.off('queueUpdated', handleUpdate);
                socket.off('adminEvent', handleUpdate);
            };
        });
        return () => { isMounted = false; };
    }, [fetchTransactions]);

    const {
        totalRevenue,
        totalTransactions,
        avgCheckSize,
        netProfit,
        paymentMethodData,
        peakHourHeatmapData,
        themeRevenueData,
        recentLargeTransactions
    } = useMemo(() => {
        let rev = 0;
        const methods = { qris: 0, edc: 0, transfer: 0, cash: 0 };
        const peakMap = Array.from({ length: 14 }).map((_, i) => ({ time: `${i + 9}:00`, load: 0, count: 0 })); // 9 AM to 10 PM
        const themes = {};

        transactions.forEach(t => {
            const val = Number(t.total) || 0;
            rev += val;
            
            // Normalize payment method
            let pm = t.payment_method?.toLowerCase() || 'cash';
            if (pm.includes('qris')) pm = 'qris';
            else if (pm.includes('edc') || pm.includes('card')) pm = 'edc';
            else if (pm.includes('transfer')) pm = 'transfer';
            else pm = 'cash';

            if (methods[pm] !== undefined) {
                methods[pm] += val;
            } else {
                methods.cash += val; // fallback
            }

            const hour = getHours(parseISO(t.created_at));
            if (hour >= 9 && hour <= 22) {
                peakMap[hour - 9].count += 1;
            }

            const themeName = t.theme || 'Cafe Only';
            themes[themeName] = (themes[themeName] || 0) + val;
        });

        const maxHourCount = Math.max(...peakMap.map(p => p.count), 1);
        peakMap.forEach(p => {
            p.load = Math.round((p.count / maxHourCount) * 100);
        });

        const avg = transactions.length > 0 ? rev / transactions.length : 0;
        const profit = rev * 0.68; // Arbitrary 68% margin for est. net profit

        const tRevenueData = Object.entries(themes).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
        const pMethodData = [
            { name: 'QRIS', value: methods.qris, color: 'hsl(var(--primary))' },
            { name: 'EDC (Card)', value: methods.edc, color: '#3b82f6' },
            { name: 'Transfer', value: methods.transfer, color: '#8b5cf6' },
            { name: 'Cash', value: methods.cash, color: '#10b981' },
        ];

        const rLarge = [...transactions].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 5).map(t => ({
            id: t.invoice_number,
            amount: Number(t.total),
            method: t.payment_method,
            time: format(parseISO(t.created_at), 'HH:mm'),
            cust: `${t.customer_name || 'Walk-in'} (${t.people_count || 1} pax)`
        }));

        return {
            totalRevenue: rev,
            totalTransactions: transactions.length,
            avgCheckSize: avg,
            netProfit: profit,
            paymentMethodData: pMethodData,
            peakHourHeatmapData: peakMap,
            themeRevenueData: tRevenueData,
            recentLargeTransactions: rLarge
        };
    }, [transactions]);


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-3 border border-primary/20">
                        <CircleDollarSign className="h-4 w-4" /> Finance Hub
                    </div>
                    <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                        Finance Analytics
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Deep dive into financial metrics, revenue breakdown, and trends. {selectedBranch && <span className="text-primary font-medium">— {selectedBranch.name}</span>}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <Button variant="default" className="shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:bg-primary/90 rounded-xl" onClick={() => setShowTargetModal(true)}>
                        <Target className="mr-2 h-4 w-4" /> Set Targets
                    </Button>
                    <div className="flex items-center border border-white/10 rounded-xl p-1 bg-card/50 backdrop-blur-md shadow-sm">
                        {['Today', '7 Days', '30 Days', 'This Month'].map(range => (
                            <Button
                                key={range}
                                variant={dateRange === range ? "secondary" : "ghost"}
                                size="sm"
                                className={`text-xs px-4 rounded-lg transition-all ${dateRange === range ? 'bg-primary/20 text-primary shadow-sm' : 'hover:bg-muted font-medium text-muted-foreground'}`}
                                onClick={() => setDateRange(range)}
                            >
                                {range}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} subtext="Collected" icon={CircleDollarSign} bgClass="bg-blue-500/10" colorClass="text-blue-500" />
                    <StatCard title="Total Transactions" value={totalTransactions} subtext="Successful payments" icon={Activity} bgClass="bg-violet-500/10" colorClass="text-violet-500" />
                    <StatCard title="Avg Check Size" value={formatCurrency(avgCheckSize)} subtext="Per transaction" icon={CreditCard} bgClass="bg-emerald-500/10" colorClass="text-emerald-500" />
                    
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-md rounded-3xl border border-primary/20 shadow-sm relative overflow-hidden flex flex-col justify-center p-6 min-h-[140px]">
                        <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                        <div className="flex justify-between items-center mb-3 relative z-10">
                             <div className="text-sm font-medium text-foreground">
                                 {dateRange === 'Today' ? 'Daily Target' : 'Revenue Target'} Progress
                             </div>
                             <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                 <Target className="h-4 w-4 text-primary" />
                             </div>
                        </div>
                        <div className="flex items-end justify-between relative z-10">
                            <div className="text-3xl font-black text-primary">
                                {(totalRevenue / (dateRange === 'Today' ? targets.daily : targets.monthly) * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                                {formatCurrency(totalRevenue)} / {formatCurrency(dateRange === 'Today' ? targets.daily : targets.monthly)}
                            </div>
                        </div>
                        <div className="w-full bg-secondary/80 h-3 rounded-full overflow-hidden mt-3 shadow-inner relative z-10">
                            <div 
                                className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-1000 ease-out" 
                                style={{ width: `${Math.min(100, Math.max(0, (totalRevenue / (dateRange === 'Today' ? targets.daily : targets.monthly) * 100)))}%` }}
                            >
                                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_25%,rgba(255,255,255,0.2)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.2)_75%,rgba(255,255,255,0.2)_100%)] bg-[length:20px_20px] animate-[pulse_2s_linear_infinite]" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-7">
                    <Card className="col-span-4 max-h-[450px]">
                        <CardHeader>
                            <CardTitle>Peak Hour Heatmap</CardTitle>
                            <CardDescription>Customer density and revenue generation by hour.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={peakHourHeatmapData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                    <Tooltip
                                        formatter={(value) => [`${value}% Capacity`, 'Load']}
                                        labelFormatter={(v) => `Time: ${v}`}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    />
                                    <Area type="monotone" dataKey="load" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Payment Methods</CardTitle>
                            <CardDescription>Breakdown of transaction channels</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={paymentMethodData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `Rp${(v / 1000000).toFixed(1)}M`} />
                                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={70} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(v) => formatCurrency(v)}
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                        {paymentMethodData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue By Theme</CardTitle>
                            <CardDescription>Performance comparison across available themes</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {themeRevenueData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data for selected period</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={themeRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            formatter={(v) => formatCurrency(v)}
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        />
                                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Large Transactions</CardTitle>
                            <CardDescription>Highest payments for the selected period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentLargeTransactions.length === 0 && (
                                    <div className="text-center py-8 text-sm text-muted-foreground">No transactions available</div>
                                )}
                                {recentLargeTransactions.map((tx, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{tx.cust}</p>
                                                <p className="text-xs text-muted-foreground">{tx.id} • {tx.method} • {tx.time}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary">{formatCurrency(tx.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                </>
            )}
            {showTargetModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-card/90 backdrop-blur-md w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="flex justify-between items-center p-6 md:p-8 border-b border-white/5 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary">
                                    <Target className="h-5 w-5" />
                                </div>
                                <h3 className="text-xg font-bold">Set Revenue Targets</h3>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowTargetModal(false)} className="rounded-full hover:bg-white/10">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-6 md:p-8 space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Daily Target (Rp)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground font-medium">Rp</div>
                                    <input 
                                        type="number" 
                                        className="w-full h-12 rounded-xl border border-input/50 bg-background/50 pl-11 pr-4 text-lg font-bold shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all font-mono"
                                        value={targets.daily}
                                        onChange={(e) => setTargets({...targets, daily: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Monthly Target (Rp)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground font-medium">Rp</div>
                                    <input 
                                        type="number" 
                                        className="w-full h-12 rounded-xl border border-input/50 bg-background/50 pl-11 pr-4 text-lg font-bold shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all font-mono"
                                        value={targets.monthly}
                                        onChange={(e) => setTargets({...targets, monthly: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Yearly Target (Rp)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground font-medium">Rp</div>
                                    <input 
                                        type="number" 
                                        className="w-full h-12 rounded-xl border border-input/50 bg-background/50 pl-11 pr-4 text-lg font-bold shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-all font-mono"
                                        value={targets.yearly}
                                        onChange={(e) => setTargets({...targets, yearly: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end p-6 md:p-8 border-t border-white/5 gap-3 bg-muted/20 relative z-10">
                            <Button variant="ghost" onClick={() => setShowTargetModal(false)} className="rounded-xl px-6 min-h-[44px]">Cancel</Button>
                            <Button onClick={handleSaveTargets} className="rounded-xl px-8 min-h-[44px] shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:bg-primary/90">
                                Save Targets
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
