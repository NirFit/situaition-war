/** Israeli phone: 050-1234567 or 0501234567 */
const IL_PHONE_RE = /^0(5[0-9]|7[0-9]|2|3|4|8|9)[-]?\d{7}$/;

export function isValidIsraeliPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 9) return false;
  return IL_PHONE_RE.test('0' + digits);
}

export function formatIsraeliPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10 && digits[0] === '0') return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return phone;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
