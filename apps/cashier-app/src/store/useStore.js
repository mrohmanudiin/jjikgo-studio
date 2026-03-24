import { create } from 'zustand';
import { persist } from 'zustand/middleware';



// ─── QUEUE STATUS ────────────────────────────────────────────────────────────
export const ORDER_STATUSES = [
    'waiting',
    'called',
    'in_session',
    'print_requested',
    'printing',
    'done',
];

// Backend statuses that map to cashier statuses (All normalized to lowercase now)
export const BACKEND_STATUS_MAP = {
    waiting: 'waiting',
    called: 'called',
    in_session: 'in_session',
    print_requested: 'print_requested',
    printing: 'printing',
    done: 'done',
};


// ─── HELPERS ─────────────────────────────────────────────────────────────────
const padNum = (n, len = 4) => String(n).padStart(len, '0');
const today = () => new Date().toISOString().split('T')[0];

const calcTotal = (packages, addons, cafeSnacks, promo, manualDiscount, selectedThemes, peopleCount = 1) => {
    const pkgPrice = (packages || []).reduce((s, p) => s + (p.price * p.quantity), 0);
    const baseAddons = (addons || []).reduce((s, a) => s + (a.price * a.quantity), 0);
    const baseCafe = (cafeSnacks || []).reduce((s, c) => s + (c.price * c.quantity), 0);
    const baseThemes = (selectedThemes || [])
        .reduce((s, t) => s + ((t.price || 0) * peopleCount * t.quantity), 0);

    const base = pkgPrice + baseThemes + baseAddons + baseCafe;
    let discount = 0;
    if (promo) {
        if (promo.type?.toLowerCase() === 'percent' || promo.type?.toLowerCase() === 'percentage') discount = Math.round(base * parseFloat(promo.discount) / 100);
        else if (promo.type?.toLowerCase() === 'flat') discount = parseFloat(promo.discount);
        else if (promo.type?.toLowerCase() === 'manual') discount = parseFloat(manualDiscount || 0);
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
                    // Scope all master data to the current branch
                    const branchId = get().branch?.id || null;
                    const [t, p, a, c, pr] = await Promise.all([
                        fetchThemes(branchId),
                        fetchPackages(branchId),
                        fetchAddons(branchId),
                        fetchCafeSnacks(branchId),
                        fetchPromos(branchId)
                    ]);
                    set({ themes: t, packages: p, addons: a, cafeSnacks: c, promos: pr });
                } catch (err) {
                    console.error("Master data refresh failed", err);
                }
            },

            refreshTransactions: async () => {
                try {
                    const { api } = await import('../utils/api');
                    const branchId = get().branch?.id;
                    const params = branchId ? `?branch_id=${branchId}` : '';
                    const response = await api.get(`/transactions${params}`);
                    const raw = Array.isArray(response.data) ? response.data : [];

                    // Normalize backend shape → Cashier store shape
                    // Backend returns transactions with joined queue data.
                    // We flatten it so both `order_status` and `status` work.
                    const normalized = raw.map(t => {
                        // Backend may return queue as nested or flatten at top level
                        const queueStatus = t.queue?.status || t.queues?.[0]?.status || t.status || t.order_status || 'waiting';
                        const queueNumber = t.queue?.queue_number ?? t.queue?.queueNumber ?? t.queue_number ?? t.queueNumber;
                        return {
                            ...t,
                            // Normalize status fields
                            order_status: queueStatus,
                            status: queueStatus,
                            // Normalize timestamp fields
                            created_at: t.created_at || t.createdAt,
                            // Normalize queue_number
                            queue_number: queueNumber != null ? queueNumber : t.queue_number,
                            // Normalize nested names
                            customer_name: t.customer_name || t.customerName,
                            people_count: t.people_count || t.peopleCount || 1,
                            theme_id: t.theme_id || t.themeId,
                            // Queue id for status updates (use queue id if available)
                            queue_id: t.queue?.id || t.queues?.[0]?.id || t.queue_id || t.id,
                        };
                    });

                    set({ transactions: normalized });
                } catch (err) {
                    console.error("Transaction refresh failed", err);
                }
            },

            updateOrderStatus: async (id, status) => {
                try {
                    const { updateOrderStatusApi } = await import('../utils/api');
                    const txs = get().transactions;
                    const tx = (Array.isArray(txs) ? txs : []).find(t => t.id === id || t.queue_id === id);
                    const targetId = tx?.queue_id || id;
                    await updateOrderStatusApi(targetId, status);
                    get().refreshTransactions();
                } catch (e) {
                    console.error('Failed to update status', e);
                }
            },

            // Auth
            isLoggedIn: false,
            user: null, // { id, username, full_name, role, branch_id }
            branch: null, // { id, name, location }
            currentShift: null, // { id, starting_cash, start_time, total_expenses }
            shiftHistory: [],

            login: async (username, password) => {
                try {
                    const { api } = await import('../utils/api');
                    const response = await api.post('/auth/login', { username, password });
                    const userData = response.data;
                    
                    set({ 
                        isLoggedIn: true, 
                        user: {
                            id: userData.id,
                            username: userData.username,
                            full_name: userData.full_name,
                            role: userData.role,
                            branch_id: userData.branch_id,
                            token: userData.token
                        },
                        branch: userData.branch
                    });

                    // Check for active shift
                    get().refreshCurrentShift();
                    
                    return { success: true };
                } catch (err) {
                    console.error("Login failed", err);
                    return { success: false, error: err.response?.data?.error || 'Login failed' };
                }
            },

            logout: () => set({ 
                isLoggedIn: false, 
                user: null, 
                branch: null, 
                currentShift: null 
            }),

            // Shift Management
            refreshShiftHistory: async () => {
                const { branch } = get();
                if (!branch) return;
                try {
                    const { api } = await import('../utils/api');
                    const response = await api.get(`/shifts/history?branch_id=${branch.id}`);
                    set({ shiftHistory: response.data || [] });
                } catch (err) {
                    console.error("Failed to refresh shift history", err);
                }
            },

            refreshCurrentShift: async () => {
                const { branch } = get();
                if (!branch) return;
                try {
                    const { api } = await import('../utils/api');
                    const response = await api.get(`/shifts/current?branch_id=${branch.id}`);
                    set({ currentShift: response.data });
                } catch (err) {
                    console.error("Failed to refresh shift", err);
                }
            },

            startShift: async (startingCash) => {
                const { branch, user } = get();
                try {
                    const { api } = await import('../utils/api');
                    const response = await api.post('/shifts/start', {
                        branch_id: branch?.id,
                        user_id: user?.id,
                        starting_cash: startingCash
                    });
                    set({ currentShift: response.data });
                    return { success: true };
                } catch (err) {
                    console.error("Failed to start shift", err);
                    const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to start shift';
                    return { success: false, error: msg };
                }
            },

            endShift: async (endingCash) => {
                const { currentShift } = get();
                if (!currentShift) return { success: false, error: 'No active shift to end' };
                try {
                    const { api } = await import('../utils/api');
                    await api.post(`/shifts/${currentShift.id}/end`, {
                        ending_cash: endingCash
                    });
                    set({ currentShift: null });
                    return { success: true };
                } catch (err) {
                    console.error("Failed to end shift", err);
                    return { success: false, error: err.response?.data?.error || 'Failed to end shift' };
                }
            },

            addExpense: async (amount, description) => {
                const { currentShift } = get();
                if (!currentShift) return { success: false, error: 'No active shift. Please start a shift first.' };
                try {
                    const { api } = await import('../utils/api');
                    await api.post('/shifts/expenses', {
                        shift_id: currentShift.id,
                        amount,
                        description
                    });
                    get().refreshCurrentShift();
                    return { success: true };
                } catch (err) {
                    console.error("Failed to add expense", err);
                    return { success: false, error: err.response?.data?.error || 'Failed to add expense' };
                }
            },

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
                peopleCount: 1,
                packages: [], // Array of { ...package, quantity }
                themes: [], // Array of { ...theme, quantity }
                addons: [], // Array of { ...addon, quantity }
                cafeSnacks: [],
                promo: null,
                manualDiscount: 0,
                paymentMethod: null,
                note: '',
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

            updatePackageQuantity: (pkg, delta) =>
                set((s) => {
                    const existing = (s.builder.packages || []).find((p) => p.id === pkg.id);
                    let newPkgs;
                    if (existing) {
                        const nextQty = existing.quantity + delta;
                        if (nextQty <= 0) {
                            newPkgs = s.builder.packages.filter((p) => p.id !== pkg.id);
                        } else {
                            newPkgs = s.builder.packages.map((p) =>
                                p.id === pkg.id ? { ...p, quantity: nextQty } : p
                            );
                        }
                    } else if (delta > 0) {
                        newPkgs = [...(s.builder.packages || []), { ...pkg, quantity: delta }];
                    } else {
                        newPkgs = s.builder.packages || [];
                    }
                    return { builder: { ...s.builder, packages: newPkgs } };
                }),

            updateAddonQuantity: (addon, delta) =>
                set((s) => {
                    const existing = (s.builder.addons || []).find((a) => a.id === addon.id);
                    let newAddons;
                    if (existing) {
                        const nextQty = existing.quantity + delta;
                        if (nextQty <= 0) {
                            newAddons = s.builder.addons.filter((a) => a.id !== addon.id);
                        } else {
                            newAddons = s.builder.addons.map((a) =>
                                a.id === addon.id ? { ...a, quantity: nextQty } : a
                            );
                        }
                    } else if (delta > 0) {
                        newAddons = [...(s.builder.addons || []), { ...addon, quantity: delta }];
                    } else {
                        newAddons = s.builder.addons || [];
                    }
                    return { builder: { ...s.builder, addons: newAddons } };
                }),

            resetBuilder: () =>
                set({
                    builder: {
                        customerName: '',
                        peopleCount: 1,
                        packages: [],
                        themes: [],
                        addons: [],
                        cafeSnacks: [],
                        promo: null,
                        manualDiscount: 0,
                        paymentMethod: null,
                        note: '',
                    },
                }),

            getBuilderCalc: () => {
                const { builder } = get();
                return calcTotal(builder.packages, builder.addons, builder.cafeSnacks, builder.promo, builder.manualDiscount, builder.themes, builder.peopleCount);
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
                            // Backend needs these:
                            branch_id: s.branch?.id,
                            shift_id: s.currentShift?.id,
                            user_id: s.user?.id,

                            id: `${currentInvoice}-${themeId}-${i}`, 
                            session_id: `${currentInvoice}-${themeId}-${i}`,
                            order_id: `JJ-${padNum(currentInvoice)}`,
                            queue_number: `${prefix}${padNum(queueNum, 2)}`,
                            customer_name: s.builder.customerName || `Customer ${currentInvoice}`,
                            people_count: s.builder.peopleCount || 1,
                            package: s.builder.packages.map(p => `${p.quantity}x ${p.label}`).join(', '),
                            package_id: s.builder.packages.map(p => p.id).join(','),
                            theme: theme.label,
                            theme_id: themeId,
                            addons: s.builder.addons.map((a) => `${a.quantity}x ${a.label}`),
                            cafe_snacks: (s.builder.cafeSnacks || []).map((c) => `${c.quantity}x ${c.label}`),
                            promo: s.builder.promo?.label || '',
                            base_price: base,
                            discount: discount,
                            total: total,
                            note: s.builder.note,
                            payment_method: s.builder.paymentMethod,
                            payment_status: 'PAID',
                            order_status: 'waiting',
                            created_at: new Date().toISOString(),
                        };
                        newTransactions.push(tx);
                        updatedThemeCounters[themeId] = queueNum + 1;
                    }
                });

                // If no themes but has cafe:
                if (s.builder.themes.length === 0) {
                    const tx = {
                        branch_id: s.branch?.id,
                        shift_id: s.currentShift?.id,
                        user_id: s.user?.id,

                        id: `${currentInvoice}-cafe`,
                        session_id: `${currentInvoice}-cafe`,
                        order_id: `JJ-${padNum(currentInvoice)}`,
                        queue_number: 'CAFE',
                        customer_name: s.builder.customerName || `Customer ${currentInvoice}`,
                        people_count: s.builder.peopleCount || 1,
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
                        note: s.builder.note,
                        payment_method: s.builder.paymentMethod,
                        payment_status: 'PAID',
                        order_status: 'done',
                        created_at: new Date().toISOString(),
                    };
                    newTransactions.push(tx);
                }

                set((prev) => ({
                    invoiceCounter: prev.invoiceCounter + 1,
                    themeCounters: updatedThemeCounters
                }));

                return newTransactions;
            },

            // Update order status (for Production Queue panel)
            updateOrderStatus: async (id, status) => {
                try {
                    const { updateOrderStatusApi } = await import('../utils/api');
                    // Use queue_id from normalized transaction (backend status updates operate on queues)
                    const txs = get().transactions;
                    const tx = (Array.isArray(txs) ? txs : []).find(t => t.id === id || t.queue_id === id);
                    const targetId = tx?.queue_id || id;
                    await updateOrderStatusApi(targetId, status);
                    get().refreshTransactions();
                } catch (e) {
                    console.error("Failed to update status", e);
                }
            },

            // Derived getters
            getTodayTransactions: () => {
                const d = today();
                const txs = get().transactions;
                return (Array.isArray(txs) ? txs : []).filter((t) => {
                    const ts = t.created_at || t.createdAt || '';
                    return ts.startsWith(d);
                });
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
            getActiveQueueCount: () => {
                const txs = get().transactions;
                return (Array.isArray(txs) ? txs : []).filter((t) => {
                    const s = (t.order_status || t.status || '').toLowerCase();
                    return s === 'waiting' || s === 'called';
                }).length;
            },
            getMostUsedPackage: () => {
                const txs = get().getTodayTransactions();
                if (!txs.length) return '—';
                const freq = {};
                txs.forEach((t) => { freq[t.package] = (freq[t.package] || 0) + 1; });
                return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
            },
            getThemeQueueWaitTime: (themeId) => {
                const txs = get().transactions;
                const count = (Array.isArray(txs) ? txs : []).filter(t =>
                    t.theme_id === themeId && t.order_status !== 'DONE' && t.order_status !== 'done'
                ).length;
                if (count === 0) return 0;
                return { min: count * 7, max: count * 10 };
            },

            // Get all print_requested queues for cashier alert panel
            getPrintRequests: () => {
                const txs = get().transactions;
                return (Array.isArray(txs) ? txs : []).filter((t) => {
                    const s = (t.order_status || t.status || '').toLowerCase();
                    return s === 'print_requested';
                });
            },

            // Confirm print — advance to PRINTING via backend
            confirmPrint: async (id) => {
                try {
                    const { updateOrderStatusApi } = await import('../utils/api');
                    const txs = get().transactions;
                    const tx = (Array.isArray(txs) ? txs : []).find(t => t.id === id || t.queue_id === id);
                    const targetId = tx?.queue_id || id;
                    await updateOrderStatusApi(targetId, 'printing');
                    get().refreshTransactions();
                } catch (e) {
                    console.error('Failed to confirm print', e);
                }
            },

        }),
        {
            name: 'jjikgo-store',
            partialize: (s) => ({
                isLoggedIn: s.isLoggedIn,
                user: s.user,
                branch: s.branch,
                currentShift: s.currentShift,
                invoiceCounter: s.invoiceCounter,
                themeCounters: s.themeCounters,
            }),
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...persistedState,
                // Ensure builder is ALWAYS derived from fresh code, not old localStorage
                builder: currentState.builder,
                // Ensure transactions is explicitly set to not persist/load buggy state
                transactions: currentState.transactions,
            }),
        }
    )
);
