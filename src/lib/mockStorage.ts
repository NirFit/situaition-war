const KEY_CIRCLES = 'safe_circle_demo_circles';
const KEY_MEMBERS = 'safe_circle_demo_members';
const KEY_USERS = 'safe_circle_demo_users';
const KEY_CHAT = 'safe_circle_demo_chat';
const KEY_PROFILES = 'safe_circle_demo_profiles';

interface StoredUser {
  myCircleIds: string[];
}

interface StoredProfile {
  displayName: string;
  phone: string;
  city: string;
  location: string;
  address: string;
}

function getProfiles(): Record<string, StoredProfile> {
  try {
    return JSON.parse(localStorage.getItem(KEY_PROFILES) ?? '{}');
  } catch {
    return {};
  }
}

function saveProfiles(p: Record<string, StoredProfile>) {
  localStorage.setItem(KEY_PROFILES, JSON.stringify(p));
}

function getUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(KEY_USERS) ?? '{}');
  } catch {
    return {};
  }
}

function saveUsers(u: Record<string, StoredUser>) {
  localStorage.setItem(KEY_USERS, JSON.stringify(u));
}

interface StoredCircle {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: number;
}

type MemberStatus = 'unknown' | 'safe' | 'sos';

interface StoredMember {
  id: string;
  userId: string | null;
  displayName: string;
  phone?: string;
  isSafe: boolean;
  status: MemberStatus;
  lastSafeAt: number | null;
  addedAt: number;
}

function getCircles(): Record<string, StoredCircle> {
  try {
    return JSON.parse(localStorage.getItem(KEY_CIRCLES) ?? '{}');
  } catch {
    return {};
  }
}

function getAllMembers(): Record<string, Record<string, StoredMember>> {
  try {
    return JSON.parse(localStorage.getItem(KEY_MEMBERS) ?? '{}');
  } catch {
    return {};
  }
}

function saveCircles(c: Record<string, StoredCircle>) {
  localStorage.setItem(KEY_CIRCLES, JSON.stringify(c));
}

