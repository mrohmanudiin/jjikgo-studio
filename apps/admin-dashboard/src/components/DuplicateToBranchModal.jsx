import React, { useState, useEffect } from 'react';
import { X, Copy, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * DuplicateToBranchModal
 *
 * Props:
 *   open           – boolean
 *   onClose        – () => void
 *   itemLabel      – string  – friendly name shown in header ("Theme: Retro Vibe" | "3 themes")
 *   branches       – Branch[] – all available branches from BranchContext
 *   sourceBranchId – number | null – id of the branch the item(s) currently belong to (exclude from list)
 *   onConfirm      – (targetBranchIds: number[]) => Promise<void>
 */
export function DuplicateToBranchModal({ open, onClose, itemLabel, branches, sourceBranchId, onConfirm }) {
    const [selected, setSelected] = useState([]);
    const [running, setRunning] = useState(false);
    const [status, setStatus] = useState(null); // null | 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // Branches to show: exclude the source branch
    const targetBranches = branches.filter(b => b.id !== sourceBranchId);

    useEffect(() => {
        if (open) {
            setSelected([]);
            setRunning(false);
            setStatus(null);
            setErrorMsg('');
        }
    }, [open]);

    if (!open) return null;

    const toggle = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAll = () => setSelected(targetBranches.map(b => b.id));
    const clearAll = () => setSelected([]);

    const handleConfirm = async () => {
        if (selected.length === 0) return;
        setRunning(true);
        setStatus(null);
        try {
            await onConfirm(selected);
            setStatus('success');
        } catch (err) {
            setStatus('error');
            setErrorMsg(err?.response?.data?.error || err?.message || 'Unknown error');
        } finally {
            setRunning(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={!running ? onClose : undefined}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200">

                    {/* Header */}
                    <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Copy className="h-5 w-5 text-primary" />
                                Duplicate to Branch
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Copying: <span className="font-medium text-foreground">{itemLabel}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={running}
                            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {status === 'success' ? (
                            <div className="flex flex-col items-center gap-3 py-4 text-emerald-500">
                                <CheckCircle2 className="h-10 w-10" />
                                <p className="font-medium">Duplicated successfully!</p>
                                <Button variant="outline" onClick={onClose} className="mt-2">Close</Button>
                            </div>
                        ) : status === 'error' ? (
                            <div className="flex flex-col items-center gap-3 py-4 text-destructive">
                                <AlertCircle className="h-10 w-10" />
                                <p className="font-medium">Something went wrong</p>
                                <p className="text-xs text-muted-foreground text-center">{errorMsg}</p>
                                <div className="flex gap-2 mt-2">
                                    <Button variant="outline" onClick={() => setStatus(null)}>Try again</Button>
                                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium">Select destination branch(es)</p>
                                        <div className="flex gap-2 text-xs">
                                            <button onClick={selectAll} className="text-primary hover:underline">All</button>
                                            <span className="text-muted-foreground">·</span>
                                            <button onClick={clearAll} className="text-muted-foreground hover:underline">None</button>
                                        </div>
                                    </div>

                                    {targetBranches.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic py-4 text-center">
                                            No other branches available.
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                            {targetBranches.map(branch => (
                                                <label
                                                    key={branch.id}
                                                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors group"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected.includes(branch.id)}
                                                        onChange={() => toggle(branch.id)}
                                                        className="h-4 w-4 rounded accent-primary"
                                                    />
                                                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                                                        {branch.name}
                                                    </span>
                                                    {selected.includes(branch.id) && (
                                                        <span className="ml-auto text-xs text-primary font-medium">Selected</span>
                                                    )}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={selected.length === 0 || running}
                                        className="flex-1"
                                    >
                                        {running
                                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Duplicating…</>
                                            : <><Copy className="mr-2 h-4 w-4" /> Duplicate to {selected.length} branch{selected.length !== 1 ? 'es' : ''}</>
                                        }
                                    </Button>
                                    <Button variant="outline" onClick={onClose} disabled={running}>
                                        Cancel
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
