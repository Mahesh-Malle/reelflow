import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { X, Save } from 'lucide-react';

const CategoryEditModal = ({ videoId, onClose, onSave }) => {
  const { API_URL, activeChannel } = useApp();
  const [video, setVideo] = useState(null);
  const [contentCategories, setContentCategories] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [hookTypes, setHookTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedHooks, setSelectedHooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [videoId]);

  const fetchData = async () => {
    try {
      const { data: videoData } = await axios.get(`${API_URL}/videos/${videoId}?channelId=${activeChannel._id}`);
      setVideo(videoData);
      
      // Set selected IDs from video data
      setSelectedCategories(videoData.contentCategories?.map(c => typeof c === 'object' ? c._id : c) || []);
      setSelectedTypes(videoData.contentTypes?.map(t => typeof t === 'object' ? t._id : t) || []);
      setSelectedHooks(videoData.hookTypes?.map(h => typeof h === 'object' ? h._id : h) || []);

      // Fetch available categories
      const [catRes, typeRes, hookRes] = await Promise.all([
        axios.get(`${API_URL}/categories?channelId=${activeChannel?._id || videoData.channelId}&type=CONTENT_CATEGORY`),
        axios.get(`${API_URL}/categories?channelId=${activeChannel?._id || videoData.channelId}&type=CONTENT_TYPE`),
        axios.get(`${API_URL}/categories?channelId=${activeChannel?._id || videoData.channelId}&type=HOOK_TYPE`)
      ]);
      setContentCategories(catRes.data);
      setContentTypes(typeRes.data);
      setHookTypes(hookRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API_URL}/videos/${videoId}`, {
        contentCategories: selectedCategories,
        contentTypes: selectedTypes,
        hookTypes: selectedHooks
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const fmtViews = (n) => {
    if (!n) return null;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  const ytViews    = video?.youtube?.views    || 0;
  const igViews    = video?.instagram?.views  || 0;
  const hasYT      = ytViews > 0;
  const hasIG      = igViews > 0;

  if (loading) return <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}><p style={{ color: 'white' }}>Loading...</p></div>;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="stat-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: 0 }}>

        {/* ── Sticky video context header ───────────────────────── */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#1e293b',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '1.1rem 1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              {/* Label */}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.3rem' }}>
                Editing tags for
              </p>
              {/* Title */}
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.35', wordBreak: 'break-word' }}>
                {video?.title || '—'}
              </h3>
              {/* Metadata */}
              {(hasYT || hasIG) && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                  {hasYT && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                      YouTube · {fmtViews(ytViews)} views
                    </span>
                  )}
                  {hasIG && (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', display: 'inline-block' }} />
                      Instagram · {fmtViews(igViews)} views
                    </span>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', flexShrink: 0, padding: '0.1rem' }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* ── Tag selection body ────────────────────────────────── */}
        <div style={{ padding: '1.5rem' }}>

          {/* Content Categories */}
          <div className="form-group">
          <label>Categories</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {contentCategories.map(cat => (
              <label key={cat._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: selectedCategories.includes(cat._id) ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: selectedCategories.includes(cat._id) ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories([...selectedCategories, cat._id]);
                    } else {
                      setSelectedCategories(selectedCategories.filter(id => id !== cat._id));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {cat.name}
              </label>
            ))}
          </div>
        </div>

        {/* Content Types */}
        <div className="form-group">
          <label>Content Types</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {contentTypes.map(type => (
              <label key={type._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: selectedTypes.includes(type._id) ? 'rgba(236,72,153,0.3)' : 'rgba(255,255,255,0.05)', border: selectedTypes.includes(type._id) ? '1px solid #ec4899' : '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTypes([...selectedTypes, type._id]);
                    } else {
                      setSelectedTypes(selectedTypes.filter(id => id !== type._id));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {type.name}
              </label>
            ))}
          </div>
        </div>

        {/* Hook Types */}
        <div className="form-group">
          <label>Hook Types</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {hookTypes.map(hook => (
              <label key={hook._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: selectedHooks.includes(hook._id) ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)', border: selectedHooks.includes(hook._id) ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={selectedHooks.includes(hook._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedHooks([...selectedHooks, hook._id]);
                    } else {
                      setSelectedHooks(selectedHooks.filter(id => id !== hook._id));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                {hook.name}
              </label>
            ))}
          </div>
        </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={handleSave} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={16} /> Save Changes
            </button>
            <button onClick={onClose} className="btn" style={{ background: '#334155' }}>Cancel</button>
          </div>
        </div>{/* end tag selection body */}
      </div>
    </div>
  );
};

export default CategoryEditModal;
