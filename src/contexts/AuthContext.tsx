import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { hashPassword, verifyPassword } from '../lib/crypto';
import { validateEmail, validatePassword, validatePhone, sanitizeText } from '../lib/validation';

const DEMO_CURRENT = 'safe_circle_demo_current';
const DEMO_USERS = 'safe_circle_demo_users';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

export interface UserProfileData {
  displayName: string;
  phone: string;
  city: string;
  location: string;
  address: string;
}

interface DemoUser {
  email: string;
  displayName: string;
  uid: string;
  phone?: string;
  city?: string;
  location?: string;
  address?: string;
}

interface DemoStoredUser {
  displayName: string;
  passwordHash: string;
  uid: string;
  phone?: string;
  city?: string;
  location?: string;
  address?: string;
}

function getDemoCurrent(): DemoUser | null {
  try {
    const s = localStorage.getItem(DEMO_CURRENT);
    return s ? (JSON.parse(s) as DemoUser) : null;
  } catch {
    return null;
  }
}

function toFirebaseUser(d: DemoUser): User {
  return {
    uid: d.uid,
    email: d.email,
    displayName: d.displayName,
  } as User;
}

interface AuthContextValue {
  user: User | null;
  userPhone: string | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, phone: string, profile?: { city?: string; location?: string; address?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY;
  const loginAttemptsRef = useRef<{ count: number; lockedUntil: number }>({ count: 0, lockedUntil: 0 });

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const state = loginAttemptsRef.current;
    if (state.lockedUntil > now) {
      const secondsLeft = Math.ceil((state.lockedUntil - now) / 1000);
      throw new Error(`יותר מדי ניסיונות. נסה שוב בעוד ${secondsLeft} שניות`);
    }
    if (state.lockedUntil > 0 && state.lockedUntil <= now) {
      state.count = 0;
      state.lockedUntil = 0;
    }
  }, []);

  const recordFailedAttempt = useCallback(() => {
    const state = loginAttemptsRef.current;
    state.count++;
    if (state.count >= MAX_LOGIN_ATTEMPTS) {
      state.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
  }, []);

  const resetAttempts = useCallback(() => {
    loginAttemptsRef.current = { count: 0, lockedUntil: 0 };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      checkRateLimit();

      const emailErr = validateEmail(email);
      if (emailErr) throw new Error(emailErr);

      if (!hasFirebase) {
        const raw = localStorage.getItem(DEMO_USERS);
        const users: Record<string, DemoStoredUser> = raw ? JSON.parse(raw) : {};
        const u = users[email.trim().toLowerCase()];

        if (!u) {
          recordFailedAttempt();
          throw new Error('אימייל או סיסמה לא נכונים');
        }

        const isValid = u.passwordHash
          ? await verifyPassword(password, u.passwordHash)
          : false;

        if (!isValid) {
          recordFailedAttempt();
          throw new Error('אימייל או סיסמה לא נכונים');
        }

        resetAttempts();
        const demo: DemoUser = { email: email.trim(), displayName: u.displayName, uid: u.uid, phone: u.phone, city: u.city, location: u.location, address: u.address };
        localStorage.setItem(DEMO_CURRENT, JSON.stringify(demo));
        setUser(toFirebaseUser(demo));
        setUserPhone(u.phone ?? null);
        setUserProfile({
          displayName: u.displayName,
          phone: u.phone ?? '',
          city: u.city ?? '',
          location: u.location ?? '',
          address: u.address ?? '',
        });
        return;
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        resetAttempts();
        setUser(cred.user);
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const snap = await getDoc(doc(db, 'users', cred.user.uid));
          const d = snap.data();
          setUserPhone(d?.phone ?? null);
          setUserProfile(d ? {
            displayName: d.displayName ?? '',
            phone: d.phone ?? '',
            city: d.city ?? '',
            location: d.location ?? '',
            address: d.address ?? '',
          } : null);
        } catch {
          setUserPhone(null);
          setUserProfile(null);
        }
      } catch {
        recordFailedAttempt();
        throw new Error('אימייל או סיסמה לא נכונים');
      }
    },
    [hasFirebase, checkRateLimit, recordFailedAttempt, resetAttempts]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string, phone: string, profile?: { city?: string; location?: string; address?: string }) => {
      const emailErr = validateEmail(email);
      if (emailErr) throw new Error(emailErr);

      const passErr = validatePassword(password);
      if (passErr) throw new Error(passErr);

      const em = email.trim().toLowerCase();
      const name = sanitizeText(displayName) || em.split('@')[0];
      const cleanPhone = (phone ?? '').replace(/\D/g, '');
      if (phone !== undefined && phone !== '') {
        const phoneErr = validatePhone(phone);
        if (phoneErr) throw new Error(phoneErr);
      }

      const city = sanitizeText(profile?.city ?? '');
      const location = sanitizeText(profile?.location ?? '');
      const address = sanitizeText(profile?.address ?? '');

      if (!hasFirebase) {
        const raw = localStorage.getItem(DEMO_USERS) ?? '{}';
        const users: Record<string, DemoStoredUser> = JSON.parse(raw);
        if (users[em]) throw new Error('כתובת המייל כבר רשומה');

        const uid = 'demo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
        const passwordHash = await hashPassword(password);
        users[em] = { displayName: name, passwordHash, uid, phone: cleanPhone, city, location, address };
        localStorage.setItem(DEMO_USERS, JSON.stringify(users));

        const { mockStorage } = await import('../lib/mockStorage');
        mockStorage.updateUserProfile(uid, { displayName: name, phone: cleanPhone, city, location, address });

        const demo: DemoUser = { email: em, displayName: name, uid, phone: cleanPhone, city, location, address };
        localStorage.setItem(DEMO_CURRENT, JSON.stringify(demo));
        setUser(toFirebaseUser(demo));
        setUserPhone(cleanPhone);
        setUserProfile({ displayName: name, phone: cleanPhone, city, location, address });
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, em, password);
      await updateProfile(cred.user, { displayName: name });
      const { ensureUserDoc } = await import('../lib/circleService');
      await ensureUserDoc(cred.user.uid, cred.user.email ?? undefined, name, cleanPhone, city, location, address);
      setUser(cred.user);
      setUserPhone(cleanPhone);
      setUserProfile({ displayName: name, phone: cleanPhone, city, location, address });
    },
    [hasFirebase]
  );

  const signOut = useCallback(async () => {
    if (!hasFirebase) {
      localStorage.removeItem(DEMO_CURRENT);
      setUser(null);
      setUserPhone(null);
      setUserProfile(null);
      return;
    }
    await firebaseSignOut(auth);
    setUser(null);
    setUserPhone(null);
    setUserProfile(null);
  }, [hasFirebase]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    if (!hasFirebase) {
      const cur = getDemoCurrent();
      if (cur) {
        const { mockStorage } = await import('../lib/mockStorage');
        const profile = mockStorage.getUserProfile(cur.uid);
        if (profile) {
          const updated: DemoUser = { ...cur, ...profile };
          localStorage.setItem(DEMO_CURRENT, JSON.stringify(updated));
          const raw = localStorage.getItem(DEMO_USERS) ?? '{}';
          const users: Record<string, DemoStoredUser> = JSON.parse(raw);
          if (users[cur.email]) {
            users[cur.email] = { ...users[cur.email], ...profile };
            localStorage.setItem(DEMO_USERS, JSON.stringify(users));
          }
          setUserProfile(profile);
        } else {
          setUserProfile({
            displayName: cur.displayName ?? '',
            phone: cur.phone ?? '',
            city: cur.city ?? '',
            location: cur.location ?? '',
            address: cur.address ?? '',
          });
        }
      }
      return;
    }
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const snap = await getDoc(doc(db, 'users', user.uid));
      const d = snap.data();
      if (d) {
        setUserPhone(d.phone ?? null);
        setUserProfile({
          displayName: d.displayName ?? '',
          phone: d.phone ?? '',
          city: d.city ?? '',
          location: d.location ?? '',
          address: d.address ?? '',
        });
      }
    } catch {
      setUserProfile(null);
    }
  }, [user, hasFirebase]);

  useEffect(() => {
    if (!hasFirebase) {
      const cur = getDemoCurrent();
      setUser(cur ? toFirebaseUser(cur) : null);
      setUserPhone(cur?.phone ?? null);
      setUserProfile(cur ? {
        displayName: cur.displayName ?? '',
        phone: cur.phone ?? '',
        city: cur.city ?? '',
        location: cur.location ?? '',
        address: cur.address ?? '',
      } : null);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      if (u) {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const snap = await getDoc(doc(db, 'users', u.uid));
          const d = snap.data();
          setUserPhone(d?.phone ?? null);
          setUserProfile(d ? {
            displayName: d.displayName ?? '',
            phone: d.phone ?? '',
            city: d.city ?? '',
            location: d.location ?? '',
            address: d.address ?? '',
          } : null);
        } catch {
          setUserPhone(null);
          setUserProfile(null);
        }
      } else {
        setUserPhone(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [hasFirebase]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, userPhone, userProfile, loading, signIn, signUp, signOut, refreshProfile }),
    [user, userPhone, userProfile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
