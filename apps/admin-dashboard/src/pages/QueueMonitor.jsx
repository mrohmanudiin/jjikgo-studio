import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Filter, SlidersHorizontal, MoreHorizontal, Loader2, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { format } from 'date-fns';

function getStatusBadge(status) {
    const s = status?.toLowerCase();
    switch (s) {
        case 'waiting': return <Badge variant="outline" className="border-amber-500/20 text-amber-600 bg-amber-500/10">Waiting</Badge>;
        case 'called': return <Badge variant="outline" className="border-cyan-500/20 text-cyan-600 bg-cyan-500/10">Called</Badge>;
        case 'in_session': return <Badge variant="outline" className="border-blue-500/20 text-blue-600 bg-blue-500/10">In Session</Badge>;
        case 'print_requested': return <Badge variant="outline" className="border-pink-500/20 text-pink-600 bg-pink-500/10">Print Requested</Badge>;
        case 'done': return <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 bg-emerald-500/10">Done</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

export function QueueMonitor() {
    const { selectedBranch } = useBranch();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [queueItems, setQueueItems] = useState([]);
    const [themes, setThemes] = useState([]);
    const [themeFilter, setThemeFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const fetchQueue = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch) params.append('branch_id', selectedBranch.id);

            const [qRes, tRes] = await Promise.all([
                api.get(`/queue?${params}`),
                api.get(`/themes?${params}`)
            ]);

            // Queue data comes as { ThemeName: [...items] }
            const queueMap = qRes.data || {};
            const allItems = [];
            Object.entries(queueMap).forEach(([themeName, items]) => {
                if (Array.isArray(items)) {
                    items.forEach(item => allItems.push({ ...item, themeName }));
                }
            });
            setQueueItems(allItems);
            setThemes(Array.isArray(tRes.data) ? tRes.data : []);
        } catch (err) {
            console.error('Failed to fetch queue:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchQueue();
        // Listen for real-time updates
        import('../utils/socket').then(({ socket }) => {
            socket.on('queueUpdated', fetchQueue);
            return () => socket.off('queueUpdated', fetchQueue);
        });
    }, [fetchQueue]);

    const filtered = queueItems.filter(q => {
        const s = q.status?.toLowerCase();
        if (statusFilter !== 'all' && s !== statusFilter) return false;
        if (themeFilter !== 'all' && q.themeName !== themeFilter) return false;
        const term = searchTerm.toLowerCase();
        if (term) {
            const name = q.transaction?.customer_name?.toLowerCase() || '';
            const num = String(q.queue_number || '');
            if (!name.includes(term) && !num.includes(term)) return false;
        }
        return true;
    });

    const uniqueThemes = [...new Set(queueItems.map(q => q.themeName))];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Queue Monitor</h2>
                    <p className="text-muted-foreground mt-1">
                        Live tracking of customer queue and session flow.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchQueue(); }}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search name or queue number..."
                            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="waiting">Waiting</option>
                            <option value="called">Called</option>
                            <option value="in_session">In Session</option>
                            <option value="print_requested">Print Requested</option>
                            <option value="done">Done</option>
                        </select>
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={themeFilter}
                            onChange={(e) => setThemeFilter(e.target.value)}
                        >
                            <option value="all">All Themes</option>
                            {uniqueThemes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </CardHeader>
                <div className="border-t">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[100px] font-semibold">Queue #</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Theme</TableHead>
                                    <TableHead className="font-semibold">Pax</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium text-primary">
                                            {item.queue_number}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {item.transaction?.customer_name || 'Walk-in'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.themeName}</TableCell>
                                        <TableCell>{item.transaction?.people_count || 1}</TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">
                                            {item.created_at ? format(new Date(item.created_at), 'HH:mm') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Filter className="h-8 w-8 text-muted-foreground/50" />
                                                <p>No queue entries found.</p>
                                                <Button variant="link" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setThemeFilter('all'); }}>Clear Filters</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}
