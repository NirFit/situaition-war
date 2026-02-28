const CONTACTS = [
  { name: 'מד"א', phone: '101', icon: '🚑' },
  { name: 'משטרה', phone: '100', icon: '🚔' },
  { name: 'כיבוי', phone: '102', icon: '🚒' },
  { name: 'פיקוד העורף', phone: '104', icon: '🛡️' },
  { name: 'עזרה ראשונה', phone: '1221', icon: '🏥' },
];

export function EmergencyContacts() {
  return (
    <section className="emergency-section card">
      <h3>מוקדי חירום</h3>
      <div className="emergency-grid">
        {CONTACTS.map((c) => (
          <a key={c.phone} href={`tel:${c.phone}`} className="emergency-btn">
            <span className="em-icon">{c.icon}</span>
            <span className="em-name">{c.name}</span>
            <span className="em-phone">{c.phone}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
