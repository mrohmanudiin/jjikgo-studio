import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, TrendingUp, MonitorPlay, Search, Loader2, Pencil, Trash2, X, Save, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { DuplicateToBranchModal } from '../components/DuplicateToBranchModal';

export function ThemeManagement() {
    const { selectedBranch, branches } = useBranch();
    const [themes, setThemes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', maxPeople: 2, duration: 15, price: 35000, active: true, branchId: null });
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dupModal, setDupModal] = useState({ open: false, label: '', items: [], sourceBranchId: null });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [themesRes, txRes] = await Promise.all([
                api.get('/studio/themes'),
                api.get(selectedBranch ? `/transactions?branch_id=${selectedBranch.id}` : '/transactions')
            ]);

            const allTxs = txRes.data;
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

            // If selectedBranch is set, filter. Else show all.
            let rawThemes = themesRes.data;
            if (selectedBranch) {
                rawThemes = rawThemes.filter(t => t.branchId === selectedBranch.id || t.branch_id === selectedBranch.id);
            }

            const themeData = rawThemes.map(theme => {
                const txs = allTxs.filter(t => (t.themeId === theme.id || t.theme_id === theme.id) && t.status === 'done');
                const sessionsTotal = txs.length;
                const revenueTotal = txs.reduce((sum, t) => sum + Number(t.totalPrice || t.total || 0), 0);
                
                const currentMonthTxs = txs.filter(t => new Date(t.createdAt || t.created_at) >= lastMonth);
                const previousMonthTxs = txs.filter(t => new Date(t.createdAt || t.created_at) >= twoMonthsAgo && new Date(t.createdAt || t.created_at) < lastMonth);

                const currentRev = currentMonthTxs.reduce((sum, t) => sum + Number(t.totalPrice || t.total || 0), 0);
                const prevRev = previousMonthTxs.reduce((sum, t) => sum + Number(t.totalPrice || t.total || 0), 0);
                const trend = prevRev === 0 ? (currentRev > 0 ? 100 : 0) : Math.round(((currentRev - prevRev) / prevRev) * 100);

                return {
                    id: theme.id,
                    name: theme.name,
                    maxPeople: parseInt(theme.maxCapacity || theme.max_people || theme.maxPeople || 2),
                    duration: theme.duration || 15,
                    price: Number(theme.price) || 0, 
                    active: theme.active !== false,
                    status: theme.active !== false ? 'Active' : 'Inactive',
                    branchId: theme.branchId || theme.branch_id,
                    sessionsTotal,
                    revenueTotal,
                    trend
                };
            });

            setThemes(themeData);
        } catch (error) {
            console.error('Failed to load themes data', error);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { 
                name: formData.name, 
                maxCapacity: formData.maxPeople, 
                price: formData.price, 
                active: formData.active,
                branchId: selectedBranch ? selectedBranch.id : formData.branchId
            };
            
            if (editingId) {
                await api.put(`/studio/themes/${editingId}`, payload);
            } else {
                await api.post('/studio/themes', payload);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', maxPeople: 2, duration: 15, price: 35000, active: true, branchId: null });
            fetchData();
        } catch (err) {
            alert('Failed to save theme: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (theme) => {
        setEditingId(theme.id);
        setFormData({ 
            name: theme.name, 
            maxPeople: theme.maxPeople, 
            duration: theme.duration, 
            price: theme.price, 
            active: theme.status === 'Active',
            branchId: theme.branchId || null
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this theme?')) return;
        try {
            await api.delete(`/studio/themes/${id}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const openDupModal = (themes, label, sourceBranchId) => {
        setDupModal({ open: true, label, items: themes, sourceBranchId: sourceBranchId ?? null });
    };

    const handleDuplicate = (theme) => {
        openDupModal([theme], `Theme: ${theme.name}`, theme.branchId || (selectedBranch?.id ?? null));
    };

    const handleDuplicateAll = () => {
        if (filteredThemes.length === 0) return;
        const srcId = selectedBranch?.id ?? (filteredThemes[0]?.branchId ?? null);
        openDupModal(filteredThemes, `${filteredThemes.length} theme${filteredThemes.length !== 1 ? 's' : ''}`, srcId);
    };

    const executeDuplicate = async (targetBranchIds) => {
        for (const theme of dupModal.items) {
            for (const branchId of targetBranchIds) {
                const payload = {
                    name: `${theme.name} (Copy)`,
                    maxCapacity: theme.maxPeople,
                    price: theme.price,
                    active: theme.active !== false,
                    branchId: branchId
                };
                await api.post('/studio/themes', payload);
            }
        }
        fetchData();
    };

    const getBranchName = (bId) => {
        const branch = branches.find(b => b.id === bId);
        return branch ? branch.name : 'Unknown';
    };

    const filteredThemes = themes.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const totalSessions = themes.reduce((acc, t) => acc + t.sessionsTotal, 0);

    const themeChartData = [...themes]
        .map(t => ({
            name: t.name,
            sessions: t.sessionsTotal,
            revenue: t.revenueTotal / 1000000 // In millions
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex justify-center flex-col items-center py-20 min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Loading theme analytics...</p>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Theme Management</h2>
                    <p className="text-muted-foreground mt-1">Manage photobooth themes and track their performance at {selectedBranch?.name || 'this branch'}.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleDuplicateAll} disabled={filteredThemes.length === 0}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate All
                    </Button>
                    <Button onClick={() => { setEditingId(null); setFormData({ name: '', maxPeople: 2, duration: 15, price: 35000, active: true, branchId: selectedBranch ? selectedBranch.id : null }); setShowForm(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add New Theme
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="border-primary/30">
                    <CardHeader className="pb-4">
                        <CardTitle>{editingId ? 'Edit Theme' : 'New Theme'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Name</label>
                                <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Theme name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Max People</label>
                                <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.maxPeople} onChange={e => setFormData({...formData, maxPeople: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Duration (min)</label>
                                <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.duration} onChange={e => setFormData({...formData, duration: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Price (Rp)</label>
                                <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                            </div>
                        </div>
                        {!selectedBranch && (
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-sm font-medium">Branch</label>
                                <select 
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" 
                                    value={formData.branchId || ''} 
                                    onChange={e => setFormData({...formData, branchId: e.target.value ? Number(e.target.value) : null})}
                                >
                                    <option value="">Select Branch (Global if empty)</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} disabled={saving || !formData.name}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {editingId ? 'Update' : 'Create'}
                            </Button>
                            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Themes by Usage</CardTitle>
                        <CardDescription>Most popular themes based on total completed sessions</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={themeChartData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Bar dataKey="sessions" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Total Revenue per Theme (Millions)</CardTitle>
                        <CardDescription>Financial performance breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={themeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `Rp${v}M`} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value) => [`Rp ${(Number(value)).toFixed(2)}M`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="#10b981" maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                    <div>
                        <CardTitle>All Configured Themes</CardTitle>
                        <CardDescription>Detailed list of configured themes</CardDescription>
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
                                {!selectedBranch && <TableHead className="font-semibold">Branch</TableHead>}
                                <TableHead className="font-semibold">Settings</TableHead>
                                <TableHead className="font-semibold">Total Sessions</TableHead>
                                <TableHead className="font-semibold">Trend</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredThemes.map(t => (
                                <TableRow key={t.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <MonitorPlay className="h-4 w-4 text-primary opacity-70" />
                                        {t.name}
                                    </TableCell>
                                    {!selectedBranch && (
                                        <TableCell>
                                            {t.branchId || t.branch_id ? getBranchName(t.branchId || t.branch_id) : 'Global'}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                            <div><span className="font-medium text-foreground">{t.maxPeople}</span> Max Pax</div>
                                            <div><span className="font-medium text-foreground">{t.duration}</span> Mins Limit</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{t.sessionsTotal.toLocaleString()}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {totalSessions > 0 ? ((t.sessionsTotal / totalSessions) * 100).toFixed(1) : 0}% of total
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("flex items-center text-xs font-medium", t.trend > 0 ? "text-emerald-500" : t.trend < 0 ? "text-rose-500" : "text-muted-foreground")}>
                                            {t.trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : t.trend < 0 ? <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> : "- "}
                                            {Math.abs(t.trend)}%
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={t.status === 'Active' ? 'success' : t.status === 'Maintenance' ? 'warning' : 'secondary'} className="font-normal border-primary/20 text-primary">
                                            {t.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)} title="Duplicate"><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredThemes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={selectedBranch ? 6 : 7} className="text-center py-6 text-muted-foreground">
                                        No themes matched the search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <DuplicateToBranchModal
            open={dupModal.open}
            onClose={() => setDupModal(m => ({ ...m, open: false }))}
            itemLabel={dupModal.label}
            branches={branches}
            sourceBranchId={dupModal.sourceBranchId}
            onConfirm={executeDuplicate}
        />
        </>
    );
}

