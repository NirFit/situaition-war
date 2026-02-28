/** מחזיר טקסט עברי כמו "לפני 2 דקות" או "עכשיו" */
export function formatRelativeTime(millis: number): string {
  const sec = Math.floor((Date.now() - millis) / 1000);
  if (sec < 10) return 'עכשיו';
  if (sec < 60) return `לפני ${sec} שניות`;
  const min = Math.floor(sec / 60);
  if (min === 1) return 'לפני דקה';
  if (min < 60) return `לפני ${min} דקות`;
  const hour = Math.floor(min / 60);
  if (hour === 1) return 'לפני שעה';
  if (hour < 24) return `לפני ${hour} שעות`;
  const day = Math.floor(hour / 24);
  if (day === 1) return 'אתמול';
  if (day < 7) return `לפני ${day} ימים`;
  return 'לפני יותר משבוע';
}
