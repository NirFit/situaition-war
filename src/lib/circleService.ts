import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Circle, Member } from '../types';

const CIRCLES = 'circles';
const MEMBERS = 'members';
const USERS = 'users';

function makeInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export interface UserProfile {
  displayName?: string;
  phone?: string;
  city?: string;
  location?: string;
  address?: string;
}

export async function ensureUserDoc(
  uid: string,
  email?: string,
  displayName?: string,
  phone?: string,
  city?: string,
  location?: string,
  address?: string
): Promise<void> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: email ?? '',
      displayName: displayName ?? '',
      phone: phone ?? '',
      city: city ?? '',
      location: location ?? '',
      address: address ?? '',
      myCircleIds: [],
    });
  } else {
    const updates: Record<string, string> = {};
    if (phone != null) updates.phone = phone;
    if (displayName != null) updates.displayName = displayName;
    if (city != null) updates.city = city;
    if (location != null) updates.location = location;
    if (address != null) updates.address = address;
    if (Object.keys(updates).length > 0) await updateDoc(ref, updates);
  }
}

export async function updateUserProfile(uid: string, profile: UserProfile): Promise<void> {
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const updates: Record<string, string> = {};
  if (profile.displayName != null) updates.displayName = profile.displayName;
  if (profile.phone != null) updates.phone = profile.phone;
  if (profile.city != null) updates.city = profile.city;
  if (profile.location != null) updates.location = profile.location;
  if (profile.address != null) updates.address = profile.address;
  if (Object.keys(updates).length > 0) await updateDoc(ref, updates);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    displayName: d?.displayName ?? '',
    phone: d?.phone ?? '',
    city: d?.city ?? '',
    location: d?.location ?? '',
    address: d?.address ?? '',
  };
}

export async function addCircleToUser(userId: string, circleId: string): Promise<void> {
  const ref = doc(db, USERS, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { myCircleIds: [circleId] });
    return;
  }
  const ids: string[] = snap.get('myCircleIds') ?? [];
  if (ids.includes(circleId)) return;
  await updateDoc(ref, { myCircleIds: arrayUnion(circleId) });
}

export interface MyCircleInfo {
  circleId: string;
  name: string;
}

export async function getMyCircles(userId: string): Promise<MyCircleInfo[]> {
  const userSnap = await getDoc(doc(db, USERS, userId));
  const ids: string[] = userSnap.exists() ? (userSnap.get('myCircleIds') ?? []) : [];
  if (ids.length === 0) return [];

  const snapshots = await Promise.all(
    ids.map(id => getDoc(doc(db, CIRCLES, id)))
  );

  return snapshots
    .filter(snap => snap.exists())
    .map(snap => ({
      circleId: snap.id,
      name: (snap.data()?.name as string) || 'מעגל',
    }));
}

