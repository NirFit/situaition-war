import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail } from '../lib/validation';

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    if (!password) { setError('נא להזין סיסמה'); return; }

    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      navigate('/circles', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <h1>התחברות</h1>
      <p className="tagline">התחבר עם המייל והסיסמה שלך</p>
      <form onSubmit={handleSubmit} className="card" noValidate>
        <label>
          <span>אימייל</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            autoComplete="email"
            dir="ltr"
            required
          />
        </label>
        <label>
          <span>סיסמה</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>
      <nav className="links">
        <button type="button" className="link" onClick={() => navigate('/register')}>
          אין לך חשבון? הירשם
        </button>
      </nav>
    </div>
  );
}
