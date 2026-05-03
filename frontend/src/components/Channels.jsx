import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Edit2, Play, Heart, X } from 'lucide-react';

const Channels = () => {
  const { channels, API_URL, setActiveChannel, activeChannel, fetchChannels, user } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newChannel, setNewChannel] = useState({
    name: '',
    youtubeHandle: '',
    instagramHandle: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/channels/${editingId}`, newChannel);
        setEditingId(null);
        alert('Channel updated successfully!');
      } else {
        const response = await axios.post(`${API_URL}/channels`, newChannel);
        setActiveChannel(response.data);
      }
      setNewChannel({ name: '', youtubeHandle: '', instagramHandle: '' });
      setShowAdd(false);
      fetchChannels();
    } catch (error) {
      alert("Error saving channel: " + error.message);
    }
  };

  const handleEdit = (channel) => {
    setEditingId(channel._id);
    setNewChannel({ name: channel.name, youtubeHandle: channel.youtubeHandle || '', instagramHandle: channel.instagramHandle || '' });
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this channel? This cannot be undone.")) {
      try {
        await axios.delete(`${API_URL}/channels/${id}`);
        if (activeChannel?._id === id) {
          setActiveChannel(channels[0]);
        }
        fetchChannels();
        alert('Channel deleted successfully!');
      } catch (error) {
        alert("Error deleting channel: " + error.message);
      }
    }
  };

  const seedDefaults = async () => {
    try {
      await axios.post(`${API_URL}/channels/seed`);
      fetchChannels();
      alert('Default channels created!');
    } catch (error) {
      alert("Seed failed. Make sure backend is running.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewChannel({ name: '', youtubeHandle: '', instagramHandle: '' });
    setShowAdd(false);
  };

  return (
    <div className="channels-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Manage Your Channels</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Add, edit, or remove your YouTube/Instagram channels</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => !editingId && (setShowAdd(!showAdd), setNewChannel({ name: '', youtubeHandle: '', instagramHandle: '' }))}>
            <Plus size={18} /> Add Channel
          </button>
          {channels.length === 0 && (
            <button className="btn" onClick={seedDefaults} style={{ background: '#334155' }}>
              Seed Default Channels
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <form className="stat-card" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>{editingId ? 'Edit Channel' : 'Add New Channel'}</h3>
            <button type="button" onClick={cancelEdit} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>
              <X size={24} />
            </button>
          </div>
          <div className="form-group">
            <label>Channel Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. MSquare"
              value={newChannel.name} 
              onChange={(e) => setNewChannel({...newChannel, name: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>YouTube Handle (Optional)</label>
            <input 
              type="text" 
              placeholder="@youtubehandle"
              value={newChannel.youtubeHandle} 
              onChange={(e) => setNewChannel({...newChannel, youtubeHandle: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Instagram Handle (Optional)</label>
            <input 
              type="text" 
              placeholder="instagramhandle"
              value={newChannel.instagramHandle} 
              onChange={(e) => setNewChannel({...newChannel, instagramHandle: e.target.value})} 
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" className="btn btn-primary">{editingId ? 'Update Channel' : 'Create Channel'}</button>
            <button type="button" onClick={cancelEdit} className="btn" style={{ background: '#334155' }}>Cancel</button>
          </div>
        </form>
      )}

      {channels.length === 0 ? (
        <div className="stat-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No channels created yet. Start by adding your first channel!</p>
        </div>
      ) : (
        <div className="stats-grid">
          {channels.map(channel => (
            <div 
              key={channel._id} 
              className={`stat-card`}
              style={{ 
                cursor: 'pointer',
                border: activeChannel?._id === channel._id ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{channel.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Available on: YouTube & Instagram</p>
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {channel.youtubeHandle && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <Play size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> YouTube: <strong>{channel.youtubeHandle}</strong>
                  </div>
                )}
                {channel.instagramHandle && (
                  <div>
                    <Heart size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Instagram: <strong>{channel.instagramHandle}</strong>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setActiveChannel(channel)}
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    background: activeChannel?._id === channel._id ? 'var(--primary)' : 'rgba(99,102,241,0.2)', 
                    border: 'none', 
                    color: 'white', 
                    borderRadius: '0.5rem', 
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {activeChannel?._id === channel._id ? '✓ Active' : 'Select'}
                </button>
                <button 
                  onClick={() => handleEdit(channel)}
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    background: 'rgba(120,119,198,0.2)', 
                    border: 'none', 
                    color: '#a78bfa', 
                    borderRadius: '0.5rem', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                {user?.isAdmin && (
                  <button 
                    onClick={() => handleDelete(channel._id)}
                    style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: 'rgba(239,68,68,0.2)', 
                      border: 'none', 
                      color: '#fca5a5', 
                      borderRadius: '0.5rem', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Channels;