export async function removeCircleFromUser(userId: string, circleId: string): Promise<void> {
  const ref = doc(db, USERS, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const ids: string[] = snap.get('myCircleIds') ?? [];
  const next = ids.filter((id) => id !== circleId);
  if (next.length === ids.length) return;
  await updateDoc(ref, { myCircleIds: next });
}

export async function createCircle(ownerId: string, ownerName: string, circleName: string, ownerPhone?: string): Promise<{ circleId: string; inviteCode: string }> {
  const inviteCode = makeInviteCode();
  const circleRef = doc(db, CIRCLES, inviteCode);
  await setDoc(circleRef, {
    name: circleName || 'המעגל שלי',
    ownerId,
    inviteCode,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, CIRCLES, inviteCode, MEMBERS, ownerId), {
    userId: ownerId,
    displayName: ownerName,
    phone: ownerPhone ?? null,
    isSafe: false,
    lastSafeAt: null,
    addedAt: serverTimestamp(),
  });
  await addCircleToUser(ownerId, inviteCode);
  return { circleId: inviteCode, inviteCode };
}

export async function joinCircle(inviteCode: string, userId: string, displayName: string, userPhone?: string): Promise<string | null> {
  const code = inviteCode.toUpperCase();
  const circleRef = doc(db, CIRCLES, code);
  const snap = await getDoc(circleRef);
  if (!snap.exists()) return null;
  await setDoc(doc(db, CIRCLES, code, MEMBERS, userId), {
    userId,
    displayName,
    phone: userPhone ?? null,
    isSafe: false,
    lastSafeAt: null,
    addedAt: serverTimestamp(),
  });
  await addCircleToUser(userId, code);
  return code;
}

export async function addMemberByPhone(circleId: string, displayName: string, phone: string): Promise<void> {
  const normalized = phone.replace(/\D/g, '');
  const snap = await getDocs(collection(db, CIRCLES, circleId, MEMBERS));
  if (snap.size >= 25) throw new Error('המעגל מלא (עד 25 חברים)');
  for (const d of snap.docs) {
    const p = (d.data().phone ?? '').replace(/\D/g, '');
    if (p === normalized) throw new Error('חבר עם מספר טלפון זה כבר במעגל');
  }
  const id = `phone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await setDoc(doc(db, CIRCLES, circleId, MEMBERS, id), {
    userId: null,
    displayName,
    phone: normalized,
    isSafe: false,
    lastSafeAt: null,
    addedAt: serverTimestamp(),
  });
}

const MESSAGES = 'messages';

export async function setMeSafe(circleId: string, userId: string): Promise<void> {
  const memberRef = doc(db, CIRCLES, circleId, MEMBERS, userId);
  await updateDoc(memberRef, { isSafe: true, status: 'safe', lastSafeAt: serverTimestamp() });
}

export async function setMeUnsafe(circleId: string, userId: string): Promise<void> {
  const memberRef = doc(db, CIRCLES, circleId, MEMBERS, userId);
  await updateDoc(memberRef, { isSafe: false, status: 'unknown', lastSafeAt: null });
}

export async function setMeSafeInAllCircles(userId: string): Promise<void> {
  const userSnap = await getDoc(doc(db, USERS, userId));
  const ids: string[] = userSnap.exists() ? (userSnap.get('myCircleIds') ?? []) : [];
  await Promise.all(ids.map(id => setMeSafe(id, userId)));
}

export async function setMeUnsafeInAllCircles(userId: string): Promise<void> {
  const userSnap = await getDoc(doc(db, USERS, userId));
  const ids: string[] = userSnap.exists() ? (userSnap.get('myCircleIds') ?? []) : [];
  await Promise.all(ids.map(id => setMeUnsafe(id, userId)));
}

export async function setMeSOS(circleId: string, userId: string): Promise<void> {
  const memberRef = doc(db, CIRCLES, circleId, MEMBERS, userId);
  await updateDoc(memberRef, { isSafe: false, status: 'sos', lastSafeAt: null });
}

export async function resetAllMembers(circleId: string): Promise<void> {
  const snap = await getDocs(collection(db, CIRCLES, circleId, MEMBERS));
  const batch: Promise<void>[] = [];
  for (const d of snap.docs) {
    batch.push(updateDoc(d.ref, { isSafe: false, status: 'unknown', lastSafeAt: null }));
  }
  await Promise.all(batch);
}

export async function getCircleSummary(circleId: string): Promise<{ total: number; safe: number; sos: number }> {
  const snap = await getDocs(collection(db, CIRCLES, circleId, MEMBERS));
  let safe = 0;
  let sos = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.status === 'sos') sos++;
    else if (data.isSafe || data.status === 'safe') safe++;
  }
  return { total: snap.size, safe, sos };
}

export function subscribeToCircle(circleId: string, onCircle: (c: Circle | null) => void): Unsubscribe {
  return onSnapshot(doc(db, CIRCLES, circleId), (snap) => {
    if (!snap.exists()) {
      onCircle(null);
      return;
    }
    onCircle({ id: snap.id, ...snap.data() } as Circle);
  });
}

export function subscribeToMembers(circleId: string, onMembers: (m: Member[]) => void): Unsubscribe {
  return onSnapshot(collection(db, CIRCLES, circleId, MEMBERS), (snap) => {
    const members: Member[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
    onMembers(members);
  });
}

export async function getCircleByCode(inviteCode: string): Promise<Circle | null> {
  const snap = await getDoc(doc(db, CIRCLES, inviteCode.toUpperCase()));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Circle;
}

export async function getCircleOwner(circleId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, CIRCLES, circleId));
  if (!snap.exists()) return null;
  return snap.data()?.ownerId ?? null;
}

export async function removeMember(circleId: string, memberId: string, requesterId: string): Promise<void> {
  const circleSnap = await getDoc(doc(db, CIRCLES, circleId));
  if (!circleSnap.exists()) return;
  const ownerId = circleSnap.data()?.ownerId;
  if (ownerId !== requesterId) throw new Error('רק בעל המעגל יכול להסיר חברים');
  const memberRef = doc(db, CIRCLES, circleId, MEMBERS, memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return;
  if (memberSnap.data()?.userId === ownerId) throw new Error('לא ניתן להסיר את עצמך');
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(memberRef);
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: number;
}

export async function sendChatMessage(circleId: string, userId: string, displayName: string, text: string): Promise<void> {
  const msgRef = doc(collection(db, CIRCLES, circleId, MESSAGES));
  await setDoc(msgRef, {
    userId,
    displayName: displayName.slice(0, 100),
    text: text.slice(0, 2000),
    createdAt: serverTimestamp(),
  });
}

export function subscribeToChat(circleId: string, onMessages: (m: ChatMessage[]) => void): Unsubscribe {
  const messagesRef = collection(db, CIRCLES, circleId, MESSAGES);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
      const messages: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt;
        return {
          id: d.id,
          userId: data.userId ?? '',
          displayName: data.displayName ?? 'אנונימי',
          text: data.text ?? '',
          createdAt: ts?.toMillis?.() ?? Date.now(),
        };
      });
      onMessages(messages);
    }
  );
}
