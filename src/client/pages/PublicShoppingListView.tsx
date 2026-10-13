import React, { useState, useEffect } from 'react';
import { ShoppingList, ShoppingListItem } from '../../types/index.js';
import { api } from '../api.js';
import {
  Printer,
  FileText,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';

interface PublicShoppingListViewProps {
  token: string;
}

export const PublicShoppingListView: React.FC<PublicShoppingListViewProps> = ({ token }) => {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSharedList(token)
      .then(res => setList(res.shoppingList))
      .catch(err => setError(err.message || 'Could not load shared shopping list.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleToggleLocal = (itemId: string) => {
    if (!list) return;
    setList({
      ...list,
      items: list.items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it)
    });
  };

  const handleCopyText = () => {
    if (!list) return;
    const lines = [
      `SHOPPING LIST: ${list.meal_plan_name}`,
      `Dates: ${list.start_date} to ${list.end_date}\n`
    ];
    list.items.forEach(it => {
      lines.push(`${it.checked ? '[x]' : '[ ]'} ${it.amount} ${it.unit} ${it.item} (${it.category})`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading shared family shopping list...</div>;
  }

  if (error || !list) {
    return (
      <div className="card" style={{ padding: '36px', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <h3 style={{ color: 'var(--macro-protein)', marginBottom: '8px' }}>Shopping List Unavailable</h3>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'Link may be expired or private.'}</p>
      </div>
    );
  }

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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Action Toolbar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--primary)' }}>
            Public Family Shopping List
          </span>
          <h1 style={{ fontSize: '1.6rem', margin: '2px 0 0 0' }}>{list.meal_plan_name}</h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleCopyText} className="btn btn-outline btn-sm">
            <Copy size={15} />
            <span>{copiedText ? 'Text Copied!' : 'Copy Text'}</span>
          </button>

          <button onClick={() => window.print()} className="btn btn-outline btn-sm">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* Print-only clean header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '12px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.6rem', margin: 0 }}>Family Shopping List</h1>
        <p style={{ margin: '4px 0 0', color: '#444' }}>
          {list.meal_plan_name} ({list.start_date} to {list.end_date})
        </p>
      </div>

      {/* Shopping List Card */}
      <div className="card">
        <div className="card-header no-print">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Grocery Items Checklist</h3>
            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tap items to check them off as you shop in-store.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {checkedCount} / {totalCount} items ({progressPercent}%)
            </span>
          </div>
        </div>

        <div className="card-body">
          <div className="print-shopping-grid" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {Object.entries(categoriesMap).map(([category, items]) => (
              <div key={category} className="print-category-block" style={{ pageBreakInside: 'avoid' }}>
                <h3 style={{
                  fontSize: '1.15rem',
                  color: 'var(--primary)',
                  borderBottom: '2px solid var(--border-color)',
                  paddingBottom: '4px',
                  marginBottom: '10px'
                }}>
                  {category}
                </h3>

                <ul style={{ listStyle: 'none' }}>
                  {items.map(item => (
                    <li
                      key={item.id}
                      onClick={() => handleToggleLocal(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
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
        </div>
      </div>
    </div>
  );
};

