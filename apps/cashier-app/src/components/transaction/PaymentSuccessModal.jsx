import React from 'react';
import { formatCurrency } from '../../utils/format';
import { Printer, Plus } from 'lucide-react';

export default function PaymentSuccessModal({ transaction, onNewTransaction, onClose }) {
    if (!transaction) return null;

    const paymentIcons = { Cash: '💵', QRIS: '📱', Debit: '💳', Credit: '💳' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>

                {/* Animated checkmark */}
                <div style={{ marginBottom: 24 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80" style={{ display: 'block', margin: '0 auto' }}>
                        <circle cx="40" cy="40" r="36" fill="#F0FFF4" />
                        <circle
                            cx="40" cy="40" r="30"
                            fill="none" stroke="#34C759" strokeWidth="3"
                            className="checkmark-circle"
                        />
                        <polyline
                            points="24,40 35,51 56,28"
                            fill="none" stroke="#34C759" strokeWidth="3.5"
                            strokeLinecap="round" strokeLinejoin="round"
                            className="checkmark-check"
                        />
                    </svg>
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>
                    Payment Successful
                </h2>
                <p style={{ fontSize: 14, color: '#8E8E93', marginBottom: 28 }}>
                    {paymentIcons[transaction.payment_method] || '💳'} Paid via {transaction.payment_method}
                </p>

                {/* Queue Number(s) — BIG */}
                <div style={{
                    background: '#111111',
                    borderRadius: 16,
                    padding: '20px 24px',
                    marginBottom: 20,
                }}>
                    <div style={{ fontSize: 11, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Queue Number{transaction.all_sessions?.length > 1 ? 's' : ''}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                        {(transaction.all_sessions || [transaction]).map((s, si) => (
                            <div key={si} style={{ fontSize: transaction.all_sessions?.length > 2 ? 36 : 56, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                {s.queue_number}
                            </div>
                        ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#636366', marginTop: 12 }}>Customer may proceed to the booths when called</div>
                </div>

                {/* Details */}
                <div style={{
                    background: '#FAFAFA', borderRadius: 12,
                    padding: '16px 18px', marginBottom: 24, textAlign: 'left',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F2F2F7' }}>
                        <span style={{ fontSize: 13, color: '#8E8E93' }}>Invoice</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{transaction.order_id}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F2F2F7' }}>
                        <span style={{ fontSize: 13, color: '#8E8E93' }}>Package</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{transaction.package}</span>
                    </div>
                    <div style={{ padding: '6px 0', borderBottom: '1px solid #F2F2F7' }}>
                        <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', marginBottom: 4 }}>Sessions</div>
                        {(transaction.all_sessions || [transaction]).map((s, si) => (
                            <div key={si} style={{ fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span>{s.theme}</span>
                                <span style={{ color: '#8E8E93' }}>{s.queue_number}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#8E8E93' }}>Total Paid</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#111111' }}>{formatCurrency(transaction.total)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        id="modal-print-receipt"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => window.print()}
                    >
                        <Printer size={15} />
                        Print Receipt
                    </button>
                    <button
                        id="modal-new-transaction"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={onNewTransaction}
                    >
                        <Plus size={15} />
                        New Transaction
                    </button>
                </div>
            </div>
        </div>
    );
}
