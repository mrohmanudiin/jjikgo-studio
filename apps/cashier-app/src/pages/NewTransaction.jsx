import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/format';
import PaymentSuccessModal from '../components/transaction/PaymentSuccessModal';
import { createTransaction as apiCreateTransaction } from '../utils/api';
import {
    User, Tag, ChevronDown, CheckCircle2, AlertCircle, Coffee, Plus, Minus, Clock
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
    const navigate = useNavigate();

    const builder = useStore((s) => s.builder);
    const setBuilderField = useStore((s) => s.setBuilderField);
    const updateThemeQuantity = useStore((s) => s.updateThemeQuantity);
    const toggleAddon = useStore((s) => s.toggleAddon);
    const updateCafeSnackQuantity = useStore((s) => s.updateCafeSnackQuantity);
    const getBuilderCalc = useStore((s) => s.getBuilderCalc);
    const processPayment = useStore((s) => s.processPayment);
    const resetBuilder = useStore((s) => s.resetBuilder);
    const invoiceCounter = useStore((s) => s.invoiceCounter);
    const themeCounters = useStore((s) => s.themeCounters);

    const themesList = useStore((s) => s.themes);
    const packagesList = useStore((s) => s.packages);
    const addonsList = useStore((s) => s.addons);
    const cafeSnacksList = useStore((s) => s.cafeSnacks);
    const promosList = useStore((s) => s.promos);

    const [completedTx, setCompletedTx] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const { base, discount, total } = getBuilderCalc();
    const canProcess = !!builder.package && builder.themes.length > 0 && !!builder.paymentMethod && !isProcessing;

    const handleProcess = async () => {
        setIsProcessing(true);
        try {
            // 1. Process via local zustand for immediate UI update/offline record
            const localTx = processPayment();

            // 2. Real Backend Call (Supabase)
            for (const theme of builder.themes) {
                for (let i = 0; i < theme.quantity; i++) {
                    await apiCreateTransaction({
                        customer_name: builder.customerName || 'Anonymous',
                        customer_email: '',
                        theme_id: theme.id,
                        package_name: builder.package.label,
                        payment_method: builder.paymentMethod,
                        total_price: total / (builder.themes.reduce((s, t) => s + t.quantity, 0))
                    });
                }
            }

            setCompletedTx(localTx);
        } catch (err) {
            console.error("Transaction sync failed", err);
            alert("Backend sync failed. Transaction saved locally.");
            // Still show success based on local state
            setCompletedTx(processPayment());
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

                    {/* Customer Name (optional) */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="0" title="Customer Name" subtitle="Optional — helps identify in queue" />
                        <div style={{ position: 'relative' }}>
                            <User size={16} color="#8E8E93" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                id="customer-name"
                                className="input"
                                style={{ paddingLeft: 40 }}
                                placeholder="Enter customer name..."
                                value={builder.customerName}
                                onChange={(e) => setBuilderField('customerName', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* ── SECTION 1: Theme ───────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="1" title="Theme" subtitle="Choose your backdrop theme" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            {themesList.length === 0 ? (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px 0', color: '#8E8E93' }}>
                                    No themes available...
                                </div>
                            ) : themesList.map((theme, idx) => {
                                // Map backend ID to existing store prefixes/colors if possible
                                const selectedItem = (builder.themes || []).find(t => t.id === theme.id);
                                const qty = selectedItem ? selectedItem.quantity : 0;
                                const selected = qty > 0;
                                return (
                                    <div
                                        key={theme.id}
                                        id={`theme-${theme.id}`}
                                        className={`theme-card ${selected ? 'selected' : ''}`}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            aspectRatio: '1/1',
                                            padding: 0,
                                            overflow: 'hidden',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            border: selected ? '3px solid #111' : '1px solid #E5E5EA',
                                            borderRadius: 16,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                        onClick={() => updateThemeQuantity(theme, qty > 0 ? -qty : 1)}
                                    >
                                        <div style={{
                                            flex: 1,
                                            background: theme.color || THEME_Gradients[idx % THEME_Gradients.length],
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            padding: 12,
                                            textAlign: 'center'
                                        }}>
                                            <div style={{
                                                fontSize: 16,
                                                fontWeight: 800,
                                                color: 'white',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                                lineHeight: 1.2
                                            }}>
                                                {theme.name}
                                            </div>

                                            {selected ? (
                                                <div style={{
                                                    background: 'rgba(255,255,255,0.2)',
                                                    backdropFilter: 'blur(4px)',
                                                    borderRadius: 12,
                                                    padding: '4px 12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    color: 'white'
                                                }} onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => updateThemeQuantity(theme, -1)}
                                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span style={{ fontWeight: 800, fontSize: 18 }}>{qty}</span>
                                                    <button
                                                        onClick={() => updateThemeQuantity(theme, 1)}
                                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    width: 40, height: 40,
                                                    borderRadius: '50%',
                                                    background: 'rgba(255,255,255,0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white'
                                                }}>
                                                    <Plus size={20} />
                                                </div>
                                            )}
                                        </div>

                                        {selected && (
                                            <div style={{
                                                position: 'absolute', top: 12, right: 12,
                                                background: '#111', color: 'white',
                                                width: 28, height: 28, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                            }}>
                                                <CheckCircle2 size={16} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── SECTION 2: Package ─────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="2" title="Package" subtitle="Select the shoot package" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                            {packagesList.map((pkg) => {
                                const selected = builder.package?.id === pkg.id;
                                return (
                                    <div
                                        key={pkg.id}
                                        id={`pkg-${pkg.id}`}
                                        className={`pkg-card ${selected ? 'selected' : ''}`}
                                        onClick={() => setBuilderField('package', pkg)}
                                    >
                                        <div style={{
                                            fontSize: 11, fontWeight: 600,
                                            textTransform: 'uppercase', letterSpacing: '0.06em',
                                            color: selected ? 'rgba(255,255,255,0.6)' : '#8E8E93',
                                            marginBottom: 6,
                                        }}>
                                            {pkg.description}
                                        </div>
                                        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>
                                            {pkg.label}
                                        </div>
                                        <div style={{
                                            fontSize: 18, fontWeight: 800,
                                            color: selected ? 'rgba(255,255,255,0.9)' : '#111',
                                        }}>
                                            {formatCurrency(pkg.price)}
                                        </div>
                                        {selected && (
                                            <div style={{ marginTop: 10 }}>
                                                <CheckCircle2 size={18} color="rgba(255,255,255,0.7)" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── SECTION 3: Add-ons ─────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="3" title="Add-ons" subtitle="Toggle optional extras" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {addonsList.map((addon) => {
                                const active = builder.addons.some((a) => a.id === addon.id);
                                return (
                                    <button
                                        key={addon.id}
                                        id={`addon-${addon.id}`}
                                        className={`addon-toggle ${active ? 'active' : ''}`}
                                        onClick={() => toggleAddon(addon)}
                                    >
                                        {active && <span style={{ marginRight: 4 }}>✓</span>}
                                        {addon.label}
                                        <span style={{
                                            marginLeft: 6, fontSize: 11,
                                            opacity: 0.7, fontWeight: 500,
                                        }}>
                                            +{formatCurrency(addon.price)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── SECTION 4: Cafe & Snack Menu ─────────────────────────────────────────── */}
                    <div className="card" style={{ padding: 24 }}>
                        <SectionHeader step="4" title="Cafe & Snacks" subtitle="Refreshments while waiting" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                            {cafeSnacksList.map((item) => {
                                const selectedItem = builder.cafeSnacks.find(c => c.id === item.id);
                                const qty = selectedItem ? selectedItem.quantity : 0;

                                return (
                                    <div key={item.id} style={{
                                        border: qty > 0 ? '1.5px solid #111' : '1.5px solid #E5E5EA',
                                        background: qty > 0 ? '#FAFAFA' : 'white',
                                        borderRadius: 12, padding: 14,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'all 0.15s ease'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{item.label}</div>
                                            <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 600 }}>{formatCurrency(item.price)}</div>
                                        </div>

                                        {qty === 0 ? (
                                            <button
                                                onClick={() => updateCafeSnackQuantity(item, 1)}
                                                style={{
                                                    background: '#F2F2F7', border: 'none', borderRadius: 22,
                                                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: '#111'
                                                }}
                                            >
                                                <Plus size={18} />
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111', borderRadius: 22, padding: '4px' }}>
                                                <button
                                                    onClick={() => updateCafeSnackQuantity(item, -1)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span style={{ fontSize: 15, fontWeight: 800, color: 'white', minWidth: 16, textAlign: 'center' }}>
                                                    {qty}
                                                </span>
                                                <button
                                                    onClick={() => updateCafeSnackQuantity(item, 1)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
                                value={builder.promo?.id || 'none'}
                                onChange={(e) => {
                                    const p = promosList.find((pr) => pr.id === parseInt(e.target.value));
                                    setBuilderField('promo', p);
                                }}
                            >
                                {promosList.map((p) => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
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
                                {builder.promo.type === 'percent'
                                    ? `${builder.promo.discount}% discount applied`
                                    : builder.promo.type === 'flat'
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
                                <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Themes</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {(builder.themes || []).map(t => (
                                        <div key={t.id} style={{ fontSize: 13, fontWeight: 600, color: '#111', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{t.label}</span>
                                            <span style={{ color: '#8E8E93' }}>x{t.quantity}</span>
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
                                <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Package</div>
                                {builder.package ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{builder.package.label}</span>
                                        <span style={{ fontWeight: 700 }}>{formatCurrency(builder.package.price)}</span>
                                    </div>
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
                                                <span style={{ fontSize: 13, color: '#636366' }}>+ {a.label}</span>
                                                <span style={{ fontSize: 13, fontWeight: 600 }}>{formatCurrency(a.price)}</span>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <span style={{ fontWeight: 800, fontSize: 16 }}>TOTAL</span>
                                <span style={{ fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', color: '#111' }}>{formatCurrency(total)}</span>
                            </div>

                            {/* Payment Methods */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                                    Payment Method
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {['Cash', 'QRIS', 'Transfer', 'E-wallet'].map((method) => (
                                        <button
                                            key={method}
                                            id={`pay-${method.toLowerCase().replace('-', '')}`}
                                            className={`pay-method ${builder.paymentMethod === method ? 'selected' : ''}`}
                                            onClick={() => setBuilderField('paymentMethod', method)}
                                            style={{ flex: '1 1 calc(50% - 4px)', minWidth: 0 }}
                                        >
                                            {method === 'Cash' && '💵 '}
                                            {method === 'QRIS' && '📱 '}
                                            {method === 'Transfer' && '🏦 '}
                                            {method === 'E-wallet' && '💳 '}
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Validation warnings */}
                            {!builder.package && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 12px', borderRadius: 8,
                                    background: '#FFF8EE', color: '#FF9500',
                                    fontSize: 12, fontWeight: 500, marginBottom: 12,
                                }}>
                                    <AlertCircle size={14} />
                                    Select a package to continue
                                </div>
                            )}

                            {builder.package && !builder.paymentMethod && (
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
                                    background: isProcessing ? '#8E8E93' : (canProcess ? '#111' : '#E5E5EA'),
                                    color: canProcess ? 'white' : '#8E8E93',
                                    transition: 'all 0.2s ease',
                                    boxShadow: canProcess ? '0 4px 16px rgba(17,17,17,0.25)' : 'none',
                                }}
                            >
                                {isProcessing ? 'PROCESSING...' : '🖤 PROCESS PAYMENT'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Success Modal */}
            {completedTx && (
                <PaymentSuccessModal
                    transaction={completedTx}
                    onNewTransaction={handleNewTransaction}
                    onClose={() => setCompletedTx(null)}
                />
            )}
        </>
    );

}
