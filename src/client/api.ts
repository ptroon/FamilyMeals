import {
  AuthResponse,
  User,
  Recipe,
  MealPlan,
  ShoppingList,
  AppSettings
} from '../types/index.js';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('familymeals_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...getAuthHeader(),
    ...(options.headers as Record<string, string> || {})
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errMessage = 'An error occurred';
    try {
      const data = await res.json();
      errMessage = data.error || errMessage;
    } catch {
      errMessage = await res.text() || res.statusText;
    }
    throw new Error(errMessage);
  }

  return res.json();
}

// Auth API
export const api = {
  // Auth
  register: (payload: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  loginWithGoogle: (credential: string) =>
    request<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),

  getGoogleClientId: () =>
    request<{ clientId: string }>('/auth/google-client-id'),

  getMe: () =>
    request<{ user: User }>('/auth/me'),

  updateProfile: (payload: {
    name?: string;
    saved_emails?: string[];
    distribution_lists?: import('../types/index.js').DistributionList[];
    new_password?: string;
    current_password?: string;
  }) =>
    request<{ user: User }>('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Recipes
  getRecipes: (params?: { q?: string; filter?: string }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.filter) search.set('filter', params.filter);
    const qs = search.toString();
    return request<{ recipes: (Recipe & { ingredients_count?: number })[] }>(`/recipes${qs ? `?${qs}` : ''}`);
  },

  getRecipe: (id: string) =>
    request<{ recipe: Recipe }>(`/recipes/${id}`),

  createRecipe: (recipe: Partial<Recipe>) =>
    request<{ id: string; message: string }>('/recipes', { method: 'POST', body: JSON.stringify(recipe) }),

  updateRecipe: (id: string, recipe: Partial<Recipe>) =>
    request<{ message: string }>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(recipe) }),

  deleteRecipe: (id: string) =>
    request<{ message: string }>(`/recipes/${id}`, { method: 'DELETE' }),

  lookupNutrients: (item: string, amount: number = 100, unit: string = 'g') => {
    const qs = new URLSearchParams({ item, amount: String(amount), unit }).toString();
    return request<import('../types/index.js').NutrientLookupResult>(`/recipes/lookup-nutrients?${qs}`);
  },

  uploadRecipeImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ imageUrl: string }>('/recipes/upload-image', {
      method: 'POST',
      body: formData
    });
  },

  // Meal Plans
  getMealPlans: (params?: { filter?: string }) => {
    const qs = params?.filter ? `?filter=${params.filter}` : '';
    return request<{ mealPlans: MealPlan[] }>(`/meal-plans${qs}`);
  },

  getMealPlan: (id: string) =>
    request<{ mealPlan: MealPlan }>(`/meal-plans/${id}`),

  createMealPlan: (plan: Partial<MealPlan>) =>
    request<{ id: string; share_token: string; message: string }>('/meal-plans', {
      method: 'POST',
      body: JSON.stringify(plan)
    }),

  updateMealPlan: (id: string, plan: Partial<MealPlan>) =>
    request<{ id: string; share_token: string; message: string }>(`/meal-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan)
    }),

  cloneMealPlan: (id: string, payload: { new_start_date: string; new_name?: string }) =>
    request<{ id: string; share_token: string; message: string }>(`/meal-plans/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  deleteMealPlan: (id: string) =>
    request<{ message: string }>(`/meal-plans/${id}`, { method: 'DELETE' }),

  // Shopping Lists
  getShoppingList: (planId: string) =>
    request<{ shoppingList: ShoppingList }>(`/shopping-lists/plan/${planId}`),

  generateShoppingList: (planId: string) =>
    request<{ message: string; shoppingList: ShoppingList }>(`/shopping-lists/plan/${planId}/generate`, {
      method: 'POST'
    }),

  toggleShoppingItem: (planId: string, itemId: string, checked: boolean) =>
    request<{ message: string }>(`/shopping-lists/plan/${planId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ checked })
    }),

  getCsvExportUrl: (planId: string) => `/api/shopping-lists/plan/${planId}/export/csv`,
  getTextExportUrl: (planId: string) => `/api/shopping-lists/plan/${planId}/export/text`,

  // Public Share
  getSharedPlan: (token: string) =>
    request<{ mealPlan: MealPlan & { shopping_share_token?: string } }>(`/share/plan/${token}`),

  getSharedList: (token: string) =>
    request<{ shoppingList: ShoppingList }>(`/share/list/${token}`),

  emailMealPlan: (
    planId: string,
    payload?: { distribution_list_id?: string; single_email?: string; custom_emails?: string[] }
  ) =>
    request<{ message: string; shareUrl: string }>(`/share/plan/${planId}/email`, {
      method: 'POST',
      body: JSON.stringify(payload || {})
    }),

  // Admin
  getAdminSettings: () =>
    request<{ settings: AppSettings }>('/admin/settings'),

  saveAdminSettings: (settings: Partial<AppSettings>) =>
    request<{ message: string }>('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }),

  testSmtp: (target_email?: string) =>
    request<{ message: string }>('/admin/smtp/test', {
      method: 'POST',
      body: JSON.stringify({ target_email })
    }),

  getDatabaseBackupUrl: () => '/api/admin/backup/database',

  restoreDatabase: async (file: File) => {
    const formData = new FormData();
    formData.append('backupFile', file);
    return request<{ message: string }>('/admin/restore/database', {
      method: 'POST',
      body: formData
    });
  },

  resetBlankDatabase: () =>
    request<{ message: string }>('/admin/database/reset-blank', {
      method: 'POST'
    }),

  importBulkRecipes: async (fileOrContent: File | string) => {
    if (typeof fileOrContent === 'string') {
      return request<{ message: string; count: number }>('/admin/recipes/import', {
        method: 'POST',
        body: JSON.stringify({ content: fileOrContent })
      });
    } else {
      const formData = new FormData();
      formData.append('file', fileOrContent);
      return request<{ message: string; count: number }>('/admin/recipes/import', {
        method: 'POST',
        body: formData
      });
    }
  },

  getBulkExportUrl: (format: 'yaml' | 'json') => `/api/admin/export/${format}`,

  // AI
  parseRecipeWithAI: (text: string) =>
    request<{ recipe: Partial<Recipe> }>('/ai/parse-recipe', {
      method: 'POST',
      body: JSON.stringify({ text })
    }),

  suggestMealPlanWithAI: (payload: { daysCount?: number; caloriesTarget?: number; proteinTarget?: number; dietaryNotes?: string }) =>
    request<{ suggestions: any[]; summary: string }>('/ai/suggest-plan', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};

