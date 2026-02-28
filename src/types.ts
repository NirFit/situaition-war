export interface Circle {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: import('firebase/firestore').Timestamp;
}

export type MemberStatus = 'unknown' | 'safe' | 'sos';

export interface Member {
  id: string;
  userId: string | null;
  displayName: string;
  phone?: string;
  isSafe: boolean;
  status: MemberStatus;
  lastSafeAt: import('firebase/firestore').Timestamp | null;
  addedAt: import('firebase/firestore').Timestamp;
}
