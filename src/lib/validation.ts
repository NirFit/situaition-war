const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\-+() ]{7,20}$/;
const MAX_NAME_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 200);
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'נא להזין אימייל';
  if (trimmed.length > MAX_EMAIL_LENGTH) return 'כתובת אימייל ארוכה מדי';
  if (!EMAIL_RE.test(trimmed)) return 'כתובת אימייל לא תקינה';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'נא להזין סיסמה';
  if (password.length < 6) return 'הסיסמה חייבת לכלול לפחות 6 תווים';
  if (password.length > 128) return 'הסיסמה ארוכה מדי';
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length > MAX_NAME_LENGTH) return 'השם ארוך מדי (עד 50 תווים)';
  return null;
}

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return 'נא להזין מספר טלפון';
  if (!PHONE_RE.test(trimmed)) return 'מכיל תווים לא חוקיים';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 10) return 'מספר טלפון לא תקין';
  if (digits.length === 9 && !/^[2-9]/.test(digits)) return 'מספר טלפון לא תקין';
  if (digits.length === 10 && digits[0] !== '0') return 'מספר טלפון לא תקין';
  return null;
}

const MAX_ADDRESS_LENGTH = 150;
const MAX_CITY_LENGTH = 80;

export function validateAddress(address: string): string | null {
  const trimmed = address.trim();
  if (trimmed.length > MAX_ADDRESS_LENGTH) return `הכתובת ארוכה מדי (עד ${MAX_ADDRESS_LENGTH} תווים)`;
  return null;
}

export function validateCity(city: string): string | null {
  const trimmed = city.trim();
  if (trimmed.length > MAX_CITY_LENGTH) return `שם העיר ארוך מדי (עד ${MAX_CITY_LENGTH} תווים)`;
  return null;
}

export function validateLocation(location: string): string | null {
  const trimmed = location.trim();
  if (trimmed.length > MAX_CITY_LENGTH) return `המיקום ארוך מדי (עד ${MAX_CITY_LENGTH} תווים)`;
  return null;
}

export function validateInviteCode(code: string): string | null {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return 'נא להזין קוד';
  if (trimmed.length !== 6) return 'הקוד חייב להכיל 6 תווים';
  if (!/^[A-Z0-9]{6}$/.test(trimmed)) return 'הקוד מכיל תווים לא חוקיים';
  return null;
}
