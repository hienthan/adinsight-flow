import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
export const pb = new PocketBase(PB_URL);

// Disable autocancellation to prevent "ClientResponseError 0" in console when multiple 
// components request data simultaneously or during HMR.
pb.autoCancellation(false);

/**
 * Formats a PocketBase or ISO date string to YYYY-MM-DD for use in <input type="date" />
 */
export const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    // Handle both "2024-01-01 12:00:00.000Z" and "2024-01-01T12:00:00.000Z"
    return dateStr.substring(0, 10);
};

// ... existing auth ...
export async function authenticate() {
    if (pb.authStore.isValid) return;

    try {
        // In production, this would be an actual login form
        // For local dev, we use the superuser account from db/pb_info.txt logic
        // But since this is frontend, we'll need to handle it or use public rules
        console.warn('PocketBase: No valid auth found. Please ensure public rules are set or login.');
    } catch (err) {
        console.error('PocketBase auth failed', err);
    }
}
