import React, { useState, useEffect } from 'react';
import { ShoppingList, ShoppingListItem } from '../../types/index.js';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  FileText,
  Printer,
  Share2,
  Copy,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';

interface ShoppingListViewProps {
  planId: string;
  onBack: () => void;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({ planId, onBack }) => {
  const { user } = useAuth();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const loadShoppingList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getShoppingList(planId);
      setList(res.shoppingList);
    } catch (err: any) {
      setError(err.message || 'No shopping list found for this plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShoppingList();
  }, [planId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError('');
    try {
      const res = await api.generateShoppingList(planId);
      setList(res.shoppingList);
    } catch (err: any) {
      setError(err.message || 'Failed to generate shopping list.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggleItem = async (itemId: string, currentChecked: boolean) => {
    if (!list) return;

    // Optimistic UI update
    const updatedItems = list.items.map(it => it.id === itemId ? { ...it, checked: !currentChecked } : it);
    setList({ ...list, items: updatedItems });

    if (user) {
      try {
        await api.toggleShoppingItem(planId, itemId, !currentChecked);
      } catch (err) {
        console.error('Failed to sync check state:', err);
      }
    }
  };

  const handleCopyShortLink = () => {
    if (!list) return;
    const shareUrl = `${window.location.origin}/share/list/${list.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPlainText = async () => {
    if (!list) return;
    try {
      const res = await fetch(api.getTextExportUrl(planId));
      const text = await res.text();
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}>Aggregating shopping ingredients...</div>;
  }

  if (error && !list) {
    return (
      <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
        <p style={{ color: 'var(--macro-protein)', marginBottom: '16px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={onBack} className="btn btn-outline">
            <ArrowLeft size={16} /> Back to Plan
          </button>
          <button onClick={handleRegenerate} disabled={regenerating} className="btn btn-primary">
            <RefreshCw size={16} /> {regenerating ? 'Generating...' : 'Generate Shopping List Now'}
          </button>
        </div>
      </div>
    );
  }

  if (!list) return null;

  // Group items by category
  const categoriesMap: Record<string, ShoppingListItem[]> = {};
  list.items.forEach(item => {
    const cat = item.category || 'Other';
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(item);
  });

  const checkedCount = list.items.filter(i => i.checked).length;
  const totalCount = list.items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Top action bar (hidden in print) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> Back to Meal Plan
        </button>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleCopyShortLink} className="btn btn-outline btn-sm">
            <Share2 size={15} />
            <span>{copiedLink ? 'Link Copied!' : 'Copy Short-Link'}</span>
          </button>

          <button onClick={handleCopyPlainText} className="btn btn-outline btn-sm" title="Copy text for mobile Notes or SMS">
            <Copy size={15} />
            <span>{copiedText ? 'Text Copied!' : 'Copy as Text'}</span>
          </button>

          <a href={api.getCsvExportUrl(planId)} download className="btn btn-outline btn-sm">
            <Download size={15} /> CSV
          </a>

          <a href={api.getTextExportUrl(planId)} download className="btn btn-outline btn-sm">
            <FileText size={15} /> Text (.txt)
          </a>

          <button onClick={() => window.print()} className="btn btn-outline btn-sm" title="Print shopping list">
            <Printer size={15} /> Print
          </button>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="btn btn-secondary btn-sm"
            title="Recalculate and concatenate repeated items from current meal plan recipes"
          >
            <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
            <span>{regenerating ? 'Regenerating...' : 'Regenerate List'}</span>
          </button>
        </div>
      </div>

      {/* Print-only clean header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Family Shopping List</h1>
        <p style={{ margin: '4px 0 0', color: '#666' }}>
          {list.meal_plan_name} ({list.start_date} to {list.end_date})
        </p>
      </div>

      {/* Shopping List Card */}
      <div className="card">
        <div className="card-header no-print">
          <div>
            <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Shopping List</h1>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {list.meal_plan_name} &bull; {totalCount} total grocery items
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              {checkedCount} of {totalCount} items bought ({progressPercent}%)
            </span>
            <div style={{ width: '140px', height: '6px', background: 'var(--border-color)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--secondary)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>

        <div className="card-body">
          {Object.keys(categoriesMap).length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              No items in this shopping list. Click "Regenerate List" to gather ingredients from your scheduled meals.
            </p>
          ) : (
            <div className="print-shopping-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Object.entries(categoriesMap).map(([category, items]) => (
                <div key={category} className="print-category-block" style={{ pageBreakInside: 'avoid' }}>
                  <h3 style={{
                    fontSize: '1.15rem',
                    color: 'var(--primary)',
                    borderBottom: '2px solid var(--border-color)',
                    paddingBottom: '6px',
                    marginBottom: '10px'
                  }}>
                    {category}
                  </h3>

                  <ul style={{ listStyle: 'none' }}>
                    {items.map(item => (
                      <li
                        key={item.id}
                        onClick={() => handleToggleItem(item.id, item.checked)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          background: item.checked ? 'var(--bg-card-subtle)' : 'transparent',
                          opacity: item.checked ? 0.6 : 1,
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: item.checked ? 'var(--secondary)' : 'var(--text-light)' }}>
                            {item.checked ? <CheckSquare size={18} /> : <Square size={18} />}
                          </span>
                          <span style={{
                            textDecoration: item.checked ? 'line-through' : 'none',
                            fontWeight: item.checked ? 400 : 500
                          }}>
                            {item.item}
                          </span>
                        </div>

                        <span style={{
                          fontWeight: 700,
                          color: item.checked ? 'var(--text-light)' : 'var(--primary)',
                          fontSize: '0.92rem'
                        }}>
                          {item.amount && item.amount > 0 ? `${item.amount} ${item.unit}`.trim() : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

