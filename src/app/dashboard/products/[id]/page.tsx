'use client';

import { useEffect, useState, useCallback } from 'react';
import { marked } from 'marked';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore, useProductStore, useScoringStore, calculateProductSummary } from '@/store/useStore';
import { formatCurrency, getScoreColor, getScoreLabel } from '@/lib/utils';
import Link from 'next/link';
import PricingPlanGenerator from '@/components/product/PricingPlanGenerator';
import {
  ArrowLeft,
  Package,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Edit,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Megaphone,
  Video,
  Share2,
  TrendingUp,
  Loader2,
  LightbulbIcon
} from 'lucide-react';

type GenerateType = 'opinion' | 'pitchline' | 'strategy' | 'meta_ad' | 'ig_reels' | 'tiktok' | 'angle';

const generateConfig = [
  { type: 'angle' as const, label: 'Angle Iklan', icon: LightbulbIcon, description: 'Suggest angle/hook untuk ads', color: 'bg-amber-100 text-amber-600' },
  { type: 'opinion' as const, label: 'AI Opinion', icon: Sparkles, description: 'Analisis kelayakan & tantangan', color: 'bg-purple-100 text-purple-600' },
  { type: 'pitchline' as const, label: 'Pitchline', icon: MessageSquare, description: 'Hook lines untuk ads', color: 'bg-blue-100 text-blue-600' },
  { type: 'strategy' as const, label: 'Strategy', icon: TrendingUp, description: 'Rencana marketing lengkap', color: 'bg-green-100 text-green-600' },
  { type: 'meta_ad' as const, label: 'Meta Ads', icon: Megaphone, description: 'Sample narrative untuk FB/IG ads', color: 'bg-indigo-100 text-indigo-600' },
  { type: 'ig_reels' as const, label: 'IG Reels', icon: Video, description: 'Script untuk Reels', color: 'bg-pink-100 text-pink-600' },
  { type: 'tiktok' as const, label: 'TikTok', icon: Share2, description: 'Script untuk TikTok video', color: 'bg-black text-white' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const { user } = useAuthStore();
  const { products, categories, setProducts, updateProduct } = useProductStore();
  const { weights } = useScoringStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [generatingTypes, setGeneratingTypes] = useState<Set<GenerateType>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections] = useState<Record<string, boolean>>({
    opinion: true,
    pitchline: true,
    strategy: true,
    meta_ad: true,
    ig_reels: true,
    tiktok: true,
  });

  const product = products.find(p => p.id === productId);
  if (product) {
    
  } else {
    
  }

  useEffect(() => {
    if (!user) return;
    fetchProduct();
  }, [user, productId]);

  const fetchProduct = async () => {
    if (!user) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        headers: { 'x-user-id': user.id }
      });

      if (!res.ok) {
        throw new Error('Product not found');
      }

      const data = await res.json();
      
      // Update in store - always ensure product is in array
      const existingIndex = products.findIndex(p => p.id === productId);
      if (existingIndex >= 0) {
        updateProduct(data);
      } else {
        
        setProducts([...products, data]);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
      router.push('/dashboard/products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (type: GenerateType) => {
    if (!user || !product) return;

    setGeneratingTypes(prev => new Set(prev).add(type));

    try {
      let fieldMap: Record<GenerateType, string> = {
        angle: 'potential_angles',
        opinion: 'ai_opinion',
        pitchline: 'pitchline',
        strategy: 'marketing_strategy',
        meta_ad: 'meta_ad_narrative',
        ig_reels: 'ig_reels_narrative',
        tiktok: 'tiktok_narrative',
      };

      // Get available providers
      const providersRes = await fetch('/api/ai/generate', {
        method: 'GET',
        headers: { 'x-user-id': user.id }
      });
      const providersData = await providersRes.json();
      const activeProvider = providersData.providers?.find((p: any) => p.hasApiKey);

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          type,
          provider: activeProvider?.id || 'openai',
          model: activeProvider?.defaultModel,
          product: {
            name: product.name,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            target_market: product.target_market,
            problem_solved: product.problem_solved,
            competitors: product.competitors,
            potential_angles: product.potential_angles,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      
      // Update product with generated content - only send the specific field
      const fieldToUpdate = fieldMap[type];
      const updateData: any = { [fieldToUpdate]: data.result };

      // Recalculate scores
      const category = categories.find(c => c.id === product.category_id);
      const summary = calculateProductSummary({ ...product, [fieldToUpdate]: data.result } as any, category, weights);
      updateData.scores = summary.scores;

      // Save to database - only the specific field
      const saveResponse = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(updateData),
      });

      const updatedProduct = await saveResponse.json();
      updateProduct(updatedProduct);

    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('Gagal menghasilkan konten. Silakan coba lagi.');
    } finally {
      setGeneratingTypes(prev => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };


  // Helper to render markdown content safely
  const renderMarkdown = (text: string | null | undefined) => {
    if (!text) return null;
    return (
      <div 
        className="markdown-content text-sm text-gray-700 max-h-48 overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: marked.parse(text) as string }}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto text-gray-400 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-gray-900">Produk Tidak Ditemukan</h2>
        <Link href="/dashboard/products" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
          Kembali ke Daftar Produk
        </Link>
      </div>
    );
  }

  const category = categories.find(c => c.id === product.category_id);
  const profit = product.selling_price - product.cost_price;
  const margin = product.cost_price > 0 ? (profit / product.cost_price) * 100 : 0;
  const summary = calculateProductSummary(product, category, weights);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/products"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {category && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                  {category.name}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">Detail produk dan analisis AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/products/${productId}/edit`}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Edit size={18} />
            Edit
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Harga Modal</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(product.cost_price)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Harga Jual</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(product.selling_price)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Margin</p>
          <p className={`text-lg font-bold ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
            {margin.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Overall Score</p>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(summary.scores.overall_score)}`}>
              {summary.scores.overall_score}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Plan Generator */}
      <PricingPlanGenerator 
        costPrice={product.cost_price} 
        onSave={(plans) => {
          console.log('Saved pricing plans:', plans);
          // Optional: Save to product or show notification
        }}
      />

      {/* Product Description */}
      {product.description && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="text-indigo-600" size={20} />
            </div>
            <h2 className="font-semibold text-gray-900">Deskripsi Produk</h2>
          </div>
          <div className="max-h-64 overflow-y-auto text-sm text-gray-700">
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(product.description) }} />
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Score Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Profit Margin', score: summary.scores.profit_margin, weight: weights.profit_margin },
            { label: 'Market Potential', score: summary.scores.market_potential, weight: weights.market_potential },
            { label: 'Competition', score: summary.scores.competition_level, weight: weights.competition_level },
            { label: 'Uniqueness', score: summary.scores.uniqueness, weight: weights.uniqueness },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    strokeWidth="8"
                    fill="none"
                    className="stroke-gray-200"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    strokeWidth="8"
                    fill="none"
                    className={item.score >= 70 ? 'stroke-green-500' : item.score >= 40 ? 'stroke-yellow-500' : 'stroke-red-500'}
                    strokeDasharray={`${item.score * 2.26} 226`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{item.score}</span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">Weight: {(item.weight * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Product Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="text-blue-600" size={20} />
            </div>
            <h2 className="font-semibold text-gray-900">Target Market</h2>
          </div>
          {product.target_market ? renderMarkdown(product.target_market) : <p className="text-gray-400 italic">Belum diisi</p>}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="text-orange-600" size={20} />
            </div>
            <h2 className="font-semibold text-gray-900">Masalah yang Diselesaikan</h2>
          </div>
          {product.problem_solved ? renderMarkdown(product.problem_solved) : <p className="text-gray-400 italic">Belum diisi</p>}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={20} />
            </div>
            <h2 className="font-semibold text-gray-900">Indikasi Demand</h2>
          </div>
          {product.demand_indication ? renderMarkdown(product.demand_indication) : <p className="text-gray-400 italic">Belum diisi</p>}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h2 className="font-semibold text-gray-900">Kompetitor</h2>
          </div>
          {product.competitors ? renderMarkdown(product.competitors) : <p className="text-gray-400 italic">Belum diisi</p>}
        </div>

      </div>

      {/* AI Generated Content */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Konten yang Dihasilkan AI</h2>
        <p className="text-gray-600">Gunakan tombol Generate untuk membuat konten marketing dengan bantuan AI</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generateConfig.map((item) => {
            const Icon = item.icon;
            let content = '';
            
            switch (item.type) {
              case 'angle': content = product.potential_angles || ''; break;
              case 'opinion': content = product.ai_opinion || ''; break;
              case 'pitchline': content = product.pitchline || ''; break;
              case 'strategy': content = product.marketing_strategy || ''; break;
              case 'meta_ad': content = product.meta_ad_narrative || ''; break;
              case 'ig_reels': content = product.ig_reels_narrative || ''; break;
              case 'tiktok': content = product.tiktok_narrative || ''; break;
            }

            const hasContent = !!content;
            const isGeneratingThis = generatingTypes.has(item.type);

            return (
              <div key={item.type} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {hasContent ? (
                    <div className="relative">
                      <div className="max-h-96 overflow-y-auto text-sm text-gray-700 mb-3 px-2 py-2 bg-gray-50 rounded-lg">
                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(content) }} />
                      </div>
                      <button
                        onClick={() => copyToClipboard(content, item.type)}
                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        {copiedField === item.type ? <Check size={16} /> : <Copy size={16} />}
                        {copiedField === item.type ? 'Tersalin!' : 'Salin'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic mb-3">
                      Belum ada konten
                    </p>
                  )}

                  <button
                    onClick={() => handleGenerate(item.type)}
                    disabled={isGeneratingThis}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                      hasContent
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    } disabled:opacity-50`}
                  >
                    {isGeneratingThis ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={18} />
                        {hasContent ? 'Regenerate' : 'Generate'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Sparkles className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">Tentang AI Generation</h3>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• AI membutuhkan API key OpenAI untuk berfungsi (set di environment variables)</li>
              <li>• Konten yang dihasilkan adalah suggestions dan perlu diverifikasi</li>
              <li>• Setiap regenerate akan menghasilkan konten yang berbeda</li>
              <li>• Untuk hasil terbaik, isi detail produk selengkap mungkin sebelum generate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
