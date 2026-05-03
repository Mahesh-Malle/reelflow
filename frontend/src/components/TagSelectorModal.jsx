import React, { useState, useMemo } from 'react';
import { X, Check, Search } from 'lucide-react';

const TagSelectorModal = ({ title, options, selected, accentColor, onApply, onClose }) => {
  const [localSelected, setLocalSelected] = useState([...selected]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const toggle = (id) =>
    setLocalSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
      <div className="stat-card" style={{ width: '90%', maxWidth: '460px', maxHeight: '78vh', display: 'flex', flexDirection: 'column', padding: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.35rem', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Options */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem 0.75rem' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>No options found</p>
          ) : filtered.map(opt => {
            const active = localSelected.includes(opt._id);
            return (
              <div
                key={opt._id}
                onClick={() => toggle(opt._id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.6rem', borderRadius: '0.4rem', cursor: 'pointer', background: active ? `${accentColor}18` : 'transparent', transition: 'background 0.1s', marginBottom: '0.1rem', userSelect: 'none' }}
              >
                <div style={{ width: 17, height: 17, borderRadius: '0.25rem', border: `2px solid ${active ? accentColor : 'rgba(255,255,255,0.22)'}`, background: active ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                  {active && <Check size={11} color="white" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: '0.9rem', color: active ? 'white' : '#cbd5e1' }}>{opt.name}</span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {localSelected.length} selected
          </span>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={onClose}
              style={{ background: '#334155', border: 'none', color: 'white', padding: '0.5rem 1.1rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              onClick={() => { onApply(localSelected); onClose(); }}
              style={{ background: accentColor, border: 'none', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagSelectorModal;
