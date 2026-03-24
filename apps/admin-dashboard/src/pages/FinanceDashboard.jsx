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

function getComparisonRange(range, currentFrom, currentTo) {
    if (!currentFrom || !currentTo) return {};
    const from = parseISO(currentFrom);
    const to = parseISO(currentTo);
    const diff = Math.max(1, (new Date(currentTo) - new Date(currentFrom)) / (1000 * 60 * 60 * 24) + 1);
    
    return {
        from: format(subDays(from, Math.round(diff)), 'yyyy-MM-dd'),
        to: format(subDays(to, Math.round(diff)), 'yyyy-MM-dd')
    };
}

function StatCard({ title, value, subtext, icon: Icon, trend, colorClass = 'text-primary', bgClass = 'bg-primary/10' }) {
    const positive = trend !== undefined && trend >= 0;
    const hasTrend = trend !== undefined && trend !== null && !isNaN(trend);
    
    return (
        <div className="bg-card/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
            <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`${bgClass} p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-6 w-6 ${colorClass}`} />
                    </div>
                    {hasTrend && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3 rotate-90" />}
                            {Math.abs(trend).toFixed(1)}%
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
    const [dateRange, setDateRange] = useState('30 Days');
    const [transactions, setTransactions] = useState([]);
    const [comparisonTransactions, setComparisonTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showComparison, setShowComparison] = useState(true);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targets, setTargets] = useState({ daily: 1000000, monthly: 30000000, yearly: 360000000 });

    const fetchSettings = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch && selectedBranch.id !== 'ALL') {
                params.append('branchFilter', selectedBranch.id);
            }
            const { data } = await api.get(`/studio/settings?${params}`);
            
            // Map array of settings to object
            const settingsMap = Array.isArray(data) ? data.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}) : data;
            
            setTargets({
                daily: Number(settingsMap.daily_target_revenue) || 1000000,
                monthly: Number(settingsMap.monthly_target_revenue) || 30000000,
                yearly: Number(settingsMap.yearly_target_revenue) || 360000000,
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
            const payloads = [
                { key: 'daily_target_revenue', value: String(targets.daily) },
                { key: 'monthly_target_revenue', value: String(targets.monthly) },
                { key: 'yearly_target_revenue', value: String(targets.yearly) },
            ];

            if (selectedBranch && selectedBranch.id !== 'ALL') {
                payloads.forEach(p => p.branch_id = selectedBranch.id);
            }

            await Promise.all(payloads.map(p => api.post('/studio/settings', p)));
            setShowTargetModal(false);
            fetchSettings();
        } catch(e) {
            console.error(e);
            alert('Failed to save targets');
        }
    };

    const formatCurrency = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const rangeObj = getDateRange(dateRange, null, null) || {};
            const compRange = getComparisonRange(dateRange, rangeObj.from, rangeObj.to) || {};

            const buildParams = (r) => {
                const p = new URLSearchParams();
                if (selectedBranch && selectedBranch.id !== 'ALL') p.append('branch_id', selectedBranch.id);
                if (r && r.from) p.append('date_from', r.from);
                if (r && r.to) p.append('date_to', r.to);
                return p.toString();
            };

            const [currentRes, prevRes] = await Promise.all([
                api.get(`/transactions?${buildParams(rangeObj)}`),
                api.get(`/transactions?${buildParams(compRange)}`)
            ]);

            const currentArr = Array.isArray(currentRes.data) ? currentRes.data : [];
            const prevArr = Array.isArray(prevRes.data) ? prevRes.data : [];

            setTransactions(currentArr.filter(t => t && t.status !== 'cancelled'));
            setComparisonTransactions(prevArr.filter(t => t && t.status !== 'cancelled'));
        } catch (err) {
            console.error('Failed to fetch finance data', err);
            setTransactions([]);
            setComparisonTransactions([]);
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
            const handleUpdate = () => fetchTransactions();
            socket.on('queueUpdated', handleUpdate);
            socket.on('adminEvent', handleUpdate);
            socket.on('transactionUpdated', handleUpdate);
            
            return () => {
                socket.off('queueUpdated', handleUpdate);
                socket.off('adminEvent', handleUpdate);
                socket.off('transactionUpdated', handleUpdate);
            };
        });
        return () => { isMounted = false; };
    }, [fetchTransactions]);

    const calculateMetrics = (txList) => {
        let revenue = 0;
        const methods = { qris: 0, edc: 0, transfer: 0, cash: 0 };
        const items = { themes: {}, packages: {}, snacks: {}, addons: {} };
        const peakMap = Array.from({ length: 14 }).map((_, i) => ({ time: `${i + 9}:00`, count: 0 }));

        txList.forEach(t => {
            if (!t) return;
            const total = Number(t.total_price || t.totalPrice || t.total) || 0;
            revenue += total;

            // Payment Method
            const rawPm = t.payment_method || t.paymentMethod || 'cash';
            let pm = String(rawPm).toLowerCase();
            if (pm.includes('qris')) methods.qris += total;
            else if (pm.includes('edc') || pm.includes('card')) methods.edc += total;
            else if (pm.includes('transfer')) methods.transfer += total;
            else methods.cash += total;

            // Peak Hours
            try {
                const dateStr = t.created_at || t.createdAt;
                if (dateStr) {
                    const dt = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
                    if (!isNaN(dt.getTime())) {
                        const hour = getHours(dt);
                        if (hour >= 9 && hour <= 22) {
                            if (peakMap[hour - 9]) peakMap[hour - 9].count += 1;
                        }
                    }
                }
            } catch (e) { /* ignore single error */ }

            // Breakdown (Strict Separation)
            let componentSnack = 0;
            let componentAddon = 0;

            const parseArr = (val) => {
                if (Array.isArray(val)) return val;
                if (typeof val === 'string' && val.trim()) {
                    try { return JSON.parse(val); } catch (e) { return []; }
                }
                return [];
            };

            const snacksArr = parseArr(t.cafe_snacks || t.cafeSnacks);
            snacksArr.forEach(s => {
                const sRev = (Number(s.price) || 0) * (Number(s.quantity) || 1);
                componentSnack += sRev;
                const sName = s.name || s.label || 'Unknown';
                items.snacks[sName] = (items.snacks[sName] || 0) + sRev;
            });

            const addonsArr = parseArr(t.addons);
            addonsArr.forEach(a => {
                const aRev = (Number(a.price) || 0) * (Number(a.quantity) || 1);
                componentAddon += aRev;
                const aName = a.name || a.label || 'Unknown';
                items.addons[aName] = (items.addons[aName] || 0) + aRev;
            });

            // Theme & Package get the remainder (base photoshoot price)
            const packageRev = total - componentSnack - componentAddon;
            const pName = t.package_name || t.packageName || 'Base';
            const tName = t.theme || 'Cafe Only';
            
            if (pName !== 'Base') items.packages[pName] = (items.packages[pName] || 0) + packageRev;
            items.themes[tName] = (items.themes[tName] || 0) + packageRev;
        });

        return { revenue, count: txList.length, avg: txList.length ? revenue / txList.length : 0, methods, items, peakMap };
    };

    const metrics = useMemo(() => calculateMetrics(transactions), [transactions]);
    const prevMetrics = useMemo(() => calculateMetrics(comparisonTransactions), [comparisonTransactions]);

    const getTrend = (curr, prev) => {
        if (!prev) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const {
        totalRevenue,
        totalTransactions,
        avgCheckSize,
        paymentMethodData,
        peakHourHeatmapData,
        themeRevenueData,
        packageRevenueData,
        cafeSnackRevenueData,
        addonRevenueData,
        recentLargeTransactions
    } = useMemo(() => {
        const { revenue, count, avg, methods, items, peakMap } = metrics;
        
        const maxHourCount = Math.max(...peakMap.map(p => p.count), 1);
        const peakData = peakMap.map(p => ({ ...p, load: Math.round((p.count / maxHourCount) * 100) }));

        const pMethodData = [
            { name: 'QRIS', value: methods.qris, color: 'hsl(var(--primary))' },
            { name: 'EDC', value: methods.edc, color: '#3b82f6' },
            { name: 'Transfer', value: methods.transfer, color: '#8b5cf6' },
            { name: 'Cash', value: methods.cash, color: '#10b981' },
        ];

        const tRev = Object.entries(items.themes).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
        const pRev = Object.entries(items.packages).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
        
        const csRev = Object.entries(items.snacks).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
        const aRev = Object.entries(items.addons).map(([name, revenue]) => ({ name, revenue })).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

        const rLarge = [...transactions].sort((a, b) => (Number(b.total_price || b.total) || 0) - (Number(a.total_price || a.total) || 0)).slice(0, 5).map(t => {
            let labelTime = '--:--';
            try {
                const rawTime = t.created_at || t.createdAt;
                if (rawTime) {
                    const dt = typeof rawTime === 'string' ? parseISO(rawTime) : new Date(rawTime);
                    if (!isNaN(dt.getTime())) labelTime = format(dt, 'HH:mm');
                }
            } catch(e) {}

            return {
                id: t.invoice_number || t.invoiceNumber || 'TX-???',
                amount: Number(t.total_price || t.total) || 0,
                method: t.payment_method || t.paymentMethod || 'Cash',
                time: labelTime,
                cust: `${t.customer_name || t.customerName || 'Walk-in'} (${t.people_count || t.peopleCount || 1} pax)`
            };
        });

        const bestSellers = [
            ...tRev.map(r => ({ name: r.name, category: 'Theme', revenue: r.revenue })),
            ...pRev.map(r => ({ name: r.name, category: 'Package', revenue: r.revenue })),
            ...csRev.map(r => ({ name: r.name, category: 'Cafe', revenue: r.revenue })),
        ].sort((a,b) => b.revenue - a.revenue).slice(0, 10);

        return {
            totalRevenue: revenue,
            totalTransactions: count,
            avgCheckSize: avg,
            paymentMethodData: pMethodData,
            peakHourHeatmapData: peakData,
            themeRevenueData: tRev,
            packageRevenueData: pRev,
            cafeSnackRevenueData: csRev,
            addonRevenueData: aRev,
            recentLargeTransactions: rLarge,
            bestSellers
        };
    }, [metrics, transactions]);

    const exportToCSV = () => {
        const headers = ["Date", "Invoice", "Customer", "Branch", "Method", "Total"];
        const rows = transactions.filter(t => t && t.created_at).map(t => [
            (() => { try { return format(parseISO(t.created_at), 'yyyy-MM-dd HH:mm'); } catch(e) { return '--'; } })(),
            t.invoice_number || '--',
            t.customer_name || 'Walk-in',
            t.branch?.name || t.branch_id || '--',
            t.payment_method || '--',
            t.total || 0
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `JJIKGO_Finance_${dateRange}_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Finance data exported to CSV");
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold mb-3 border border-primary/20">
                        <CircleDollarSign className="h-4 w-4" /> Finance Analytics
                    </div>
                    <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                        Revenue Insights
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Real-time financial performance and trends. {selectedBranch && <span className="text-primary font-medium">— {selectedBranch.name}</span>}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                        <Button variant="default" className="shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:bg-primary/90 rounded-xl" onClick={() => setShowTargetModal(true)}>
                            <Target className="mr-2 h-4 w-4" /> Goals
                        </Button>
                        <Button variant="outline" className="rounded-xl border-white/10" onClick={exportToCSV}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
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
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className={cn("rounded-xl border-white/10 text-xs px-4 h-9", showComparison && "bg-primary/10 border-primary/20 text-primary")}
                            onClick={() => setShowComparison(!showComparison)}
                        >
                            {showComparison ? 'Comparison: On' : 'Comparison: Off'}
                        </Button>
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
                    <StatCard 
                        title="Total Revenue" 
                        value={formatCurrency(totalRevenue)} 
                        subtext="Collected" 
                        icon={CircleDollarSign} 
                        bgClass="bg-blue-500/10" 
                        colorClass="text-blue-500" 
                        trend={showComparison ? getTrend(totalRevenue, prevMetrics.revenue) : undefined}
                    />
                    <StatCard 
                        title="Transactions" 
                        value={totalTransactions} 
                        subtext="Successful payments" 
                        icon={Activity} 
                        bgClass="bg-violet-500/10" 
                        colorClass="text-violet-500" 
                        trend={showComparison ? getTrend(totalTransactions, prevMetrics.count) : undefined}
                    />
                    <StatCard 
                        title="Avg Check Size" 
                        value={formatCurrency(avgCheckSize)} 
                        subtext="Per transaction" 
                        icon={CreditCard} 
                        bgClass="bg-emerald-500/10" 
                        colorClass="text-emerald-500" 
                        trend={showComparison ? getTrend(avgCheckSize, prevMetrics.avg) : undefined}
                    />
                    
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
                            <CardTitle>Revenue By Package</CardTitle>
                            <CardDescription>Top performing packages</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {packageRevenueData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={packageRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                                        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue By Cafe/Snacks</CardTitle>
                            <CardDescription>Top selling food & beverages</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {cafeSnackRevenueData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cafeSnackRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue By Addons</CardTitle>
                            <CardDescription>Top selling studio accessories</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {addonRevenueData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={addonRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }} />
                                        <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Best Sellers</CardTitle>
                            <CardDescription>Consolidated performance across categories</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {bestSellers.length === 0 && (
                                    <div className="text-center py-8 text-sm text-muted-foreground">No data available</div>
                                )}
                                {bestSellers.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-muted/30 transition-all border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                #{i+1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{item.name}</p>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{item.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-primary font-mono text-sm">{formatCurrency(item.revenue)}</p>
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
