import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api.js';
import { DistributionList } from '../../types/index.js';
import { User, Mail, Plus, Trash2, Save, KeyRound, Users, Check, AlertCircle } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [distributionLists, setDistributionLists] = useState<DistributionList[]>(
    user?.distribution_lists && user.distribution_lists.length > 0
      ? user.distribution_lists
      : [{ id: 'default-dl', name: 'Immediate Family', emails: user?.saved_emails || [] }]
  );
  const [newDlName, setNewDlName] = useState('');
  const [addingEmailToDlId, setAddingEmailToDlId] = useState<string | null>(null);
  const [newEmailAddress, setNewEmailAddress] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state with user profile changes
  React.useEffect(() => {
    if (user) {
      if (user.distribution_lists && user.distribution_lists.length > 0) {
        setDistributionLists(user.distribution_lists);
      } else if (user.saved_emails && user.saved_emails.length > 0) {
        setDistributionLists([
          { id: 'default-dl', name: 'Immediate Family', emails: user.saved_emails }
        ]);
      }
      setName(user.name || '');
    }
  }, [user]);

  // Immediately persist Distribution Lists to database so navigating away preserves all changes
  const persistDistributionLists = async (updatedLists: DistributionList[]) => {
    setDistributionLists(updatedLists);
    try {
      const allUniqueEmails = Array.from(new Set(updatedLists.flatMap(dl => dl.emails)));
      await api.updateProfile({
        distribution_lists: updatedLists,
        saved_emails: allUniqueEmails
      });
      await refreshUser();
    } catch (err: any) {
      console.error('Failed to auto-save distribution lists:', err);
    }
  };

  // Password validation checks
  const hasMinLen = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword);
  const isNewPasswordValid = !newPassword || (hasMinLen && hasNumber && hasSpecial);

  // Add a new Distribution List
  const handleCreateDl = async () => {
    const trimmed = newDlName.trim();
    if (!trimmed) return;

    const updated = [
      ...distributionLists,
      { id: `dl-${Date.now()}`, name: trimmed, emails: [] }
    ];
    setNewDlName('');
    await persistDistributionLists(updated);
  };

  // Remove a Distribution List
  const handleRemoveDl = async (dlId: string) => {
    if (!window.confirm('Delete this distribution list?')) return;
    const updated = distributionLists.filter(dl => dl.id !== dlId);
    await persistDistributionLists(updated);
  };

  // Add email into a specific Distribution List
  const handleAddEmailToDl = async (dlId: string) => {
    const trimmed = newEmailAddress.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;

    const updated = distributionLists.map(dl => {
      if (dl.id !== dlId) return dl;
      if (dl.emails.includes(trimmed)) return dl;
      return { ...dl, emails: [...dl.emails, trimmed] };
    });

    setNewEmailAddress('');
    setAddingEmailToDlId(null);
    await persistDistributionLists(updated);
  };

  // Remove email from a Distribution List
  const handleRemoveEmailFromDl = async (dlId: string, emailIndex: number) => {
    const updated = distributionLists.map(dl => {
      if (dl.id !== dlId) return dl;
      return { ...dl, emails: dl.emails.filter((_, idx) => idx !== emailIndex) };
    });
    await persistDistributionLists(updated);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && !isNewPasswordValid) {
      setStatusMsg({
        type: 'error',
        text: 'New password must be at least 8 characters long, contain at least 1 number, and 1 special character.'
      });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    // Collect all emails across all DLs for backwards compatibility
    const allUniqueEmails = Array.from(new Set(distributionLists.flatMap(dl => dl.emails)));

    try {
      await api.updateProfile({
        name: name.trim(),
        saved_emails: allUniqueEmails,
        distribution_lists: distributionLists,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined
      });
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setStatusMsg({ type: 'success', text: 'Family Distribution Lists and profile updated successfully!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <p>Please sign in to view your profile.</p>;
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', margin: '0 0 6px 0' }}>Family Contacts & Distribution Lists</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          Build Family Distribution Lists (DLs) to easily email meal plan short-links to specific family circles.
        </p>
      </div>

      {statusMsg && (
        <div className={`alert alert-${statusMsg.type}`}>{statusMsg.text}</div>
      )}

      <form onSubmit={handleSaveProfile}>
        {/* Family Distribution Lists */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Family Distribution Lists (DL)</h3>
            </div>
          </div>

          <div className="card-body">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Create named distribution lists (e.g. <em>"Immediate Family"</em>, <em>"Extended Family & Grandparents"</em>). When sharing any meal plan, you can choose to send the link to a specific Distribution List or to a single email address.
            </p>

            {/* List of existing DLs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {distributionLists.map(dl => (
                <div
                  key={dl.id}
                  style={{
                    background: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                        {dl.name}
                      </span>
                      <span style={{ fontSize: '0.78rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        {dl.emails.length} contact{dl.emails.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDl(dl.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--macro-protein)', padding: '4px 8px' }}
                      title="Delete this distribution list"
                    >
                      <Trash2 size={15} /> Delete DL
                    </button>
                  </div>

                  {/* Emails inside this DL */}
                  {dl.emails.length > 0 ? (
                    <ul style={{ listStyle: 'none', marginBottom: '10px' }}>
                      {dl.emails.map((email, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-card)',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            fontSize: '0.88rem',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} color="var(--text-light)" /> {email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmailFromDl(dl.id, idx)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--macro-protein)', padding: '2px 6px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', fontStyle: 'italic', margin: '6px 0 10px' }}>
                      No emails added to this list yet.
                    </p>
                  )}

                  {/* Add email to this DL form */}
                  {addingEmailToDlId === dl.id ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="email"
                        placeholder="family-member@example.com"
                        value={newEmailAddress}
                        onChange={(e) => setNewEmailAddress(e.target.value)}
                        className="form-input"
                        style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddEmailToDl(dl.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Add to DL
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingEmailToDlId(null); setNewEmailAddress(''); }}
                        className="btn btn-ghost btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAddingEmailToDlId(dl.id); setNewEmailAddress(''); }}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.82rem' }}
                    >
                      <Plus size={14} /> Add Email to this DL
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Create New DL Form */}
            <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>Create New Distribution List</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. Extended Family & In-Laws"
                  value={newDlName}
                  onChange={(e) => setNewDlName(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                />
                <button
                  type="button"
                  onClick={handleCreateDl}
                  disabled={!newDlName.trim()}
                  className="btn btn-secondary"
                >
                  <Plus size={16} /> Create List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info & Password */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Account Details</h3>
            </div>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Name / Family Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Login)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="form-input"
                style={{ opacity: 0.7 }}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={16} /> Change Password (Optional)
            </h4>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 number, 1 special char"
                  className="form-input"
                />
              </div>
            </div>

            {newPassword && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>New Password Requirements:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: hasMinLen ? 'var(--secondary)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasMinLen ? <Check size={13} /> : '•'} At least 8 characters
                  </span>
                  <span style={{ color: hasNumber ? 'var(--secondary)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasNumber ? <Check size={13} /> : '•'} At least 1 number (0-9)
                  </span>
                  <span style={{ color: hasSpecial ? 'var(--secondary)' : 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {hasSpecial ? <Check size={13} /> : '•'} At least 1 special character (!@#$%^&*)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="card-footer">
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
