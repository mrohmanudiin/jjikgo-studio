import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Camera, DollarSign, Activity, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { format, subDays } from 'date-fns';

function StatCard({ title, value, icon: Icon, trend, trendLabel, colorClass = 'text-primary', bgClass = 'bg-primary/10' }) {
  const positive = trend >= 0;
  return (
    <div className="bg-card rounded-3xl border p-6 hover:shadow-lg transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`${bgClass} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold ${positive ? 'text-green-600' : 'text-red-500'}`}>
            {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-black mb-1">{value}</div>
      <div className="text-sm text-muted-foreground font-medium">{title}</div>
      {trendLabel && <div className="text-xs text-muted-foreground mt-1">{trendLabel}</div>}
    </div>
  );
}

export function Dashboard() {
  const { selectedBranch } = useBranch();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const today = format(new Date(), 'yyyy-MM-dd');
      const from30 = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      if (selectedBranch) params.append('branch_id', selectedBranch.id);
      params.append('date_from', from30);
      params.append('date_to', today);

      const { data: txAll } = await api.get(`/transactions?${params}`);

      // Compute stats
      const todayTx = txAll.filter(t => format(new Date(t.created_at), 'yyyy-MM-dd') === today);
      const totalRevenue = txAll.reduce((s, t) => s + (Number(t.total) || 0), 0);
      const todayRevenue = todayTx.reduce((s, t) => s + (Number(t.total) || 0), 0);

      setStats({
        totalToday: todayTx.length,
        totalAllTime: txAll.length,
        revenue30d: totalRevenue,
        todayRevenue,
        waiting: txAll.filter(t => t.status === 'waiting').length,
      });

      // Build last 7 days chart
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i);
        const key = format(day, 'yyyy-MM-dd');
        const dayTx = txAll.filter(t => format(new Date(t.created_at), 'yyyy-MM-dd') === key);
        return {
          day: format(day, 'EEE'),
          transactions: dayTx.length,
          revenue: dayTx.reduce((s, t) => s + (Number(t.total) || 0), 0),
        };
      });
      setChartData(last7);

      // Recent transactions
      setRecentTx(txAll.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    import('../utils/socket').then(({ socket }) => {
      const handleUpdate = () => {
        fetchData();
      };
      socket.on('queueUpdated', handleUpdate);
      socket.on('adminEvent', handleUpdate);
      
      return () => {
        socket.off('queueUpdated', handleUpdate);
        socket.off('adminEvent', handleUpdate);
      };
    });
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          {selectedBranch ? `${selectedBranch.name} Dashboard` : 'All Branches Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time overview for {format(new Date(), 'EEEE, dd MMMM yyyy')}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Today's Transactions"
          value={stats?.totalToday ?? 0}
          icon={Camera}
          bgClass="bg-violet-500/10"
          colorClass="text-violet-600"
        />
        <StatCard
          title="Today's Revenue"
          value={`Rp ${(stats?.todayRevenue ?? 0).toLocaleString('id-ID')}`}
          icon={DollarSign}
          bgClass="bg-green-500/10"
          colorClass="text-green-600"
        />
        <StatCard
          title="Queue Waiting"
          value={stats?.waiting ?? 0}
          icon={Activity}
          bgClass="bg-orange-500/10"
          colorClass="text-orange-500"
        />
        <StatCard
          title="Revenue (30 Days)"
          value={`Rp ${((stats?.revenue30d ?? 0) / 1000).toFixed(0)}K`}
          icon={TrendingUp}
          bgClass="bg-blue-500/10"
          colorClass="text-blue-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-3xl p-6">
          <h3 className="text-lg font-black mb-6">Transactions — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={24}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', fontSize: 12, border: '1px solid hsl(var(--border))' }}
                formatter={(v) => [v, 'Transactions']}
              />
              <Bar dataKey="transactions" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-3xl p-6">
          <h3 className="text-lg font-black mb-6">Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', fontSize: 12, border: '1px solid hsl(var(--border))' }}
                formatter={(v) => [`Rp ${v.toLocaleString('id-ID')}`, 'Revenue']}
              />
              <Line dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card border rounded-3xl p-6">
        <h3 className="text-lg font-black mb-5">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b">
                <th className="pb-3 text-left font-semibold">Invoice</th>
                <th className="pb-3 text-left font-semibold">Customer</th>
                <th className="pb-3 text-left font-semibold">Theme</th>
                {!selectedBranch && <th className="pb-3 text-left font-semibold">Branch</th>}
                <th className="pb-3 text-right font-semibold">Total</th>
                <th className="pb-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentTx.map(tx => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 font-mono text-xs text-muted-foreground">{tx.invoice_number}</td>
                  <td className="py-3 font-medium">{tx.customer_name}</td>
                  <td className="py-3 text-muted-foreground">{tx.theme || 'Cafe'}</td>
                  {!selectedBranch && (
                    <td className="py-3 text-muted-foreground">{tx.branch?.name}</td>
                  )}
                  <td className="py-3 text-right font-bold text-primary">
                    Rp {Number(tx.total).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      tx.status === 'done' ? 'bg-green-100 text-green-700' :
                      tx.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {tx.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {recentTx.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
