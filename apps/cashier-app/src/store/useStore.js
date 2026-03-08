import { create } from 'zustand';
import { persist } from 'zustand/middleware';



// ─── QUEUE STATUS ────────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
    'WAITING_SHOOT',
    'SHOOTING',
    'EDITING',
    'PRINTING',
    'DONE',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const padNum = (n, len = 4) => String(n).padStart(len, '0');
const today = () => new Date().toISOString().split('T')[0];

const calcTotal = (pkg, addons, cafeSnacks, promo, manualDiscount, selectedThemes) => {
    if (!pkg) return { base: 0, discount: 0, total: 0 };
    const baseAddons = (addons || []).reduce((s, a) => s + a.price, 0);
    const baseCafe = (cafeSnacks || []).reduce((s, c) => s + (c.price * c.quantity), 0);
    const themeCount = (selectedThemes && selectedThemes.length > 0)
        ? selectedThemes.reduce((s, t) => s + t.quantity, 0)
        : 0;
    const baseThemes = pkg.price * themeCount;
    const base = baseThemes + baseAddons + baseCafe;
    let discount = 0;
    if (promo) {
        if (promo.type === 'percent') discount = Math.round(base * promo.discount / 100);
        else if (promo.type === 'flat') discount = promo.discount;
        else if (promo.type === 'manual') discount = manualDiscount || 0;
    }
    return { base, discount, total: Math.max(0, base - discount) };
};

