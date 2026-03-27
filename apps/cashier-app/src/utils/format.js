export const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export const formatTime = (date = new Date()) =>
    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export const formatDate = (date = new Date()) =>
    date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export const formatDateTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const getStatusLabel = (status) => {
    const map = {
        waiting: 'Waiting',
        called: 'Called',
        in_session: 'In Session',
        print_requested: '🖨️ Print Req.',
        printing: 'Printing',
        done: 'Done',
    };
    return map[status?.toLowerCase()] || status;
};

export const getStatusBadgeClass = (status) => {
    const map = {
        waiting: 'badge-waiting',
        called: 'badge-shooting',
        in_session: 'badge-shooting',
        print_requested: 'badge-printing',
        printing: 'badge-printing',
        done: 'badge-done',
    };
    return map[status?.toLowerCase()] || 'badge-waiting';
};
