import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { Plus, Clock, Calendar as CalIcon, AlertCircle, Link, X, GripVertical, Lock, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import IdeaDetail from './IdeaDetail';

// ── date helpers (always UTC so frontend and backend agree) ─────────────────
const toDateStr = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const addDays   = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const Planner = () => {
  const { activeChannel, API_URL, channels, hasPermission, plannerCache, setPlannerCache } = useApp();
  const navigate = useNavigate();
  const [ideas, setIdeas]                       = useState([]);
  const [selectedIdeaId, setSelectedIdeaId]       = useState(null);
  const activeChannelRef = useRef(activeChannel);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // drag state
  const [draggingId, setDraggingId]       = useState(null);
  const [dragTarget, setDragTarget]       = useState(null); // { type: 'before'|'end', id }
  const [togglingLockId, setTogglingLockId] = useState(null);

  const [autoShift, setAutoShift] = useState(false);

  const canEdit = hasPermission('EDIT_PLANNER');

  useEffect(() => {
    if (activeChannel) {
      // Restore cached data immediately if available, otherwise clear to avoid showing old channel data
      const cached = plannerCache[activeChannel._id];
      if (cached) {
        setIdeas(cached);
      } else {
        setIdeas([]);
      }
      fetchIdeas(activeChannel._id);
    }
  }, [activeChannel]);

  const fetchIdeas = async (channelId = activeChannel?._id) => {
    if (!channelId) return;
    try {
      const { data } = await axios.get(`${API_URL}/videos?channelId=${channelId}`);
      const filtered = data.filter(v => v.status !== 'Posted');
      console.log(`[Planner] fetched=${data.length} total, non-posted=${filtered.length}`);
      
      // Update cache
      setPlannerCache(prev => ({
        ...prev,
        [channelId]: filtered
      }));

      // Only update local state if this is still the active channel
      if (activeChannelRef.current && activeChannelRef.current._id === channelId) {
        setIdeas(filtered);
      }
    } catch (error) {
      console.error('Error fetching ideas:', error);
    }
  };

  const isValidUrl = (url) => { try { new URL(url); return true; } catch { return false; } };

  const formatPlannedDate = (dateStr) => {
    const date  = new Date(dateStr);
    const today = new Date();
    const diff  = Math.round((date.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / 86_400_000);
    const day   = new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' });
    const short = new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    if (diff === 0) return `Today • ${day}`;
    if (diff === 1) return `Tomorrow • ${day}`;
    return `${day} • ${short}`;
  };

  // ── planned list: sort by plannedDate ASC, then orderIndex ASC ───────────────
  const sortedPlanned = useMemo(() =>
    [...ideas.filter(v => v.plannedDate)].sort((a, b) => {
      const da = new Date(a.plannedDate) - new Date(b.plannedDate);
      if (da !== 0) return da;
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    }),
  [ideas]);

  // Group into [{ key, date, items }] sorted by date
  const dateGroups = useMemo(() => {
    const groups = {};
    sortedPlanned.forEach(v => {
      const key = toDateStr(v.plannedDate);
      if (!groups[key]) groups[key] = { date: v.plannedDate, items: [] };
      groups[key].items.push(v);
    });
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, { date, items }]) => ({ key, date, items }));
  }, [sortedPlanned]);

  // Interleave date groups with virtual drop zones for missing dates
  const plannedItems = useMemo(() => {
    if (dateGroups.length === 0) return [];
    const items = [];

    // Zone before the very first date (day before)
    items.push({ type: 'vzone', suggestedDate: addDays(dateGroups[0].key, -1) });

    dateGroups.forEach((group, idx) => {
      items.push({ type: 'group', ...group });

      if (idx < dateGroups.length - 1) {
        const nextKey = dateGroups[idx + 1].key;
        // Only insert a zone if there is a gap (non-consecutive days)
        if (addDays(group.key, 1) !== nextKey) {
          items.push({ type: 'vzone', suggestedDate: addDays(group.key, 1) });
        }
      }
    });

    // Zone after the very last date (next day)
    items.push({ type: 'vzone', suggestedDate: addDays(dateGroups[dateGroups.length - 1].key, 1) });

    return items;
  }, [dateGroups]);

  // ── drag-and-drop ────────────────────────────────────────────────────────────
  const cleanupDrag = () => { setDraggingId(null); setDragTarget(null); };

  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, type, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragTarget(prev =>
      prev?.type === type && prev?.id === id ? prev : { type, id }
    );
  };

  const handleDrop = async (e, type, id) => {
    e.preventDefault();
    if (!draggingId) { cleanupDrag(); return; }
    if (!canEdit) { cleanupDrag(); return; }

    const draggedVideo = sortedPlanned.find(v => v._id === draggingId);
    if (!draggedVideo) { cleanupDrag(); return; }

    let targetPlannedDate = null;
    let targetOrderIndex  = 0;

    if (type === 'before') {
      // id = target card's _id — drop before it
      if (id === draggingId) { cleanupDrag(); return; }
      const target = sortedPlanned.find(v => v._id === id);
      if (!target) { cleanupDrag(); return; }
      targetPlannedDate = target.plannedDate;
      const targetDateKey  = toDateStr(target.plannedDate);
      const othersAtDate   = sortedPlanned.filter(v => toDateStr(v.plannedDate) === targetDateKey && v._id !== draggingId);
      targetOrderIndex = Math.max(0, othersAtDate.findIndex(v => v._id === id));
    } else if (type === 'end') {
      // id = dateKey — append to end of that date group
      const sample = sortedPlanned.find(v => toDateStr(v.plannedDate) === id);
      if (!sample) { cleanupDrag(); return; }
      targetPlannedDate = sample.plannedDate;
      targetOrderIndex  = sortedPlanned.filter(v => toDateStr(v.plannedDate) === id && v._id !== draggingId).length;
    } else if (type === 'new-date') {
      // id = YYYY-MM-DD of a virtual zone (no existing videos on that date yet)
      targetPlannedDate = id;
      targetOrderIndex  = 0;
    }

    if (!targetPlannedDate) { cleanupDrag(); return; }

    const newDateStr = toDateStr(targetPlannedDate);
    const oldDateStr = toDateStr(draggedVideo.plannedDate);
    const isCrossDate = newDateStr !== oldDateStr;

    // Mirror backend auto-shift logic to build optimistic shift map
    const shiftMap = {};
    if (autoShift && isCrossDate) {
      const otherPlans  = sortedPlanned.filter(v => v._id !== draggingId);
      const uniqueDates = [...new Set(otherPlans.map(v => toDateStr(v.plannedDate)))]
        .filter(ds => ds >= newDateStr)
        .sort();
      let expected = newDateStr;
      for (const ds of uniqueDates) {
        if (ds === expected) { shiftMap[ds] = addDays(ds, 1); expected = addDays(ds, 1); }
        else break;
      }
    }

    // Compute new orderIndex for target date (all cards after inserting dragged)
    const othersAtNewDate = sortedPlanned.filter(v => toDateStr(v.plannedDate) === newDateStr && v._id !== draggingId);
    const reorderedAtNew  = [...othersAtNewDate];
    reorderedAtNew.splice(targetOrderIndex, 0, draggedVideo);

    // Also recompute orderIndex for origin date (clean up gaps)
    const othersAtOldDate = isCrossDate
      ? sortedPlanned.filter(v => toDateStr(v.plannedDate) === oldDateStr && v._id !== draggingId)
      : [];

    const orderUpdates = [
      ...reorderedAtNew.map((v, i) => ({ _id: v._id, orderIndex: i })),
      ...othersAtOldDate.map((v, i) => ({ _id: v._id, orderIndex: i })),
    ];
    const orderMap = Object.fromEntries(orderUpdates.map(u => [u._id, u.orderIndex]));

    // Optimistic update
    setIdeas(prev => {
      const updated = prev.map(v => {
        const ds = v.plannedDate ? toDateStr(v.plannedDate) : null;
        let newDate = v.plannedDate;
        if (v._id === draggingId) {
          newDate = targetPlannedDate;
        } else if (isCrossDate && ds && shiftMap[ds]) {
          newDate = shiftMap[ds] + 'T00:00:00.000Z';
        }
        return { ...v, plannedDate: newDate, ...(v._id in orderMap ? { orderIndex: orderMap[v._id] } : {}) };
      });
      if (activeChannel) {
        setPlannerCache(cache => ({
          ...cache,
          [activeChannel._id]: updated
        }));
      }
      return updated;
    });

    cleanupDrag();

    // Persist
    try {
      await axios.put(`${API_URL}/videos/reorder`, {
        channelId: activeChannel._id,
        movedId:   draggingId,
        newPlannedDate: isCrossDate ? newDateStr : undefined,
        autoShift:  autoShift && isCrossDate,
        updates:    orderUpdates,
      });
    } catch (err) {
      console.error('Reorder failed, rolling back:', err);
      await fetchIdeas();
    }
  };

  const toggleLock = async (e, video) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (togglingLockId === video._id) return;
    setTogglingLockId(video._id);
    const newLocked = !video.isDateLocked;

    const updateLockState = (locked) => {
      setIdeas(prev => {
        const updated = prev.map(v => v._id === video._id ? { ...v, isDateLocked: locked } : v);
        if (activeChannel) {
          setPlannerCache(cache => ({
            ...cache,
            [activeChannel._id]: updated
          }));
        }
        return updated;
      });
    };

    updateLockState(newLocked);

    try {
      await axios.put(`${API_URL}/videos/${video._id}?channelId=${activeChannel._id}`, {
        isDateLocked: newLocked });
    } catch {
      updateLockState(!newLocked);
    } finally {
      setTogglingLockId(null);
    }
  };

  // ── guards ───────────────────────────────────────────────────────────────────
  if (channels.length === 0) return (
    <div className="planner">
      <div className="insight-banner" style={{ background: 'var(--bg-card)', border: '1px dashed var(--warning)' }}>
        <AlertCircle size={24} color="var(--warning)" />
        <div><strong>No Channels Yet!</strong> Go to <strong>Manage Channels</strong> to add your channel first.</div>
      </div>
    </div>
  );

  if (!activeChannel) return (
    <div className="planner">
      <div className="insight-banner" style={{ background: 'var(--bg-card)', border: '1px dashed var(--warning)' }}>
        <AlertCircle size={24} color="var(--warning)" />
        <div><strong>Select a Channel First!</strong> Choose a channel from the top bar to start planning.</div>
      </div>
    </div>
  );

  return (
    <div className="planner">
      {/* Channel header */}
      <div style={{
        background: 'rgba(99,102,241,0.1)', border: '1px solid var(--primary)',
        borderRadius: '0.75rem', padding: '1rem', marginBottom: '2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, marginBottom: '0.1rem' }}>PLANNING FOR</p>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>{activeChannel.name}</h3>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => navigate('/create-idea')} style={{ width: 'auto' }}>
            <Plus size={18} />
            Add Idea
          </button>
        )}
      </div>

      {selectedIdeaId && (
        <IdeaDetail ideaId={selectedIdeaId} onBack={() => setSelectedIdeaId(null)} onRefresh={fetchIdeas} />
      )}

      {ideas.length === 0 ? (
        <div className="stat-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No content planned yet. {canEdit ? 'Click "Add Idea" to start planning!' : ''}</p>
        </div>
      ) : (
        <>
          {/* ── PLANNED SECTION ──────────────────────────────────────── */}
          {sortedPlanned.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              {/* Section header + auto-shift toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📅 Upcoming
                  <span style={{ fontSize: '0.8rem', fontWeight: '500', background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.35)', color: '#fbbf24', padding: '0.1rem 0.55rem', borderRadius: '1rem' }}>
                    {sortedPlanned.length}
                  </span>
                </h3>

                <div style={{ flex: 1 }} />

                {/* Auto Shift toggle */}
                {canEdit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: autoShift ? '#6366f1' : '#64748b', fontWeight: '500', letterSpacing: '0.03em' }}>
                      Auto Shift
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoShift(v => !v)}
                      title={autoShift ? 'Auto Shift ON — dropping a card shifts the continuous date sequence forward' : 'Auto Shift OFF — cards stack on the target date'}
                      style={{
                        width: '34px', height: '18px', borderRadius: '9px', padding: 0,
                        background: autoShift ? '#6366f1' : '#334155',
                        border: 'none', cursor: 'pointer', position: 'relative',
                        transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%', background: 'white',
                        position: 'absolute', top: '3px',
                        left: autoShift ? '19px' : '3px',
                        transition: 'left 0.18s',
                      }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Planned list */}
              <div
                className="ideas-list"
                style={{ maxHeight: '620px', overflowY: 'auto', paddingRight: '0.25rem' }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragTarget(null);
                }}
              >
                {plannedItems.map((item) => {

                  // ── Virtual drop zone (new date) ──────────────────────────
                  if (item.type === 'vzone') {
                    if (!canEdit) return null;
                    const { suggestedDate } = item;
                    const isActive  = dragTarget?.type === 'new-date' && dragTarget?.id === suggestedDate;
                    const shortDate = new Date(suggestedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                    return (
                      <div
                        key={`vz-${suggestedDate}`}
                        onDragOver={e => handleDragOver(e, 'new-date', suggestedDate)}
                        onDrop={e => handleDrop(e, 'new-date', suggestedDate)}
                        style={{
                          height: draggingId ? (isActive ? '2.5rem' : '1.5rem') : '0',
                          overflow: 'hidden',
                          margin: draggingId ? '0.15rem 0' : '0',
                          borderRadius: '0.4rem',
                          border: `2px dashed ${isActive ? '#6366f1' : draggingId ? 'rgba(99,102,241,0.18)' : 'transparent'}`,
                          background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                          transition: 'height 0.15s, border-color 0.12s, background 0.12s',
                          cursor: draggingId ? 'copy' : 'default',
                        }}
                      >
                        {draggingId && (
                          <>
                            <Plus size={11} color={isActive ? '#6366f1' : 'rgba(99,102,241,0.35)'} />
                            <span style={{
                              fontSize: '0.71rem',
                              color: isActive ? '#6366f1' : 'rgba(99,102,241,0.45)',
                              fontWeight: isActive ? '600' : '400',
                              pointerEvents: 'none',
                            }}>
                              {isActive ? `Move to ${shortDate}` : shortDate}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  }

                  // ── Date group ────────────────────────────────────────────
                  const { key, date, items } = item;
                  return (
                  <div key={key} style={{ marginBottom: '0.75rem' }}>

                    {/* Date group header — drop here to prepend to this date */}
                    <div
                      onDragOver={e => canEdit && items[0] && handleDragOver(e, 'before', items[0]._id)}
                      onDrop={e => canEdit && items[0] && handleDrop(e, 'before', items[0]._id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.3rem 0.25rem', marginBottom: '0.4rem',
                        borderRadius: '0.35rem', transition: 'background 0.1s',
                        background: draggingId && dragTarget?.type === 'before' && dragTarget?.id === items[0]?._id
                          ? 'rgba(99,102,241,0.08)' : 'transparent',
                      }}
                    >
                      <CalIcon size={13} color="#fbbf24" />
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fbbf24', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {formatPlannedDate(date)}
                      </span>
                      {items.length > 1 && (
                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.1rem 0.45rem', borderRadius: '1rem' }}>
                          ⚠ {items.length} on same day
                        </span>
                      )}
                      <div style={{ flex: 1, height: '1px', background: 'rgba(234,179,8,0.12)' }} />
                    </div>

                    {/* Cards */}
                    {items.map(video => {
                      const isDropTarget = dragTarget?.type === 'before' && dragTarget?.id === video._id;
                      return (
                        <div
                          key={video._id}
                          draggable={canEdit}
                          onDragStart={e => canEdit && handleDragStart(e, video._id)}
                          onDragOver={e => canEdit && handleDragOver(e, 'before', video._id)}
                          onDrop={e => canEdit && handleDrop(e, 'before', video._id)}
                          onDragEnd={canEdit ? cleanupDrag : undefined}
                          onClick={() => setSelectedIdeaId(video._id)}
                          className="stat-card"
                          style={{
                            marginBottom: '0.55rem',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            cursor: 'pointer',
                            opacity: draggingId === video._id ? 0.3 : 1,
                            transition: 'opacity 0.15s, box-shadow 0.12s',
                            ...(isDropTarget ? { boxShadow: '0 -3px 0 0 #6366f1, 0 0 0 1px rgba(99,102,241,0.25)' } : {}),
                          }}
                        >
                          {canEdit && (
                            <div onClick={e => e.stopPropagation()}
                              style={{ color: '#475569', cursor: 'grab', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0.2rem', transition: 'color 0.1s' }}
                              onMouseOver={e => e.currentTarget.style.color = '#94a3b8'}
                              onMouseOut={e => e.currentTarget.style.color = '#475569'}
                            >
                              <GripVertical size={15} />
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.73rem', padding: '0.18rem 0.45rem', borderRadius: '4px', background: 'var(--warning)', flexShrink: 0, fontWeight: '600' }}>
                                Planned
                              </span>
                                {video.needScript && (
                                  <span title="Script Required" style={{ fontSize: '0.68rem', color: '#ec4899', background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', padding: '0.1rem 0.45rem', borderRadius: '4px', flexShrink: 0, fontWeight: '600' }}>
                                    Need Script
                                  </span>
                                )}
                                <h4 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</h4>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                              {video.createdBy && (
                                <span style={{ 
                                  fontSize: '0.68rem', 
                                  color: video.createdBy.isAdmin ? 'var(--primary)' : 'var(--text-muted)',
                                  background: 'rgba(255,255,255,0.03)',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                  by {video.createdBy.isAdmin ? 'Admin' : video.createdBy.name}
                                </span>
                              )}
                              {video.plannedTime && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={12} /> {video.plannedTime}
                                </div>
                              )}
                            </div>
                          </div>

                          {canEdit && (
                            <button
                              onClick={e => toggleLock(e, video)}
                              disabled={togglingLockId === video._id}
                              title={video.isDateLocked ? 'Locked: auto-shift skips this. Click to unlock.' : 'Click to lock date (auto-shift will skip this video)'}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                                padding: '0.3rem', borderRadius: '0.3rem', display: 'flex', alignItems: 'center',
                                color: video.isDateLocked ? '#f59e0b' : '#475569',
                                opacity: togglingLockId === video._id ? 0.4 : 1,
                                transition: 'color 0.15s',
                              }}
                              onMouseOver={e => { if (!video.isDateLocked) e.currentTarget.style.color = '#94a3b8'; }}
                              onMouseOut={e => { if (!video.isDateLocked) e.currentTarget.style.color = '#475569'; }}
                            >
                              {video.isDateLocked ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* End drop zone — append to this date */}
                    {canEdit && (
                      <div
                        onDragOver={e => handleDragOver(e, 'end', key)}
                        onDrop={e => handleDrop(e, 'end', key)}
                        style={{
                          height: draggingId ? '1.8rem' : '0.3rem',
                          marginTop: '0.1rem', borderRadius: '0.4rem',
                          border: `2px dashed ${dragTarget?.type === 'end' && dragTarget?.id === key ? '#6366f1' : 'transparent'}`,
                          background: dragTarget?.type === 'end' && dragTarget?.id === key ? 'rgba(99,102,241,0.06)' : 'transparent',
                          transition: 'height 0.15s, border-color 0.1s, background 0.1s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {draggingId && dragTarget?.type === 'end' && dragTarget?.id === key && (
                          <span style={{ fontSize: '0.68rem', color: '#6366f1', pointerEvents: 'none' }}>
                            Append to {formatPlannedDate(date)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── IDEAS SECTION ─────────────────────────────────────── */}
          {ideas.filter(v => !v.plannedDate).length > 0 && (
            <div>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💡 Ideas
                <span style={{ fontSize: '0.8rem', fontWeight: '500', background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', padding: '0.1rem 0.55rem', borderRadius: '1rem' }}>
                  {ideas.filter(v => !v.plannedDate).length}
                </span>
              </h3>
              <div className="ideas-list" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {ideas.filter(v => !v.plannedDate).map(video => (
                  <div key={video._id} onClick={() => setSelectedIdeaId(video._id)} className="stat-card"
                    style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '0.73rem', padding: '0.18rem 0.45rem', borderRadius: '4px', background: '#334155', flexShrink: 0 }}>Idea</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</h4>
                      {video.createdBy && (
                        <div style={{ marginTop: '0.2rem' }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            color: video.createdBy.isAdmin ? 'var(--primary)' : 'var(--text-muted)',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            by {video.createdBy.isAdmin ? 'Admin' : video.createdBy.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Planner;
