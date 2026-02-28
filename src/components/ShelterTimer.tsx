import { useState, useEffect, useRef } from 'react';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ShelterTimer() {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = Date.now() - elapsed * 1000;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const handleToggle = () => {
    if (active) {
      setActive(false);
    } else {
      setElapsed(0);
      startRef.current = Date.now();
      setActive(true);
    }
  };

  return (
    <section className="shelter-timer card">
      <h3>טיימר ממ"ד</h3>
      {active ? (
        <>
          <div className="timer-display">{formatDuration(elapsed)}</div>
          <p className="timer-hint">אתה בממ"ד. הישאר עד שפיקוד העורף יאשר יציאה.</p>
          <button type="button" className="btn-timer-stop" onClick={handleToggle}>
            יצאתי מהממ"ד
          </button>
        </>
      ) : (
        <>
          <p className="timer-hint">לחץ כשנכנסת לממ"ד כדי לעקוב אחרי הזמן.</p>
          <button type="button" className="btn-timer-start" onClick={handleToggle}>
            נכנסתי לממ"ד
          </button>
        </>
      )}
    </section>
  );
}
