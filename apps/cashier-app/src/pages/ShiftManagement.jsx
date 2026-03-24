import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDateTime } from '../utils/format';
import { 
    DollarSign, Clock, Receipt, TrendingUp, ArrowDownCircle, 
    ArrowUpCircle, History, Plus, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function ShiftManagement() {
    const { 
        currentShift, shiftHistory, branch, refreshCurrentShift, 
        refreshShiftHistory, startShift, endShift, addExpense 
    } = useStore();

    const [activeTab, setActiveTab] = useState('current'); // 'current', 'history'
    const [loading, setLoading] = useState(false);
    const [startingCash, setStartingCash] = useState('');
    const [endingCash, setEndingCash] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [showExpenseForm, setShowExpenseForm] = useState(false);

    useEffect(() => {
        refreshCurrentShift();
        refreshShiftHistory();
    }, []);

    const handleStart = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await startShift(parseFloat(startingCash));
        setLoading(false);
        if (res.success) setStartingCash('');
    };

    const handleEnd = async (e) => {
        e.preventDefault();
        if (!window.confirm('Are you sure you want to end this shift?')) return;
        setLoading(true);
        const res = await endShift(parseFloat(endingCash));
        setLoading(false);
        if (res.success) {
            setEndingCash('');
            refreshShiftHistory();
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await addExpense(parseFloat(expenseAmount), expenseDesc);
        setLoading(false);
        if (res.success) {
            setExpenseAmount('');
            setExpenseDesc('');
            setShowExpenseForm(false);
        }
    };

    return (
        <div style={{ paddingBottom: 40 }} className="animate-fadeIn">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.02em', marginBottom: 4 }}>Shift Management</h1>
                    <p style={{ color: '#8E8E93', fontSize: 14, fontWeight: 500 }}>Manage your daily register, expenses, and shift logs.</p>
                </div>
                <div style={{ display: 'flex', background: '#F2F2F7', padding: 4, borderRadius: 12 }}>
                    <button 
                        onClick={() => setActiveTab('current')}
                        style={{
                            padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                            background: activeTab === 'current' ? 'white' : 'transparent',
                            color: activeTab === 'current' ? '#111' : '#8E8E93',
                            boxShadow: activeTab === 'current' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >Current Shift</button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
                            background: activeTab === 'history' ? 'white' : 'transparent',
                            color: activeTab === 'history' ? '#111' : '#8E8E93',
                            boxShadow: activeTab === 'history' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >Shift History</button>
                </div>
            </div>

            {activeTab === 'current' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {!currentShift ? (
                            <div className="card" style={{ padding: 40, textAlign: 'center', border: '2px dashed #E5E5EA', background: '#FAFAFA' }}>
                                <div style={{ 
                                    width: 64, height: 64, borderRadius: 20, background: '#F0FFF4', color: '#34C759',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                                }}>
                                    <DollarSign size={32} strokeWidth={2.5} />
                                </div>
                                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Register is Closed</h2>
                                <p style={{ color: '#8E8E93', marginBottom: 32, maxWidth: 300, margin: '0 auto 32px' }}>
                                    You need to start a new shift and record your starting cash before processing transactions.
                                </p>
                                <form onSubmit={handleStart} style={{ maxWidth: 320, margin: '0 auto' }}>
                                    <div style={{ marginBottom: 16, textAlign: 'left' }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: '#111', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Starting Cash</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#8E8E93' }}>Rp</span>
                                            <input 
                                                type="number" className="input" placeholder="0" 
                                                value={startingCash} onChange={e => setStartingCash(e.target.value)} required
                                                style={{ paddingLeft: 44, fontSize: 18, fontWeight: 700 }}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16 }}>
                                        {loading ? 'Opening Store...' : 'Start New Shift'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <>
                                {/* Stats Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                    <div className="card" style={{ padding: 24, border: '1px solid #E5E5EA' }}>
                                        <div style={{ color: '#8E8E93', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Starting Cash</div>
                                        <div style={{ fontSize: 20, fontWeight: 800 }}>{formatCurrency(currentShift.startingCash || currentShift.starting_cash)}</div>
                                    </div>
                                    <div className="card" style={{ padding: 24, border: '1px solid #E5E5EA' }}>
                                        <div style={{ color: '#FF3B30', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Total Expenses</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#FF3B30' }}>- {formatCurrency(currentShift.totalExpenses || currentShift.total_expenses || 0)}</div>
                                    </div>
                                    <div className="card" style={{ padding: 24, border: '1px solid #E5E5EA', background: '#F0FFF4', border: '1px solid #34C75920' }}>
                                        <div style={{ color: '#34C759', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Expected Cash</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#34C759' }}>{formatCurrency((currentShift.startingCash || currentShift.starting_cash || 0) - (currentShift.totalExpenses || currentShift.total_expenses || 0))}</div>
                                    </div>
                                </div>

                                {/* Current Status Card */}
                                <div className="card" style={{ padding: 24, border: '1px solid #E5E5EA' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <History size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontWeight: 800, fontSize: 18 }}>Active Shift Details</h3>
                                                <p style={{ fontSize: 13, color: '#8E8E93' }}>Open since {formatDateTime(currentShift.startTime || currentShift.start_time)}</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#F0FFF4', color: '#34C759', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759', animation: 'pulse 1.5s infinite' }} />
                                            LIVE
                                        </div>
                                    </div>

                                    <div style={{ background: '#F8F8F8', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#8E8E93', fontWeight: 600 }}>Shift ID</span>
                                            <span style={{ fontWeight: 700, fontFeatureSettings: '"tnum"' }}>#S-{currentShift.id}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#8E8E93', fontWeight: 600 }}>Cashier</span>
                                            <span style={{ fontWeight: 700 }}>{currentShift.user?.full_name || 'System'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#8E8E93', fontWeight: 600 }}>Branch</span>
                                            <span style={{ fontWeight: 700 }}>{branch?.name}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expense Log */}
                                <div className="card" style={{ padding: 0, border: '1px solid #E5E5EA', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ fontWeight: 800, fontSize: 16 }}>Expense Log</h3>
                                        <button 
                                            onClick={() => setShowExpenseForm(!showExpenseForm)}
                                            style={{ 
                                                background: '#111', color: 'white', border: 'none', padding: '8px 16px', 
                                                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: 6
                                            }}
                                        >
                                            <Plus size={14} /> Add Expense
                                        </button>
                                    </div>

                                    {showExpenseForm && (
                                        <div style={{ padding: 20, background: '#FAFAFA', borderBottom: '1px solid #F2F2F7' }} className="animate-slideDown">
                                            <form onSubmit={handleAddExpense} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12, alignItems: 'flex-end' }}>
                                                <div>
                                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', marginBottom: 4, display: 'block' }}>Amount</label>
                                                    <input type="number" className="input" placeholder="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#8E8E93', marginBottom: 4, display: 'block' }}>Description</label>
                                                    <input type="text" className="input" placeholder="e.g. Electricity, Tissues" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required />
                                                </div>
                                                <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0 20px', height: 44 }}>
                                                    {loading ? '...' : 'Save'}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {!currentShift.expenses || currentShift.expenses.length === 0 ? (
                                        <div style={{ padding: 40, textAlign: 'center', color: '#8E8E93', fontSize: 14 }}>
                                            No expenses recorded for this shift.
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', background: '#FAFAFA' }}>
                                                    <th style={{ padding: '12px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Description</th>
                                                    <th style={{ padding: '12px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentShift.expenses.map(exp => (
                                                    <tr key={exp.id} style={{ borderTop: '1px solid #F2F2F7' }}>
                                                        <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 600 }}>{exp.description}</td>
                                                        <td style={{ padding: '16px 24px', fontSize: 14, fontWeight: 700, color: '#FF3B30', textAlign: 'right' }}>-{formatCurrency(exp.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Sidebar Actions */}
                    <div>
                        {currentShift && (
                            <div className="card" style={{ padding: 24, background: '#FFF1F0', border: '1px solid #FF3B3020' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, color: '#FF3B30' }}>
                                    <AlertCircle size={24} />
                                    <h3 style={{ fontWeight: 800, fontSize: 18 }}>Closing Shift</h3>
                                </div>
                                <p style={{ fontSize: 14, color: '#8E1F1A', marginBottom: 24, lineHeight: 1.5 }}>
                                    Before ending your shift, please count all physical cash in the register and enter it below.
                                </p>
                                <form onSubmit={handleEnd}>
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ fontSize: 12, fontWeight: 700, color: '#8E1F1A', marginBottom: 8, display: 'block' }}>Physical Ending Cash</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#FF3B30' }}>Rp</span>
                                            <input 
                                                type="number" className="input" placeholder="0" 
                                                value={endingCash} onChange={e => setEndingCash(e.target.value)} required
                                                style={{ paddingLeft: 44, fontSize: 18, fontWeight: 700, border: '1.5px solid #FF3B3040' }}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '16px', background: '#FF3B30', color: 'white', fontWeight: 800, fontSize: 16 }}>
                                        {loading ? 'Closing...' : 'Close Register & End Shift'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* History Tab */
                <div className="card" style={{ padding: 0, border: '1px solid #E5E5EA', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #F2F2F7' }}>
                        <h3 style={{ fontWeight: 800, fontSize: 18 }}>Shift History</h3>
                        <p style={{ fontSize: 14, color: '#8E8E93' }}>Past register logs and performance records.</p>
                    </div>

                    {!shiftHistory || shiftHistory.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: '#8E8E93' }}>
                            No past shifts found.
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: '#FAFAFA' }}>
                                    <th style={{ padding: '16px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Shift Date</th>
                                    <th style={{ padding: '16px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Cashier</th>
                                    <th style={{ padding: '16px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Starting</th>
                                    <th style={{ padding: '16px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Ending</th>
                                    <th style={{ padding: '16px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Expenses</th>
                                    <th style={{ padding: '16px 24px', fontSize: 12, color: '#8E8E93', fontWeight: 700 }}>Difference</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shiftHistory.map(shift => {
                                    const expected = (shift.startingCash || shift.starting_cash || 0) - (shift.totalExpenses || shift.total_expenses || 0);
                                    const actual = (shift.endingCash || shift.ending_cash || 0);
                                    const diff = actual - expected;
                                    return (
                                        <tr key={shift.id} style={{ borderTop: '1px solid #F2F2F7' }}>
                                            <td style={{ padding: '20px 24px' }}>
                                                <div style={{ fontWeight: 700, color: '#111' }}>{formatDateTime(shift.endTime || shift.end_time)}</div>
                                                <div style={{ fontSize: 12, color: '#8E8E93' }}>ID: #S-{shift.id}</div>
                                            </td>
                                            <td style={{ padding: '20px 24px', fontSize: 14, fontWeight: 600 }}>{shift.user?.full_name}</td>
                                            <td style={{ padding: '20px 24px', fontSize: 14, fontWeight: 700 }}>{formatCurrency(shift.startingCash || shift.starting_cash)}</td>
                                            <td style={{ padding: '20px 24px', fontSize: 14, fontWeight: 700 }}>{formatCurrency(shift.endingCash || shift.ending_cash)}</td>
                                            <td style={{ padding: '20px 24px', fontSize: 14, fontWeight: 700, color: '#FF3B30' }}>-{formatCurrency(shift.totalExpenses || shift.total_expenses || 0)}</td>
                                            <td style={{ padding: '20px 24px' }}>
                                                <div style={{ 
                                                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', 
                                                    borderRadius: 6, fontSize: 12, fontWeight: 800,
                                                    background: diff === 0 ? '#F0FFF4' : (diff > 0 ? '#EBF8FF' : '#FFF1F0'),
                                                    color: diff === 0 ? '#34C759' : (diff > 0 ? '#007AFF' : '#FF3B30')
                                                }}>
                                                    {diff === 0 ? <CheckCircle2 size={14}/> : (diff > 0 ? <TrendingUp size={14}/> : <AlertCircle size={14}/>)}
                                                    {diff === 0 ? 'Match' : (diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString())}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
            
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
                @keyframes slideDown {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
