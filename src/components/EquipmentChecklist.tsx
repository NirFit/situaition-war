import { useState, useEffect } from 'react';

const KEY = 'safe_circle_equipment';

const DEFAULT_ITEMS = [
  { id: 'water', label: 'בקבוקי מים', checked: false },
  { id: 'meds', label: 'תרופות', checked: false },
  { id: 'docs', label: 'מסמכים חשובים', checked: false },
  { id: 'phone', label: 'טלפון טעון', checked: false },
  { id: 'charger', label: 'מטען', checked: false },
  { id: 'flashlight', label: 'פנס', checked: false },
  { id: 'batteries', label: 'סוללות', checked: false },
  { id: 'firstaid', label: 'ערכת עזרה ראשונה', checked: false },
];

function loadItems(): typeof DEFAULT_ITEMS {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return DEFAULT_ITEMS;
    const parsed = JSON.parse(s) as { id: string; checked: boolean }[];
    return DEFAULT_ITEMS.map((d) => {
      const p = parsed.find((x) => x.id === d.id);
      return { ...d, checked: p?.checked ?? d.checked };
    });
  } catch {
    return DEFAULT_ITEMS;
  }
}

function saveItems(items: typeof DEFAULT_ITEMS) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(items.map(({ id, checked }) => ({ id, checked })))
    );
  } catch {
    /* ignore */
  }
}

export function EquipmentChecklist() {
  const [items, setItems] = useState(loadItems);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const toggle = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  };

  const checked = items.filter((i) => i.checked).length;
  const total = items.length;

  return (
    <section className="equipment-section card">
      <button
        type="button"
        className="equipment-header"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <h3>רשימת ציוד מומלץ</h3>
        <span className="equipment-progress">
          {checked}/{total}
        </span>
        <span className="equipment-toggle">{collapsed ? '▼' : '▲'}</span>
      </button>
      {!collapsed && (
        <ul className="equipment-list">
          {items.map((item) => (
            <li key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggle(item.id)}
                />
                <span className={item.checked ? 'checked' : ''}>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
