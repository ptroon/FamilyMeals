import { RecipeIngredient, ShoppingListItem } from '../../types/index.js';
import crypto from 'crypto';

interface RawItem {
  item: string;
  amount: number;
  unit: string;
  category: string;
}

// Helper to normalize item strings for matching
function normalizeItemName(name: string): string {
  let cleaned = name.trim().toLowerCase();
  
  // Remove descriptors that might differ across recipes but refer to same core grocery
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Common plural normalizations
  if (cleaned.endsWith('ies')) {
    cleaned = cleaned.slice(0, -3) + 'y';
  } else if (cleaned.endsWith('es') && (cleaned.endsWith('ches') || cleaned.endsWith('shes') || cleaned.endsWith('xes') || cleaned.endsWith('toes'))) {
    cleaned = cleaned.slice(0, -2);
  } else if (cleaned.endsWith('s') && !cleaned.endsWith('ss') && !cleaned.endsWith('us') && !cleaned.endsWith('is')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}

// Normalize units
function normalizeUnit(unit: string): { standardUnit: string; scale: number } {
  const u = unit.trim().toLowerCase();

  switch (u) {
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return { standardUnit: 'g', scale: 1000 };
    case 'g':
    case 'gram':
    case 'grams':
      return { standardUnit: 'g', scale: 1 };
    case 'mg':
      return { standardUnit: 'g', scale: 0.001 };
    case 'l':
    case 'liter':
    case 'liters':
    case 'litre':
    case 'litres':
      return { standardUnit: 'ml', scale: 1000 };
    case 'ml':
    case 'milliliter':
    case 'milliliters':
      return { standardUnit: 'ml', scale: 1 };
    case 'tbsp':
    case 'tablespoon':
    case 'tablespoons':
      return { standardUnit: 'tbsp', scale: 1 };
    case 'tsp':
    case 'teaspoon':
    case 'teaspoons':
      return { standardUnit: 'tsp', scale: 1 };
    case 'cup':
    case 'cups':
      return { standardUnit: 'cup', scale: 1 };
    case 'clove':
    case 'cloves':
      return { standardUnit: 'clove', scale: 1 };
    case 'can':
    case 'cans':
      return { standardUnit: 'can', scale: 1 };
    case 'slice':
    case 'slices':
      return { standardUnit: 'slice', scale: 1 };
    case 'piece':
    case 'pieces':
    case 'pcs':
    case 'pc':
      return { standardUnit: 'piece', scale: 1 };
    case '':
    case 'item':
    case 'items':
    case 'count':
      return { standardUnit: '', scale: 1 };
    default:
      return { standardUnit: u, scale: 1 };
  }
}

function isDiscreteUnit(u: string): boolean {
  const norm = u.trim().toLowerCase();
  return [
    'piece',
    'pieces',
    'item',
    'items',
    'count',
    'clove',
    'cloves',
    'can',
    'cans',
    'slice',
    'slices',
    'head',
    'heads',
    'bunch',
    'bunches',
    'egg',
    'eggs',
    'portion',
    'portions',
    ''
  ].includes(norm);
}

// Convert back to human-friendly display units if large amounts and round up discrete pieces
function formatDisplayAmount(amount: number, unit: string): { amount: number; unit: string } {
  // Round up discrete items so the user sees full whole items to buy (e.g. 1.33 onions -> 2 pieces)
  if (isDiscreteUnit(unit)) {
    const ceilAmount = Math.ceil(amount);
    return {
      amount: ceilAmount,
      unit: unit || (ceilAmount > 1 ? 'pieces' : 'piece')
    };
  }

  // Condiments/spices measured in spoonfuls (tbsp or tsp) should not display volume on the grocery list
  if (['tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'spoon'].includes(unit.toLowerCase())) {
    return { amount: 0, unit: '' };
  }

  let rounded = Math.round(amount * 100) / 100;

  if (unit === 'g' && rounded >= 1000) {
    return {
      amount: Math.round((rounded / 1000) * 100) / 100,
      unit: 'kg'
    };
  }

  if (unit === 'ml' && rounded >= 1000) {
    return {
      amount: Math.round((rounded / 1000) * 100) / 100,
      unit: 'L'
    };
  }

  return { amount: rounded, unit };
}

// Capitalize title
function capitalize(str: string): string {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

export function aggregateIngredients(ingredients: RawItem[], existingCheckedMap: Record<string, boolean> = {}): ShoppingListItem[] {
  // Key: `${normalizedItem}_${standardUnit}`
  const map = new Map<string, {
    canonicalName: string;
    normalizedName: string;
    totalStandardAmount: number;
    standardUnit: string;
    category: string;
  }>();

  for (const raw of ingredients) {
    if (!raw.item || !raw.item.trim()) continue;

    const normName = normalizeItemName(raw.item);
    const { standardUnit, scale } = normalizeUnit(raw.unit || '');
    const convertedAmount = (Number(raw.amount) || 1) * scale;
    const key = `${normName}:::${standardUnit}`;

    if (map.has(key)) {
      const entry = map.get(key)!;
      entry.totalStandardAmount += convertedAmount;
      // Prefer more specific category if current is Pantry
      if (entry.category === 'Pantry' && raw.category && raw.category !== 'Pantry') {
        entry.category = raw.category;
      }
    } else {
      map.set(key, {
        canonicalName: capitalize(raw.item.trim()),
        normalizedName: normName,
        totalStandardAmount: convertedAmount,
        standardUnit: standardUnit,
        category: raw.category || 'Pantry'
      });
    }
  }

  // Convert to final ShoppingListItems
  const result: ShoppingListItem[] = [];

  for (const entry of map.values()) {
    const formatted = formatDisplayAmount(entry.totalStandardAmount, entry.standardUnit);
    const id = crypto.randomUUID();
    const isChecked = existingCheckedMap[entry.normalizedName] || false;

    result.push({
      id,
      item: entry.canonicalName,
      normalized_item: entry.normalizedName,
      amount: formatted.amount,
      unit: formatted.unit,
      category: entry.category,
      checked: isChecked
    });
  }

  // Sort by category, then item name
  const categoryOrder = [
    'Produce',
    'Meat & Poultry',
    'Dairy & Refrigerated',
    'Dairy & Eggs',
    'Bakery',
    'Pantry & Grains',
    'Pantry',
    'Spices & Seasonings',
    'Canned & Jarred',
    'Frozen',
    'Condiments & Sauces',
    'Beverages',
    'Other'
  ];

  result.sort((a, b) => {
    const idxA = categoryOrder.indexOf(a.category);
    const idxB = categoryOrder.indexOf(b.category);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;

    if (posA !== posB) return posA - posB;
    return a.item.localeCompare(b.item);
  });

  return result;
}

// Export formatting functions
export function exportToCsv(items: ShoppingListItem[], mealPlanName: string): string {
  const lines: string[] = [];
  lines.push(`"Item","Amount","Unit","Category","Checked"`);

  for (const item of items) {
    const escapedItem = item.item.replace(/"/g, '""');
    const escapedCategory = item.category.replace(/"/g, '""');
    const checkedStr = item.checked ? 'Yes' : 'No';
    const amountStr = item.amount && item.amount > 0 ? String(item.amount) : '';
    lines.push(`"${escapedItem}","${amountStr}","${item.unit || ''}","${escapedCategory}","${checkedStr}"`);
  }

  return lines.join('\r\n');
}

export function exportToPlainText(items: ShoppingListItem[], mealPlanName: string): string {
  const lines: string[] = [];
  lines.push(`=========================================`);
  lines.push(`SHOPPING LIST: ${mealPlanName}`);
  lines.push(`Generated by FamilyMeals`);
  lines.push(`=========================================\n`);

  let currentCategory = '';
  for (const item of items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      lines.push(`\n[ ${currentCategory.toUpperCase()} ]`);
    }
    const checkMark = item.checked ? '[x]' : '[ ]';
    const unitPart = item.amount && item.amount > 0 ? `${item.amount}${item.unit ? ' ' + item.unit : ''} ` : '';
    lines.push(`${checkMark} ${unitPart}${item.item}`.trim());
  }

  return lines.join('\n');
}

