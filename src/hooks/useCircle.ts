import { useState, useEffect, useCallback } from 'react';
import * as circleService from '../lib/circleService';
import { mockStorage, mockSubscribeToMembers } from '../lib/mockStorage';
import type { Member } from '../types';

const useFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;

export type MemberStatus = 'unknown' | 'safe' | 'sos';

export interface CircleMember {
  id: string;
  displayName: string;
  phone?: string;
  isSafe: boolean;
  status: MemberStatus;
  userId: string | null;
  lastSafeAt: number | null;
}

function toMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && 'toMillis' in v && typeof (v as { toMillis: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

function toCircleMember(m: Member | { id: string; displayName: string; phone?: string; isSafe: boolean; status?: string; userId: string | null; lastSafeAt?: unknown; addedAt?: unknown }): CircleMember {
  const raw = 'status' in m && m.status ? m.status : (m.isSafe ? 'safe' : 'unknown');
  return {
    id: m.id,
    displayName: m.displayName,
    phone: m.phone,
    isSafe: m.isSafe,
    status: (raw === 'safe' || raw === 'sos') ? raw : 'unknown',
    userId: 'userId' in m ? m.userId : null,
    lastSafeAt: 'lastSafeAt' in m ? toMillis(m.lastSafeAt) : null,
  };
}

export function useCircle(circleId: string | null, userId: string | null) {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(!!circleId);

  useEffect(() => {
    if (!circleId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    if (useFirebase) {
      const unsub = circleService.subscribeToMembers(circleId, (m) =>
        setMembers(m.map(toCircleMember))
      );
      return () => unsub();
    }
    const unsub = mockSubscribeToMembers(circleId, (m) =>
      setMembers(m.map(toCircleMember))
    );
    return () => unsub();
  }, [circleId]);

  const markSafe = useCallback(async () => {
    if (!userId) return;
    if (useFirebase) await circleService.setMeSafeInAllCircles(userId);
    else mockStorage.setMeSafeInAllCircles(userId);
  }, [userId]);

  const markUnsafe = useCallback(async () => {
    if (!userId) return;
    if (useFirebase) await circleService.setMeUnsafeInAllCircles(userId);
    else mockStorage.setMeUnsafeInAllCircles(userId);
  }, [userId]);

  const markSOS = useCallback(async () => {
    if (!circleId || !userId) return;
    if (useFirebase) await circleService.setMeSOS(circleId, userId);
    else mockStorage.setMeSOS(circleId, userId);
  }, [circleId, userId]);

  const resetAll = useCallback(async () => {
    if (!circleId) return;
    if (useFirebase) await circleService.resetAllMembers(circleId);
    else mockStorage.resetAllMembers(circleId);
  }, [circleId]);

  const notSafeCount = members.filter((m) => !m.isSafe).length;
  const sosCount = members.filter((m) => m.status === 'sos').length;

  return { members, loading, markSafe, markUnsafe, markSOS, resetAll, notSafeCount, sosCount };
}

export async function createCircle(ownerId: string, ownerName: string, circleName?: string, ownerPhone?: string): Promise<{ circleId: string; inviteCode: string }> {
  const name = circleName?.trim() || 'המעגל שלי';
  if (useFirebase) return circleService.createCircle(ownerId, ownerName, name, ownerPhone);
  return mockStorage.createCircle(ownerId, ownerName, name, ownerPhone);
}

export type MyCircleInfo = { circleId: string; name: string };

export async function getMyCircles(userId: string): Promise<MyCircleInfo[]> {
  if (useFirebase) return circleService.getMyCircles(userId);
  return mockStorage.getMyCircles(userId);
}

export async function ensureUserDoc(uid: string, email?: string, displayName?: string): Promise<void> {
  if (useFirebase) await circleService.ensureUserDoc(uid, email, displayName);
}

export async function removeCircleFromUser(userId: string, circleId: string): Promise<void> {
  if (useFirebase) await circleService.removeCircleFromUser(userId, circleId);
  else mockStorage.removeCircleFromUser(userId, circleId);
}

export async function joinCircle(inviteCode: string, userId: string, displayName: string, userPhone?: string): Promise<string | null> {
  if (useFirebase) return circleService.joinCircle(inviteCode, userId, displayName, userPhone);
  return mockStorage.joinCircle(inviteCode, userId, displayName, userPhone);
}

export async function addMemberByPhone(circleId: string, displayName: string, phone: string): Promise<void> {
  if (useFirebase) await circleService.addMemberByPhone(circleId, displayName, phone);
  else mockStorage.addMemberByPhone(circleId, displayName, phone);
}

export type CircleSummary = { total: number; safe: number; sos: number };

export async function getCircleSummary(circleId: string): Promise<CircleSummary> {
  if (useFirebase) return circleService.getCircleSummary(circleId);
  return mockStorage.getCircleSummary(circleId);
}

export function isFirebaseMode(): boolean {
  return useFirebase;
}

export const MAX_CIRCLE_MEMBERS = 25;

export async function removeMember(circleId: string, memberId: string, requesterId: string): Promise<void> {
  if (useFirebase) await circleService.removeMember(circleId, memberId, requesterId);
  else mockStorage.removeMember(circleId, memberId, requesterId);
}

export async function getCircleOwner(circleId: string): Promise<string | null> {
  if (useFirebase) return circleService.getCircleOwner(circleId);
  return mockStorage.getCircleOwner(circleId);
}
