import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types/index.js';
import { api } from '../api.js';
import {
  Shield,
  Settings,
  Mail,
  Download,
  Upload,
  Database,
  FileCode,
  CheckCircle,
  AlertCircle,
  Send,
  Save,
  HelpCircle
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'smtp' | 'import' | 'export' | 'backup'>('settings');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SMTP test state
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<string | null>(null);

  // Bulk import state
  const [importContent, setImportContent] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // DB Restore & Blank Init state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const [resettingBlank, setResettingBlank] = useState(false);
  const [blankResetResult, setBlankResetResult] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminSettings();
      setSettings(res.settings);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load admin settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.saveAdminSettings(settings);
      setStatusMsg({ type: 'success', text: res.message });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpResult(null);
    try {
      const res = await api.testSmtp(testEmail.trim() || undefined);
      setSmtpResult(`✅ Success: ${res.message}`);
    } catch (err: any) {
      setSmtpResult(`❌ Error: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportResult(null);

    try {
      const res = await api.importBulkRecipes(importFile || importContent);
      setImportResult(`✅ ${res.message}`);
      setImportContent('');
      setImportFile(null);
    } catch (err: any) {
      setImportResult(`❌ Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleRestoreDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    if (!window.confirm('WARNING: Restoring the database will replace existing data. Proceed?')) return;

    setRestoring(true);
    setRestoreResult(null);

    try {
      const res = await api.restoreDatabase(restoreFile);
      setRestoreResult(`✅ ${res.message}`);
      setRestoreFile(null);
      loadSettings();
    } catch (err: any) {
      setRestoreResult(`❌ Restore failed: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleResetBlankDatabase = async () => {
    if (
      !window.confirm(
        'WARNING: This will create a fresh blank database containing ONLY the default admin account (0 meal plans, 0 recipes, 0 shopping lists). A backup of the current database will be saved on disk first. Proceed?'
      )
    ) {
      return;
    }

    setResettingBlank(true);
    setBlankResetResult(null);
    try {
      const res = await api.resetBlankDatabase();
      setBlankResetResult(`✅ ${res.message}`);
      loadSettings();
    } catch (err: any) {
      setBlankResetResult(`❌ Failed to create blank database: ${err.message}`);
    } finally {
      setResettingBlank(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading administration dashboard...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Shield size={28} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Administrator Control Panel</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            App configuration, SMTP mail settings, database backup/restore, and bulk YAML/JSON recipe tools.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className={`alert alert-${statusMsg.type}`}>{statusMsg.text}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('settings')}
          className={`btn btn-sm ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Settings size={16} /> App Settings & Nutrients
        </button>

        <button
          onClick={() => setActiveTab('smtp')}
          className={`btn btn-sm ${activeTab === 'smtp' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Mail size={16} /> SMTP Email Config
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`btn btn-sm ${activeTab === 'import' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Upload size={16} /> Bulk Recipe Import (YAML/JSON)
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`btn btn-sm ${activeTab === 'export' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Download size={16} /> Bulk Export
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`btn btn-sm ${activeTab === 'backup' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Database size={16} /> Database Backup & Restore
        </button>
      </div>

      {/* TAB 1: App Settings & Nutrients */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="card">
          <div className="card-header">
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>General Application Variables</h3>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Application Name</label>
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Allow New User Registrations</label>
                <select
                  value={settings.allow_registrations ? 'true' : 'false'}
                  onChange={(e) => setSettings({ ...settings, allow_registrations: e.target.value === 'true' })}
                  className="form-select"
                >
                  <option value="true">Enabled (Allow public registrations)</option>
                  <option value="false">Disabled (Admin invite only)</option>
                </select>
              </div>
            </div>

            <h4 style={{ margin: '20px 0 12px 0', fontSize: '1rem', color: 'var(--primary)' }}>
              Default Daily Macronutrient Targets
            </h4>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-cal)' }}>Calories (kcal)</label>
                <input
                  type="number"
                  value={settings.calorie_target_default}
                  onChange={(e) => setSettings({ ...settings, calorie_target_default: Number(e.target.value) })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-protein)' }}>Protein (g)</label>
                <input
                  type="number"
                  value={settings.protein_target_default}
                  onChange={(e) => setSettings({ ...settings, protein_target_default: Number(e.target.value) })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-carbs)' }}>Carbohydrates (g)</label>
                <input
                  type="number"
                  value={settings.carbs_target_default}
                  onChange={(e) => setSettings({ ...settings, carbs_target_default: Number(e.target.value) })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--macro-fat)' }}>Fat (g)</label>
                <input
                  type="number"
                  value={settings.fat_target_default}
                  onChange={(e) => setSettings({ ...settings, fat_target_default: Number(e.target.value) })}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Google Gemini AI API Key (Free Tier)</label>
              <input
                type="password"
                placeholder={settings.has_gemini_key ? '•••••••••••••••• (API Key Active)' : 'Enter Google AI Studio Gemini API Key'}
                value={settings.gemini_api_key || ''}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                className="form-input"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
                Used for AI Recipe Parsing & AI Meal Balancing. Obtain a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio</a>.
              </span>
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Google SSO OAuth Client ID</label>
              <input
                type="text"
                placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                value={settings.google_client_id || ''}
                onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
                className="form-input"
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>
                Optional. Enables one-click &quot;Sign in with Google&quot; on the login modal. Obtain from Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.
              </span>
            </div>
          </div>
          <div className="card-footer">
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Changes apply immediately across the application.</span>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save size={16} /> {saving ? 'Saving...' : 'Save App Variables'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SMTP Email Settings */}
      {activeTab === 'smtp' && settings && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form onSubmit={handleSaveSettings} className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>SMTP Mail Server Configuration</h3>
            </div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com or smtp.sendgrid.net"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Port</label>
                  <input
                    type="number"
                    placeholder="587 or 465"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: Number(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">SMTP Username</label>
                  <input
                    type="text"
                    placeholder="you@gmail.com"
                    value={settings.smtp_user}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Password / App Password</label>
                  <input
                    type="password"
                    placeholder="Enter password or leave masked"
                    value={settings.smtp_pass || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">From Email Address</label>
                  <input
                    type="email"
                    placeholder="meals@yourfamilydomain.com"
                    value={settings.smtp_from_email}
                    onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">From Name</label>
                  <input
                    type="text"
                    placeholder="FamilyMeals Kitchen"
                    value={settings.smtp_from_name}
                    onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={settings.smtp_secure}
                    onChange={(e) => setSettings({ ...settings, smtp_secure: e.target.checked })}
                  />
                  Use SSL/TLS (Check for Port 465, Uncheck for Port 587/STARTTLS)
                </label>
              </div>
            </div>
            <div className="card-footer">
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Required for emailing meal plan short-links to family.</span>
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Save size={16} /> Save SMTP Settings
              </button>
            </div>
          </form>

          {/* Test SMTP Tool */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Test SMTP Connection</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Verify your email configuration by sending an instant test message to any email address.
              </p>

              {smtpResult && (
                <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: '6px', marginBottom: '14px', fontSize: '0.9rem' }}>
                  {smtpResult}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="email"
                  placeholder="Enter recipient email (defaults to your admin email)"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '400px' }}
                />
                <button
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="btn btn-secondary"
                >
                  <Send size={16} /> {testingSmtp ? 'Verifying...' : 'Send Test Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Bulk Recipe Import (YAML or JSON) */}
      {activeTab === 'import' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Bulk Import Recipes (YAML or JSON)</h3>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Quickly add multiple recipes into the database at once instead of typing them individually.
              </p>
            </div>
          </div>

          <form onSubmit={handleBulkImport}>
            <div className="card-body">
              {importResult && (
                <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: '6px', marginBottom: '16px' }}>
                  {importResult}
                </div>
              )}

              {/* Upload File Option */}
              <div className="form-group">
                <label className="form-label">Upload YAML or JSON File (.yaml, .yml, .json)</label>
                <input
                  type="file"
                  accept=".yaml,.yml,.json"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="form-input"
                />
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0', color: 'var(--text-light)', fontWeight: 600 }}>
                — OR PASTE CONTENT BELOW —
              </div>

              {/* Paste Text Option */}
              <div className="form-group">
                <label className="form-label">Paste YAML or JSON Text</label>
                <textarea
                  rows={10}
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder={`- title: "Family Roast Chicken"
  description: "Sunday family favorite"
  prep_time_minutes: 20
  cook_time_minutes: 45
  servings: 4
  method: "Season chicken with herbs.\\n\\nRoast for 45 mins at 200C."
  ingredients:
    - item: "Chicken breast"
      amount: 500
      unit: "g"
      category: "Meat & Poultry"
      protein: 45`}
                  className="form-textarea"
                  style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            <div className="card-footer">
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                YAML format supports standard indentation. Double blank lines separate method steps.
              </span>
              <button type="submit" disabled={importing || (!importFile && !importContent.trim())} className="btn btn-primary">
                <Upload size={16} /> {importing ? 'Importing Recipes...' : 'Import Recipes Now'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Bulk Export */}
      {activeTab === 'export' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Bulk Export Recipes, Meals & Plans</h3>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Download all database recipes, schedule meals, and weekly meal plans in standardized YAML or JSON.
              </p>
            </div>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Export files can be archived, transferred to other FamilyMeals instances, or used in offline meal planning systems.
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <a href={api.getBulkExportUrl('json')} download className="btn btn-primary btn-lg">
                <Download size={18} /> Export as JSON (.json)
              </a>

              <a href={api.getBulkExportUrl('yaml')} download className="btn btn-secondary btn-lg">
                <Download size={18} /> Export as YAML (.yaml)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Database Backup & Restore */}
      {activeTab === 'backup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Download DB backup */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Download SQLite Database Backup</h3>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                Download a complete, live snapshot of your SQLite persistence database (including all users, recipes, ingredients, meal plans, and shopping lists).
              </p>
              <a href={api.getDatabaseBackupUrl()} download className="btn btn-primary">
                <Download size={16} /> Download Live .db Backup File
              </a>
            </div>
          </div>

          {/* Restore DB backup */}
          <div className="card" style={{ borderColor: 'var(--amber)' }}>
            <div className="card-header" style={{ background: 'var(--amber-light)' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--amber-text)' }}>
                Restore Database from File
              </h3>
            </div>
            <form onSubmit={handleRestoreDatabase}>
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Upload a previously saved <code>.db</code> or <code>.sqlite</code> file. A safety backup of the active database will automatically be generated before replacement.
                </p>

                {restoreResult && (
                  <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: '6px', marginBottom: '16px' }}>
                    {restoreResult}
                  </div>
                )}

                <div className="form-group">
                  <input
                    type="file"
                    accept=".db,.sqlite,.sqlite3"
                    required
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="card-footer">
                <span style={{ fontSize: '0.8rem', color: 'var(--amber-text)' }}>
                  ⚠️ This will replace the active database.
                </span>
                <button type="submit" disabled={restoring || !restoreFile} className="btn btn-outline" style={{ borderColor: 'var(--amber)', color: 'var(--amber-text)' }}>
                  <Database size={16} /> {restoring ? 'Restoring Database...' : 'Restore Database Now'}
                </button>
              </div>
            </form>
          </div>

          {/* Initialize New Blank Database */}
          <div className="card" style={{ borderColor: 'var(--macro-protein)' }}>
            <div className="card-header" style={{ background: 'var(--macro-protein-bg)' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--macro-protein)' }}>
                Initialize New Blank Database (Default Admin Only)
              </h3>
            </div>
            <div className="card-body">
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                Reset the database to a fresh deployment state with <strong>only the default administrator account</strong> and <strong>zero meal plans, recipes, or shopping lists</strong>. When the application is newly deployed from GitHub with no database file present, it automatically creates this blank database on first run.
              </p>

              {blankResetResult && (
                <div style={{ padding: '12px', background: 'var(--bg-card-subtle)', borderRadius: '6px', marginBottom: '16px' }}>
                  {blankResetResult}
                </div>
              )}
            </div>
            <div className="card-footer">
              <span style={{ fontSize: '0.8rem', color: 'var(--macro-protein)' }}>
                ⚠️ Clears all recipes, meal plans, and shopping lists (creates a safety .bak file first).
              </span>
              <button
                type="button"
                disabled={resettingBlank}
                onClick={handleResetBlankDatabase}
                className="btn btn-outline"
                style={{ borderColor: 'var(--macro-protein)', color: 'var(--macro-protein)' }}
              >
                <Database size={16} /> {resettingBlank ? 'Initializing Blank DB...' : 'Create New Blank Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

