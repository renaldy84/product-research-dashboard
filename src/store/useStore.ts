import { create } from 'zustand';
import { User, Category, Product, ProductSummary, ScoringWeights } from '@/lib/types';
import { calculateProfit, calculateProfitMargin } from '@/lib/utils';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

interface ProductState {
  products: Product[];
  categories: Category[];
  selectedProduct: Product | null;
  isLoading: boolean;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setLoading: (loading: boolean) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
}

interface ScoringState {
  weights: ScoringWeights;
  setWeights: (weights: ScoringWeights) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null }),
}));

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  categories: [],
  selectedProduct: null,
  isLoading: false,
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setLoading: (isLoading) => set({ isLoading }),
  addProduct: (product) => set((state) => ({ 
    products: [...state.products, product] 
  })),
  updateProduct: (product) => {
    set((state) => ({ 
      products: state.products.map((p) => p.id === product.id ? product : p),
      selectedProduct: state.selectedProduct?.id === product.id ? product : state.selectedProduct,
    }));
  },
  deleteProduct: (id) => set((state) => ({ 
    products: state.products.filter((p) => p.id !== id),
    selectedProduct: state.selectedProduct?.id === id ? null : state.selectedProduct,
  })),
  addCategory: (category) => set((state) => ({ 
    categories: [...state.categories, category] 
  })),
  updateCategory: (category) => set((state) => ({ 
    categories: state.categories.map((c) => c.id === category.id ? category : c)
  })),
  deleteCategory: (id) => set((state) => ({ 
    categories: state.categories.filter((c) => c.id !== id)
  })),
}));

export const useScoringStore = create<ScoringState>((set) => ({
  weights: {
    profit_margin: 0.3,
    market_potential: 0.25,
    competition_level: 0.25,
    uniqueness: 0.2,
  },
  setWeights: (weights) => set({ weights }),
}));

// Helper function to calculate product summary
export function calculateProductSummary(
  product: Product, 
  category: Category | undefined,
  weights: ScoringWeights
): ProductSummary {
  const profit = calculateProfit(product.cost_price, product.selling_price);
  const profitMargin = calculateProfitMargin(product.cost_price, product.selling_price);
  
  // Score components (1-100 scale)
  const profitMarginScore = Math.min(100, Math.max(0, profitMargin));
  const marketPotentialScore = product.demand_indication ? 75 : 50; // Simplified
  const competitionScore = product.competitors ? 60 : 80; // Simplified - fewer competitors = higher score
  const uniquenessScore = product.potential_angles ? 70 : 50; // Simplified
  
  // Calculate weighted overall score
  const overallScore = Math.round(
    (profitMarginScore * weights.profit_margin) +
    (marketPotentialScore * weights.market_potential) +
    (competitionScore * weights.competition_level) +
    (uniquenessScore * weights.uniqueness)
  );
  
  return {
    product,
    category: category!,
    scores: {
      profit_margin: Math.round(profitMarginScore),
      market_potential: Math.round(marketPotentialScore),
      competition_level: Math.round(competitionScore),
      uniqueness: Math.round(uniquenessScore),
      overall_score: overallScore,
    },
    profit,
    profit_margin_pct: profitMargin,
  };
}
