import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, AlertCircle, Pencil, Check, X, FileText } from 'lucide-react';

const ACCENT = {
  CONTENT_CATEGORY: '#6366f1',
  CONTENT_TYPE: '#22c55e',
  HOOK_TYPE: '#f97316',
};

const PLACEHOLDERS = {
  name: {
    CONTENT_CATEGORY: 'e.g., Apps, Websites, AI Tools…',
    CONTENT_TYPE: 'e.g., Tutorial, Comparison, List…',
    HOOK_TYPE: 'e.g., Curiosity, Urgency, Shock…',
  },
  description: {
    CONTENT_CATEGORY: 'e.g., Videos reviewing or comparing software tools. Variations: "top 5 apps", "best tools for…", "vs comparison"…',
    CONTENT_TYPE: 'e.g., Step-by-step walkthroughs. Variations: "how to…", "beginner guide", "full tutorial"…',
    HOOK_TYPE: 'e.g., Opens with a question that triggers fear of missing out. Variations: "before buying…", "stop doing this…", "don\'t make this mistake"…',
  },
};

const inputStyle = (accentColor) => ({
  width: '100%',
  padding: '0.4rem 0.6rem',
  background: '#1a1a2e',
  border: `1px solid ${accentColor}`,
  borderRadius: '0.25rem',
  color: 'white',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none',
});

