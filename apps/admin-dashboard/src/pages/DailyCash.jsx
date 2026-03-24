import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FileText, CheckCircle2, Clock, Banknote, ArrowRight, User, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../utils/api';
import { useBranch } from '../contexts/BranchContext';
import { format, parseISO } from 'date-fns';

export function DailyCash() {
    const { selectedBranch } = useBranch();
    const [currentShift, setCurrentShift] = useState(null);
    const [shiftTransactions, setShiftTransactions] = useState([]);
    const [previousShifts, setPreviousShifts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dummy "Confirmed" feature since ending a shift requires cashier role
    // In actual implementation, Admin shouldn't close the drawer, Cashier should.
    // For admin view, we just observe or verify.
    const [confirmed, setConfirmed] = useState(false);
    const [actualCash, setActualCash] = useState('');

    const fetchData = useCallback(async () => {
        if (!selectedBranch) return;
        setLoading(true);
        try {
            const [shiftRes, historyRes] = await Promise.all([
                api.get(`/shifts/current?branch_id=${selectedBranch.id}`),
                api.get(`/shifts/history?branch_id=${selectedBranch.id}`)
            ]);

            setCurrentShift(shiftRes.data || null);
            setPreviousShifts(historyRes.data || []);

            if (shiftRes.data?.id) {
                const txRes = await api.get(`/transactions?branch_id=${selectedBranch.id}&shift_id=${shiftRes.data.id}`);
                setShiftTransactions(txRes.data.filter(t => t.status === 'done') || []);
            } else {
                setShiftTransactions([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Socket updates
    useEffect(() => {
        let isMounted = true;
        import('../utils/socket').then(({ socket }) => {
            if (!isMounted) return;
            const handleUpdate = () => fetchData();
            socket.on('queueUpdated', handleUpdate);
            socket.on('adminEvent', handleUpdate);
            return () => {
                socket.off('queueUpdated', handleUpdate);
                socket.off('adminEvent', handleUpdate);
            };
        });
        return () => { isMounted = false; };
    }, [fetchData]);

    const [confirmMsg, setConfirmMsg] = useState('');

    const handleConfirm = () => {
        setConfirmed(true);
        setConfirmMsg('✓ Cash drawer verified by admin. Cashier is responsible for closing the shift.');
    };

    const processShiftData = () => {
        if (!currentShift) return null;

        let cash = 0, qris = 0, edc = 0, transfer = 0;
        shiftTransactions.forEach(t => {
            const val = Number(t.total) || 0;
            let pm = t.payment_method?.toLowerCase() || 'cash';
            if (pm.includes('qris')) qris += val;
            else if (pm.includes('edc') || pm.includes('card')) edc += val;
            else if (pm.includes('transfer')) transfer += val;
            else cash += val;
        });

        const start = currentShift.start_time ? format(parseISO(currentShift.start_time), 'HH:mm') : '--:--';
        
        return {
            cashier: currentShift.user?.full_name || 'Unknown',
            start,
            end: 'Now',
            openingCash: Number(currentShift.starting_cash) || 0,
            cash, qris, edc, transfer,
            totalSales: cash + qris + edc + transfer
        };
    };

    const shiftData = processShiftData();
    const expectedCash = shiftData ? (shiftData.openingCash + shiftData.cash) : 0;
    const discrepancy = actualCash ? parseInt(actualCash) - expectedCash : null;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Daily Cash Closing</h2>
                    <p className="text-muted-foreground mt-1">Reconcile shift sales, verify cash drawer, and close out the day.</p>
                </div>
                <Button variant="outline" onClick={() => alert('Generating PDF shift report...')}>
                    <FileText className="mr-2 h-4 w-4" /> Generate PDF Report
                </Button>
            </div>

            {!shiftData ? (
                <Card className="border-dashed py-12">
                     <CardContent className="flex flex-col items-center justify-center space-y-3">
                         <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                             <Clock className="h-6 w-6 text-muted-foreground" />
                         </div>
                         <h3 className="font-semibold text-lg text-center">No Active Shift</h3>
                         <p className="text-muted-foreground text-center">There is currently no open shift at this branch.</p>
                     </CardContent>
                 </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle>Current Shift Summary</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <User className="h-3.5 w-3.5" /> {shiftData.cashier}
                                    <span className="text-muted-foreground">•</span>
                                    <Clock className="h-3.5 w-3.5" /> {shiftData.start} — {shiftData.end}
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 bg-emerald-500/10 shrink-0">Live</Badge>
                        </CardHeader>
                        <CardContent className="space-y-0">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Opening Cash</p>
                                    <p className="text-lg font-bold mt-1">Rp {shiftData.openingCash.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Total Shift Sales</p>
                                    <p className="text-lg font-bold text-primary mt-1">Rp {shiftData.totalSales.toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            {[
                                { label: 'Cash Sales', value: shiftData.cash, color: 'emerald' },
                                { label: 'QRIS', value: shiftData.qris, color: 'blue' },
                                { label: 'EDC (Card)', value: shiftData.edc, color: 'violet' },
                                { label: 'Bank Transfer', value: shiftData.transfer, color: 'amber' },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-3 border-b last:border-b-0">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-2 w-2 rounded-full", `bg-${item.color}-500`)} />
                                        <span className="text-sm text-muted-foreground">{item.label}</span>
                                    </div>
                                    <span className="font-medium text-sm">Rp {item.value.toLocaleString('id-ID')}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className={cn("flex flex-col", confirmed && "border-emerald-500/50")}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-primary" />
                                Cash Drawer Check
                            </CardTitle>
                            <CardDescription>Verify actual cash in the register.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <div className="bg-muted p-6 rounded-lg text-center space-y-1 mb-4">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Expected Cash in Drawer</p>
                                <h3 className="text-3xl font-bold tracking-tight">Rp {expectedCash.toLocaleString('id-ID')}</h3>
                                <p className="text-[10px] text-muted-foreground">(Opening Rp {shiftData.openingCash.toLocaleString('id-ID')} + Cash Sales Rp {shiftData.cash.toLocaleString('id-ID')})</p>
                            </div>

                            <div className="space-y-2 mb-4">
                                <label className="text-sm font-medium">Actual Cash Count (Demo)</label>
                                <input
                                    type="number"
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    placeholder="Enter actual amount..."
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                    disabled={confirmed}
                                />
                                {discrepancy !== null && (
                                    <p className={cn("text-xs font-medium mt-1", discrepancy === 0 ? "text-emerald-500" : discrepancy > 0 ? "text-blue-500" : "text-rose-500")}>
                                        {discrepancy === 0 ? '✓ Exact match!' : discrepancy > 0 ? `+Rp ${discrepancy.toLocaleString('id-ID')} over` : `-Rp ${Math.abs(discrepancy).toLocaleString('id-ID')} short`}
                                    </p>
                                )}
                            </div>

                            <div className="mt-auto">
                                <Button
                                    onClick={handleConfirm}
                                    disabled={confirmed || !actualCash}
                                    className="w-full h-11"
                                    variant={confirmed ? "outline" : "default"}
                                >
                                    {confirmed ? (
                                        <><CheckCircle2 className="mr-2 h-5 w-5 text-emerald-500" /> Admin Verified</>
                                    ) : (
                                        "Verify Drawer"
                                    )}
                                </Button>
                                {confirmMsg && (
                                    <p className="text-sm font-medium text-emerald-500 text-center mt-3 animate-in fade-in slide-in-from-bottom-2">
                                        {confirmMsg}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Previous Shift Closings (Last 30)</CardTitle>
                    <CardDescription>History of confirmed shift reconciliations at {selectedBranch?.name || 'this branch'}</CardDescription>
                </CardHeader>
                <CardContent>
                    {previousShifts.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">No past shifts recorded.</div>
                    ) : (
                        <div className="space-y-3">
                            {previousShifts.map((shift) => {
                                const expCash = Number(shift.starting_cash) + 0; // Backend lacks recorded total shift sales snapshot right now unless we fetch it.
                                // For an actual production system, a Shift summary object should save final `cashSales` or similar on `endShift`.
                                // Since we don't have that yet, let's just show reported `ending_cash`.
                                const endCash = Number(shift.ending_cash) || 0;
                                const discrepancy = endCash - Number(shift.starting_cash); // Mock discrepancy because we lack cashSales on Shift model 

                                return (
                                    <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{format(parseISO(shift.start_time), 'MMM dd, yyyy')}</p>
                                                <p className="text-xs text-muted-foreground">{shift.user?.full_name || 'Cashier'} • {format(parseISO(shift.start_time), 'HH:mm')} - {shift.end_time ? format(parseISO(shift.end_time), 'HH:mm') : 'Closed'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm">Ended cDrawer: Rp {endCash.toLocaleString('id-ID')}</p>
                                            {/* Note: Discrepancy computation logic requires `totalCashSales` saved on shift end, which does not exist in db. 
                                            We just show Ending Cash here. */}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

