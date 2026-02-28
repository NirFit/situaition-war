import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { joinCircle } from '../hooks/useCircle';
import { validateInviteCode, sanitizeText } from '../lib/validation';

export function JoinCircle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') ?? '';
  const { user, userPhone } = useAuth();
  const [code, setCode] = useState(codeFromUrl.toUpperCase());
  const displayName = (user?.displayName as string) || (user?.email as string) || '';
  const [name, setName] = useState(displayName);

  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl.toUpperCase());
  }, [codeFromUrl]);

  useEffect(() => {
    if (displayName) setName(displayName);
  }, [displayName]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const n = sanitizeText(name);

    const codeErr = validateInviteCode(c);
    if (codeErr) { setError(codeErr); return; }
    if (!n) { setError('נא להזין שם'); return; }
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const circleId = await joinCircle(c, user.uid, n, userPhone ?? undefined);
      if (!circleId) {
        setError('קוד לא תקין. בדוק ונסה שוב.');
        setLoading(false);
        return;
      }
      navigate(`/circle/${circleId}`);
    } catch {
      setError('שגיאה בהצטרפות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page join">
      <h1>הצטרף למעגל</h1>
      <p className="tagline">הזן את קוד המעגל שקיבלת</p>
      <form onSubmit={handleJoin} className="card" noValidate>
        <label>
          <span>קוד המעגל (6 תווים)</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            dir="ltr"
            className="code-input"
            autoComplete="off"
          />
        </label>
        <label>
          <span>השם שלך</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="למשל: דני"
            dir="rtl"
            maxLength={50}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'מצטרף...' : 'הצטרף'}
        </button>
      </form>
      <nav className="links">
        <button type="button" className="link" onClick={() => navigate('/circles')}>
          חזרה למעגלים שלי
        </button>
      </nav>
    </div>
  );
}