const Categories = () => {
  const { activeChannel, API_URL } = useApp();
  const [contentCats, setContentCats]   = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [hookTypes, setHookTypes]       = useState([]);
  const [activeTab, setActiveTab]       = useState('CONTENT_CATEGORY');
  const [loading, setLoading]           = useState(false);

  // Add form
  const [newName, setNewName]               = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showAddDesc, setShowAddDesc]       = useState(false);

  // Inline edit
  const [editingId, setEditingId]                   = useState(null);
  const [editingName, setEditingName]               = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  useEffect(() => {
    if (activeChannel) fetchAllCategories();
  }, [activeChannel]);

  const fetchAllCategories = async () => {
    try {
      const [catRes, typeRes, hookRes] = await Promise.all([
        axios.get(`${API_URL}/categories?channelId=${activeChannel._id}&type=CONTENT_CATEGORY`),
        axios.get(`${API_URL}/categories?channelId=${activeChannel._id}&type=CONTENT_TYPE`),
        axios.get(`${API_URL}/categories?channelId=${activeChannel._id}&type=HOOK_TYPE`),
      ]);
      setContentCats(catRes.data);
      setContentTypes(typeRes.data);
      setHookTypes(hookRes.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setLoading(true);
      await axios.post(`${API_URL}/categories`, {
        name: newName.trim(),
        description: newDescription.trim(),
        type: activeTab,
        channelId: activeChannel._id,
      });
      setNewName('');
      setNewDescription('');
      setShowAddDesc(false);
      await fetchAllCategories();
    } catch (error) {
      alert('Error creating category: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this? Videos will remain but the tag link will be removed.')) {
      try {
        await axios.delete(`${API_URL}/categories/${id}`);
        await fetchAllCategories();
      } catch (error) {
        alert('Error deleting: ' + error.message);
      }
    }
  };

  const handleEditStart = (cat) => {
    setEditingId(cat._id);
    setEditingName(cat.name);
    setEditingDescription(cat.description || '');
  };

  const handleEditSave = async (id) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    try {
      await axios.put(`${API_URL}/categories/${id}`, {
        name: trimmed,
        description: editingDescription.trim(),
      });
      setEditingId(null);
      await fetchAllCategories();
    } catch (error) {
      alert('Error saving: ' + error.message);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingName('');
    setEditingDescription('');
  };

  const seedDefaults = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/channels/seed`);
      await fetchAllCategories();
      alert('✅ All category types seeded with default values!');
    } catch (error) {
      alert('Error seeding categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCategorySection = (title, categories, type) => {
    const accent = ACCENT[type];
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: accent }}>
          {title} ({categories.length})
        </h3>
        {categories.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No {title.toLowerCase()} yet. Create one using the form above.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {categories.map(cat => (
              <div key={cat._id} className="stat-card" style={{ padding: '0.75rem 1rem' }}>
                {editingId === cat._id ? (
                  // ── Edit mode ──────────────────────────────────────
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      autoFocus
                      placeholder="Name"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && handleEditCancel()}
                      style={inputStyle(accent)}
                    />
                    <textarea
                      placeholder="Description (internal use only)"
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      rows={3}
                      style={{ ...inputStyle(accent), resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.4' }}
                    />
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Only for your reference. Not used in analytics.
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleEditSave(cat._id)}
                        style={{ flex: 1, background: 'var(--success)', border: 'none', color: 'white', borderRadius: '0.25rem', padding: '0.4rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}
                      >
                        <Check size={13} /> Save
                      </button>
                      <button
                        onClick={handleEditCancel}
                        style={{ flex: 1, background: '#334155', border: 'none', color: 'white', borderRadius: '0.25rem', padding: '0.4rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}
                      >
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // ── View mode ──────────────────────────────────────
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                      <span style={{ fontWeight: '500', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.name}
                      </span>
                      {cat.description && (
                        <FileText size={12} color="#64748b" title={cat.description} style={{ flexShrink: 0, cursor: 'help' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                      <button onClick={() => handleEditStart(cat)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(cat._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!activeChannel) {
    return (
      <div className="categories">
        <div className="insight-banner" style={{ background: 'var(--bg-card)', border: '1px dashed var(--warning)' }}>
          <AlertCircle size={24} color="var(--warning)" />
          <div>
            <strong>Select a Channel First!</strong> Choose a channel from the top bar to manage its categories.
          </div>
        </div>
      </div>
    );
  }

  const accent = ACCENT[activeTab];
  const addLabel = activeTab === 'CONTENT_CATEGORY' ? 'Category' : activeTab === 'CONTENT_TYPE' ? 'Type' : 'Hook';

  return (
    <div className="categories">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Category Master</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your 3-dimensional content analysis categories</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        {[
          { id: 'CONTENT_CATEGORY', label: '📦 Content Categories', color: '#6366f1' },
          { id: 'CONTENT_TYPE',     label: '🎬 Content Types',       color: '#22c55e' },
          { id: 'HOOK_TYPE',        label: '🎣 Hook Types',          color: '#f97316' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setNewName(''); setNewDescription(''); setShowAddDesc(false); }}
            style={{
              background: activeTab === tab.id ? tab.color : 'transparent',
              color: 'white',
              border: `2px solid ${activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.2)'}`,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Form */}
      <div className="stat-card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: showAddDesc ? '0.75rem' : '0' }}>
            <input
              type="text"
              placeholder={PLACEHOLDERS.name[activeTab]}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setShowAddDesc(p => !p)}
              title="Add description"
              style={{ background: showAddDesc ? `${accent}33` : 'rgba(255,255,255,0.05)', border: `1px solid ${showAddDesc ? accent : 'rgba(255,255,255,0.15)'}`, color: showAddDesc ? accent : '#94a3b8', borderRadius: '0.4rem', padding: '0 0.75rem', cursor: 'pointer', flexShrink: 0 }}
            >
              <FileText size={16} />
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !newName.trim()} style={{ flexShrink: 0 }}>
              <Plus size={18} /> Add {addLabel}
            </button>
          </div>

          {showAddDesc && (
            <div style={{ marginTop: '0.75rem' }}>
              <textarea
                placeholder={PLACEHOLDERS.description[activeTab]}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                disabled={loading}
                style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#1a1a2e', border: `1px solid ${accent}`, borderRadius: '0.35rem', color: 'white', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.4', boxSizing: 'border-box', outline: 'none' }}
              />
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Only for your reference. Not used in analytics or tags.
              </p>
            </div>
          )}
        </form>

        <button
          onClick={seedDefaults}
          style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', color: 'white', borderRadius: '0.4rem', cursor: 'pointer' }}
          disabled={loading}
        >
          Initialize with Defaults (Seeds All 3 Types)
        </button>
      </div>

      {/* Category List */}
      {activeTab === 'CONTENT_CATEGORY' && renderCategorySection('Content Categories', contentCats, 'CONTENT_CATEGORY')}
      {activeTab === 'CONTENT_TYPE'     && renderCategorySection('Content Types',       contentTypes, 'CONTENT_TYPE')}
      {activeTab === 'HOOK_TYPE'        && renderCategorySection('Hook Types',          hookTypes,    'HOOK_TYPE')}

      {/* Summary */}
      <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '0.75rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>📊 Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Content Categories</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#6366f1' }}>{contentCats.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Content Types</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#22c55e' }}>{contentTypes.length}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hook Types</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f97316' }}>{hookTypes.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
