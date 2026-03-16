import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Filter, Loader2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

const STATUS_COLORS = {
  waiting: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

function getDateRange(range, customFrom, customTo) {
  const now = new Date();
  switch (range) {
    case 'today':
      return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'yesterday':
      return { from: format(subDays(now, 1), 'yyyy-MM-dd'), to: format(subDays(now, 1), 'yyyy-MM-dd') };
    case 'week':
      return { from: format(subDays(now, 7), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'month':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'custom':
      return { from: customFrom, to: customTo };
    default:
      return {};
  }
}

function exportCSV(rows) {
  if (!rows.length) return alert('No data to export.');
  const headers = ['Invoice', 'Customer', 'Theme', 'Package', 'People', 'Payment', 'Total', 'Status', 'Branch', 'Date'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.invoice_number,
      `"${r.customer_name || ''}"`,
      `"${r.theme || ''}"`,
      `"${r.package || ''}"`,
      r.people_count,
      r.payment_method,
      r.total,
      r.status,
      `"${r.branch?.name || ''}"`,
      format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
    ].join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function TransactionHistory() {
  const { selectedBranch } = useBranch();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('today');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch) params.append('branch_id', selectedBranch.id);
      const dateRange = getDateRange(range, customFrom, customTo);
      if (dateRange.from) params.append('date_from', dateRange.from);
      if (dateRange.to) params.append('date_to', dateRange.to);

      const { data } = await api.get(`/transactions?${params}`);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, range, customFrom, customTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    import('../utils/socket').then(({ socket }) => {
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
  }, [fetchTransactions]);

  const handleDelete = async (tx) => {
    if (!confirm(`Delete transaction ${tx.invoice_number}?`)) return;
    try {
      await api.delete(`/transactions/${tx.id}`);
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="opacity-40">
      {sortKey === col ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3" />}
    </span>
  );

  const filtered = transactions
    .filter(t =>
      !search ||
      t.invoice_number?.includes(search) ||
      t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.theme?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'total') { av = Number(a.total); bv = Number(b.total); }
      if (sortKey === 'created_at') { av = new Date(a.created_at); bv = new Date(b.created_at); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalRevenue = filtered.reduce((s, t) => s + (Number(t.total) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground mt-1">
            All photobooth transactions and revenue.
            {selectedBranch && <span className="ml-2 text-primary font-medium">— {selectedBranch.name}</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all"
          >
            <Filter className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: filtered.length },
          { label: 'Total Revenue', value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, highlight: true },
          { label: 'Completed', value: filtered.filter(t => t.status === 'done').length },
          { label: 'Waiting', value: filtered.filter(t => t.status === 'waiting').length },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="bg-card rounded-2xl border p-4">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-black ${highlight ? 'text-primary' : ''}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        {/* Date range */}
        <div className="flex gap-1 flex-wrap">
          {DATE_RANGES.map(dr => (
            <button
              key={dr.value}
              onClick={() => setRange(dr.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${range === dr.value ? 'bg-primary text-primary-foreground shadow' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
            >
              {dr.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex gap-2 items-center ml-auto">
            <input type="date" className="h-8 px-3 rounded-xl border text-sm bg-background" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span className="text-muted-foreground">→</span>
            <input type="date" className="h-8 px-3 rounded-xl border text-sm bg-background" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoice, customer..."
            className="h-8 pl-8 pr-3 rounded-xl border text-xs bg-background w-52"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-foreground" onClick={() => toggleSort('customer_name')}>
                    <span className="flex items-center gap-1">Customer <SortIcon col="customer_name" /></span>
                  </th>
                  <th className="px-4 py-3 text-left">Theme / Package</th>
                  <th className="px-4 py-3 text-left">Branch</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-foreground" onClick={() => toggleSort('total')}>
                    <span className="flex items-center gap-1 justify-end">Revenue <SortIcon col="total" /></span>
                  </th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-foreground" onClick={() => toggleSort('created_at')}>
                    <span className="flex items-center gap-1">Date <SortIcon col="created_at" /></span>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tx.invoice_number}</td>
                    <td className="px-4 py-3 font-medium">{tx.customer_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{tx.theme || 'Cafe Only'}</div>
                      <div className="text-xs text-muted-foreground">{tx.package}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.branch?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{tx.payment_method}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      Rp {Number(tx.total).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[tx.status] || 'bg-muted text-muted-foreground'}`}>
                        {tx.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(tx)} className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No transactions found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
