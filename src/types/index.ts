// Shared types between Server and Client

export interface DistributionList {
  id: string;
  name: string;
  emails: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  saved_emails?: string[];
  distribution_lists?: DistributionList[];
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  item: string;
  amount: number;
  unit: string;
  category: string;
  macro_type?: 'protein' | 'carbohydrates' | 'fat' | 'mixed' | '';
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  sort_order?: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  author_name?: string;
  title: string;
  description: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  is_public: boolean | number;
  image_url: string;
  method: string; // Plain text with blank lines (\n\n) separating steps
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  ingredients?: RecipeIngredient[];
  created_at: string;
  updated_at: string;
}

export interface MealPlanDayRecipe {
  id?: string;
  day_id?: string;
  recipe_id?: string;
  recipe?: Recipe;
  custom_item_name?: string;
  servings: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  custom_ingredients?: RecipeIngredient[];
}

export interface MealPlanDay {
  id: string;
  meal_plan_id: string;
  date: string; // YYYY-MM-DD
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_name?: string;
  is_blank: boolean | number;
  blank_reason?: string;
  sort_order?: number;
  recipes: MealPlanDayRecipe[];
}

export interface MealPlan {
  id: string;
  user_id: string;
  author_name?: string;
  name: string;
  start_date: string;
  end_date: string;
  is_public: boolean | number;
  share_token: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  days?: MealPlanDay[];
  total_meals_count?: number;
  has_shopping_list?: boolean;
}

export interface ShoppingListItem {
  id: string;
  item: string;
  normalized_item: string;
  amount: number;
  unit: string;
  category: string;
  checked: boolean;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  meal_plan_id: string;
  share_token: string;
  meal_plan_name?: string;
  start_date?: string;
  end_date?: string;
  generated_at: string;
  items: ShoppingListItem[];
}

export interface AppSettings {
  app_name: string;
  calorie_target_default: number;
  protein_target_default: number;
  carbs_target_default: number;
  fat_target_default: number;
  allow_registrations: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass?: string;
  smtp_from_email: string;
  smtp_from_name: string;
  gemini_api_key?: string;
  has_gemini_key?: boolean;
  google_client_id?: string;
}

export interface NutrientLookupResult {
  found: boolean;
  item: string;
  matchedFood?: string;
  source: string;
  amount: number;
  unit: string;
  category: string;
  macro_type: 'protein' | 'carbohydrates' | 'fat' | 'mixed' | '';
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

