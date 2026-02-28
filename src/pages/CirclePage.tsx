import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useCircle,
  addMemberByPhone,
  removeCircleFromUser,
  removeMember,
  getCircleOwner,
  MAX_CIRCLE_MEMBERS,
} from '../hooks/useCircle';
import type { CircleMember } from '../hooks/useCircle';
import { formatRelativeTime } from '../lib/relativeTime';
import { validatePhone, sanitizeText } from '../lib/validation';
import { formatIsraeliPhone } from '../lib/phoneFormat';
import { sendMessage, subscribeToChat, type ChatMessage } from '../lib/chatService';
import { ShelterTimer } from '../components/ShelterTimer';
import { EmergencyContacts } from '../components/EmergencyContacts';
import { EquipmentChecklist } from '../components/EquipmentChecklist';
import { SkeletonCircle } from '../components/Skeleton';
import { useTheme } from '../contexts/ThemeContext';

const MESSAGE_TEMPLATES = [
  'אני במרחב מוגן',
  'אני בדרך למרחב מוגן',
  'צריך עזרה',
  'כולם בסדר אצלי',
  'אני בחוץ',
];

type SortMode = 'status' | 'name' | 'time';
type FilterMode = 'all' | 'safe' | 'unsafe';

function playNewMessageSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    /* ignore */
  }
}

function MemberRow({
  member,
  isMe,
  isOwner,
  onRemove,
}: {
  member: CircleMember;
  isMe: boolean;
  isOwner: boolean;
  onRemove?: (id: string) => void;
}) {
  const canRemove = isOwner && !isMe && member.userId !== null;
  const phoneDisplay = member.phone
    ? formatIsraeliPhone(member.phone.length === 9 ? '0' + member.phone : member.phone)
    : member.phone;

  return (
    <div
      className={`member-row ${member.status === 'sos' ? 'sos' : member.isSafe ? 'safe' : 'unsafe'}`}
      role="listitem"
    >
      <span className="status-icon" aria-label={member.isSafe ? 'בטוח' : member.status === 'sos' ? 'צריך עזרה' : 'לא בטוח'}>
        {member.status === 'sos' ? '🆘' : member.isSafe ? '✓' : '○'}
      </span>
      <div className="member-info">
        <span className="name">
          {member.status === 'sos' && <span className="sos-badge">צריך עזרה!</span>}
          {member.displayName}
          {isMe && <em> (אני)</em>}
        </span>
        {member.isSafe && member.lastSafeAt != null && (
          <span className="last-safe">סימן/ה בטוח/ה {formatRelativeTime(member.lastSafeAt)}</span>
        )}
        {!member.isSafe && member.status !== 'sos' && (
          <span className="last-safe unsafe-label">טרם סימן/ה בטוח</span>
        )}
      </div>
      <div className="member-actions">
        {!member.isSafe && member.phone && (
          <a href={`tel:${phoneDisplay}`} className="btn-call" aria-label={`חייג ל${member.displayName}`}>
            חייג
          </a>
        )}
        {canRemove && (
          <button
            type="button"
            className="btn-remove-member"
            onClick={() => onRemove?.(member.id)}
            aria-label={`הסר את ${member.displayName}`}
          >
            הסר
          </button>
        )}
      </div>
    </div>
  );
}

