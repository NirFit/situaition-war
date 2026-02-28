import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validatePassword, validateDisplayName, validatePhone, validateCity, validateLocation, validateAddress, sanitizeText } from '../lib/validation';

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }

    const nameErr = validateDisplayName(displayName);
    if (nameErr) { setError(nameErr); return; }

    const passErr = validatePassword(password);
    if (passErr) { setError(passErr); return; }

    if (password !== confirmPassword) {
      setError('הסיסמאות לא תואמות');
      return;
    }

    const phoneErr = validatePhone(phone);
    if (phoneErr) { setError(phoneErr); return; }

    const cityErr = validateCity(city);
    if (cityErr) { setError(cityErr); return; }

    const locationErr = validateLocation(location);
    if (locationErr) { setError(locationErr); return; }

    const addressErr = validateAddress(address);
    if (addressErr) { setError(addressErr); return; }

    setLoading(true);
    setError('');
    try {
      await signUp(email.trim(), password, sanitizeText(displayName), phone.trim(), {
        city: sanitizeText(city),
        location: sanitizeText(location),
        address: sanitizeText(address),
      });
      navigate('/circles', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <h1>הרשמה</h1>
      <p className="tagline">צור חשבון עם אימייל וסיסמה</p>
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
          <span>שם (איך שיראו אותך במעגלים)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="למשל: דני"
            autoComplete="name"
            dir="rtl"
            maxLength={50}
          />
        </label>
        <label>
          <span>מספר טלפון (ליצירת קשר)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-1234567"
            autoComplete="tel"
            dir="ltr"
            maxLength={20}
          />
        </label>
        <label>
          <span>עיר</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="למשל: תל אביב"
            autoComplete="address-level2"
            dir="rtl"
            maxLength={80}
          />
        </label>
        <label>
          <span>מיקום / שכונה</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="למשל: רמת גן, צפון"
            dir="rtl"
            maxLength={80}
          />
        </label>
        <label>
          <span>כתובת</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="רחוב, מספר בית"
            autoComplete="street-address"
            dir="rtl"
            maxLength={150}
          />
        </label>
        <label>
          <span>סיסמה (לפחות 6 תווים)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          <span>אימות סיסמה</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'נרשם...' : 'הירשם'}
        </button>
      </form>
      <nav className="links">
        <button type="button" className="link" onClick={() => navigate('/login')}>
          כבר יש לך חשבון? התחבר
        </button>
      </nav>
    </div>
  );
}
