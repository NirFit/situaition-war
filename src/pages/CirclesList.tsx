import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyCircles, createCircle, getCircleSummary, type MyCircleInfo } from '../hooks/useCircle';
import { sanitizeText } from '../lib/validation';
import { useTheme } from '../contexts/ThemeContext';

const CIRCLE_NAME_OPTIONS = [
  { value: 'משפחה', label: 'משפחה' },
  { value: 'חברים', label: 'חברים' },
  { value: 'עבודה', label: 'עבודה' },
  { value: 'שכנים', label: 'שכנים' },
  { value: 'אחר', label: 'אחר (להזין שם)' },
];

const CIRCLE_ICONS: Record<string, string> = {
  משפחה: '👨‍👩‍👧‍👦',
  חברים: '👫',
  עבודה: '💼',
  שכנים: '🏘️',
  אחר: '●',
};

export function CirclesList() {
  const navigate = useNavigate();
  const { user, userPhone, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [circles, setCircles] = useState<MyCircleInfo[]>([]);
  const [summaries, setSummaries] = useState<Record<string, { total: number; safe: number; sos: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCustomName, setNewCustomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyCircles(user.uid)
      .then(async (data) => {
        if (cancelled) return;
        setCircles(data);
        const sums: Record<string, { total: number; safe: number; sos: number }> = {};
        await Promise.all(
          data.map(async (c) => {
            try {
              const s = await getCircleSummary(c.circleId);
              if (!cancelled) sums[c.circleId] = s;
            } catch {
              /* ignore */
            }
          })
        );
        if (!cancelled) setSummaries(sums);
      })
      .catch(() => { if (!cancelled) setError('שגיאה בטעינת המעגלים'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const displayName = (user?.displayName as string) || (user?.email as string) || 'אני';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const nameToUse = newName === 'אחר'
      ? sanitizeText(newCustomName)
      : newName;
    if (!nameToUse) {
      setError('נא לבחור או להזין שם למעגל');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const { circleId } = await createCircle(user.uid, displayName, nameToUse, userPhone ?? undefined);
      setShowNew(false);
      setNewName('');
      setNewCustomName('');
      setCircles((prev) => [...prev, { circleId, name: nameToUse }]);
      navigate(`/circle/${circleId}`);
    } catch {
      setError('שגיאה ביצירת מעגל');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page circles-list">
      <header className="list-header">
        <h1>המעגלים שלי</h1>
        <p className="tagline">שלום {displayName}</p>
        <div className="header-actions">
          <button type="button" className="btn-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="btn-profile" onClick={() => navigate('/profile')} aria-label="עריכת פרופיל">
            פרופיל
          </button>
          <button type="button" className="btn-signout" onClick={() => signOut()} aria-label="התנתק">
            התנתק
          </button>
        </div>
      </header>

      {loading ? (
        <p className="loading">טוען...</p>
      ) : circles.length === 0 && !showNew ? (
        <div className="card empty-card">
          <p>עדיין אין לך מעגלים.</p>
          <p className="hint">צור מעגל (משפחה, חברים וכו') או הצטרף עם קוד.</p>
          <button type="button" className="btn-primary" onClick={() => setShowNew(true)}>
            צור מעגל ראשון
          </button>
        </div>
      ) : (
        <>
          <div className="circles-grid">
            {circles.map((c) => {
              const s = summaries[c.circleId];
              const hasSos = s && s.sos > 0;
              const icon = CIRCLE_ICONS[c.name] ?? '●';
              return (
                <button
                  key={c.circleId}
                  type="button"
                  className={`circle-card ${hasSos ? 'has-sos' : ''}`}
                  onClick={() => navigate(`/circle/${c.circleId}`)}
                >
                  <span className="circle-icon">{icon}</span>
                  <span className="circle-name">{c.name}</span>
                  {s && (
                    <span className="circle-summary">
                      <span className="cs-safe">{s.safe}/{s.total}</span>
                      {hasSos && <span className="cs-sos"> 🆘{s.sos}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn-new-circle" onClick={() => setShowNew(true)}>
            + צור מעגל חדש
          </button>
        </>
      )}

      {showNew && (
        <div className="card create-card">
          <h2>מעגל חדש</h2>
          <form onSubmit={handleCreate}>
            <label>
              <span>סוג המעגל</span>
              <select
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                dir="rtl"
              >
                <option value="">בחר...</option>
                {CIRCLE_NAME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            {newName === 'אחר' && (
              <label>
                <span>שם המעגל</span>
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="למשל: חוג הורים"
                  dir="rtl"
                  maxLength={50}
                />
              </label>
            )}
            {error && <p className="error" role="alert">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowNew(false); setError(''); }}>
                ביטול
              </button>
              <button type="submit" disabled={creating}>
                {creating ? 'יוצר...' : 'צור מעגל'}
              </button>
            </div>
          </form>
        </div>
      )}

      <nav className="links">
        <button type="button" className="link" onClick={() => navigate('/join')}>
          יש לי קוד – הצטרף למעגל
        </button>
      </nav>
    </div>
  );
}
