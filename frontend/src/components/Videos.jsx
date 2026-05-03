import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { Edit2, Save, Tag, ChevronUp, ChevronDown, Filter, X, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import CategoryEditModal from './CategoryEditModal';
import IdeaDetail from './IdeaDetail';

// ─── constants ────────────────────────────────────────────────────────────────

const BG_CARD    = '#1e293b';   // --bg-card
const BG_HEADER  = '#252f3e';   // card + rgba(255,255,255,0.05) approximation
const BG_HOVER   = '#263348';   // subtle row highlight
const BG_MODIFIED = 'rgba(99,102,241,0.07)';
const STICKY_SHADOW = '4px 0 10px rgba(0,0,0,0.4)';

// ─── Videos ───────────────────────────────────────────────────────────────────

const Videos = () => {
  const { activeChannel, API_URL, hasPermission, user } = useApp();

  // data
  const [videos, setVideos]         = useState([]);
  const [contentCategories, setContentCategories] = useState([]);
  const [contentTypes, setContentTypes]           = useState([]);
  const [hookTypes, setHookTypes]                 = useState([]);
  const [selectedIdeaId, setSelectedIdeaId]       = useState(null);

  // per-row edit (for published date)
  const [editingId, setEditingId]   = useState(null);
  const [editValues, setEditValues] = useState({});

  // bulk edit
  const [editMode, setEditMode]         = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});
  const [saving, setSaving]             = useState(false);

  // sort
  const [sortConfig, setSortConfig] = useState({ field: 'publishDate', direction: 'desc' });

  // filter
  const [filterCategories, setFilterCategories]       = useState([]);
  const [filterContentTypes, setFilterContentTypes]   = useState([]);
  const [filterHookTypes, setFilterHookTypes]         = useState([]);
  const [showFilters, setShowFilters]                 = useState(false);

  // search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const debounceRef                     = useRef(null);

  // delete
  const [deleteTarget, setDeleteTarget]       = useState(null); // { _id, title }
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting]               = useState(false);

  // UX
  const [hoveredRow, setHoveredRow] = useState(null);
  const [flashRow, setFlashRow]     = useState(null);
  const [categoryEditId, setCategoryEditId] = useState(null);
  const [toast, setToast]           = useState(null);

  useEffect(() => {
    if (activeChannel) {
      fetchVideos();
      fetchFilterOptions();
    }
  }, [activeChannel]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  useEffect(() => {
    if (activeChannel) fetchVideos();
  }, [searchQuery]);

  // ── data fetching ────────────────────────────────────────────────────────────

  const fetchVideos = async () => {
    try {
      const params = new URLSearchParams({ channelId: activeChannel._id, status: 'Posted' });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const { data } = await axios.get(`${API_URL}/videos?${params}`);
      setVideos(data);
    } catch (err) {
      console.error('Error fetching videos:', err);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const [catRes, typeRes, hookRes] = await Promise.all([
        axios.get(`${API_URL}/categories?channelId=${activeChannel._id}&type=CONTENT_CATEGORY`),
        axios.get(`${API_URL}/categories?channelId=${activeChannel._id}&type=CONTENT_TYPE`),
        axios.get(`${API_URL}/categories?channelId=${activeChannel._id}&type=HOOK_TYPE`),
      ]);
      setContentCategories(catRes.data);
      setContentTypes(typeRes.data);
      setHookTypes(hookRes.data);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  // ── per-row edit (published date only) ──────────────────────────────────────

  const handleSingleEdit = (video) => {
    setEditingId(video._id);
    setEditValues({
      publishDate: video.publishDate ? new Date(video.publishDate).toISOString().split('T')[0] : '',
      youtubeViews: video.youtube?.views || 0,
      youtubeSubs: video.youtube?.subscribersGained || 0,
      instagramViews: video.instagram?.views || 0,
      instagramFollowers: video.instagram?.followersGained || 0,
    });
  };

  const handleSingleSave = async (videoId) => {
    try {
      await axios.put(`${API_URL}/videos/${videoId}?channelId=${activeChannel._id}`, {
        publishDate: editValues.publishDate || undefined,
        youtube: { views: parseInt(editValues.youtubeViews), subscribersGained: parseInt(editValues.youtubeSubs) },
        instagram: { views: parseInt(editValues.instagramViews), followersGained: parseInt(editValues.instagramFollowers) },
      });
      setEditingId(null);
      await fetchVideos();
      showToast('✅ Video updated!');
    } catch (err) {
      showToast('❌ Error saving');
    }
  };

  // ── bulk edit ────────────────────────────────────────────────────────────────

  const enterEditMode = () => {
    const initial = {};
    videos.forEach(v => {
      initial[v._id] = {
        youtubeViews:      String(v.youtube?.views              || 0),
        youtubeSubs:       String(v.youtube?.subscribersGained  || 0),
        instagramViews:    String(v.instagram?.views            || 0),
        instagramFollowers:String(v.instagram?.followersGained  || 0),
      };
    });
    setPendingEdits(initial);
    setEditingId(null); // close any per-row edit
    setEditMode(true);
  };

  const exitEditMode = () => {
    setEditMode(false);
    setPendingEdits({});
  };

  const updatePending = (videoId, field, value) => {
    setPendingEdits(prev => ({
      ...prev,
      [videoId]: { ...prev[videoId], [field]: value },
    }));
  };

  const isModified = (video) => {
    const e = pendingEdits[video._id];
    if (!e) return false;
    return (
      parseInt(e.youtubeViews)       !== (video.youtube?.views              || 0) ||
      parseInt(e.youtubeSubs)        !== (video.youtube?.subscribersGained  || 0) ||
      parseInt(e.instagramViews)     !== (video.instagram?.views            || 0) ||
      parseInt(e.instagramFollowers) !== (video.instagram?.followersGained  || 0)
    );
  };

  const fieldChanged = (videoId, field, original) =>
    pendingEdits[videoId] && parseInt(pendingEdits[videoId][field]) !== original;

  const modifiedCount = videos.filter(isModified).length;

  const handleBulkSave = async () => {
    const toSave = videos.filter(isModified);
    if (toSave.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(toSave.map(v => {
        const e = pendingEdits[v._id];
        return axios.put(`${API_URL}/videos/${v._id}?channelId=${activeChannel._id}`, {
          youtube:   { views: parseInt(e.youtubeViews),      subscribersGained: parseInt(e.youtubeSubs) },
          instagram: { views: parseInt(e.instagramViews),    followersGained:   parseInt(e.instagramFollowers) },
        });
      }));
      await fetchVideos();
      setEditMode(false);
      setPendingEdits({});
      showToast(`✅ ${toSave.length} video${toSave.length !== 1 ? 's' : ''} updated!`);
    } catch (err) {
      showToast('❌ Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────────

  const openDeleteModal = (video) => {
    setDeleteTarget({ _id: video._id, title: video.title });
    setDeleteConfirmText('');
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteConfirmText('');
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE' || !deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/videos/${deleteTarget._id}?channelId=${activeChannel._id}`);
      closeDeleteModal();
      await fetchVideos();
      showToast('✅ Video deleted');
    } catch (err) {
      showToast('❌ Error deleting video');
    } finally {
      setDeleting(false);
    }
  };

  const openTagsModal = (videoId) => {
    setFlashRow(videoId);
    setTimeout(() => {
      setFlashRow(null);
      setCategoryEditId(videoId);
    }, 180);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const calcRatio = (num, den) => {
    if (!den) return '0.00';
    return ((num / den) * 1000).toFixed(2);
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const calcRatioNum = (num, den) => (!den ? 0 : (num / den) * 1000);

  // ── filter ───────────────────────────────────────────────────────────────────

  const toggleFilter = (id, setList) =>
    setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const clearAllFilters = () => {
    setFilterCategories([]);
    setFilterContentTypes([]);
    setFilterHookTypes([]);
  };

  const activeFilterCount = filterCategories.length + filterContentTypes.length + filterHookTypes.length;

  const filteredVideos = videos.filter(video => {
    const getIds = arr => (arr || []).map(x => (typeof x === 'object' ? x._id : x));
    if (filterCategories.length > 0   && !filterCategories.some(id   => getIds(video.contentCategories).includes(id))) return false;
    if (filterContentTypes.length > 0 && !filterContentTypes.some(id => getIds(video.contentTypes).includes(id)))      return false;
    if (filterHookTypes.length > 0    && !filterHookTypes.some(id    => getIds(video.hookTypes).includes(id)))         return false;
    return true;
  });

  // ── sort ─────────────────────────────────────────────────────────────────────

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    let aVal, bVal;
    switch (sortConfig.field) {
      case 'publishDate':   aVal = new Date(a.publishDate).getTime(); bVal = new Date(b.publishDate).getTime(); break;
      case 'ytViews':       aVal = a.youtube?.views || 0;              bVal = b.youtube?.views || 0;             break;
      case 'instaViews':    aVal = a.instagram?.views || 0;            bVal = b.instagram?.views || 0;           break;
      case 'ytSubs':        aVal = a.youtube?.subscribersGained || 0;  bVal = b.youtube?.subscribersGained || 0; break;
      case 'instaFollowers':aVal = a.instagram?.followersGained || 0;  bVal = b.instagram?.followersGained || 0; break;
      case 'ytRatio':       aVal = calcRatioNum(a.youtube?.subscribersGained || 0, a.youtube?.views || 0);
                            bVal = calcRatioNum(b.youtube?.subscribersGained || 0, b.youtube?.views || 0); break;
      case 'instaRatio':    aVal = calcRatioNum(a.instagram?.followersGained || 0, a.instagram?.views || 0);
                            bVal = calcRatioNum(b.instagram?.followersGained || 0, b.instagram?.views || 0); break;
      default: return 0;
    }
    return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
  });

  // ── sub-components ───────────────────────────────────────────────────────────

  const SortIcon = ({ field }) => {
    if (sortConfig.field !== field) return <ChevronDown size={14} style={{ opacity: 0.3, marginLeft: '4px' }} />;
    return sortConfig.direction === 'desc'
      ? <ChevronDown size={14} style={{ marginLeft: '4px', color: 'var(--primary)' }} />
      : <ChevronUp   size={14} style={{ marginLeft: '4px', color: 'var(--primary)' }} />;
  };

  const FilterGroup = ({ label, options, selected, onToggle, accentColor }) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {options.length === 0
          ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None created yet</span>
          : options.map(opt => {
              const active = selected.includes(opt._id);
              return (
                <button key={opt._id} onClick={() => onToggle(opt._id)} style={{ padding: '0.3rem 0.75rem', borderRadius: '1rem', border: `1px solid ${active ? accentColor : 'rgba(255,255,255,0.15)'}`, background: active ? `${accentColor}33` : 'transparent', color: active ? accentColor : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: active ? '600' : '400' }}>
                  {opt.name}
                </button>
              );
            })
        }
      </div>
    </div>
  );

  // ── inline input style for bulk edit ────────────────────────────────────────

  const bulkInput = (videoId, field, original) => ({
    width: '100%',
    padding: '0.35rem 0.45rem',
    background: '#0f172a',
    border: `1px solid ${fieldChanged(videoId, field, original) ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
    borderRadius: '0.25rem',
    color: 'white',
    fontSize: '0.85rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  });

  // ── row background logic ──────────────────────────────────────────────────────

  const rowBg = (video) => {
    if (flashRow === video._id)                return 'rgba(99,102,241,0.22)';
    if (hoveredRow === video._id)              return BG_HOVER;
    if (editMode && isModified(video))         return BG_MODIFIED;
    return 'transparent';
  };

  const stickyTdBg = (video) => {
    if (flashRow === video._id)                return '#2d3a5a';
    if (hoveredRow === video._id)              return BG_HOVER;
    if (editMode && isModified(video))         return '#1f2a44';
    return BG_CARD;
  };

  // ── sticky th/td shared styles ───────────────────────────────────────────────

  const stickyTh = {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    background: BG_HEADER,
    boxShadow: STICKY_SHADOW,
    padding: '1rem',
    minWidth: '160px',
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="videos">

      {/* Header row */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>Video Library</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {searchQuery.trim()
              ? `${videos.length} result${videos.length !== 1 ? 's' : ''} for "${searchQuery.trim()}"`
              : activeFilterCount > 0
              ? `Showing ${sortedVideos.length} of ${videos.length} videos (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`
              : 'All posted videos — click any column header to sort'}
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title, category, type or hook..."
            style={{
              width: '100%',
              padding: '0.6rem 2.2rem 0.6rem 2.2rem',
              background: '#1e293b',
              border: `1px solid ${searchInput ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchQuery(''); }}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Edit Mode toggle */}
          {!editMode ? (
            <button
              onClick={enterEditMode}
              disabled={videos.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              <Pencil size={15} /> Edit Mode
            </button>
          ) : (
            <span style={{ fontSize: '0.85rem', color: modifiedCount > 0 ? 'var(--primary)' : 'var(--text-muted)', padding: '0.6rem 0.5rem' }}>
              {modifiedCount > 0 ? `${modifiedCount} video${modifiedCount !== 1 ? 's' : ''} modified` : 'No changes yet'}
            </span>
          )}

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '0.5rem', border: `1px solid ${activeFilterCount > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.15)'}`, background: activeFilterCount > 0 ? 'rgba(99,102,241,0.15)' : 'transparent', color: activeFilterCount > 0 ? 'var(--primary)' : 'white', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <Filter size={16} /> Filter
            {activeFilterCount > 0 && <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '1rem', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: '700' }}>{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="stat-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: '600' }}>Filter by Tags</span>
            {activeFilterCount > 0 && <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={14} /> Clear all</button>}
          </div>
          <FilterGroup label="Categories"    options={contentCategories} selected={filterCategories}    onToggle={id => toggleFilter(id, setFilterCategories)}    accentColor="#6366f1" />
          <FilterGroup label="Content Types" options={contentTypes}       selected={filterContentTypes}  onToggle={id => toggleFilter(id, setFilterContentTypes)}  accentColor="#ec4899" />
          <FilterGroup label="Hook Types"    options={hookTypes}          selected={filterHookTypes}     onToggle={id => toggleFilter(id, setFilterHookTypes)}     accentColor="#22c55e" />
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>Within a group: matches any · Across groups: must match all</p>
        </div>
      )}

      {/* Table */}
      <div className="stat-card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>

              {/* STICKY title column */}
              <th style={stickyTh}>Title</th>

              <th onClick={() => handleSort('publishDate')} style={{ padding: '1rem', minWidth: '130px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Published Date <SortIcon field="publishDate" /></th>
              <th onClick={() => handleSort('ytViews')}    style={{ padding: '1rem', minWidth: '110px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>YouTube Views <SortIcon field="ytViews" /></th>
              <th onClick={() => handleSort('instaViews')} style={{ padding: '1rem', minWidth: '110px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Instagram Views <SortIcon field="instaViews" /></th>
              <th onClick={() => handleSort('ytSubs')}     style={{ padding: '1rem', minWidth: '110px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>YouTube Subs <SortIcon field="ytSubs" /></th>
              <th onClick={() => handleSort('instaFollowers')} style={{ padding: '1rem', minWidth: '120px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Insta Followers <SortIcon field="instaFollowers" /></th>
              <th onClick={() => handleSort('ytRatio')}    style={{ padding: '1rem', minWidth: '120px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>YT Conv. Ratio <SortIcon field="ytRatio" /></th>
              <th onClick={() => handleSort('instaRatio')} style={{ padding: '1rem', minWidth: '130px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Insta Conv. Ratio <SortIcon field="instaRatio" /></th>
              <th style={{ padding: '1rem', minWidth: '100px' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedVideos.length > 0 ? sortedVideos.map(video => {
              const e = pendingEdits[video._id] || {};
              const ytViews   = parseInt(e.youtubeViews      ?? video.youtube?.views              ?? 0);
              const ytSubs    = parseInt(e.youtubeSubs        ?? video.youtube?.subscribersGained  ?? 0);
              const igViews   = parseInt(e.instagramViews     ?? video.instagram?.views            ?? 0);
              const igFol     = parseInt(e.instagramFollowers ?? video.instagram?.followersGained  ?? 0);

              return (
                <tr
                  key={video._id}
                  onMouseEnter={() => setHoveredRow(video._id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: rowBg(video), transition: 'background 0.12s' }}
                >
                  {/* STICKY title td */}
                  <td style={{ position: 'sticky', left: 0, zIndex: 2, background: stickyTdBg(video), boxShadow: STICKY_SHADOW, padding: '0.85rem 1rem', transition: 'background 0.12s', maxWidth: '220px' }}>
                    <span 
                      style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500', cursor: 'pointer', color: 'var(--primary)' }} 
                      title={video.title}
                      onClick={() => setSelectedIdeaId(video._id)}
                    >
                      {video.title}
                    </span>
                    {editMode && isModified(video) && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--primary)', marginTop: '0.2rem', display: 'block' }}>● modified</span>
                    )}
                  </td>

                  {/* ── Bulk Edit Mode ───────────────────────────────── */}
                  {editMode ? (
                    <>
                      {/* Published date — read-only in bulk edit */}
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {new Date(video.publishDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input type="number" min="0" value={e.youtubeViews ?? ''} onChange={ev => updatePending(video._id, 'youtubeViews', ev.target.value)} style={bulkInput(video._id, 'youtubeViews', video.youtube?.views || 0)} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input type="number" min="0" value={e.instagramViews ?? ''} onChange={ev => updatePending(video._id, 'instagramViews', ev.target.value)} style={bulkInput(video._id, 'instagramViews', video.instagram?.views || 0)} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input type="number" min="0" value={e.youtubeSubs ?? ''} onChange={ev => updatePending(video._id, 'youtubeSubs', ev.target.value)} style={bulkInput(video._id, 'youtubeSubs', video.youtube?.subscribersGained || 0)} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input type="number" min="0" value={e.instagramFollowers ?? ''} onChange={ev => updatePending(video._id, 'instagramFollowers', ev.target.value)} style={bulkInput(video._id, 'instagramFollowers', video.instagram?.followersGained || 0)} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--accent)', fontSize: '0.9rem' }}>{calcRatio(ytSubs, ytViews)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--accent)', fontSize: '0.9rem' }}>{calcRatio(igFol, igViews)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button onClick={() => openTagsModal(video._id)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', padding: '0.3rem 0.6rem', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Tag size={13} /> Tags
                        </button>
                      </td>
                    </>

                  /* ── Per-row Edit Mode ─────────────────────────────── */
                  ) : editingId === video._id ? (
                    <>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input type="date" value={editValues.publishDate} onChange={e => setEditValues({ ...editValues, publishDate: e.target.value })} style={{ width: '100%', padding: '0.4rem 0.5rem', background: '#0f172a', border: '1px solid var(--primary)', borderRadius: '0.25rem', color: 'white' }} />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><input type="number" value={editValues.youtubeViews}      onChange={e => setEditValues({ ...editValues, youtubeViews: e.target.value })}      style={{ width: '100%', padding: '0.4rem 0.5rem', background: '#0f172a', border: '1px solid var(--primary)', borderRadius: '0.25rem', color: 'white' }} /></td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><input type="number" value={editValues.instagramViews}    onChange={e => setEditValues({ ...editValues, instagramViews: e.target.value })}    style={{ width: '100%', padding: '0.4rem 0.5rem', background: '#0f172a', border: '1px solid var(--primary)', borderRadius: '0.25rem', color: 'white' }} /></td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><input type="number" value={editValues.youtubeSubs}       onChange={e => setEditValues({ ...editValues, youtubeSubs: e.target.value })}       style={{ width: '100%', padding: '0.4rem 0.5rem', background: '#0f172a', border: '1px solid var(--primary)', borderRadius: '0.25rem', color: 'white' }} /></td>
                      <td style={{ padding: '0.5rem 0.75rem' }}><input type="number" value={editValues.instagramFollowers} onChange={e => setEditValues({ ...editValues, instagramFollowers: e.target.value })} style={{ width: '100%', padding: '0.4rem 0.5rem', background: '#0f172a', border: '1px solid var(--primary)', borderRadius: '0.25rem', color: 'white' }} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>—</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>—</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button onClick={() => handleSingleSave(video._id)} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Save size={14} /> Save
                        </button>
                      </td>
                    </>

                  /* ── View Mode ─────────────────────────────────────── */
                  ) : (
                    <>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.9rem' }}>{new Date(video.publishDate).toLocaleDateString()}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{(video.youtube?.views || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{(video.instagram?.views || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{(video.youtube?.subscribersGained || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{(video.instagram?.followersGained || 0).toLocaleString()}</td>
                      <td style={{ padding: '0.85rem 1rem', color: video.youtube?.views > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{calcRatio(video.youtube?.subscribersGained || 0, video.youtube?.views || 0)}</td>
                      <td style={{ padding: '0.85rem 1rem', color: video.instagram?.views > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{calcRatio(video.instagram?.followersGained || 0, video.instagram?.views || 0)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => handleSingleEdit(video)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.35rem 0.7rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem' }}>
                            <Edit2 size={13} /> Metrics
                          </button>
                          <button onClick={() => openTagsModal(video._id)} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.35rem 0.7rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.82rem' }}>
                            <Tag size={13} /> Tags
                          </button>
                          {(hasPermission('ADMIN') || video.createdBy?._id === user?.userId) && (
                            <button onClick={() => openDeleteModal(video)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', padding: '0.35rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Delete video">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {searchQuery.trim()
                    ? `No videos found for "${searchQuery.trim()}".`
                    : activeFilterCount > 0
                    ? 'No videos match the selected filters.'
                    : 'No videos posted yet. Go to Planner to mark ideas as posted!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bulk Edit Action Bar (fixed) ───────────────────────────────────── */}
      {editMode && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 'var(--sidebar-width)',
          right: 0,
          background: 'rgba(15,23,42,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          padding: '0.9rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
        }}>
          <span style={{ color: modifiedCount > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: modifiedCount > 0 ? '600' : '400', fontSize: '0.9rem' }}>
            {modifiedCount > 0 ? `${modifiedCount} video${modifiedCount !== 1 ? 's' : ''} modified` : 'No changes yet — edit the fields above'}
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={exitEditMode}
              disabled={saving}
              style={{ background: '#334155', color: 'white', border: 'none', padding: '0.55rem 1.4rem', borderRadius: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSave}
              disabled={modifiedCount === 0 || saving}
              style={{ background: modifiedCount === 0 ? '#334155' : 'var(--success)', color: 'white', border: 'none', padding: '0.55rem 1.6rem', borderRadius: '0.45rem', cursor: modifiedCount === 0 ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: '600', opacity: modifiedCount === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {saving ? 'Saving…' : `Save All Changes${modifiedCount > 0 ? ` (${modifiedCount})` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: editMode ? '4.5rem' : '2rem', right: '2rem', background: toast.includes('✅') ? 'var(--success)' : '#ef4444', color: 'white', padding: '1rem 1.5rem', borderRadius: '0.5rem', zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}

      {categoryEditId && (
        <CategoryEditModal
          videoId={categoryEditId}
          onClose={() => setCategoryEditId(null)}
          onSave={() => { fetchVideos(); showToast('✅ Tags updated!'); }}
        />
      )}

      {selectedIdeaId && (
        <IdeaDetail ideaId={selectedIdeaId} onBack={() => setSelectedIdeaId(null)} onRefresh={fetchVideos} />
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div className="stat-card" style={{ width: '90%', maxWidth: '460px', padding: '2rem' }}>
            {/* Icon + heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Delete Video</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>This action cannot be undone.</p>
              </div>
            </div>

            {/* Video title */}
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>You are deleting:</p>
              <p style={{ margin: 0, fontWeight: '600', wordBreak: 'break-word' }}>{deleteTarget.title}</p>
            </div>

            {/* Type-to-confirm */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Type <strong style={{ color: '#ef4444', letterSpacing: '0.05em' }}>DELETE</strong> to confirm
              </label>
              <input
                autoFocus
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && deleteConfirmText === 'DELETE') handleDelete(); if (e.key === 'Escape') closeDeleteModal(); }}
                placeholder="DELETE"
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: '#0f172a', border: `1px solid ${deleteConfirmText === 'DELETE' ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, borderRadius: '0.4rem', color: 'white', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', letterSpacing: '0.05em' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                style={{ flex: 1, background: '#334155', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '0.45rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                style={{ flex: 1, background: deleteConfirmText === 'DELETE' ? '#ef4444' : 'rgba(239,68,68,0.2)', color: deleteConfirmText === 'DELETE' ? 'white' : 'rgba(239,68,68,0.4)', border: 'none', padding: '0.65rem', borderRadius: '0.45rem', cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {deleting ? 'Deleting…' : <><Trash2 size={15} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Videos;
