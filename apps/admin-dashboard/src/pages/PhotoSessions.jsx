import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Search, Filter, MonitorPlay, Users, LayoutGrid, List, Loader2, RefreshCw, Inbox } from 'lucide-react';
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
        case 'in_session': return <Badge className="bg-blue-500/90">In Session</Badge>;
        case 'print_requested': return <Badge className="bg-pink-500/90">Print Requested</Badge>;
        case 'done': return <Badge className="bg-emerald-500/90">Done</Badge>;
        case 'called': return <Badge className="bg-cyan-500/90">Called</Badge>;
        case 'waiting': return <Badge className="bg-amber-500/90">Waiting</Badge>;
        default: return <Badge>{status}</Badge>;
    }
}

export function PhotoSessions() {
    const { selectedBranch } = useBranch();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch && selectedBranch.id !== 'ALL') {
                params.append('branch_id', selectedBranch.id);
            }

            const res = await api.get(`/queue?${params}`);
            const queueMap = res.data || {};
            const allSessions = [];
            Object.entries(queueMap).forEach(([themeName, items]) => {
                if (Array.isArray(items)) {
                    // Include sessions that have actually been through the booth
                    items
                        .filter(q => ['in_session', 'print_requested', 'done'].includes(q.status?.toLowerCase()))
                        .forEach(item => allSessions.push({ ...item, themeName }));
                }
            });
            allSessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setSessions(allSessions);
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = sessions.filter(s => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        const name = s.transaction?.customer_name?.toLowerCase() || '';
        const num = String(s.queue_number || '');
        return name.includes(term) || num.includes(term) || s.themeName.toLowerCase().includes(term);
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Photo Sessions</h2>
                    <p className="text-muted-foreground mt-1">Review active and completed photo sessions.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                    <div className="flex flex-1 gap-2 max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search customer or theme..."
                                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md p-1 bg-muted/50">
                            <Button
                                variant={viewMode === 'grid' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? "secondary" : "ghost"}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className={cn(viewMode === 'grid' ? "pt-6" : "p-0")}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filtered.map((session) => (
                                <Card key={session.id} className="overflow-hidden group hover:border-primary/30 transition-all flex flex-col">
                                    <div className="relative bg-muted aspect-[4/3] flex items-center justify-center">
                                        <div className="text-center text-muted-foreground">
                                            <MonitorPlay className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p className="text-xs">{session.themeName}</p>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            {getStatusBadge(session.status)}
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-base">
                                                Q#{session.queue_number}
                                                <span className="text-xs font-normal text-muted-foreground ml-2">
                                                    {session.transaction?.customer_name || 'Walk-in'}
                                                </span>
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {session.created_at ? format(new Date(session.created_at), 'dd MMM yyyy, HH:mm') : '-'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] text-muted-foreground uppercase font-medium">Theme</span>
                                                <span className="font-medium flex items-center gap-1.5">
                                                    <MonitorPlay className="w-3.5 h-3.5" />{session.themeName}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] text-muted-foreground uppercase font-medium">People</span>
                                                <span className="font-medium flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5" />{session.transaction?.people_count || 1} pax
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {filtered.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                                    <Inbox className="h-10 w-10 mb-3 opacity-30" />
                                    <p>No photo sessions found.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold">Queue #</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Theme</TableHead>
                                    <TableHead className="font-semibold">People</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="text-right font-semibold">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((session) => (
                                    <TableRow key={session.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium text-primary">{session.queue_number}</TableCell>
                                        <TableCell className="font-medium">{session.transaction?.customer_name || 'Walk-in'}</TableCell>
                                        <TableCell className="text-muted-foreground">{session.themeName}</TableCell>
                                        <TableCell>{session.transaction?.people_count || 1}</TableCell>
                                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                                        <TableCell className="text-right text-muted-foreground text-sm">
                                            {session.created_at ? format(new Date(session.created_at), 'HH:mm') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <Inbox className="h-8 w-8 text-muted-foreground/50" />
                                                <p>No photo sessions found.</p>
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
