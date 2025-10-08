import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './MyBases.css';

const MyBases = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bases, setBases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [baseToDelete, setBaseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadBases = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        const { data, error: basesError } = await supabase
          .from('bases')
          .select(`
            *,
            base_files(count)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (basesError) throw basesError;

        setBases(data || []);
      } catch (err) {
        console.error('Error loading bases:', err);
        setError('Failed to load bases. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBases();
  }, [user]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileCount = (base) => {
    return base.base_files?.[0]?.count || 0;
  };

  const handleDeleteBase = (base) => {
    setBaseToDelete(base);
    setShowDeleteModal(true);
  };

  const confirmDeleteBase = async () => {
    if (!baseToDelete) return;
    
    setIsDeleting(true);
    try {
      // First, get all files in the base to delete them from storage
      const { data: files, error: filesError } = await supabase
        .from('base_files')
        .select('file_path')
        .eq('base_id', baseToDelete.id);

      if (filesError) throw filesError;

      // Delete files from storage
      if (files && files.length > 0) {
        const filePaths = files.map(file => file.file_path);
        const { error: storageError } = await supabase.storage
          .from('files')
          .remove(filePaths);

        if (storageError) throw storageError;
      }

      // Delete base from database (this will cascade delete base_files due to foreign key)
      const { error: deleteError } = await supabase
        .from('bases')
        .delete()
        .eq('id', baseToDelete.id);

      if (deleteError) throw deleteError;

      // Update local state
      setBases(bases.filter(base => base.id !== baseToDelete.id));
      setShowDeleteModal(false);
      setBaseToDelete(null);

    } catch (err) {
      console.error('Error deleting base:', err);
      setError('Failed to delete base. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteBase = () => {
    setShowDeleteModal(false);
    setBaseToDelete(null);
  };

  return (
    <div className="my-bases">
      <div className="my-bases-container">
        {/* Header */}
        <div className="my-bases-header">
          <div className="header-icon">📚</div>
          <h1 className="header-title">My Bases</h1>
          <p className="header-subtitle">Manage your study bases and files</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Bases Grid */}
        <div className="bases-content">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your bases...</p>
            </div>
          ) : bases.length > 0 ? (
            <div className="bases-grid">
              {bases.map((base) => (
                <div key={base.id} className="base-card" onClick={() => navigate(`/base/${base.id}`)}>
                  <div className="base-header">
                    <div className="base-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="base-info">
                      <h3 className="base-name">{base.name}</h3>
                      <p className="base-date">Created {formatDate(base.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="base-stats">
                    <div className="stat-item">
                      <span className="stat-number">{getFileCount(base)}</span>
                      <span className="stat-label">Files</span>
                    </div>
                  </div>

                  <div className="base-actions">
                    <button className="action-btn open-btn" onClick={(e) => { e.stopPropagation(); navigate(`/base/${base.id}`); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H16C17.1046 21 18 20.1046 18 19V17M8 5C8 6.10457 8.89543 7 10 7H12C13.1046 7 14 6.10457 14 5M8 5C8 3.89543 8.89543 3 10 3H12C13.1046 3 14 3.89543 14 5M16 3H18C19.1046 3 20 3.89543 20 5V7C20 8.10457 19.1046 9 18 9H16C14.8954 9 14 8.10457 14 7V5C14 3.89543 14.8954 3 16 3Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Open Base
                    </button>
                    <button className="action-btn edit-btn" onClick={(e) => { e.stopPropagation(); navigate(`/edit-base/${base.id}`); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2"/>
                        <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Edit
                    </button>
                    <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteBase(base); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No bases created yet</h3>
              <p>Create your first study base to get started!</p>
              <button className="create-first-base-btn" onClick={() => navigate('/new-base')}>
                Create Your First Base
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <button className="close-button" onClick={cancelDeleteBase}>&times;</button>
            <div className="delete-modal-header">
              <h3 className="delete-modal-title">Delete Base</h3>
              <p className="delete-modal-message">
                Are you sure you want to delete "{baseToDelete?.name}"? This will permanently delete the base and all its files. This action cannot be undone.
              </p>
            </div>
            <div className="delete-modal-actions">
              <button className="cancel-btn" onClick={cancelDeleteBase} disabled={isDeleting}>
                Cancel
              </button>
              <button className="confirm-delete-btn" onClick={confirmDeleteBase} disabled={isDeleting}>
                {isDeleting ? (
                  <div className="spinner"></div>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBases;
