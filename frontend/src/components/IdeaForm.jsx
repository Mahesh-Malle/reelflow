import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { Plus, Link, X, Clock, Calendar as CalIcon, AlertCircle } from 'lucide-react';
import TagSelectorModal from './TagSelectorModal';

const IdeaForm = ({ onSuccess, onCancel }) => {
  const { activeChannel, API_URL, hasPermission, user } = useApp();
  const [contentCategories, setContentCategories] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [hookTypes, setHookTypes] = useState([]);
  const [analyticsMap, setAnalyticsMap] = useState({ categories: {}, contentTypes: {}, hookTypes: {} });
  const [openModal, setOpenModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newIdea, setNewIdea] = useState({
    title: '', plannedDate: '', plannedTime: '',
    contentCategories: [], contentTypes: [], hookTypes: [],
    references: [], notes: '',
    needScript: false,
  });

  const canEdit = hasPermission('EDIT_PLANNER');

  useEffect(() => {
    if (activeChannel) {
      fetchData();
    }
  }, [activeChannel]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const id = activeChannel._id;
      const [c1, c2, c3, catAn, typeAn, hookAn] = await Promise.all([
        axios.get(`${API_URL}/categories?channelId=${id}&type=CONTENT_CATEGORY`),
        axios.get(`${API_URL}/categories?channelId=${id}&type=CONTENT_TYPE`),
        axios.get(`${API_URL}/categories?channelId=${id}&type=HOOK_TYPE`),
        axios.get(`${API_URL}/analytics/categories?channelId=${id}`),
        axios.get(`${API_URL}/analytics/content-types?channelId=${id}`),
        axios.get(`${API_URL}/analytics/hook-types?channelId=${id}`),
      ]);

      setContentCategories(c1.data);
      setContentTypes(c2.data);
      setHookTypes(c3.data);

      const toMap = (arr) => {
        const m = {};
        arr.forEach(d => { if (d._id) m[d._id] = d; });
        return m;
      };

      setAnalyticsMap({
        categories: toMap(catAn.data),
        contentTypes: toMap(typeAn.data),
        hookTypes: toMap(hookAn.data),
      });
    } catch (error) {
      console.error('Error fetching data for IdeaForm:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!newIdea.title) { alert('Title is required!'); return; }
    try {
      await axios.post(`${API_URL}/videos`, { ...newIdea, channelId: activeChannel._id });
      onSuccess();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving content: ' + error.message);
    }
  };

  const isValidUrl = (url) => { try { new URL(url); return true; } catch { return false; } };
  const addRef = () => setNewIdea(p => ({ ...p, references: [...p.references, { url: '', note: '' }] }));
  const updateRef = (idx, field, val) => setNewIdea(p => {
    const refs = [...p.references];
    refs[idx] = { ...refs[idx], [field]: val };
    return { ...p, references: refs };
  });
  const removeRef = (idx) => setNewIdea(p => ({ ...p, references: p.references.filter((_, i) => i !== idx) }));

  const LOW_DATA = 10_000;
  const perfConv = (d) => d && (d.totalViews || 0) >= LOW_DATA
    ? ((d.totalSubs || 0) + (d.totalFollowers || 0)) / d.totalViews * 1000
    : -1;
  const perfViews = (d) => d?.totalViews || 0;

  const sortByPerf = (options, map) =>
    [...options].sort((a, b) => {
      const da = map[a._id], db = map[b._id];
      const ca = perfConv(da), cb = perfConv(db);
      if (ca !== cb) return cb - ca;
      const va = perfViews(da), vb = perfViews(db);
      if (va !== vb) return vb - va;
      return a.name.localeCompare(b.name);
    });

  const getBadge = (optId, map) => {
    const entries = Object.entries(map).filter(([, d]) => (d?.totalViews || 0) >= LOW_DATA);
    if (entries.length === 0) return '';
    const topViewId = entries.reduce((best, [id, d]) => perfViews(d) > perfViews(map[best]) ? id : best, entries[0][0]);
    const topConvId = entries.reduce((best, [id, d]) => perfConv(d) > perfConv(map[best]) ? id : best, entries[0][0]);
    let badge = '';
    if (optId === topViewId) badge += '🔥';
    if (optId === topConvId && perfConv(map[optId]) > 0) badge += '🚀';
    return badge;
  };

  const renderTagSelector = (label, options, selectedIds, modalKey, accentColor, onApply) => {
    if (options.length === 0) return (
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.875rem' }}>{label}</label>
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No options yet — add some in Category Master.</p>
      </div>
    );

    const map = analyticsMap[modalKey] || {};
    const sorted = sortByPerf(options, map);
    const INLINE_LIMIT = 4;
    const inlineOpts = sorted.slice(0, INLINE_LIMIT);
    const inlineIdSet = new Set(inlineOpts.map(o => o._id));
    const hiddenCount = Math.max(0, options.length - INLINE_LIMIT);
    const extraSelected = options.filter(o => !inlineIdSet.has(o._id) && selectedIds.includes(o._id));
    const toggle = (id) =>
      onApply(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

    return (
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.45rem' }}>{label}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          {inlineOpts.map(opt => {
            const active = selectedIds.includes(opt._id);
            const badge = getBadge(opt._id, map);
            return (
              <button key={opt._id} type="button" onClick={() => toggle(opt._id)} style={{
                padding: '0.28rem 0.75rem', borderRadius: '1rem',
                border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.15)'}`,
                background: active ? `${accentColor}28` : 'rgba(255,255,255,0.04)',
                color: active ? 'white' : '#94a3b8', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: active ? '600' : '400',
                transition: 'border-color 0.1s, background 0.1s, color 0.1s',
              }}>
                {badge && <span style={{ marginRight: '0.25rem' }}>{badge}</span>}{opt.name}
              </button>
            );
          })}
          {extraSelected.map(opt => (
            <button key={opt._id} type="button" onClick={() => toggle(opt._id)} style={{
              padding: '0.28rem 0.55rem 0.28rem 0.75rem', borderRadius: '1rem',
              border: `1px solid ${accentColor}`, background: `${accentColor}28`,
              color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              {opt.name} <X size={11} />
            </button>
          ))}
          {hiddenCount > 0 && (
            <button type="button" onClick={() => setOpenModal(modalKey)} style={{
              padding: '0.28rem 0.75rem', borderRadius: '1rem',
              border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent',
              color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap',
            }}>
              + {hiddenCount} more
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!activeChannel) return (
    <div className="stat-card" style={{ textAlign: 'center', padding: '2rem' }}>
       <AlertCircle size={24} color="var(--warning)" style={{ marginBottom: '1rem' }} />
       <p>Select a channel first to create an idea.</p>
    </div>
  );

  if (loading) return (
    <div className="stat-card" style={{ textAlign: 'center', padding: '2rem' }}>
       <p style={{ color: 'var(--text-muted)' }}>Loading categories...</p>
    </div>
  );

  return (
    <form className="stat-card" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Adding to: <strong style={{ color: 'white' }}>{activeChannel.name}</strong></p>
      </div>
      <div className="form-group">
        <label>Title</label>
        <input type="text" required placeholder="e.g., How to build a website"
          value={newIdea.title} onChange={e => setNewIdea({ ...newIdea, title: e.target.value })} />
      </div>

      {renderTagSelector('Content Categories', contentCategories, newIdea.contentCategories, 'categories', '#6366f1',
        ids => setNewIdea(p => ({ ...p, contentCategories: ids })))}
      {renderTagSelector('Content Types', contentTypes, newIdea.contentTypes, 'contentTypes', '#ec4899',
        ids => setNewIdea(p => ({ ...p, contentTypes: ids })))}
      {renderTagSelector('Hook Types', hookTypes, newIdea.hookTypes, 'hookTypes', '#22c55e',
        ids => setNewIdea(p => ({ ...p, hookTypes: ids })))}

      <div className="form-group">
        <label>Notes / Script <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>(optional)</span></label>
        <textarea rows={5} placeholder="Write your hook, flow, or full script here..."
          value={newIdea.notes} onChange={e => setNewIdea({ ...newIdea, notes: e.target.value })}
          style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.4rem', color: 'white', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Link size={14} /> References
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>(optional)</span>
          </label>
          <button type="button" onClick={addRef} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: 'var(--primary)', padding: '0.3rem 0.75rem', borderRadius: '0.35rem', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Plus size={13} /> Add Reference
          </button>
        </div>
        {newIdea.references.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {newIdea.references.map((ref, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.4rem', padding: '0.75rem', position: 'relative' }}>
                <button type="button" onClick={() => removeRef(idx)} style={{ position: 'absolute', right: '0.5rem', top: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', zIndex: 1 }} title="Remove reference">
                  <X size={16} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '1.5rem' }}>
                  <input type="url" placeholder="https://example.com" value={ref.url}
                    onChange={e => updateRef(idx, 'url', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: `1px solid ${ref.url && !isValidUrl(ref.url) ? '#ef4444' : 'rgba(255,255,255,0.12)'}`, borderRadius: '0.3rem', color: 'white', fontSize: '0.85rem', outline: 'none' }} />
                  {ref.url && !isValidUrl(ref.url) && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Invalid URL</span>}
                  <input type="text" placeholder="Note (optional)" value={ref.note}
                    onChange={e => updateRef(idx, 'note', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.3rem', color: 'white', fontSize: '0.82rem', outline: 'none' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user?.isAdmin && (
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.75rem', borderRadius: '0.5rem', background: newIdea.needScript ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${newIdea.needScript ? '#ec4899' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s' }}>
            <input
              type="checkbox"
              checked={newIdea.needScript}
              onChange={e => setNewIdea({ ...newIdea, needScript: e.target.checked })}
              style={{ width: '1.2rem', height: '1.2rem', accentColor: '#ec4899' }}
            />
            <span style={{ fontSize: '0.9rem', color: newIdea.needScript ? 'white' : 'var(--text-muted)', fontWeight: newIdea.needScript ? '600' : '400' }}>
              Need Script? <span style={{ fontSize: '0.75rem', marginLeft: '0.2rem', opacity: 0.8 }}>(Script Writer will see this)</span>
            </span>
          </label>
        </div>
      )}

      <div className="responsive-grid">
        <div className="form-group">
          <label>Planned Date</label>
          <input type="date" value={newIdea.plannedDate} onChange={e => setNewIdea({ ...newIdea, plannedDate: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Planned Time</label>
          <input type="time" value={newIdea.plannedTime} onChange={e => setNewIdea({ ...newIdea, plannedTime: e.target.value })} />
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
        💡 If you add a date, this becomes "Planned". Without a date, it's an "Idea".
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button type="submit" className="btn btn-primary">Save to Planner</button>
        <button type="button" onClick={onCancel} className="btn" style={{ background: '#334155' }}>Cancel</button>
      </div>

      {openModal === 'categories' && (
        <TagSelectorModal title="Content Categories" options={contentCategories}
          selected={newIdea.contentCategories} accentColor="#6366f1"
          onApply={ids => setNewIdea(p => ({ ...p, contentCategories: ids }))}
          onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'contentTypes' && (
        <TagSelectorModal title="Content Types" options={contentTypes}
          selected={newIdea.contentTypes} accentColor="#ec4899"
          onApply={ids => setNewIdea(p => ({ ...p, contentTypes: ids }))}
          onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'hookTypes' && (
        <TagSelectorModal title="Hook Types" options={hookTypes}
          selected={newIdea.hookTypes} accentColor="#22c55e"
          onApply={ids => setNewIdea(p => ({ ...p, hookTypes: ids }))}
          onClose={() => setOpenModal(null)} />
      )}
    </form>
  );
};

export default IdeaForm;
