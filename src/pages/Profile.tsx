import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile as updateProfileService } from '../lib/profileService';
import { isFirebaseMode } from '../hooks/useCircle';
import { validatePhone, validateDisplayName, validateCity, validateLocation, validateAddress, sanitizeText } from '../lib/validation';

export function Profile() {
  const navigate = useNavigate();
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (userProfile) {
      setDisplayName(userProfile.displayName ?? '');
      setPhone(userProfile.phone ?? '');
      setCity(userProfile.city ?? '');
      setLocation(userProfile.location ?? '');
      setAddress(userProfile.address ?? '');
    } else {
      setDisplayName((user.displayName as string) ?? '');
      setPhone('');
      setCity('');
      setLocation('');
      setAddress('');
    }
  }, [user?.uid, user?.displayName, userProfile?.displayName, userProfile?.phone, userProfile?.city, userProfile?.location, userProfile?.address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const nameErr = validateDisplayName(displayName);
    if (nameErr) { setError(nameErr); return; }

    const phoneErr = validatePhone(phone);
    if (phoneErr) { setError(phoneErr); return; }

    const cityErr = validateCity(city);
    if (cityErr) { setError(cityErr); return; }

    const locationErr = validateLocation(location);
    if (locationErr) { setError(locationErr); return; }

    const addressErr = validateAddress(address);
    if (addressErr) { setError(addressErr); return; }

    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updates = {
        displayName: sanitizeText(displayName),
        phone: phone.replace(/\D/g, ''),
        city: sanitizeText(city),
        location: sanitizeText(location),
        address: sanitizeText(address),
      };
      await updateProfileService(user.uid, updates);
      if (isFirebaseMode() && updates.displayName) {
        const { auth } = await import('../lib/firebase');
        if (auth?.currentUser) {
          await firebaseUpdateProfile(auth.currentUser, { displayName: updates.displayName });
        }
      }
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('שגיאה בעדכון הפרופיל');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (!user && !loading) return null;

  return (
    <div className="page profile-page">
      <header className="profile-header">
        <button type="button" className="btn-back" onClick={() => navigate('/circles')} aria-label="חזרה">
          ←
        </button>
        <h1>עריכת פרופיל</h1>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <label>
          <span>שם (איך שיראו אותך במעגלים)</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="למשל: דני"
            dir="rtl"
            maxLength={50}
          />
        </label>
        <label>
          <span>מספר טלפון</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-1234567"
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
            dir="rtl"
            maxLength={150}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {success && <p className="success" role="status">הפרופיל עודכן בהצלחה</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
      </form>

      <section className="card privacy-section">
        <h3>פרטיות ואבטחה</h3>
        <ul className="privacy-list">
          <li>רק חברי המעגל רואים את הסטטוס וההודעות</li>
          <li>מספר הטלפון מוצג רק לחברי המעגל לצורכי חיוג</li>
          <li>המעגל מוגבל ל־25 חברים</li>
          <li>בעל המעגל יכול להסיר חברים</li>
        </ul>
      </section>
    </div>
  );
}
