import React, { useState } from 'react';
import { MealPlan, DistributionList } from '../../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api.js';
import { X, Share2, Copy, Check, Mail, Send, Users, AtSign } from 'lucide-react';

interface ShareModalProps {
  plan: MealPlan;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ plan, onClose }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [sendTargetType, setSendTargetType] = useState<'dl' | 'single'>('dl');

  const distributionLists: DistributionList[] = user?.distribution_lists || [
    { id: 'default-dl', name: 'Immediate Family', emails: user?.saved_emails || [] }
  ];

  const [selectedDlId, setSelectedDlId] = useState<string>(
    distributionLists.length > 0 ? distributionLists[0].id : ''
  );
  const [singleEmail, setSingleEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/share/plan/${plan.share_token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendToDl = async () => {
    if (!selectedDlId) return;
    setEmailing(true);
    setStatusMsg(null);
    try {
      const res = await api.emailMealPlan(plan.id, { distribution_list_id: selectedDlId });
      setStatusMsg({ type: 'success', text: res.message });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send email to Distribution List.' });
    } finally {
      setEmailing(false);
    }
  };

  const handleSendToSingle = async () => {
    if (!singleEmail.trim()) return;
    setEmailing(true);
    setStatusMsg(null);
    try {
      const res = await api.emailMealPlan(plan.id, { single_email: singleEmail.trim() });
      setStatusMsg({ type: 'success', text: res.message });
      setSingleEmail('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to send email.' });
    } finally {
      setEmailing(false);
    }
  };

  const currentSelectedDl = distributionLists.find(d => d.id === selectedDlId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Share Family Meal Plan</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {statusMsg && (
            <div className={`alert alert-${statusMsg.type}`}>{statusMsg.text}</div>
          )}

          {/* Short-link display with copy button */}
          <div style={{ marginBottom: '22px' }}>
            <label className="form-label">Public Short-Link (for SMS, WhatsApp or Text)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="form-input"
                style={{ background: 'var(--bg-card-subtle)', cursor: 'text' }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-outline"
                style={{ minWidth: '100px' }}
              >
                {copied ? <><Check size={16} color="var(--secondary)" /> Copied!</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Anyone with this link can view this meal plan on mobile or desktop without an account.
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '18px 0' }} />

          {/* Email via SMTP Section */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={18} color="var(--primary)" /> Send Link via SMTP
            </h4>

            {/* Target Selection: DL vs Single Email */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setSendTargetType('dl')}
                className={`btn btn-sm ${sendTargetType === 'dl' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1 }}
              >
                <Users size={15} /> Send to Distribution List (DL)
              </button>
              <button
                type="button"
                onClick={() => setSendTargetType('single')}
                className={`btn btn-sm ${sendTargetType === 'single' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1 }}
              >
                <AtSign size={15} /> Send to One Email Address
              </button>
            </div>

            {/* Option 1: Send to Distribution List */}
            {sendTargetType === 'dl' && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {distributionLists.length > 0 ? (
                  <>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '0.85rem' }}>Select Family Distribution List:</label>
                      <select
                        className="form-select"
                        value={selectedDlId}
                        onChange={(e) => setSelectedDlId(e.target.value)}
                      >
                        {distributionLists.map(dl => (
                          <option key={dl.id} value={dl.id}>
                            {dl.name} ({dl.emails.length} contact{dl.emails.length !== 1 ? 's' : ''})
                          </option>
                        ))}
                      </select>
                    </div>

                    {currentSelectedDl && currentSelectedDl.emails.length > 0 ? (
                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', display: 'block', marginBottom: '6px' }}>
                          Recipients in this list:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {currentSelectedDl.emails.map((em, idx) => (
                            <span key={idx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem' }}>
                              {em}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.82rem', color: 'var(--amber-text)', margin: '6px 0 12px' }}>
                        This distribution list has no email addresses yet. Add contacts in your Profile.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={emailing || !currentSelectedDl || currentSelectedDl.emails.length === 0}
                      onClick={handleSendToDl}
                      className="btn btn-secondary"
                      style={{ width: '100%' }}
                    >
                      <Send size={15} /> {emailing ? 'Sending...' : `Send Plan to DL: "${currentSelectedDl?.name || ''}"`}
                    </button>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No Distribution Lists created yet. Create one under Family Contacts!
                  </p>
                )}
              </div>
            )}

            {/* Option 2: Send to Single Email Address */}
            {sendTargetType === 'single' && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem' }}>Recipient Email Address:</label>
                  <input
                    type="email"
                    placeholder="e.g. partner@example.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    className="form-input"
                  />
                </div>

                <button
                  type="button"
                  disabled={emailing || !singleEmail.trim()}
                  onClick={handleSendToSingle}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <Send size={15} /> {emailing ? 'Sending...' : 'Send Plan to this Email'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