function CircleChat({
  circleId,
  userId,
  displayName,
  onNewMessage,
}: {
  circleId: string;
  userId: string;
  displayName: string;
  onNewMessage?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!circleId) return;
    const unsub = subscribeToChat(circleId, setMessages);
    return unsub;
  }, [circleId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const last = messages[messages.length - 1];
      if (last && last.userId !== userId) {
        onNewMessage?.();
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, userId, onNewMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = sanitizeText(input);
    if (!text || !circleId || !userId) return;
    setSending(true);
    setInput('');
    try {
      await sendMessage(circleId, userId, displayName, text);
    } finally {
      setSending(false);
    }
  };

  const useTemplate = (text: string) => {
    setInput(text);
  };

  return (
    <section className="chat-section card">
      <h3>צ'אט הקבוצה</h3>
      <div className="chat-templates">
        {MESSAGE_TEMPLATES.map((t) => (
          <button key={t} type="button" className="chat-template-btn" onClick={() => useTemplate(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="chat-messages" ref={listRef} role="log" aria-label="הודעות">
        {messages.length === 0 ? (
          <p className="chat-empty">אין הודעות עדיין. התחל את השיחה!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-msg ${m.userId === userId ? 'mine' : ''}`}>
              <span className="chat-msg-author">{m.displayName}</span>
              <span className="chat-msg-text">{m.text}</span>
              <span className="chat-msg-time">{formatRelativeTime(m.createdAt)}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="chat-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="כתוב הודעה..."
          maxLength={500}
          dir="rtl"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          {sending ? '...' : 'שלח'}
        </button>
      </form>
    </section>
  );
}

function MembersSummary({ members }: { members: CircleMember[] }) {
  const safe = members.filter((m) => m.isSafe).length;
  const unsafe = members.length - safe;
  const percent = members.length > 0 ? Math.round((safe / members.length) * 100) : 0;

  return (
    <div className="members-summary">
      <div className="summary-bar">
        <div className="summary-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="summary-stats">
        <span className="stat safe-stat">{safe} בטוחים</span>
        <span className="stat-divider">|</span>
        <span className="stat unsafe-stat">{unsafe} ממתינים</span>
        <span className="stat-divider">|</span>
        <span className="stat">{percent}%</span>
      </div>
    </div>
  );
}

export function CirclePage() {
  const { circleId } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    members,
    loading,
    markSafe,
    markUnsafe,
    markSOS,
    resetAll,
    notSafeCount,
    sosCount,
  } = useCircle(circleId ?? null, user?.uid ?? null);

  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [copyToast, setCopyToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('status');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const me = useMemo(() => members.find((m) => m.userId === user?.uid), [members, user?.uid]);
  const isSafe = me?.isSafe ?? false;
  const isOwner = user?.uid === ownerId;

  useEffect(() => {
    if (!circleId) return;
    getCircleOwner(circleId).then(setOwnerId);
  }, [circleId]);

  const filteredAndSorted = useMemo(() => {
    let result = [...members];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((m) => m.displayName.toLowerCase().includes(q));
    }

    if (filterMode === 'safe') result = result.filter((m) => m.isSafe);
    else if (filterMode === 'unsafe') result = result.filter((m) => !m.isSafe);

    result.sort((a, b) => {
      const aIsMe = a.userId === user?.uid ? -1 : 0;
      const bIsMe = b.userId === user?.uid ? -1 : 0;
      if (aIsMe !== bIsMe) return aIsMe - bIsMe;

      if (sortMode === 'status') {
        if (a.status === 'sos' && b.status !== 'sos') return -1;
        if (a.status !== 'sos' && b.status === 'sos') return 1;
        if (a.isSafe !== b.isSafe) return a.isSafe ? 1 : -1;
        return a.displayName.localeCompare(b.displayName, 'he');
      }
      if (sortMode === 'name') return a.displayName.localeCompare(b.displayName, 'he');
      if (sortMode === 'time') return (b.lastSafeAt ?? 0) - (a.lastSafeAt ?? 0);
      return 0;
    });

    return result;
  }, [members, searchQuery, sortMode, filterMode, user?.uid]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleId) return;

    const cleanName = sanitizeText(addName);
    if (!cleanName) {
      setAddError('נא להזין שם');
      return;
    }

    const phoneErr = validatePhone(addPhone);
    if (phoneErr) {
      setAddError(phoneErr);
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      await addMemberByPhone(circleId, cleanName, addPhone.trim());
      setAddName('');
      setAddPhone('');
      setShowAdd(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'שגיאה בהוספת חבר');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (!circleId || !user) return;
      if (!window.confirm('להסיר חבר זה מהמעגל?')) return;
      try {
        await removeMember(circleId, memberId, user.uid);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'שגיאה');
      }
    },
    [circleId, user]
  );

  const handleEmergencyMode = useCallback(() => {
    if (!window.confirm('מצב חירום: לחייג למוקד חירום?')) return;
    window.location.href = 'tel:101';
  }, []);

  const handleShareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('המיקום לא נתמך במכשיר זה');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        const text = `המיקום שלי: ${url}`;
        if (navigator.share) {
          navigator.share({ title: 'מיקום', text, url }).catch(() => {
            navigator.clipboard.writeText(text);
            alert('הקישור הועתק ללוח');
          });
        } else {
          navigator.clipboard.writeText(text);
          alert('הקישור הועתק ללוח');
        }
      },
      () => alert('לא ניתן לקבל מיקום')
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleNewMessage = useCallback(() => {
    playNewMessageSound();
  }, []);

  if (!circleId) {
    navigate('/circles');
    return null;
  }

  const inviteLink = `${window.location.origin}/join?code=${encodeURIComponent(circleId)}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    }
  }, [inviteLink]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'מעגל בטוח – הצטרף אליי',
        text: `הצטרף למעגל שלי. קוד: ${circleId}`,
        url: inviteLink,
      });
    } catch {
      handleCopy();
    }
  };

  const handleLeaveCircle = async () => {
    if (!user || !circleId) return;
    if (
      !window.confirm(
        'לצאת מהמעגל? לא תוכל לראות את הסטטוס של החברים עד שתצטרף שוב עם קוד.'
      )
    )
      return;
    await removeCircleFromUser(user.uid, circleId);
    navigate('/circles', { replace: true });
  };

  const handleReset = async () => {
    if (!window.confirm('לאפס את כל החברים ל"עדיין לא"? (אירוע חדש)')) return;
    await resetAll();
  };

  const onlyMe = members.length <= 1;
  const displayName = (user?.displayName as string) || (user?.email as string) || 'אני';
  const atLimit = members.length >= MAX_CIRCLE_MEMBERS;
  const allSafe = members.length > 0 && notSafeCount === 0;

  return (
    <div className="page circle">
      <header className="circle-header">
        <h1>המעגל שלי</h1>
        <div className="header-actions-circle">
          <button
            type="button"
            className="btn-theme"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate('/circles')}
            aria-label="חזרה למעגלים"
          >
            ←
          </button>
        </div>
      </header>

      {sosCount > 0 && (
        <div className="alert-sos" role="alert">
          <strong>🆘 {sosCount} אנשים צריכים עזרה!</strong> צרו קשר מיידית.
        </div>
      )}

      {notSafeCount > 0 && sosCount === 0 && (
        <div className="alert-unsafe" role="alert">
          <strong>תשומת לב:</strong> {notSafeCount} אנשים עדיין לא סימנו בטוח.
          {notSafeCount === 1 && ' כדאי לבדוק איתו/איתה.'}
        </div>
      )}

      {allSafe && (
        <div className="alert-all-safe" role="status">
          <strong>כולם בטוחים!</strong> כל {members.length} חברי המעגל סימנו.
        </div>
      )}

      <button type="button" className="btn-emergency" onClick={handleEmergencyMode}>
        🆘 מצב חירום – חיוג למוקד
      </button>

      <div className="card mark-safe-card">
        <p className="mark-safe-label">הסטטוס שלי</p>
        <div className="mark-safe-buttons three-buttons">
          <button type="button" className={`btn-safe ${isSafe ? 'active' : ''}`} onClick={markSafe}>
            אני בטוח/ה
          </button>
          <button type="button" className={`btn-unsafe ${!isSafe && me?.status !== 'sos' ? 'active' : ''}`} onClick={markUnsafe}>
            עדיין לא
          </button>
          <button type="button" className={`btn-sos ${me?.status === 'sos' ? 'active' : ''}`} onClick={markSOS}>
            🆘 צריך עזרה!
          </button>
        </div>
      </div>

      <ShelterTimer />
      <EmergencyContacts />

      <section className="members-section">
        <div className="members-header">
          <h2>חברי המעגל ({members.length})</h2>
          {!loading && (
            <div className="members-header-actions">
              {isOwner && (
                <button type="button" className="btn-reset" onClick={handleReset}>
                  ↻ איפוס
                </button>
              )}
              <button
                type="button"
                className="btn-reset"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="רענן"
              >
                {refreshing ? '...' : '↻'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <SkeletonCircle />
        ) : !loading && members.length > 1 ? (
          <MembersSummary members={members} />
        ) : null}

        {!loading && members.length > 3 && (
          <div className="members-toolbar">
            <input
              type="search"
              className="search-input"
              placeholder="חיפוש לפי שם..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              dir="rtl"
            />
            <div className="toolbar-row">
              <div className="filter-buttons">
                <button
                  type="button"
                  className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterMode('all')}
                >
                  הכל ({members.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn safe-filter ${filterMode === 'safe' ? 'active' : ''}`}
                  onClick={() => setFilterMode('safe')}
                >
                  בטוחים ({members.filter((m) => m.isSafe).length})
                </button>
                <button
                  type="button"
                  className={`filter-btn unsafe-filter ${filterMode === 'unsafe' ? 'active' : ''}`}
                  onClick={() => setFilterMode('unsafe')}
                >
                  ממתינים ({members.filter((m) => !m.isSafe).length})
                </button>
              </div>
              <select
                className="sort-select"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                dir="rtl"
                aria-label="מיון לפי"
              >
                <option value="status">מיון: סטטוס</option>
                <option value="name">מיון: שם</option>
                <option value="time">מיון: זמן עדכון</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonCircle />
        ) : onlyMe ? (
          <div className="empty-state card">
            <p>עדיין אין חברים במעגל.</p>
            <p className="hint">
              שתף את הקוד או הקישור למטה כדי שהחברים יוכלו להצטרף, או הוסף אותם לפי טלפון.
            </p>
          </div>
        ) : (
          <div className="members-list" role="list" aria-label="רשימת חברים">
            {filteredAndSorted.length === 0 ? (
              <p className="no-results">לא נמצאו תוצאות</p>
            ) : (
              filteredAndSorted.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isMe={m.userId === user?.uid}
                  isOwner={isOwner}
                  onRemove={handleRemoveMember}
                />
              ))
            )}
          </div>
        )}
      </section>

      {user ? (
        <CircleChat
          circleId={circleId}
          userId={user.uid}
          displayName={displayName}
          onNewMessage={handleNewMessage}
        />
      ) : null}

      <div className="card">
        <button type="button" className="btn-location" onClick={handleShareLocation}>
          📍 שלח את המיקום שלי
        </button>
      </div>

      <EquipmentChecklist />

      <section className="invite-section card">
        <h3>הזמנת חברים</h3>
        <p>שלח את הקישור או הקוד לחברים כדי שיוכלו להצטרף:</p>
        <div className="invite-code" aria-label="קוד הזמנה">
          {circleId}
        </div>
        <div className="invite-actions">
          {canShare && (
            <button type="button" className="btn-copy" onClick={handleShare}>
              שתף
            </button>
          )}
          <button type="button" className="btn-copy" onClick={handleCopy}>
            העתק קישור
          </button>
        </div>
        {copyToast && (
          <p className="toast" role="status">
            הועתק!
          </p>
        )}
        {!atLimit && (
          <button type="button" className="btn-add" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'ביטול' : 'הוסף לפי טלפון'}
          </button>
        )}
        {atLimit && <p className="hint">המעגל מלא (עד {MAX_CIRCLE_MEMBERS} חברים)</p>}
        {showAdd && (
          <form onSubmit={handleAddMember} className="add-form" noValidate>
            <input
              type="text"
              placeholder="שם"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              dir="rtl"
              maxLength={50}
            />
            <input
              type="tel"
              placeholder="טלפון (למשל 050-1234567)"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              dir="ltr"
              maxLength={20}
            />
            {addError && (
              <p className="error" role="alert">
                {addError}
              </p>
            )}
            <button type="submit" disabled={addLoading}>{addLoading ? 'מוסיף...' : 'הוסף'}</button>
          </form>
        )}
        <button type="button" className="btn-leave" onClick={handleLeaveCircle}>
          יציאה מהמעגל
        </button>
      </section>
    </div>
  );
}
