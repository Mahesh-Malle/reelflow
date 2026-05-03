import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { Users, Shield, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';

const AdminPanel = () => {
  const { API_URL, user, channels, hasPermission } = useApp();
  const [targetMobile, setTargetMobile] = useState('');
  const [targetName, setTargetName] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/auth/team`);
      setTeamMembers(data);
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const availablePermissions = [
    { id: 'VIEW_PLANNER', label: 'View Planner' },
    { id: 'EDIT_PLANNER', label: 'Edit Planner' },
    { id: 'VIEW_ANALYTICS', label: 'View Analytics' },
    { id: 'EDIT_ANALYTICS', label: 'Edit Analytics' },
    { id: 'ADMIN', label: 'Admin (Full Access)' },
  ];

  const handleChannelToggle = (id) => {
    setSelectedChannels(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePermissionToggle = (id) => {
    setPermissions([id]); // Only one role allowed
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetMobile || selectedChannels.length === 0 || permissions.length === 0) {
      alert('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/assign-access`, {
        targetMobile,
        name: targetName,
        channelIds: selectedChannels,
        permissions
      });
      setMessage({ type: 'success', text: `Access granted to ${targetMobile}` });
      setTargetMobile('');
      setTargetName('');
      setSelectedChannels([]);
      setPermissions([]);
      fetchTeamMembers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to assign access' });
    } finally {
      setLoading(false);
    }
  };

  const [editingMember, setEditingMember] = useState(null); // { userId, name, channelId, permissions }
  const [editName, setEditName] = useState('');

  const handleUpdateName = async (userId) => {
    try {
      await axios.put(`${API_URL}/auth/team/${userId}`, { name: editName });
      setEditingMember(null);
      fetchTeamMembers();
      setMessage({ type: 'success', text: 'Name updated' });
    } catch (error) {
      alert('Failed to update name');
    }
  };

  const handleUpdateAccess = async (userId, channelId, permissions) => {
    if (userId === user.userId && !permissions.includes('ADMIN') && !user.isAdmin) {
      alert('You cannot remove your own ADMIN permission');
      return;
    }
    try {
      await axios.put(`${API_URL}/auth/team/${userId}`, { channelId, permissions });
      fetchTeamMembers();
      setMessage({ type: 'success', text: 'Permissions updated' });
    } catch (error) {
      alert('Failed to update permissions');
    }
  };

  const handleRemoveAccess = async (userId, channelId) => {
    if (userId === user.userId) {
      alert('You cannot remove your own access');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this user\'s access to this channel?')) return;
    try {
      await axios.delete(`${API_URL}/auth/team/${userId}/${channelId}`);
      fetchTeamMembers();
      setMessage({ type: 'success', text: 'Access removed' });
    } catch (error) {
      alert('Failed to remove access');
    }
  };

  if (!hasPermission('ADMIN')) {
    return <div className="stat-card">Access Denied. Admins only.</div>;
  }

  return (
    <div className="admin-panel">
      <div style={{ marginBottom: '2rem' }}>
        <h2><Shield size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Team Access Management</h2>
        <p style={{ color: 'var(--text-muted)' }}>Grant channel access to team members and view your team.</p>
      </div>

      <div className="responsive-grid" style={{ alignItems: 'start', gap: '2rem' }}>
        <form className="stat-card" onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '1.5rem' }}>Assign New Access</h3>
          
          <div className="form-group">
            <label>Team Member Name</label>
            <input 
              type="text" 
              placeholder="e.g., John Doe" 
              value={targetName}
              onChange={e => setTargetName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>User Mobile Number</label>
            <input 
              type="text" 
              placeholder="e.g., 9876543210" 
              value={targetMobile}
              onChange={e => setTargetMobile(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Select Channels</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {channels.map(c => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => handleChannelToggle(c._id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    border: `1px solid ${selectedChannels.includes(c._id) ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                    background: selectedChannels.includes(c._id) ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: selectedChannels.includes(c._id) ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Permissions</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {availablePermissions.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '0.4rem', background: 'rgba(255,255,255,0.02)' }}>
                  <input 
                    type="radio" 
                    name="permission"
                    checked={permissions.includes(p.id)}
                    onChange={() => handlePermissionToggle(p.id)}
                  />
                  <span style={{ fontSize: '0.88rem' }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {message && (
            <div style={{ 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1rem',
              background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: message.type === 'success' ? '#22c55e' : '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {message.text}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Processing...' : 'Grant Access'}
          </button>
        </form>

        <div className="stat-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> Current Team
          </h3>
          {teamMembers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No team members assigned yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {teamMembers.map(member => (
                <div key={member._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    {editingMember?.userId === member._id && !editingMember.channelId ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                        <input 
                          autoFocus
                          type="text" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          style={{ flex: 1, padding: '0.3rem 0.6rem' }}
                        />
                        <button onClick={() => handleUpdateName(member._id)} className="btn btn-primary" style={{ padding: '0.3rem 0.75rem' }}>Save</button>
                        <button onClick={() => setEditingMember(null)} className="btn" style={{ padding: '0.3rem 0.75rem', background: '#334155' }}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{member.name}</h4>
                            <button 
                              onClick={() => { setEditingMember({ userId: member._id }); setEditName(member.name); }}
                              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                            >
                              Edit Name
                            </button>
                          </div>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{member.mobileNumber}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em', fontWeight: '600' }}>Channel Access</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {member.access.map((acc, i) => {
                        const channel = channels.find(c => c._id === acc.channelId);
                        const isEditingThis = editingMember?.userId === member._id && editingMember.channelId === acc.channelId;
                        
                        return (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{channel?.name || 'Unknown Channel'}</span>
                              <div style={{ display: 'flex', gap: '0.75rem' }}>
                                {!isEditingThis && (
                                  <>
                                    <button 
                                      onClick={() => setEditingMember({ userId: member._id, channelId: acc.channelId, role: acc.role })}
                                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      Edit Access
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveAccess(member._id, acc.channelId)}
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {isEditingThis ? (
                              <div style={{ marginTop: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                  {availablePermissions.map(p => (
                                    <label key={p.id} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                      <input 
                                        type="radio" 
                                        name={`edit-perm-${member._id}-${acc.channelId}`}
                                        checked={editingMember.role === p.id}
                                        onChange={() => {
                                          setEditingMember({ ...editingMember, role: p.id });
                                        }}
                                      />
                                      {p.label}
                                    </label>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button onClick={() => handleUpdateAccess(member._id, acc.channelId, [editingMember.role])} className="btn btn-primary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>Apply</button>
                                  <button onClick={() => setEditingMember(null)} className="btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', background: '#334155' }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', color: 'var(--primary)' }}>
                                  {acc.role?.replace('_', ' ') || 'No Role'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
