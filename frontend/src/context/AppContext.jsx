import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${API_URL}/channels/my-channels`);
      setChannels(data);
      if (data.length > 0 && !activeChannel) {
        setActiveChannel(data[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching channels:', error);
      setLoading(false);
    }
  };

  const hasPermission = (permission) => {
    if (!user || !activeChannel) return false;
    if (user.isAdmin) return true;

    const PERMISSION_LEVELS = {
      'VIEW_PLANNER': 1,
      'SCRIPT_WRITER': 1.5,
      'EDIT_PLANNER': 2,
      'VIEW_ANALYTICS': 3,
      'EDIT_ANALYTICS': 4,
      'ADMIN': 5,
    };

    const roleData = user.accessMap?.[activeChannel._id];
    const role = Array.isArray(roleData) ? roleData[0] : roleData;
    const userLevel = PERMISSION_LEVELS[role] || 0;
    const requiredLevel = PERMISSION_LEVELS[permission] || 0;

    return userLevel >= requiredLevel;
  };

  return (
    <AppContext.Provider value={{
      channels,
      activeChannel,
      setActiveChannel,
      user,
      setUser,
      loading,
      API_URL,
      fetchChannels,
      hasPermission
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
