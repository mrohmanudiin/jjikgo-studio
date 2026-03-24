import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Search, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';

export function BoothManagement() {
    const { selectedBranch } = useBranch();
    const [searchTerm, setSearchTerm] = useState('');
    const [themes, setThemes] = useState([]);
    const [queueData, setQueueData] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch) params.append('branch_id', selectedBranch.id);

            const [tRes, qRes] = await Promise.all([
                api.get(`/themes?${params}`),
                api.get(`/queue?${params}`)
            ]);

            setThemes(Array.isArray(tRes.data) ? tRes.data : []);
            setQueueData(qRes.data || {});
        } catch (err) {
            console.error('Failed to fetch booth data:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredThemes = themes.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getThemeStats = (themeName) => {
        const items = queueData[themeName] || [];
        const active = items.filter(q => ['called', 'in_session'].includes(q.status?.toLowerCase())).length;
        const waiting = items.filter(q => q.status?.toLowerCase() === 'waiting').length;
        const done = items.filter(q => q.status?.toLowerCase() === 'done').length;
        return { active, waiting, done, total: items.length };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalActive = themes.reduce((sum, t) => sum + getThemeStats(t.name).active, 0);
    const totalWaiting = themes.reduce((sum, t) => sum + getThemeStats(t.name).waiting, 0);
    const totalDone = themes.reduce((sum, t) => sum + getThemeStats(t.name).done, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Booth Management</h2>
                    <p className="text-muted-foreground mt-1">Manage themes and monitor booth performance.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Booth Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium">Total Themes</span>
                                </div>
                                <span className="font-bold">{themes.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">Active Sessions</span>
                                </div>
                                <span className="font-bold">{totalActive}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-medium">Waiting</span>
                                </div>
                                <span className="font-bold">{totalWaiting}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium">Completed Today</span>
                                </div>
                                <span className="font-bold">{totalDone}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                    <div>
                        <CardTitle>All Themes / Booths</CardTitle>
                        <CardDescription>Current theme assignments and queue status</CardDescription>
                    </div>
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search themes..."
                            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold">Theme Name</TableHead>
                                <TableHead className="font-semibold">Prefix</TableHead>
                                <TableHead className="font-semibold">Waiting</TableHead>
                                <TableHead className="font-semibold">Active</TableHead>
                                <TableHead className="font-semibold">Done Today</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredThemes.map(t => {
                                const stats = getThemeStats(t.name);
                                const isActive = stats.active > 0;
                                const hasWaiting = stats.waiting > 0;
                                return (
                                    <TableRow key={t.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">{t.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">{t.prefix || 'T'}</Badge>
                                        </TableCell>
                                        <TableCell>{stats.waiting}</TableCell>
                                        <TableCell>{stats.active}</TableCell>
                                        <TableCell>{stats.done}</TableCell>
                                        <TableCell>
                                            <Badge variant={isActive ? 'default' : hasWaiting ? 'outline' : 'secondary'} className="font-normal">
                                                {isActive ? 'In Session' : hasWaiting ? 'Has Queue' : 'Idle'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredThemes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No themes found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
