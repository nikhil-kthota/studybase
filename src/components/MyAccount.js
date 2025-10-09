import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './MyAccount.css';

const MyAccount = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState({
    bases: 0,
    files: 0,
    storage: '0 MB'
  });
  const [userBases, setUserBases] = useState([]);
  const [userFiles, setUserFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Fetch user bases
        const { data: bases, error: basesError } = await supabase
          .from('bases')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (basesError) throw basesError;

        // Fetch user files
        const { data: files, error: filesError } = await supabase
          .from('base_files')
          .select(`
            *,
            bases!inner(user_id)
          `)
          .eq('bases.user_id', user.id)
          .order('uploaded_at', { ascending: false });

        if (filesError) throw filesError;

        // Calculate storage used
        const totalStorage = files.reduce((sum, file) => sum + file.file_size, 0);
        const storageFormatted = formatFileSize(totalStorage);

        // Update state
        setUserBases(bases || []);
        setUserFiles(files || []);
        setUserStats({
          bases: bases?.length || 0,
          files: files?.length || 0,
          storage: storageFormatted
        });

      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);



  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      console.log('Successfully logged out');
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    // Placeholder for delete account functionality
    console.log('Delete account confirmed');
    setShowDeleteConfirm(false);
    // In a real app, this would call a delete account API
  };

  const cancelDeleteAccount = () => {
    setShowDeleteConfirm(false);
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getUserEmail = () => {
    return user?.email || 'No email';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="my-account">
      <div className="account-container">
        {/* Header */}
        <div className="account-header">
          <div className="profile-section">
            <div className="profile-avatar-large">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M20.59 22C20.59 18.13 16.74 15 12 15C7.26 15 3.41 18.13 3.41 22" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="profile-info">
              <h1 className="profile-name">{getUserDisplayName()}</h1>
              <p className="profile-email">{getUserEmail()}</p>
            </div>
          </div>
        </div>

        {/* User Stats */}
        <div className="stats-section">
          <h2 className="section-title">Account Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{isLoading ? '...' : userStats.bases}</div>
                <div className="stat-label">Bases</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{isLoading ? '...' : userStats.files}</div>
                <div className="stat-label">Files</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6H16L14 4H10L8 6H4C2.9 6 2 6.9 2 8V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V8C22 6.9 21.1 6 20 6ZM20 19H4V8H6.83L8.83 6H15.17L17.17 8H20V19Z" fill="currentColor"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-number">{isLoading ? '...' : userStats.storage}</div>
                <div className="stat-label">Storage Used</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Files Section */}
        <div className="files-section">
          <h2 className="section-title">My Files</h2>
          <div className="files-grid">
            {isLoading ? (
              <div className="loading-placeholder">Loading files...</div>
            ) : userFiles.length > 0 ? (
              userFiles.slice(0, 6).map((file) => (
                <div key={file.id} className="file-card">
                  <div className="file-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="file-info">
                    <div className="file-name">{file.file_name}</div>
                    <div className="file-size">{formatFileSize(file.file_size)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No files uploaded yet</div>
            )}
          </div>
        </div>


        {/* My Bases Section */}
        <div className="bases-section">
          <h2 className="section-title">My Bases</h2>
          <div className="bases-grid">
            {isLoading ? (
              <div className="loading-placeholder">Loading bases...</div>
            ) : userBases.length > 0 ? (
              userBases.slice(0, 6).map((base) => {
                const baseFileCount = userFiles.filter(file => file.base_id === base.id).length;
                return (
                  <div key={base.id} className="base-card" onClick={() => navigate(`/base/${base.id}`)}>
                    <div className="base-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="base-info">
                      <div className="base-name">{base.name}</div>
                      <div className="base-files">{baseFileCount} files</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-data">No bases created yet</div>
            )}
          </div>
        </div>

        {/* Account Actions */}
        <div className="actions-section">
          <h2 className="section-title">Account Actions</h2>
          <div className="actions-grid">
            <button className="action-btn logout-btn" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="currentColor"/>
              </svg>
              Sign Out
            </button>

            <button className="action-btn delete-btn" onClick={handleDeleteAccount}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor"/>
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>Delete Account</h3>
              <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            </div>
            <div className="delete-modal-actions">
              <button className="cancel-btn" onClick={cancelDeleteAccount}>
                Cancel
              </button>
              <button className="confirm-delete-btn" onClick={confirmDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAccount;
