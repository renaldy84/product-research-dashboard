// Types for the Product Research Dashboard

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  user_id: string;
  cost_price: number;
  selling_price: number;
  target_market: string;
  problem_solved: string;
  demand_indication: string;
  competitors: string;
  potential_angles: string;
  ai_opinion: string | null;
  challenges: string | null;
  pitchline: string | null;
  marketing_strategy: string | null;
  meta_ad_narrative: string | null;
  ig_reels_narrative: string | null;
  tiktok_narrative: string | null;
  scores: ProductScores | null;
  created_at: string;
  updated_at: string;
}

export interface ProductScores {
  profit_margin: number;
  market_potential: number;
  competition_level: number;
  uniqueness: number;
  overall_score: number;
}

export interface ScoringWeights {
  profit_margin: number;
  market_potential: number;
  competition_level: number;
  uniqueness: number;
}

export interface ProductSummary {
  product: Product;
  category: Category;
  scores: ProductScores;
  profit: number;
  profit_margin_pct: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}
