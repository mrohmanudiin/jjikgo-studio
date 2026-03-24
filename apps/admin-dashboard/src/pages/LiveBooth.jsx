import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Clock, Users, Palette, MonitorPlay, Camera, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';

function getStatusText(items) {
    if (!items || items.length === 0) return 'Idle';
    const active = items.find(q => ['called', 'in_session'].includes(q.status?.toLowerCase()));
    if (active) return active.status === 'in_session' ? 'In Session' : 'Called';
    const waiting = items.filter(q => q.status?.toLowerCase() === 'waiting');
    if (waiting.length > 0) return 'Waiting';
    return 'Idle';
}

function getStatusColor(status) {
    switch (status) {
        case 'Idle': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        case 'Waiting': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
        case 'In Session': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        case 'Called': return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
        default: return 'bg-secondary text-secondary-foreground';
    }
}

function getStatusDotColor(status) {
    switch (status) {
        case 'In Session': return 'bg-blue-500 animate-pulse';
        case 'Idle': return 'bg-emerald-500';
        case 'Waiting': return 'bg-amber-500';
        case 'Called': return 'bg-cyan-500';
        default: return 'bg-gray-500';
    }
}

export function LiveBooth() {
    const { selectedBranch } = useBranch();
    const [selectedBooth, setSelectedBooth] = useState(null);
    const [booths, setBooths] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedBranch) params.append('branch_id', selectedBranch.id);

            const [qRes, tRes] = await Promise.all([
                api.get(`/queue?${params}`),
                api.get(`/themes?${params}`)
            ]);

            const queueMap = qRes.data || {};
            const themesList = Array.isArray(tRes.data) ? tRes.data : [];

            const boothData = themesList.map(theme => {
                const items = queueMap[theme.name] || [];
                const activeItem = items.find(q => ['called', 'in_session'].includes(q.status?.toLowerCase()));
                const waitingCount = items.filter(q => q.status?.toLowerCase() === 'waiting').length;
                const status = getStatusText(items);

                return {
                    id: theme.id,
                    name: theme.name,
                    theme: theme.name,
                    prefix: theme.prefix || 'T',
                    status,
                    queueNumber: activeItem ? `${theme.prefix || 'T'}${String(activeItem.queue_number).padStart(2, '0')}` : null,
                    people: activeItem?.transaction?.people_count || null,
                    waitingCount,
                    totalToday: items.filter(q => q.status?.toLowerCase() === 'done').length,
                    activeItems: items.filter(q => !['done'].includes(q.status?.toLowerCase())),
                };
            });

            setBooths(boothData);
        } catch (err) {
            console.error('Failed to fetch booth data:', err);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Live Booth Monitor</h2>
                    <p className="text-muted-foreground mt-1">
                        Realtime status of all photobooth stations.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
            </div>

            {booths.length === 0 ? (
                <Card className="py-16">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <Camera className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">No booths/themes configured yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {booths.map(booth => (
                        <Card
                            key={booth.id}
                            className={cn(
                                "cursor-pointer hover:border-primary/50 transition-all hover:shadow-md",
                                selectedBooth?.id === booth.id && "ring-2 ring-primary border-transparent"
                            )}
                            onClick={() => setSelectedBooth(booth)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg font-semibold">{booth.name}</CardTitle>
                                <MonitorPlay className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4">
                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(booth.status))}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", getStatusDotColor(booth.status))} />
                                        {booth.status}
                                    </span>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Theme</span>
                                        <div className="flex items-center gap-2 font-medium">
                                            <Palette className="h-4 w-4 text-primary" />
                                            {booth.theme}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 pt-2 border-t mt-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Queue</span>
                                            <span className="font-semibold text-foreground">
                                                {booth.queueNumber || '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">People</span>
                                            <span className="font-semibold text-foreground flex items-center gap-1">
                                                {booth.people ? <><Users className="h-3 w-3" /> {booth.people}</> : '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Waiting</span>
                                            <span className="font-semibold text-foreground">{booth.waitingCount}</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md border text-xs">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                Completed Today
                                            </div>
                                            <span className="font-bold text-primary">{booth.totalToday}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {selectedBooth && (
                <Card className="mt-8 border-primary/20 bg-primary/5 relative overflow-hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={() => setSelectedBooth(null)}
                    >
                        &times;
                    </Button>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Viewing Details: {selectedBooth.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Current Status</p>
                                <p className="font-semibold">{selectedBooth.status}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Theme</p>
                                <p className="font-semibold">{selectedBooth.theme}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Queue</p>
                                <p className="font-semibold">{selectedBooth.queueNumber || 'None'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Waiting in Queue</p>
                                <p className="font-semibold">{selectedBooth.waitingCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
