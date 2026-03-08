export const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export const formatTime = (date = new Date()) =>
    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export const formatDate = (date = new Date()) =>
    date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const getStatusLabel = (status) => {
    const map = {
        WAITING_SHOOT: 'Waiting',
        SHOOTING: 'Shooting',
        EDITING: 'Editing',
        PRINTING: 'Printing',
        DONE: 'Done',
    };
    return map[status] || status;
};

export const getStatusBadgeClass = (status) => {
    const map = {
        WAITING_SHOOT: 'badge-waiting',
        SHOOTING: 'badge-shooting',
        EDITING: 'badge-editing',
        PRINTING: 'badge-printing',
        DONE: 'badge-done',
    };
    return map[status] || 'badge-waiting';
};
