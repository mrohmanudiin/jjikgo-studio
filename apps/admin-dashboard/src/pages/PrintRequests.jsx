import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Printer, Search, Filter, Loader2, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '../lib/utils';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/Table';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { format } from 'date-fns';

function getStatusBadge(status) {
    const s = status?.toLowerCase();
    switch (s) {
        case 'print_requested': return <Badge variant="outline" className="border-amber-500/20 text-amber-600 bg-amber-500/10">Pending</Badge>;
        case 'done': return <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 bg-emerald-500/10">Completed</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

export function PrintRequests() {
    const { selectedBranch } = useBranch();
    const [searchTerm, setSearchTerm] = useState('');
    const [printItems, setPrintItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch && selectedBranch.id !== 'ALL') {
                params.append('branch_id', selectedBranch.id);
            }

            const res = await api.get(`/queue?${params}`);
            const queueMap = res.data || {};
            const allItems = [];
            Object.entries(queueMap).forEach(([themeName, items]) => {
                if (Array.isArray(items)) {
                    items
                        .filter(q => ['print_requested', 'done'].includes(q.status?.toLowerCase()))
                        .forEach(item => allItems.push({ ...item, themeName }));
                }
            });
            // Sort: print_requested first, then by created_at desc
            allItems.sort((a, b) => {
                if (a.status === 'print_requested' && b.status !== 'print_requested') return -1;
                if (b.status === 'print_requested' && a.status !== 'print_requested') return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setPrintItems(allItems);
        } catch (err) {
            console.error('Failed to fetch print requests:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchData();
        import('../utils/socket').then(({ socket }) => {
            socket.on('queueUpdated', fetchData);
            return () => socket.off('queueUpdated', fetchData);
        });
    }, [fetchData]);

    const filtered = printItems.filter(item => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        const name = item.transaction?.customer_name?.toLowerCase() || '';
        const num = String(item.queue_number || '');
        return name.includes(term) || num.includes(term) || item.themeName.toLowerCase().includes(term);
    });

    const pendingCount = printItems.filter(q => q.status?.toLowerCase() === 'print_requested').length;
    const doneCount = printItems.filter(q => q.status?.toLowerCase() === 'done').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Print Requests</h2>
                    <p className="text-muted-foreground mt-1">Manage print queue and track print status.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Printer className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Prints</p>
                                <p className="text-2xl font-bold">{pendingCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Printer className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Completed Today</p>
                                <p className="text-2xl font-bold">{doneCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                    <div>
                        <CardTitle>Print Queue</CardTitle>
                        <CardDescription>Sessions with print requests</CardDescription>
                    </div>
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search customer or queue..."
                            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold">Queue #</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Theme</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium text-primary">{item.queue_number}</TableCell>
                                        <TableCell className="font-medium">{item.transaction?.customer_name || 'Walk-in'}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.themeName}</TableCell>
                                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">
                                            {item.created_at ? format(new Date(item.created_at), 'HH:mm') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Inbox className="h-8 w-8 text-muted-foreground/50" />
                                                <p>No print requests found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
