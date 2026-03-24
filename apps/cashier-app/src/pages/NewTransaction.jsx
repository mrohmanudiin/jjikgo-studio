import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';
import PaymentSuccessModal from '../components/transaction/PaymentSuccessModal';
import { createTransaction as apiCreateTransaction } from '../utils/api';
import {
    User, Tag, ChevronDown, CheckCircle2, AlertCircle, Coffee, Plus, Minus, Clock, Pencil
} from 'lucide-react';

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ step, title, subtitle }) {
    return (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: '#111', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    marginTop: 2
                }}>{step}</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
                    {subtitle && <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>{subtitle}</div>}
                </div>
            </div>
            <div style={{
                width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #F2F2F7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C7C7CC'
            }}>
                <Plus size={14} />
            </div>
        </div>
    );
}

// ─── Theme colour dots ────────────────────────────────────────────────────────
const THEME_Gradients = [
    'linear-gradient(135deg, #C9A96E 0%, #8B6914 100%)',
    'linear-gradient(135deg, #8B9E8E 0%, #4A6B4A 100%)',
    'linear-gradient(135deg, #B08A7E 0%, #7A4E42 100%)',
    'linear-gradient(135deg, #7E9BB5 0%, #3A6080 100%)',
    'linear-gradient(135deg, #9B7EB0 0%, #5E3A80 100%)',
    'linear-gradient(135deg, #B07E8A 0%, #7A3A4A 100%)',
    'linear-gradient(135deg, #D4D4D8 0%, #71717A 100%)', // Default
];

