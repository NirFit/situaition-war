import * as circleService from './circleService';
import { mockStorage } from './mockStorage';

const useFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;

export interface UserProfile {
  displayName: string;
  phone: string;
  city: string;
  location: string;
  address: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (useFirebase) {
    const p = await circleService.getUserProfile(userId);
    return p ? { displayName: p.displayName ?? '', phone: p.phone ?? '', city: p.city ?? '', location: p.location ?? '', address: p.address ?? '' } : null;
  }
  return mockStorage.getUserProfile(userId);
}

export async function updateProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  if (useFirebase) {
    await circleService.updateUserProfile(userId, profile);
  } else {
    mockStorage.updateUserProfile(userId, profile);
  }
}
