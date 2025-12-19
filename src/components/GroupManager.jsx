import React, { useState } from 'react';
import { groupService } from '../services/groupService';
import '../styles/Forms.css';

const GroupManager = ({ currentUserId, onGroupCreated }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    groupName: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.groupName.trim()) {
        setError('Please enter group name');
        setLoading(false);
        return;
      }

      const result = await groupService.createGroup(
        formData.groupName,
        formData.description,
        currentUserId
      );

      if (result.success) {
        setFormData({ groupName: '', description: '' });
        setShowForm(false);
        setSuccess('Group created successfully!');
        setTimeout(() => setSuccess(''), 3000);
        onGroupCreated();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-manager">
      <div className="manager-header">
        <h3>📁 Create New Group</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? '✕ Cancel' : '➕ New Group'}
        </button>
      </div>

      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="group-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              name="groupName"
              value={formData.groupName}
              onChange={handleChange}
              placeholder="e.g., Trip to Goa, Roommates, Project Team"
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What's this group for?"
              rows="3"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '⏳ Creating...' : '✓ Create Group'}
          </button>
        </form>
      )}
    </div>
  );
};

export default GroupManager;