export default function NewTransaction() {

    const builder = useStore((s) => s.builder);
    const setBuilderField = useStore((s) => s.setBuilderField);
    const updateThemeQuantity = useStore((s) => s.updateThemeQuantity);
    const updatePackageQuantity = useStore((s) => s.updatePackageQuantity);
    const updateAddonQuantity = useStore((s) => s.updateAddonQuantity);
    const updateCafeSnackQuantity = useStore((s) => s.updateCafeSnackQuantity);
    const getBuilderCalc = useStore((s) => s.getBuilderCalc);
    const processPayment = useStore((s) => s.processPayment);
    const resetBuilder = useStore((s) => s.resetBuilder);
    const invoiceCounter = useStore((s) => s.invoiceCounter);
    const themeCounters = useStore((s) => s.themeCounters);

    // Auth / shift context — read explicitly so we can pass them to backend
    const storeUser = useStore((s) => s.user);
    const storeBranch = useStore((s) => s.branch);
    const currentShift = useStore((s) => s.currentShift);

    const themesList = useStore((s) => s.themes);
    const packagesList = useStore((s) => s.packages);
    const addonsList = useStore((s) => s.addons);
    const cafeSnacksList = useStore((s) => s.cafeSnacks);
    const promosList = useStore((s) => s.promos);

    const [completedTx, setCompletedTx] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isNoteVisible, setIsNoteVisible] = useState(false);
    const [txError, setTxError] = useState('');

    const { base, discount, total } = getBuilderCalc();
    const overCapacityThemes = builder.themes.filter(t => (builder.peopleCount || 1) > (t.max_capacity || 4));
    const isOverCapacity = overCapacityThemes.length > 0;

    const hasItems = builder.themes.length > 0 || builder.packages.length > 0 || builder.addons.length > 0 || builder.cafeSnacks.length > 0;
    const hasName = builder.customerName && builder.customerName.trim() !== '';
    const hasShift = !!currentShift;
    const canProcess = hasItems && hasName && !!builder.paymentMethod && !isProcessing && !isOverCapacity && hasShift;

    const handleProcess = async () => {
        setTxError('');
        setIsProcessing(true);
        try {
            // 1. Build the complete payload explicitly
            //    Backend needs: sessions[], branch_id, shift_id, user_id
            const { base: b, discount: d, total: t } = getBuilderCalc();

            // Build one session per theme (or one cafe session)
            const sessions = [];
            const themeBase = builder.themes;

            if (themeBase.length > 0) {
                themeBase.forEach(theme => {
                    for (let i = 0; i < theme.quantity; i++) {
                        sessions.push({
                            customer_name: builder.customerName || 'Walk-in',
                            customer_email: '',
                            people_count: builder.peopleCount || 1,
                            theme_id: theme.id,
                            package: builder.packages.map(p => `${p.quantity}x ${p.label}`).join(', '),
                            addons: builder.addons.map(a => ({ id: a.id, label: a.label, quantity: a.quantity, price: a.price })),
                            cafe_snacks: builder.cafeSnacks.map(c => ({ id: c.id, label: c.label, quantity: c.quantity, price: c.price })),
                            promo: builder.promo ? builder.promo.label : null,
                            note: builder.note || null,
                            payment_method: builder.paymentMethod,
                            total: t,
                        });
                    }
                });
            } else {
                // Cafe-only order
                sessions.push({
                    customer_name: builder.customerName || 'Walk-in',
                    customer_email: '',
                    people_count: builder.peopleCount || 1,
                    theme_id: 'cafe',
                    package: 'Cafe Only',
                    addons: [],
                    cafe_snacks: builder.cafeSnacks.map(c => ({ id: c.id, label: c.label, quantity: c.quantity, price: c.price })),
                    promo: builder.promo ? builder.promo.label : null,
                    note: builder.note || null,
                    payment_method: builder.paymentMethod,
                    total: t,
                });
            }

            // 2. Call API with explicit IDs
            const payload = {
                sessions,
                branch_id: storeBranch?.id,
                shift_id: currentShift?.id || null,
                user_id: storeUser?.id,
            };

            const { api } = await import('../utils/api');
            const res = await api.post('/transactions', payload);

            if (res.data?.success) {
                // Also run local processPayment to update counters (but don't resend to backend)
                processPayment();
                setCompletedTx({ ...res.data.all_sessions[0], all_sessions: res.data.all_sessions });
                useStore.getState().refreshTransactions();
            } else {
                setTxError('Transaction failed. Please try again.');
            }

        } catch (err) {
            console.error('Transaction failed', err);
            // Show the real backend error message, not just the HTTP status text
            const backendMsg = err.response?.data?.error || err.response?.data?.message || err.message;
            setTxError(`Payment failed: ${backendMsg}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNewTransaction = () => {
        resetBuilder();
        setCompletedTx(null);
    };



    return (
        <>
            <div className="animate-fadeIn" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

                {/* ══════════════════════════════════════════════════════════════════════
            LEFT PANEL — TRANSACTION BUILDER
        ══════════════════════════════════════════════════════════════════════ */}
                <div style={{ flex: '1 1 60%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Customer Info */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="0" title="Customer Info" subtitle="Identify the group and headcount" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 16 }}>
                            <div style={{ position: 'relative' }}>
                                <User size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    id="customer-name"
                                    className="input"
                                    style={{ paddingLeft: 40, height: 50, fontSize: 16, background: '#FAFAFA' }}
                                    placeholder="Customer Name"
                                    value={builder.customerName || ''}
                                    onChange={(e) => setBuilderField('customerName', e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F2F2F7', borderRadius: 12, padding: '4px' }}>
                                <button
                                    onClick={() => setBuilderField('peopleCount', Math.max(1, (builder.peopleCount || 1) - 1))}
                                    style={{ background: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#111', display: 'flex', width: '100%', height: '100%', minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Minus size={18} />
                                </button>
                                <span style={{ fontSize: 16, fontWeight: 800, color: '#111', minWidth: 20, textAlign: 'center' }}>
                                    {builder.peopleCount || 1}
                                </span>
                                <button
                                    onClick={() => setBuilderField('peopleCount', (builder.peopleCount || 1) + 1)}
                                    style={{ background: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#111', display: 'flex', width: '100%', height: '100%', minHeight: 46, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        {!hasName && (
                            <div style={{ fontSize: 12, color: '#FF3B30', marginTop: 8, fontWeight: 500 }}>
                                * Customer name is required.
                            </div>
                        )}
                    </div>

                    {/* ── SECTION 1: Theme ───────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="1" title="Theme" subtitle="Choose your backdrop theme" />

                        {/* Dropdown for quick selection */}
                        <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Tag size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <ChevronDown size={16} color="#8E8E93" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <select
                                className="input"
                                style={{ paddingLeft: 40, paddingRight: 40, appearance: 'none', cursor: 'pointer', background: '#FAFAFA' }}
                                value=""
                                onChange={(e) => {
                                    const theme = themesList.find(t => t.id === parseInt(e.target.value));
                                    if (theme) updateThemeQuantity(theme, 1);
                                }}
                            >
                                <option value="" disabled>Search or select theme...</option>
                                {themesList.filter(t => t.active !== false).map(t => (
                                    <option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.price)}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                            {themesList.filter(t => t.active !== false).length === 0 ? (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 0', color: '#8E8E93' }}>
                                    No themes available...
                                </div>
                            ) : themesList.filter(t => t.active !== false).map((theme, idx) => {
                                const selectedItem = (builder.themes || []).find(t => t.id === theme.id);
                                const qty = selectedItem ? selectedItem.quantity : 0;
                                const selected = qty > 0;
                                return (
                                    <div
                                        key={theme.id}
                                        style={{
                                            padding: 12, borderRadius: 14, background: selected ? '#111' : '#FAFAFA',
                                            border: selected ? '2px solid #111' : '1px solid #E5E5EA',
                                            display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer',
                                            transition: 'all 0.15s ease', position: 'relative'
                                        }}
                                        onClick={() => updateThemeQuantity(theme, qty > 0 ? 0 : 1)}
                                    >
                                        <div style={{
                                            height: 4, width: 24, borderRadius: 2, marginBottom: 4,
                                            background: theme.color || THEME_Gradients[idx % THEME_Gradients.length]
                                        }} />
                                        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? 'white' : '#111', lineHeight: 1.2 }}>
                                            {theme.name}
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: selected ? 'rgba(255,255,255,0.6)' : '#8E8E93' }}>
                                            {formatCurrency(theme.price || 0)}
                                        </div>

                                        {selected && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 2 }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => updateThemeQuantity(theme, -1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}><Minus size={14} /></button>
                                                <span style={{ fontWeight: 800, fontSize: 14, color: 'white', minWidth: 14, textAlign: 'center' }}>{qty}</span>
                                                <button onClick={() => updateThemeQuantity(theme, 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}><Plus size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── SECTION 2: Cafe & Snacks ────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="2" title="Cafe & Snacks" subtitle="Select refreshments" />
                        <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Coffee size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <ChevronDown size={16} color="#8E8E93" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <select
                                className="input"
                                style={{ paddingLeft: 40, paddingRight: 40, appearance: 'none', cursor: 'pointer', background: '#FAFAFA' }}
                                value=""
                                onChange={(e) => {
                                    const item = cafeSnacksList.find(c => c.id === parseInt(e.target.value));
                                    if (item) updateCafeSnackQuantity(item, 1);
                                }}
                            >
                                <option value="" disabled>Add cafe item...</option>
                                {cafeSnacksList.filter(c => c.active !== false).map(c => (
                                    <option key={c.id} value={c.id}>{c.label} — {formatCurrency(c.price)}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                            {builder.cafeSnacks.map((item) => (
                                <div key={item.id} style={{
                                    border: '1.5px solid #111', background: '#FAFAFA',
                                    borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                                        <div style={{ fontSize: 11, color: '#8E8E93', fontWeight: 600 }}>{formatCurrency(item.price)}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111', borderRadius: 20, padding: 2 }}>
                                        <button onClick={() => updateCafeSnackQuantity(item, -1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}><Minus size={14} /></button>
                                        <span style={{ color: 'white', fontWeight: 800, fontSize: 14, minWidth: 14, textAlign: 'center' }}>{item.quantity}</span>
                                        <button onClick={() => updateCafeSnackQuantity(item, 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── SECTION 3: Package ─────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="3" title="Package" subtitle="Select the shoot package" />
                        <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Tag size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <ChevronDown size={16} color="#8E8E93" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <select
                                className="input"
                                style={{ paddingLeft: 40, paddingRight: 40, appearance: 'none', cursor: 'pointer', background: '#FAFAFA' }}
                                value=""
                                onChange={(e) => {
                                    const pkg = packagesList.find(p => p.id === parseInt(e.target.value));
                                    if (pkg) updatePackageQuantity(pkg, 1);
                                }}
                            >
                                <option value="" disabled>Add package...</option>
                                {packagesList.filter(p => p.active !== false).map(p => (
                                    <option key={p.id} value={p.id}>{p.label} — {formatCurrency(p.price)}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                            {builder.packages.map((pkg) => (
                                <div key={pkg.id} style={{
                                    border: '1.5px solid #111', background: '#111', color: 'white',
                                    borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700 }}>{pkg.label}</div>
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{formatCurrency(pkg.price)}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 2, alignSelf: 'flex-start' }}>
                                        <button onClick={() => updatePackageQuantity(pkg, -1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}><Minus size={14} /></button>
                                        <span style={{ fontWeight: 800, fontSize: 14, minWidth: 14, textAlign: 'center' }}>{pkg.quantity}</span>
                                        <button onClick={() => updatePackageQuantity(pkg, 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}><Plus size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── SECTION 4: Add-ons ─────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="4" title="Add-ons" subtitle="Optional extras" />
                        <div style={{ position: 'relative', marginBottom: 16 }}>
                            <Plus size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <ChevronDown size={16} color="#8E8E93" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <select
                                className="input"
                                style={{ paddingLeft: 40, paddingRight: 40, appearance: 'none', cursor: 'pointer', background: '#FAFAFA' }}
                                value=""
                                onChange={(e) => {
                                    const addon = addonsList.find(a => a.id === parseInt(e.target.value));
                                    if (addon) updateAddonQuantity(addon, 1);
                                }}
                            >
                                <option value="" disabled>Add extra add-on...</option>
                                {addonsList.filter(a => a.active !== false).map(a => (
                                    <option key={a.id} value={a.id}>{a.label} — {formatCurrency(a.price)}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {builder.addons.map((a) => (
                                <div key={a.id} style={{
                                    background: '#F2F2F7', borderRadius: 20, padding: '4px 8px 4px 14px',
                                    display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E5E5EA'
                                }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{a.label}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', borderRadius: 16, border: '1px solid #E5E5EA' }}>
                                        <button onClick={() => updateAddonQuantity(a, -1)} style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', padding: 4 }}><Minus size={12} /></button>
                                        <span style={{ fontSize: 12, fontWeight: 800, minWidth: 12, textAlign: 'center' }}>{a.quantity}</span>
                                        <button onClick={() => updateAddonQuantity(a, 1)} style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', padding: 4 }}><Plus size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── SECTION 5: Promo ────────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="5" title="Promo" subtitle="Apply discount if applicable" />
                        <div style={{ position: 'relative', marginBottom: 12 }}>
                            <Tag size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                            <ChevronDown size={16} color="#8E8E93" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                            <select
                                id="promo-select"
                                className="input"
                                style={{ paddingLeft: 40, paddingRight: 40, appearance: 'none', cursor: 'pointer' }}
                                value={builder.promo?.id ? String(builder.promo.id) : 'none'}
                                onChange={(e) => {
                                    if (e.target.value === 'none') {
                                        setBuilderField('promo', null);
                                    } else {
                                        const p = promosList.find((pr) => String(pr.id) === e.target.value);
                                        setBuilderField('promo', p);
                                    }
                                }}
                            >
                                <option value="none">No Promo</option>
                                {promosList.filter(p => p.active !== false).map((p) => (
                                    <option key={p.id} value={String(p.id)}>{p.label}</option>
                                ))}
                            </select>
                        </div>

                        {builder.promo?.type === 'manual' && (
                            <div className="animate-fadeIn">
                                <input
                                    id="manual-discount"
                                    className="input"
                                    type="number"
                                    min="0"
                                    placeholder="Enter manual discount amount (Rp)"
                                    value={builder.manualDiscount || ''}
                                    onChange={(e) => setBuilderField('manualDiscount', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        )}

                        {builder.promo && builder.promo.id !== 'none' && (
                            <div style={{
                                marginTop: 10,
                                padding: '10px 14px',
                                background: '#F0FFF4',
                                borderRadius: 8,
                                fontSize: 13,
                                color: '#2DB14A',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <CheckCircle2 size={15} />
                                {(builder.promo.type?.toLowerCase() === 'percent' || builder.promo.type?.toLowerCase() === 'percentage')
                                    ? `${builder.promo.discount}% discount applied`
                                    : builder.promo.type?.toLowerCase() === 'flat'
                                        ? `${formatCurrency(builder.promo.discount)} discount applied`
                                        : discount > 0
                                            ? `Manual: ${formatCurrency(discount)} applied`
                                            : 'Enter discount amount above'}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════════════
            RIGHT PANEL — STICKY ORDER SUMMARY
        ══════════════════════════════════════════════════════════════════════ */}
                <div style={{ flex: '0 0 320px', minWidth: 280 }}>
                    <div className="summary-panel">

                        {/* Header */}
                        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F2F2F7', background: '#111', borderRadius: '14px 14px 0 0' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                Order Summary
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>
                                        JJ-{String(invoiceCounter).padStart(4, '0')}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Invoice ID</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'white', fontWeight: 900, fontSize: 13, letterSpacing: '-0.02em', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {(builder.themes || []).map(t => (
                                            <div key={t.id}>
                                                {t.prefix}{String(themeCounters[t.id] || 1).padStart(2, '0')}
                                                <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>({t.quantity}x)</span>
                                            </div>
                                        ))}
                                        {(builder.themes || []).length === 0 && <span style={{ opacity: 0.5 }}>—</span>}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>Queue No</div>
                                    {(builder.themes || []).length > 0 ? (
                                        <div style={{
                                            marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
                                            background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, justifyContent: 'flex-end'
                                        }}>
                                            <Clock size={10} color="#FF9500" />
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#FF9500', textTransform: 'uppercase' }}>
                                                Wait: {(builder.themes || []).reduce((s, t) => s + (themeCounters[t.id] - 1), 0) * 7}-{(builder.themes || []).reduce((s, t) => s + (themeCounters[t.id] - 1), 0) * 10}m
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{
                                            marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
                                            background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, justifyContent: 'flex-end'
                                        }}>
                                            <CheckCircle2 size={10} color="#34C759" />
                                            <span style={{ fontSize: 9, fontWeight: 700, color: '#34C759', textTransform: 'uppercase' }}>Ready Soon</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '16px 20px' }}>

                            {/* Theme */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Themes <span style={{ textTransform: 'none' }}>({builder.peopleCount || 1} ppl)</span></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {(builder.themes || []).map(t => (
                                        <div key={t.id} style={{ fontSize: 13, fontWeight: 600, color: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{t.name || t.label} <span style={{ color: '#8E8E93' }}>(x{t.quantity})</span></span>
                                            <span>{formatCurrency((t.price || 0) * (builder.peopleCount || 1) * t.quantity)}</span>
                                        </div>
                                    ))}
                                    {(builder.themes || []).length === 0 && (
                                        <div style={{ fontSize: 13, color: '#C7C7CC', fontStyle: 'italic' }}>No themes selected</div>
                                    )}
                                </div>
                            </div>

                            <hr className="divider" style={{ marginBottom: 12 }} />

                            {/* Package */}
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Packages</div>
                                {builder.packages.length > 0 ? (
                                    builder.packages.map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{p.label} <span style={{ color: '#8E8E93' }}>(x{p.quantity})</span></span>
                                            <span style={{ fontWeight: 700 }}>{formatCurrency(p.price * p.quantity)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: '#C7C7CC', fontSize: 13, fontStyle: 'italic' }}>No package selected</div>
                                )}
                            </div>

                            {/* Add-ons */}
                            {builder.addons.length > 0 && (
                                <>
                                    <hr className="divider" style={{ marginBottom: 12 }} />
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Add-ons</div>
                                        {builder.addons.map((a) => (
                                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, color: '#636366' }}>+ {a.label} (x{a.quantity})</span>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(a.price * a.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Cafe & Snacks */}
                            {builder.cafeSnacks.length > 0 && (
                                <>
                                    <hr className="divider" style={{ marginBottom: 12 }} />
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Cafe & Snacks</div>
                                        {builder.cafeSnacks.map((c) => (
                                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <span style={{ fontSize: 13, color: '#636366' }}>{c.quantity}x {c.label}</span>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(c.price * c.quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <hr className="divider" style={{ marginBottom: 12 }} />

                            {/* Pricing breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 13, color: '#636366' }}>Subtotal</span>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>{formatCurrency(base)}</span>
                                </div>
                                {discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 13, color: '#34C759' }}>Discount</span>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: '#34C759' }}>−{formatCurrency(discount)}</span>
                                    </div>
                                )}
                            </div>

                            <hr className="divider" style={{ marginBottom: 14 }} />

                            {/* Total */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontWeight: 800, fontSize: 16 }}>TOTAL</span>
                                <span style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', color: '#111' }}>{formatCurrency(total)}</span>
                            </div>

                            {/* Order Note Toggle */}
                            <div style={{ marginBottom: 24 }}>
                                {!isNoteVisible && !builder.note ? (
                                    <button
                                        onClick={() => setIsNoteVisible(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0, transition: 'color 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#111'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#8E8E93'}
                                    >
                                        <Pencil size={14} />
                                        Add note
                                    </button>
                                ) : (
                                    <div className="animate-fadeIn" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Pencil size={15} color="#8E8E93" />
                                        <input
                                            autoFocus
                                            type="text"
                                            className="input"
                                            placeholder="Write note here..."
                                            style={{ height: 38, fontSize: 13, background: '#F2F2F7', border: 'none', paddingLeft: 12, flex: 1, borderRadius: 8 }}
                                            value={builder.note || ''}
                                            onChange={(e) => setBuilderField('note', e.target.value)}
                                        />
                                        <button
                                            onClick={() => { setIsNoteVisible(false); setBuilderField('note', ''); }}
                                            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: '#FF3B30', cursor: 'pointer', padding: '4px 8px' }}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Payment Methods */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    Payment Method
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {['Cash', 'QRIS', 'Transfer'].map((method) => (
                                        <button
                                            key={method}
                                            id={`pay-${method.toLowerCase()}`}
                                            onClick={() => setBuilderField('paymentMethod', method)}
                                            style={{
                                                flex: '1 1 calc(33.333% - 6px)', minWidth: 0,
                                                padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                                border: builder.paymentMethod === method ? '2px solid #111' : '1px solid #E5E5EA',
                                                background: builder.paymentMethod === method ? '#FAFAFA' : 'white',
                                                color: builder.paymentMethod === method ? '#111' : '#8E8E93',
                                                cursor: 'pointer', transition: 'all 0.15s ease',
                                                transform: builder.paymentMethod === method ? 'scale(0.98)' : 'scale(1)',
                                            }}
                                        >
                                            <div style={{ fontSize: 24 }}>
                                                {method === 'Cash' && '💵'}
                                                {method === 'QRIS' && '📱'}
                                                {method === 'Transfer' && '🏦'}
                                            </div>
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Validation warnings */}
                            {isOverCapacity && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#FFF0F0', color: '#FF3B30',
                                    fontSize: 12, fontWeight: 600, marginBottom: 12,
                                }}>
                                    <AlertCircle size={14} />
                                    This theme allows a maximum of {overCapacityThemes[0]?.max_capacity || 4} people.
                                </div>
                            )}

                            {!hasShift && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#FFF0F0', color: '#FF3B30',
                                    fontSize: 12, fontWeight: 600, marginBottom: 12,
                                }}>
                                    <AlertCircle size={14} />
                                    No active shift. Open a shift first before processing transactions.
                                </div>
                            )}

                            {!hasItems && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#FFF8EE', color: '#FF9500',
                                    fontSize: 12, fontWeight: 500, marginBottom: 12,
                                }}>
                                    <AlertCircle size={14} />
                                    Add at least one item (theme, package, café...)
                                </div>
                            )}

                            {hasItems && !builder.paymentMethod && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#FFF8EE', color: '#FF9500',
                                    fontSize: 12, fontWeight: 500, marginBottom: 12,
                                }}>
                                    <AlertCircle size={14} />
                                    Select a payment method
                                </div>
                            )}

                            {txError && (
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#FFF0F0', color: '#FF3B30',
                                    fontSize: 12, fontWeight: 600, marginBottom: 12,
                                    lineHeight: 1.4,
                                }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{txError}</span>
                                </div>
                            )}

                            {/* Process Payment */}
                            <button
                                id="process-payment"
                                className="btn btn-primary"
                                disabled={!canProcess}
                                onClick={handleProcess}
                                style={{
                                    width: '100%',
                                    minHeight: 64,
                                    fontSize: 18,
                                    borderRadius: 16,
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    background: isProcessing ? '#8E8E93' : (canProcess ? '#34C759' : '#E5E5EA'),
                                    color: canProcess ? 'white' : '#8E8E93',
                                    border: 'none',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: canProcess ? '0 8px 24px rgba(52, 199, 89, 0.3)' : 'none',
                                    transform: canProcess ? 'translateY(-2px)' : 'none',
                                }}
                            >
                                {isProcessing ? 'PROCESSING...' : '🖤 PROCESS PAYMENT'}
                            </button>
                        </div>
                    </div>
                </div>
            </div >

            {/* Payment Success Modal */}
            {
                completedTx && (
                    <PaymentSuccessModal
                        transaction={completedTx}
                        onNewTransaction={handleNewTransaction}
                        onClose={() => setCompletedTx(null)}
                    />
                )
            }
        </>
    );

}
