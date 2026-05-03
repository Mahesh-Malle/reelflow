import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Save, Trash2, CheckCircle, Zap, Plus, Link, X } from 'lucide-react';
import TagSelectorModal from './TagSelectorModal';

const IdeaDetail = ({ ideaId, onBack, onRefresh }) => {
  const { API_URL, hasPermission, activeChannel, user } = useApp();
  const [idea, setIdea] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [contentCategories, setContentCategories] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [hookTypes, setHookTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [openModal, setOpenModal] = useState(null);

  const canEdit = hasPermission('EDIT_PLANNER');
  const canDelete = hasPermission('ADMIN') || (idea?.createdBy?._id === user?.userId);
  const canPost = hasPermission('ADMIN');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    fetchIdea();
  }, [ideaId]);

  const fetchIdea = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/videos/${ideaId}?channelId=${activeChannel._id}`);
      setIdea(data);
      setEditData(data);
      
      const [catRes, typeRes, hookRes] = await Promise.all([
        axios.get(`${API_URL}/categories?channelId=${data.channelId}&type=CONTENT_CATEGORY`),
        axios.get(`${API_URL}/categories?channelId=${data.channelId}&type=CONTENT_TYPE`),
        axios.get(`${API_URL}/categories?channelId=${data.channelId}&type=HOOK_TYPE`)
      ]);
      setContentCategories(catRes.data);
      setContentTypes(typeRes.data);
      setHookTypes(hookRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching idea:', error);
      setLoading(false);
    }
  };

  const addReference = () =>
    setEditData(prev => ({ ...prev, references: [...(prev.references || []), { url: '', note: '' }] }));

  const updateReference = (idx, field, value) =>
    setEditData(prev => {
      const refs = [...(prev.references || [])];
      refs[idx] = { ...refs[idx], [field]: value };
      return { ...prev, references: refs };
    });

  const removeReference = (idx) =>
    setEditData(prev => ({ ...prev, references: (prev.references || []).filter((_, i) => i !== idx) }));

  const isValidUrl = (url) => {
    if (!url.trim()) return true;
    try { new URL(url); return true; } catch { return false; }
  };

  const handleSave = async () => {
    if (!canEdit) return;
    const badRef = (editData.references || []).find(r => r.url.trim() && !isValidUrl(r.url));
    if (badRef) {
      showToast('❌ One or more URLs are invalid');
      return;
    }

    try {
      const contentCategoryIds = editData.contentCategories?.map(c => typeof c === 'object' ? c._id : c) || [];
      const contentTypeIds = editData.contentTypes?.map(t => typeof t === 'object' ? t._id : t) || [];
      const hookTypeIds = editData.hookTypes?.map(h => typeof h === 'object' ? h._id : h) || [];
      const cleanRefs = (editData.references || []).filter(r => r.url.trim() || r.note.trim());

      await axios.put(`${API_URL}/videos/${ideaId}?channelId=${activeChannel._id}`, {
        title: editData.title,
        plannedDate: editData.plannedDate,
        plannedTime: editData.plannedTime,
        contentCategories: contentCategoryIds,
        contentTypes: contentTypeIds,
        hookTypes: hookTypeIds,
        references: cleanRefs,
        notes: editData.notes || '',
      });
      setIdea(editData);
      setIsEditing(false);
      onRefresh();
      showToast('✅ Updated successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      showToast('❌ Error saving changes');
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (window.confirm('Delete this idea? This cannot be undone!')) {
      try {
        await axios.delete(`${API_URL}/videos/${ideaId}?channelId=${activeChannel._id}`);
        onRefresh();
        onBack();
      } catch (error) {
        showToast('❌ Error deleting');
      }
    }
  };

  const markPosted = async (skipMetrics = false) => {
    if (!canPost) return;
    let youtubeViews = '0', youtubeSubs = '0', instagramViews = '0', instagramFollowers = '0';
    if (!skipMetrics) {
      youtubeViews = prompt('YouTube Views:', '0');
      if (youtubeViews === null) return;
      youtubeSubs = prompt('YouTube Subscribers Gained:', '0');
      if (youtubeSubs === null) return;
      instagramViews = prompt('Instagram Views:', '0');
      if (instagramViews === null) return;
      instagramFollowers = prompt('Instagram Followers Gained:', '0');
      if (instagramFollowers === null) return;
    }

    try {
      await axios.put(`${API_URL}/videos/${ideaId}?channelId=${activeChannel._id}`, {
        status: 'Posted',
        publishDate: new Date(),
        youtube: {
          views: parseInt(youtubeViews) || 0,
          subscribersGained: parseInt(youtubeSubs) || 0
        },
        instagram: {
          views: parseInt(instagramViews) || 0,
          followersGained: parseInt(instagramFollowers) || 0
        }
      });
      setIdea(prev => ({
        ...prev,
        status: 'Posted',
        publishDate: new Date(),
        youtube: { views: parseInt(youtubeViews) || 0, subscribersGained: parseInt(youtubeSubs) || 0 },
        instagram: { views: parseInt(instagramViews) || 0, followersGained: parseInt(instagramFollowers) || 0 }
      }));
      onRefresh();
      showToast(skipMetrics ? '✅ Quick Posted with 0 metrics!' : '✅ Marked as Posted!');
    } catch (error) {
      showToast('❌ Error: ' + error.message);
    }
  };

  if (loading) return <div><p>Loading...</p></div>;
  if (!idea) return <div><p>Idea not found</p></div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="stat-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Back
          </button>
          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '4px', background: idea.status === 'Planned' ? 'var(--warning)' : idea.status === 'Posted' ? 'var(--success)' : '#334155' }}>
            {idea.status}
          </span>
          {canDelete && (
            <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {!isEditing ? (
          <>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{idea.title}</h2>
            {idea.createdBy && (
                <div style={{ marginTop: '0.4rem' }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: idea.createdBy.isAdmin ? 'var(--primary)' : 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.03)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    Created by: <strong>{idea.createdBy.isAdmin ? 'Admin' : idea.createdBy.name}</strong>
                  </span>
                </div>
              )}
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '1rem' }}>
              {idea.plannedDate && `📅 Planned: ${new Date(idea.plannedDate).toLocaleDateString()}`}
              {idea.plannedTime && ` at ${idea.plannedTime}`}
            </p>

            {/* Display all categories and types */}
            <div style={{ background: 'rgba(99,102,241,0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>📂 Content Details</h4>
              
              {idea.contentCategories && idea.contentCategories.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Categories</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {idea.contentCategories.map(cat => cat && cat.name && (
                      <span key={cat._id} style={{ background: 'rgba(99,102,241,0.3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem' }}>
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {idea.contentTypes && idea.contentTypes.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Content Types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {idea.contentTypes.map(type => type && type.name && (
                      <span key={type._id} style={{ background: 'rgba(236,72,153,0.3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem' }}>
                        {type.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {idea.hookTypes && idea.hookTypes.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Hook Types</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {idea.hookTypes.map(hook => hook && hook.name && (
                      <span key={hook._id} style={{ background: 'rgba(34,197,94,0.3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem' }}>
                        {hook.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {idea.references && idea.references.length > 0 && (
              <div style={{ background: 'rgba(148,163,184,0.07)', border: '1px solid rgba(148,163,184,0.15)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Link size={15} /> References
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {idea.references.map((ref, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      {ref.url && (
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '0.88rem', wordBreak: 'break-all', textDecoration: 'none' }}
                          onMouseOver={e => e.target.style.textDecoration = 'underline'}
                          onMouseOut={e => e.target.style.textDecoration = 'none'}
                        >
                          {ref.url}
                        </a>
                      )}
                      {ref.note && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: ref.url ? '0.5rem' : 0 }}>
                          {ref.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {idea.notes && (
              <div style={{ background: 'rgba(148,163,184,0.07)', border: '1px solid rgba(148,163,184,0.15)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '0.6rem', fontSize: '0.9rem' }}>📝 Notes / Script</h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{idea.notes}</p>
              </div>
            )}

            {idea.status === 'Posted' && (
              <div style={{ background: 'rgba(34,197,94,0.1)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>📊 Performance</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>YouTube Views</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{idea.youtube?.views || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>YouTube Subs Gained</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{idea.youtube?.subscribersGained || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Instagram Views</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{idea.instagram?.views || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Instagram Followers</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{idea.instagram?.followersGained || 0}</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              {idea.status !== 'Posted' && (
                <>
                  {canEdit && (
                    <button onClick={() => setIsEditing(true)} className="btn btn-primary">Edit</button>
                  )}
                  {canPost && (
                    <>
                      <button onClick={() => markPosted(false)} className="btn" style={{ background: 'var(--success)' }}>
                        <CheckCircle size={16} /> Mark Posted
                      </button>
                      <button onClick={() => markPosted(true)} className="btn" style={{ background: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Post with 0 metrics">
                        <Zap size={16} /> Quick Post
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Planned Date</label>
                <input
                  type="date"
                  value={editData.plannedDate ? new Date(editData.plannedDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, plannedDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Planned Time</label>
                <input
                  type="time"
                  value={editData.plannedTime || ''}
                  onChange={(e) => setEditData({ ...editData, plannedTime: e.target.value })}
                />
              </div>
            </div>

            {/* Tag selectors — inline top options + "+ N more" modal */}
            {[
              { label: 'Categories',    options: contentCategories, field: 'contentCategories', modal: 'categories',   accent: '#6366f1' },
              { label: 'Content Types', options: contentTypes,      field: 'contentTypes',      modal: 'contentTypes', accent: '#ec4899' },
              { label: 'Hook Types',    options: hookTypes,         field: 'hookTypes',         modal: 'hookTypes',    accent: '#22c55e' },
            ].map(({ label, options, field, modal, accent }) => {
              const INLINE_LIMIT = 4;
              const selectedIds  = (editData[field] || []).map(x => typeof x === 'object' ? x._id : x);
              // Alphabetical sort (no ideas list available in edit view)
              const sorted       = [...options].sort((a, b) => a.name.localeCompare(b.name));
              const inlineOpts   = sorted.slice(0, INLINE_LIMIT);
              const inlineIdSet  = new Set(inlineOpts.map(o => o._id));
              const hiddenCount  = Math.max(0, options.length - INLINE_LIMIT);
              const extraSelected = options.filter(o => !inlineIdSet.has(o._id) && selectedIds.includes(o._id));

              const toggle = (id) => {
                const next = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
                setEditData(prev => ({ ...prev, [field]: next }));
              };

              if (options.length === 0) return (
                <div key={field} className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem' }}>{label}</label>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No options yet.</p>
                </div>
              );

              return (
                <div key={field} className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.45rem' }}>{label}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    {inlineOpts.map(opt => {
                      const active = selectedIds.includes(opt._id);
                      return (
                        <button key={opt._id} type="button" onClick={() => toggle(opt._id)} style={{
                          padding: '0.28rem 0.75rem', borderRadius: '1rem',
                          border: `1px solid ${active ? accent : 'rgba(255,255,255,0.15)'}`,
                          background: active ? `${accent}28` : 'rgba(255,255,255,0.04)',
                          color: active ? 'white' : '#94a3b8', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: active ? '600' : '400',
                          transition: 'border-color 0.1s, background 0.1s, color 0.1s',
                        }}>
                          {opt.name}
                        </button>
                      );
                    })}
                    {extraSelected.map(opt => (
                      <button key={opt._id} type="button" onClick={() => toggle(opt._id)} style={{
                        padding: '0.28rem 0.55rem 0.28rem 0.75rem', borderRadius: '1rem',
                        border: `1px solid ${accent}`, background: `${accent}28`,
                        color: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        {opt.name} <X size={11} />
                      </button>
                    ))}
                    {hiddenCount > 0 && (
                      <button type="button" onClick={() => setOpenModal(modal)} style={{
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
            })}

            {/* Notes */}
            <div className="form-group">
              <label>Notes / Script <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>(optional)</span></label>
              <textarea
                rows={6}
                placeholder="Write your hook, flow, or full script here..."
                value={editData.notes || ''}
                onChange={e => setEditData({ ...editData, notes: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.4rem', color: 'white', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.6', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* References */}
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Link size={14} /> References
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={addReference}
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: 'var(--primary)', padding: '0.3rem 0.75rem', borderRadius: '0.35rem', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={13} /> Add Reference
                </button>
              </div>

              {(editData.references || []).length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No references yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {(editData.references || []).map((ref, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'start', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.4rem', padding: '0.6rem 0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <input
                          type="url"
                          placeholder="https://example.com"
                          value={ref.url}
                          onChange={e => updateReference(idx, 'url', e.target.value)}
                          style={{ width: '100%', padding: '0.4rem 0.6rem', background: '#0f172a', border: `1px solid ${ref.url && !isValidUrl(ref.url) ? '#ef4444' : 'rgba(255,255,255,0.12)'}`, borderRadius: '0.3rem', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                        {ref.url && !isValidUrl(ref.url) && (
                          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Invalid URL</span>
                        )}
                        <input
                          type="text"
                          placeholder="Note (optional)"
                          value={ref.note}
                          onChange={e => updateReference(idx, 'note', e.target.value)}
                          style={{ width: '100%', padding: '0.4rem 0.6rem', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.3rem', color: 'white', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReference(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginTop: '0.1rem', opacity: 0.7 }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button onClick={handleSave} className="btn btn-primary">
                <Save size={16} /> Save Changes
              </button>
              <button onClick={() => { setEditData(idea); setIsEditing(false); }} className="btn" style={{ background: '#334155' }}>Cancel</button>
            </div>
          </>
        )}
      </div>

      {openModal === 'categories' && (
        <TagSelectorModal
          title="Content Categories"
          options={contentCategories}
          selected={(editData.contentCategories || []).map(x => typeof x === 'object' ? x._id : x)}
          accentColor="#6366f1"
          onApply={ids => setEditData(p => ({ ...p, contentCategories: ids }))}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'contentTypes' && (
        <TagSelectorModal
          title="Content Types"
          options={contentTypes}
          selected={(editData.contentTypes || []).map(x => typeof x === 'object' ? x._id : x)}
          accentColor="#ec4899"
          onApply={ids => setEditData(p => ({ ...p, contentTypes: ids }))}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'hookTypes' && (
        <TagSelectorModal
          title="Hook Types"
          options={hookTypes}
          selected={(editData.hookTypes || []).map(x => typeof x === 'object' ? x._id : x)}
          accentColor="#22c55e"
          onApply={ids => setEditData(p => ({ ...p, hookTypes: ids }))}
          onClose={() => setOpenModal(null)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: toast.includes('✅') ? 'var(--success)' : '#ef4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          zIndex: 999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default IdeaDetail;