// ─── STORE ───────────────────────────────────────────────────────────────────
export const useStore = create(
    persist(
        (set, get) => ({
            // Settings & Master Data
            showSales: true,
            setShowSales: (val) => set({ showSales: val }),

            themes: [],
            setThemes: (val) => set({ themes: val }),

            packages: [],
            setPackages: (val) => set({ packages: val }),

            addons: [],
            setAddons: (val) => set({ addons: val }),

            cafeSnacks: [],
            setCafeSnacks: (val) => set({ cafeSnacks: val }),

            promos: [],
            setPromos: (val) => set({ promos: val }),

            refreshMasterData: async () => {
                try {
                    const { fetchThemes, fetchPackages, fetchAddons, fetchCafeSnacks, fetchPromos } = await import('../utils/api');
                    const [t, p, a, c, pr] = await Promise.all([
                        fetchThemes(),
                        fetchPackages(),
                        fetchAddons(),
                        fetchCafeSnacks(),
                        fetchPromos()
                    ]);
                    set({ themes: t, packages: p, addons: a, cafeSnacks: c, promos: pr });
                } catch (err) {
                    console.error("Master data refresh failed", err);
                }
            },

            // Auth
            isLoggedIn: false,
            cashierName: '',
            login: (name) => set({ isLoggedIn: true, cashierName: name }),
            logout: () => set({ isLoggedIn: false, cashierName: '' }),

            // Counters
            invoiceCounter: 1,
            themeCounters: {
                vintage_vinyl: 1,
                vintage_hotel: 1,
                vintage_elevator: 1,
                supermarket: 1,
                theme_5: 1,
                theme_6: 1,
            },

            // Transactions
            transactions: [],

            builder: {
                customerName: '',
                package: null,
                themes: [], // Array of { ...theme, quantity }
                addons: [],
                cafeSnacks: [],
                promo: null,
                manualDiscount: 0,
                paymentMethod: null,
            },

            setBuilderField: (field, value) =>
                set((s) => ({ builder: { ...s.builder, [field]: value } })),

            updateThemeQuantity: (theme, delta) =>
                set((s) => {
                    const existing = s.builder.themes.find((t) => t.id === theme.id);
                    let newThemes;
                    if (existing) {
                        const nextQty = existing.quantity + delta;
                        if (nextQty <= 0) {
                            newThemes = s.builder.themes.filter((t) => t.id !== theme.id);
                        } else {
                            newThemes = s.builder.themes.map((t) =>
                                t.id === theme.id ? { ...t, quantity: nextQty } : t
                            );
                        }
                    } else if (delta > 0) {
                        newThemes = [...s.builder.themes, { ...theme, quantity: delta }];
                    } else {
                        newThemes = s.builder.themes;
                    }
                    return { builder: { ...s.builder, themes: newThemes } };
                }),

            updateCafeSnackQuantity: (item, delta) =>
                set((s) => {
                    const existing = s.builder.cafeSnacks.find((c) => c.id === item.id);
                    let newSnacks;

                    if (existing) {
                        const nextQty = existing.quantity + delta;
                        if (nextQty <= 0) {
                            newSnacks = s.builder.cafeSnacks.filter((c) => c.id !== item.id);
                        } else {
                            newSnacks = s.builder.cafeSnacks.map((c) =>
                                c.id === item.id ? { ...c, quantity: nextQty } : c
                            );
                        }
                    } else if (delta > 0) {
                        newSnacks = [...s.builder.cafeSnacks, { ...item, quantity: delta }];
                    } else {
                        newSnacks = s.builder.cafeSnacks;
                    }

                    return { builder: { ...s.builder, cafeSnacks: newSnacks } };
                }),

            toggleAddon: (addon) =>
                set((s) => {
                    const has = s.builder.addons.some((a) => a.id === addon.id);
                    return {
                        builder: {
                            ...s.builder,
                            addons: has
                                ? s.builder.addons.filter((a) => a.id !== addon.id)
                                : [...s.builder.addons, addon],
                        },
                    };
                }),

            resetBuilder: () =>
                set({
                    builder: {
                        customerName: '',
                        package: null,
                        themes: [],
                        addons: [],
                        cafeSnacks: [],
                        promo: null,
                        manualDiscount: 0,
                        paymentMethod: null,
                    },
                }),

            getBuilderCalc: () => {
                const { builder } = get();
                return calcTotal(builder.package, builder.addons, builder.cafeSnacks, builder.promo, builder.manualDiscount, builder.themes);
            },

            processPayment: () => {
                const s = get();
                const { base, discount, total } = s.getBuilderCalc();
                let currentInvoice = s.invoiceCounter;
                const updatedThemeCounters = { ...s.themeCounters };
                const newTransactions = [];

                // Create a separate transaction record/queue entry for each theme quantity
                s.builder.themes.forEach(theme => {
                    for (let i = 0; i < theme.quantity; i++) {
                        const themeId = theme.id;
                        const prefix = theme.prefix || 'A';
                        const queueNum = updatedThemeCounters[themeId] || 1;

                        const tx = {
                            id: `${currentInvoice}-${themeId}-${i}`, // Unique ID for this session
                            session_id: `${currentInvoice}-${themeId}-${i}`,
                            order_id: `JJ-${padNum(currentInvoice)}`,
                            queue_number: `${prefix}${padNum(queueNum, 2)}`,
                            customer_name: s.builder.customerName || `Customer ${currentInvoice}`,
                            package: s.builder.package?.label || '',
                            package_id: s.builder.package?.id || '',
                            theme: theme.label,
                            theme_id: themeId,
                            addons: s.builder.addons.map((a) => a.label),
                            cafe_snacks: (s.builder.cafeSnacks || []).map((c) => `${c.quantity}x ${c.label}`),
                            promo: s.builder.promo?.label || '',
                            base_price: base,
                            discount: discount,
                            total: total,
                            payment_method: s.builder.paymentMethod,
                            payment_status: 'PAID',
                            order_status: 'WAITING_SHOOT',
                            created_at: new Date().toISOString(),
                        };
                        newTransactions.push(tx);
                        updatedThemeCounters[themeId] = queueNum + 1;
                    }
                });

                // If no themes but has cafe:
                if (s.builder.themes.length === 0) {
                    const tx = {
                        id: `${currentInvoice}-cafe`,
                        session_id: `${currentInvoice}-cafe`,
                        order_id: `JJ-${padNum(currentInvoice)}`,
                        queue_number: 'CAFE',
                        customer_name: s.builder.customerName || `Customer ${currentInvoice}`,
                        package: 'Cafe Only',
                        package_id: 'cafe',
                        theme: '—',
                        theme_id: 'cafe',
                        addons: [],
                        cafe_snacks: (s.builder.cafeSnacks || []).map((c) => `${c.quantity}x ${c.label}`),
                        promo: s.builder.promo?.label || '',
                        base_price: base,
                        discount: discount,
                        total: total,
                        payment_method: s.builder.paymentMethod,
                        payment_status: 'PAID',
                        order_status: 'DONE',
                        created_at: new Date().toISOString(),
                    };
                    newTransactions.push(tx);
                }

                set((prev) => ({
                    transactions: [...newTransactions, ...prev.transactions],
                    invoiceCounter: prev.invoiceCounter + 1,
                    themeCounters: updatedThemeCounters
                }));

                // Return a combined object for the success modal
                return {
                    ...newTransactions[0],
                    all_sessions: newTransactions
                };
            },

            // Update order status (for Production Queue panel)
            updateOrderStatus: (id, status) =>
                set((s) => ({
                    transactions: s.transactions.map((t) =>
                        (t.id === id || t.session_id === id) ? { ...t, order_status: status } : t
                    ),
                })),

            // Derived getters
            getTodayTransactions: () => {
                const d = today();
                return get().transactions.filter((t) => t.created_at.startsWith(d));
            },
            getTodaySales: () => {
                const txs = get().getTodayTransactions();
                const seen = new Set();
                return txs.reduce((s, t) => {
                    if (seen.has(t.order_id)) return s;
                    seen.add(t.order_id);
                    return s + (t.total || 0);
                }, 0);
            },
            getActiveQueueCount: () =>
                get().transactions.filter((t) => t.order_status === 'WAITING_SHOOT').length,
            getMostUsedPackage: () => {
                const txs = get().getTodayTransactions();
                if (!txs.length) return '—';
                const freq = {};
                txs.forEach((t) => { freq[t.package] = (freq[t.package] || 0) + 1; });
                return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
            },
            getThemeQueueWaitTime: (themeId) => {
                const count = get().transactions.filter(t =>
                    t.theme_id === themeId && t.order_status !== 'DONE'
                ).length;
                if (count === 0) return 0;
                return { min: count * 7, max: count * 10 };
            }
        }),
        {
            name: 'jjikgo-store',
            partialize: (s) => ({
                isLoggedIn: s.isLoggedIn,
                cashierName: s.cashierName,
                transactions: s.transactions,
                invoiceCounter: s.invoiceCounter,
                themeCounters: s.themeCounters,
            }),
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...persistedState,
                // Ensure builder is ALWAYS derived from fresh code, not old localStorage
                builder: currentState.builder,
            }),
        }
    )
);