function saveAllMembers(m: Record<string, Record<string, StoredMember>>) {
  localStorage.setItem(KEY_MEMBERS, JSON.stringify(m));
}

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const mockStorage = {
  ensureUserDoc(_uid: string): void {
    // no-op; we add circles when creating/joining
  },

  addCircleToUser(userId: string, circleId: string): void {
    const u = getUsers();
    u[userId] = u[userId] ?? { myCircleIds: [] };
    if (!u[userId].myCircleIds.includes(circleId)) {
      u[userId].myCircleIds.push(circleId);
      saveUsers(u);
    }
  },

  getMyCircles(userId: string): { circleId: string; name: string }[] {
    const u = getUsers();
    const ids = u[userId]?.myCircleIds ?? [];
    const circles = getCircles();
    return ids.map((circleId) => ({
      circleId,
      name: circles[circleId]?.name ?? 'מעגל',
    }));
  },

  removeCircleFromUser(userId: string, circleId: string): void {
    const u = getUsers();
    if (!u[userId]) return;
    u[userId].myCircleIds = u[userId].myCircleIds.filter((id) => id !== circleId);
    saveUsers(u);
  },

  createCircle(ownerId: string, ownerName: string, circleName: string, ownerPhone?: string): { circleId: string; inviteCode: string } {
    const circles = getCircles();
    const inviteCode = makeCode();
    circles[inviteCode] = {
      id: inviteCode,
      name: circleName || 'המעגל שלי',
      ownerId,
      inviteCode,
      createdAt: Date.now(),
    };
    saveCircles(circles);
    const all = getAllMembers();
    all[inviteCode] = all[inviteCode] ?? {};
    all[inviteCode][ownerId] = {
      id: ownerId,
      userId: ownerId,
      displayName: ownerName,
      phone: ownerPhone ?? undefined,
      isSafe: false,
      status: 'unknown',
      lastSafeAt: null,
      addedAt: Date.now(),
    };
    saveAllMembers(all);
    mockStorage.addCircleToUser(ownerId, inviteCode);
    return { circleId: inviteCode, inviteCode };
  },

  joinCircle(inviteCode: string, userId: string, displayName: string, userPhone?: string): string | null {
    const circles = getCircles();
    const code = inviteCode.toUpperCase();
    if (!circles[code]) return null;
    const all = getAllMembers();
    all[code] = all[code] ?? {};
    all[code][userId] = {
      id: userId,
      userId,
      displayName,
      phone: userPhone ?? undefined,
      isSafe: false,
      status: 'unknown',
      lastSafeAt: null,
      addedAt: Date.now(),
    };
    saveAllMembers(all);
    mockStorage.addCircleToUser(userId, code);
    return code;
  },

  getCircleOwner(circleId: string): string | null {
    const circles = getCircles();
    return circles[circleId]?.ownerId ?? null;
  },

  removeMember(circleId: string, memberId: string, requesterId: string): void {
    const circles = getCircles();
    const ownerId = circles[circleId]?.ownerId;
    if (ownerId !== requesterId) throw new Error('רק בעל המעגל יכול להסיר חברים');
    const all = getAllMembers();
    const circle = all[circleId];
    if (!circle?.[memberId]) return;
    if (circle[memberId].userId === ownerId) throw new Error('לא ניתן להסיר את עצמך');
    delete circle[memberId];
    saveAllMembers(all);
  },

  addMemberByPhone(circleId: string, displayName: string, phone: string): void {
    const all = getAllMembers();
    all[circleId] = all[circleId] ?? {};
    const members = Object.keys(all[circleId]);
    if (members.length >= 25) throw new Error('המעגל מלא (עד 25 חברים)');
    const normalized = phone.replace(/\D/g, '');
    const existing = Object.values(all[circleId]).some((m) => (m.phone ?? '').replace(/\D/g, '') === normalized);
    if (existing) throw new Error('חבר עם מספר טלפון זה כבר במעגל');
    const id = `phone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    all[circleId][id] = {
      id,
      userId: null,
      displayName,
      phone: normalized,
      isSafe: false,
      status: 'unknown',
      lastSafeAt: null,
      addedAt: Date.now(),
    };
    saveAllMembers(all);
  },

  setMeSafe(circleId: string, userId: string): void {
    const all = getAllMembers();
    if (all[circleId]?.[userId]) {
      all[circleId][userId].isSafe = true;
      all[circleId][userId].status = 'safe';
      all[circleId][userId].lastSafeAt = Date.now();
      saveAllMembers(all);
    }
  },

  setMeSafeInAllCircles(userId: string): void {
    const u = getUsers();
    const ids = u[userId]?.myCircleIds ?? [];
    for (const circleId of ids) mockStorage.setMeSafe(circleId, userId);
  },

  setMeUnsafeInAllCircles(userId: string): void {
    const u = getUsers();
    const ids = u[userId]?.myCircleIds ?? [];
    for (const circleId of ids) mockStorage.setMeUnsafe(circleId, userId);
  },

  setMeUnsafe(circleId: string, userId: string): void {
    const all = getAllMembers();
    if (all[circleId]?.[userId]) {
      all[circleId][userId].isSafe = false;
      all[circleId][userId].status = 'unknown';
      all[circleId][userId].lastSafeAt = null;
      saveAllMembers(all);
    }
  },

  setMeSOS(circleId: string, userId: string): void {
    const all = getAllMembers();
    if (all[circleId]?.[userId]) {
      all[circleId][userId].isSafe = false;
      all[circleId][userId].status = 'sos';
      all[circleId][userId].lastSafeAt = null;
      saveAllMembers(all);
    }
  },

  resetAllMembers(circleId: string): void {
    const all = getAllMembers();
    const circle = all[circleId];
    if (!circle) return;
    for (const id of Object.keys(circle)) {
      circle[id].isSafe = false;
      circle[id].status = 'unknown';
      circle[id].lastSafeAt = null;
    }
    saveAllMembers(all);
  },

  getCircleSummary(circleId: string): { total: number; safe: number; sos: number } {
    const members = mockStorage.getMembers(circleId);
    return {
      total: members.length,
      safe: members.filter((m) => m.status === 'safe' || m.isSafe).length,
      sos: members.filter((m) => m.status === 'sos').length,
    };
  },

  getCircle(code: string): StoredCircle | null {
    return getCircles()[code.toUpperCase()] ?? null;
  },

  getMembers(circleId: string): StoredMember[] {
    const m = getAllMembers()[circleId] ?? {};
    return Object.entries(m).map(([id, mem]) => ({ ...mem, id }));
  },

  getUserProfile(userId: string): StoredProfile | null {
    const p = getProfiles()[userId];
    if (!p) return null;
    return {
      displayName: p.displayName ?? '',
      phone: p.phone ?? '',
      city: p.city ?? '',
      location: p.location ?? '',
      address: p.address ?? '',
    };
  },

  updateUserProfile(userId: string, profile: Partial<StoredProfile>): void {
    const all = getProfiles();
    all[userId] = {
      displayName: profile.displayName ?? all[userId]?.displayName ?? '',
      phone: profile.phone ?? all[userId]?.phone ?? '',
      city: profile.city ?? all[userId]?.city ?? '',
      location: profile.location ?? all[userId]?.location ?? '',
      address: profile.address ?? all[userId]?.address ?? '',
    };
    saveProfiles(all);
  },

  addChatMessage(circleId: string, userId: string, displayName: string, text: string): void {
    const all = getChatMessages();
    all[circleId] = all[circleId] ?? [];
    all[circleId].push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      displayName: displayName.slice(0, 100),
      text: text.slice(0, 2000),
      createdAt: Date.now(),
    });
    saveChatMessages(all);
  },

  subscribeToChat(circleId: string, onMessages: (m: { id: string; userId: string; displayName: string; text: string; createdAt: number }[]) => void): () => void {
    const tick = () => {
      const all = getChatMessages();
      const msgs = (all[circleId] ?? []).sort((a, b) => a.createdAt - b.createdAt);
      onMessages(msgs);
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  },
};

function getChatMessages(): Record<string, { id: string; userId: string; displayName: string; text: string; createdAt: number }[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY_CHAT) ?? '{}');
  } catch {
    return {};
  }
}

function saveChatMessages(m: Record<string, { id: string; userId: string; displayName: string; text: string; createdAt: number }[]>) {
  localStorage.setItem(KEY_CHAT, JSON.stringify(m));
}

export function mockSubscribeToMembers(
  circleId: string,
  onMembers: (members: StoredMember[]) => void
): () => void {
  const tick = () => onMembers(mockStorage.getMembers(circleId));
  tick();
  const id = setInterval(tick, 3000);
  return () => clearInterval(id);
}
