import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Search, Loader2, Pencil, Trash2, X, Save, Copy } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { DuplicateToBranchModal } from '../components/DuplicateToBranchModal';

export function CafeSnackManagement() {
    const { selectedBranch, branches } = useBranch();
    const [snacks, setSnacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ label: '', price: '', active: true, branchId: null });
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dupModal, setDupModal] = useState({ open: false, label: '', items: [], sourceBranchId: null });

    const fetchSnacks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(selectedBranch ? `/studio/cafe-snacks?branchId=${selectedBranch.id}` : '/studio/cafe-snacks');
            const data = res.data || [];
            if (selectedBranch) {
                setSnacks(data.filter(s => s.branchId === selectedBranch.id));
            } else {
                setSnacks(data);
            }
        } catch (err) {
            console.error('Failed to load cafe snacks', err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => { fetchSnacks(); }, [fetchSnacks]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...formData,
                branchId: selectedBranch ? selectedBranch.id : formData.branchId,
            };

            if (editingId) {
                if (payload.id) delete payload.id;
                await api.put(`/studio/cafe-snacks/${editingId}`, payload);
            } else {
                await api.post('/studio/cafe-snacks', payload);
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ label: '', price: '', active: true, branchId: null });
            fetchSnacks();
        } catch (err) {
            alert('Failed to save snack: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (snack) => {
        setEditingId(snack.id);
        setFormData({ 
            label: snack.label, 
            price: snack.price, 
            active: snack.active !== false,
            branchId: snack.branchId || null
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this item?')) return;
        try {
            await api.delete(`/studio/cafe-snacks/${id}`);
            fetchSnacks();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const openDupModal = (items, label, sourceBranchId) => {
        setDupModal({ open: true, label, items, sourceBranchId: sourceBranchId ?? null });
    };

    const handleDuplicate = (snack) => {
        openDupModal([snack], `Item: ${snack.label}`, snack.branchId || (selectedBranch?.id ?? null));
    };

    const handleDuplicateAll = () => {
        if (filtered.length === 0) return;
        const srcId = selectedBranch?.id ?? (filtered[0]?.branchId ?? null);
        openDupModal(filtered, `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`, srcId);
    };

    const executeDuplicate = async (targetBranchIds) => {
        for (const snack of dupModal.items) {
            for (const branchId of targetBranchIds) {
                const payload = {
                    label: `${snack.label} (Copy)`,
                    price: snack.price,
                    active: snack.active,
                    branchId
                };
                await api.post('/studio/cafe-snacks', payload);
            }
        }
        fetchSnacks();
    };

    const filtered = snacks.filter(p => p.label?.toLowerCase().includes(searchTerm.toLowerCase()));

    const getBranchName = (bId) => {
        const branch = branches.find(b => b.id === bId);
        return branch ? branch.name : 'Unknown';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cafe & Snacks</h2>
                    <p className="text-muted-foreground mt-1">
                        {selectedBranch ? `Manage snacks for ${selectedBranch.name}` : 'Manage snacks across all branches'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleDuplicateAll} disabled={filtered.length === 0}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate All
                    </Button>
                    <Button onClick={() => { setEditingId(null); setFormData({ label: '', price: '', active: true, branchId: selectedBranch ? selectedBranch.id : null }); setShowForm(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                </div>
            </div>

            {showForm && (
                <Card className="border-primary/30">
                    <CardHeader className="pb-4">
                        <CardTitle>{editingId ? 'Edit Item' : 'New Item'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Name</label>
                                <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} placeholder="e.g. Iced Coffee" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Price (Rp)</label>
                                <input type="number" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} placeholder="0" />
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
                            <Button onClick={handleSave} disabled={saving || !formData.label || !formData.price}>
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

            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                    <div>
                        <CardTitle>All Items ({snacks.length})</CardTitle>
                    </div>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="Search..." className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold">Name</TableHead>
                                <TableHead className="font-semibold">Price</TableHead>
                                {!selectedBranch && <TableHead className="font-semibold">Branch</TableHead>}
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="text-right font-semibold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(snack => (
                                <TableRow key={snack.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{snack.label}</TableCell>
                                    <TableCell>Rp {Number(snack.price).toLocaleString('id-ID')}</TableCell>
                                    {!selectedBranch && (
                                        <TableCell>
                                            {snack.branchId ? getBranchName(snack.branchId) : 'Global'}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Badge variant={snack.active !== false ? 'success' : 'secondary'}>{snack.active !== false ? 'Active' : 'Inactive'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(snack)} title="Duplicate"><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(snack)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(snack.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={selectedBranch ? 4 : 5} className="text-center py-8 text-muted-foreground">No items found.</TableCell>
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
