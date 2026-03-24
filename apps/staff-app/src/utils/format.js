import { formatDistanceToNow, parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns';

/**
 * Format elapsed time from a timestamp into "Xm Xs ago" style
 */
export function formatWaitingTime(createdAt) {
    if (!createdAt) return '—';
    try {
        const date = typeof createdAt === 'string' ? parseISO(createdAt) : new Date(createdAt);
        if (isNaN(date.getTime())) return '—';

        const now = new Date();
        const diffSec = differenceInSeconds(now, date);
        if (diffSec < 0) return 'Just now';

        if (diffSec < 60) return `${diffSec}s`;
        
        const diffMin = differenceInMinutes(now, date);
        if (diffMin < 60) {
            const secs = diffSec % 60;
            return `${diffMin}m ${secs}s`;
        }

        const hours = Math.floor(diffMin / 60) || 0;
        const mins = diffMin % 60 || 0;
        return `${hours}h ${mins}m`;
    } catch (e) {
        return '—';
    }
}

/**
 * Get a human-readable label for a queue status
 */
export function getStatusLabel(status) {
    const labels = {
        waiting: 'Waiting',
        called: 'Called',
        in_session: 'In Session',
        selecting: 'Selecting',
        print_requested: 'Print Requested',
        printing: 'Printing',
        done: 'Done',
    };
    return labels[status?.toLowerCase()] || status || '—';
}

/**
 * Get color config for a status
 */
export function getStatusColor(status) {
    const colors = {
        waiting: { bg: '#FFF8EE', border: '#FFD580', text: '#9A6700', dot: '#FF9500' },
        called: { bg: '#E8F4FD', border: '#93C5FD', text: '#1D4ED8', dot: '#3B82F6' },
        in_session: { bg: '#ECFDF5', border: '#6EE7B7', text: '#065F46', dot: '#10B981' },
        selecting: { bg: '#F5F3FF', border: '#C4B5FD', text: '#5B21B6', dot: '#8B5CF6' },
        print_requested: { bg: '#FDF2F8', border: '#F9A8D4', text: '#9D174D', dot: '#EC4899' },
        printing: { bg: '#FFFBEB', border: '#FCD34D', text: '#B45309', dot: '#F59E0B' },
        done: { bg: '#F0FFF4', border: '#86EFAC', text: '#155724', dot: '#22C55E' },
    };
    return colors[status?.toLowerCase()] || { bg: '#F5F5F5', border: '#E5E5EA', text: '#636366', dot: '#8E8E93' };
}
