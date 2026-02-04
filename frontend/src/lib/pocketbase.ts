import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
export const pb = new PocketBase(PB_URL);

// Simple auth helper for development
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
