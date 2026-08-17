'use client';

import { useEffect, useState, useCallback } from 'react';
import { marked } from 'marked';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore, useProductStore, useScoringStore, calculateProductSummary } from '@/store/useStore';
import { formatCurrency, getScoreColor, getScoreLabel } from '@/lib/utils';
import Link from 'next/link';
import PricingPlanGenerator from '@/components/product/PricingPlanGenerator';
import ProposalPDF from '@/components/product/ProposalPDF';
import { pdf } from '@react-pdf/renderer';
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
  LightbulbIcon,
  FileText,
  Download,
  LayoutGrid
} from 'lucide-react';

type GenerateType = 'target_market' | 'problem_solved' | 'demand_indication' | 'competitors' | 'opinion' | 'pitchline' | 'strategy' | 'meta_ad' | 'ig_reels' | 'tiktok' | 'angle' | 'all';

// All types that will be generated when clicking "Generate All"
const allGenerateTypes: GenerateType[] = [
  'target_market',
  'problem_solved',
  'demand_indication',
  'competitors',
  'angle',
  'opinion',
  'pitchline',
  'strategy',
  'meta_ad',
  'ig_reels',
  'tiktok',
];

const generateConfig = [
  { type: 'target_market' as const, label: 'Target Market', icon: Users, description: 'Analisis target market', color: 'bg-blue-100 text-blue-600', field: 'target_market' as const },
  { type: 'problem_solved' as const, label: 'Masalah', icon: AlertTriangle, description: 'Masalah yang diselesaikan', color: 'bg-orange-100 text-orange-600', field: 'problem_solved' as const },
  { type: 'demand_indication' as const, label: 'Demand', icon: TrendingUp, description: 'Indikasi demand pasar', color: 'bg-green-100 text-green-600', field: 'demand_indication' as const },
  { type: 'competitors' as const, label: 'Kompetitor', icon: Users, description: 'Analisis kompetitor', color: 'bg-red-100 text-red-600', field: 'competitors' as const },
  { type: 'angle' as const, label: 'Angle Iklan', icon: LightbulbIcon, description: 'Suggest angle/hook untuk ads', color: 'bg-amber-100 text-amber-600', field: 'potential_angles' as const },
  { type: 'opinion' as const, label: 'AI Opinion', icon: Sparkles, description: 'Analisis kelayakan & tantangan', color: 'bg-purple-100 text-purple-600', field: 'ai_opinion' as const },
  { type: 'pitchline' as const, label: 'Pitchline', icon: MessageSquare, description: 'Hook lines untuk ads', color: 'bg-blue-100 text-blue-600', field: 'pitchline' as const },
  { type: 'strategy' as const, label: 'Strategy', icon: TrendingUp, description: 'Rencana marketing lengkap', color: 'bg-teal-100 text-teal-600', field: 'marketing_strategy' as const },
  { type: 'meta_ad' as const, label: 'Meta Ads', icon: Megaphone, description: 'Sample narrative untuk FB/IG ads', color: 'bg-indigo-100 text-indigo-600', field: 'meta_ad_narrative' as const },
  { type: 'ig_reels' as const, label: 'IG Reels', icon: Video, description: 'Script untuk Reels', color: 'bg-pink-100 text-pink-600', field: 'ig_reels_narrative' as const },
  { type: 'tiktok' as const, label: 'TikTok', icon: Share2, description: 'Script untuk TikTok video', color: 'bg-black text-white', field: 'tiktok_narrative' as const },
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
  const [isRecalculatingScores, setIsRecalculatingScores] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections] = useState<Record<string, boolean>>({
    opinion: true,
    pitchline: true,
    strategy: true,
    meta_ad: true,
    ig_reels: true,
    tiktok: true,
  });
  const [viewMode, setViewMode] = useState<'analysis' | 'proposal'>('analysis');
  const [isExporting, setIsExporting] = useState(false);

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
      const fieldMap: Record<string, string> = {
        target_market: 'target_market',
        problem_solved: 'problem_solved',
        demand_indication: 'demand_indication',
        competitors: 'competitors',
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

  // Generate all AI content at once with real-time updates
  const handleGenerateAll = async () => {
    if (!user || !product) return;

    // Set all types as generating
    setGeneratingTypes(new Set(allGenerateTypes as GenerateType[]));

    const fieldMap: Record<string, string> = {
      target_market: 'target_market',
      problem_solved: 'problem_solved',
      demand_indication: 'demand_indication',
      competitors: 'competitors',
      angle: 'potential_angles',
      opinion: 'ai_opinion',
      pitchline: 'pitchline',
      strategy: 'marketing_strategy',
      meta_ad: 'meta_ad_narrative',
      ig_reels: 'ig_reels_narrative',
      tiktok: 'tiktok_narrative',
    };

    let errorCount = 0;
    const localProduct = { ...product }; // Local copy to track results

    try {
      // Get available providers
      const providersRes = await fetch('/api/ai/generate', {
        method: 'GET',
        headers: { 'x-user-id': user.id }
      });
      const providersData = await providersRes.json();
      const activeProvider = providersData.providers?.find((p: any) => p.hasApiKey);

      // Generate each type sequentially
      for (let i = 0; i < allGenerateTypes.length; i++) {
        const type = allGenerateTypes[i];
        const config = generateConfig.find(c => c.type === type);
        const label = config?.label || type;
        const field = fieldMap[type];
        
        console.log(`[AI Generate ${i + 1}/${allGenerateTypes.length}] Starting: ${label}`);
        
        try {
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
                target_market: localProduct.target_market || '',
                problem_solved: localProduct.problem_solved || '',
                competitors: localProduct.competitors || '',
                potential_angles: localProduct.potential_angles || '',
              }
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to generate ${type}`);
          }

          const data = await response.json();
          
          if (field && data.result) {
            // Update local copy
            (localProduct as any)[field] = data.result;
            
            // Update store immediately with single field
            const updatedProduct = { ...localProduct };
            updateProduct(updatedProduct);
            
            // Save to DB immediately - only this field
            await fetch(`/api/products/${productId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              },
              body: JSON.stringify({ [field]: data.result }),
            });
            
            console.log(`[AI Generate ${i + 1}/${allGenerateTypes.length}] ✓ Done: ${label} (saved)`);
          }
          
          // Remove this type from generating set
          setGeneratingTypes(prev => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });

        } catch (error) {
          console.error(`[AI Generate ${i + 1}/${allGenerateTypes.length}] ✗ Failed: ${label}`, error);
          errorCount++;
          setGeneratingTypes(prev => {
            const next = new Set(prev);
            next.delete(type);
            return next;
          });
        }
      }

      // Calculate AI-powered scores after all content is generated
      if (errorCount < allGenerateTypes.length) {
        console.log('[AI Scoring] Starting AI-powered scoring...');
        
        try {
          // Call AI to calculate scores based on generated content
          const scoringRes = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id
            },
            body: JSON.stringify({
              type: 'scoring',
              provider: activeProvider?.id || 'openai',
              model: activeProvider?.defaultModel,
              product: {
                name: localProduct.name,
                cost_price: localProduct.cost_price,
                selling_price: localProduct.selling_price,
                description: localProduct.description || '',
                target_market: localProduct.target_market || '',
                problem_solved: localProduct.problem_solved || '',
                demand_indication: localProduct.demand_indication || '',
                competitors: localProduct.competitors || '',
                potential_angles: localProduct.potential_angles || '',
                ai_opinion: localProduct.ai_opinion || '',
              }
            }),
          });

          if (scoringRes.ok) {
            const scoringData = await scoringRes.json();
            
            // Parse scoring JSON from AI response
            if (scoringData.result) {
              try {
                let cleanResult = scoringData.result.trim();
                if (cleanResult.includes('```json')) {
                  cleanResult = cleanResult.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
                } else if (cleanResult.includes('```')) {
                  cleanResult = cleanResult.replace(/```\n?/g, '').replace(/```\n?$/g, '');
                }
                
                const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const scores = JSON.parse(jsonMatch[0]);
                  
                  // Calculate profit margin score
                  const profit = localProduct.selling_price - localProduct.cost_price;
                  const margin = localProduct.cost_price > 0 ? (profit / localProduct.cost_price) * 100 : 0;
                  const profitMarginScore = Math.min(100, Math.max(0, margin * 2));
                  
                  // Overall score = weighted average
                  const overall = Math.round(
                    scores.market_potential * weights.market_potential +
                    scores.competition_level * weights.competition_level +
                    profitMarginScore * weights.profit_margin +
                    scores.uniqueness * weights.uniqueness
                  );
                  
                  const finalScores = {
                    profit_margin: Math.round(profitMarginScore),
                    market_potential: Math.round(scores.market_potential),
                    competition_level: Math.round(scores.competition_level),
                    uniqueness: Math.round(scores.uniqueness),
                    overall_score: Math.min(100, Math.max(0, overall)),
                  };
                  
                  console.log('[AI Scoring] ✓ Scores calculated:', finalScores);
                  
                  // Update store and save
                  updateProduct({ ...localProduct, scores: finalScores });
                  
                  await fetch(`/api/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-user-id': user.id
                    },
                    body: JSON.stringify({ scores: finalScores }),
                  });
                  
                  console.log('[AI Scoring] ✓ Scores saved to DB');
                }
              } catch (parseError) {
                console.error('[AI Scoring] Parse error:', parseError);
              }
            }
          }
        } catch (scoreError) {
          console.error('[AI Scoring] Failed:', scoreError);
        }
      }

      if (errorCount > 0) {
        const successCount = allGenerateTypes.length - errorCount;
        alert(`Generate selesai! ${successCount} berhasil, ${errorCount} gagal.`);
      }

    } catch (error) {
      console.error('Failed to generate all content:', error);
      alert('Gagal menghasilkan konten. Silakan coba lagi.');
    }
  };

  // Recalculate scores using AI
  const handleRecalculateScores = async () => {
    if (!user || !product) return;
    if (!product.ai_opinion) {
      alert('Generate AI Opinion terlebih dahulu untuk menghitung scores.');
      return;
    }

    setIsRecalculatingScores(true);
    console.log('[AI Recalc] Starting score recalculation...');

    try {
      // Get available providers
      const providersRes = await fetch('/api/ai/generate', {
        method: 'GET',
        headers: { 'x-user-id': user.id }
      });
      const providersData = await providersRes.json();
      const activeProvider = providersData.providers?.find((p: any) => p.hasApiKey);

      // Call AI to calculate scores
      const scoringRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          type: 'scoring',
          provider: activeProvider?.id || 'openai',
          model: activeProvider?.defaultModel,
          product: {
            name: product.name,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            description: product.description || '',
            target_market: product.target_market || '',
            problem_solved: product.problem_solved || '',
            demand_indication: product.demand_indication || '',
            competitors: product.competitors || '',
            potential_angles: product.potential_angles || '',
            ai_opinion: product.ai_opinion || '',
          }
        }),
      });

      if (!scoringRes.ok) {
        throw new Error('Failed to calculate scores');
      }

      const scoringData = await scoringRes.json();

      if (scoringData.result) {
        try {
          let cleanResult = scoringData.result.trim();
          if (cleanResult.includes('```json')) {
            cleanResult = cleanResult.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
          } else if (cleanResult.includes('```')) {
            cleanResult = cleanResult.replace(/```\n?/g, '').replace(/```\n?$/g, '');
          }

          const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const scores = JSON.parse(jsonMatch[0]);

            // Calculate profit margin score
            const profit = product.selling_price - product.cost_price;
            const margin = product.cost_price > 0 ? (profit / product.cost_price) * 100 : 0;
            const profitMarginScore = Math.min(100, Math.max(0, margin * 2));

            // Overall score = weighted average of all scores (each 0-100, weights sum to 1)
            const overall = Math.round(
              scores.market_potential * weights.market_potential +
              scores.competition_level * weights.competition_level +
              profitMarginScore * weights.profit_margin +
              scores.uniqueness * weights.uniqueness
            );

            const finalScores = {
              profit_margin: Math.round(profitMarginScore),
              market_potential: Math.round(scores.market_potential),
              competition_level: Math.round(scores.competition_level),
              uniqueness: Math.round(scores.uniqueness),
              overall_score: Math.min(100, Math.max(0, overall)),
            };

            console.log('[AI Recalc] ✓ Scores calculated:', finalScores);
            console.log('[AI Recalc] Reasoning:', scores.reasoning);

            // Update store and save to DB
            updateProduct({ ...product, scores: finalScores });

            await fetch(`/api/products/${productId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              },
              body: JSON.stringify({ scores: finalScores }),
            });

            console.log('[AI Recalc] ✓ Scores saved to DB');
            alert('Scores berhasil dihitung ulang!');
          }
        } catch (parseError) {
          console.error('[AI Recalc] Parse error:', parseError);
          alert('Gagal parse response dari AI.');
        }
      }
    } catch (error) {
      console.error('[AI Recalc] Error:', error);
      alert('Gagal menghitung scores. Silakan coba lagi.');
    } finally {
      setIsRecalculatingScores(false);
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = <ProposalPDF product={product} category={category} margin={margin} summary={summary} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'proposal'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Gagal export PDF');
    } finally {
      setIsExporting(false);
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
  
  // Use product.scores if available (from AI), otherwise calculate
  const scores = product.scores || calculateProductSummary(product, category, weights).scores;
  const summary = { scores, product, category, profit, profit_margin_pct: margin };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <p className="text-gray-500 text-sm mt-1">Detail produk dan analisis AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('analysis')}
              className={`px-3 py-1.5 rounded text-sm font-medium ${viewMode === 'analysis' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              <LayoutGrid size={14} className="inline mr-1.5" />Analysis
            </button>
            <button
              onClick={() => setViewMode('proposal')}
              className={`px-3 py-1.5 rounded text-sm font-medium ${viewMode === 'proposal' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
            >
              <FileText size={14} className="inline mr-1.5" />Proposal
            </button>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>
          <Link
            href={`/dashboard/products/${productId}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit size={14} />Edit
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

      {/* Analysis View */}
      {viewMode === 'analysis' && (
      <>
      {/* Pricing Plan Generator */}
      <PricingPlanGenerator 
        costPrice={product.cost_price}
        productId={product.id}
        existingPricingPlan={product.pricing_plan || undefined}
        product={{
          name: product.name,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          target_market: product.target_market || '',
          problem_solved: product.problem_solved || '',
          demand_indication: product.demand_indication || '',
          competitors: product.competitors || '',
          potential_angles: product.potential_angles || '',
          ai_opinion: product.ai_opinion || '',
          pitchline: product.pitchline || '',
          marketing_strategy: product.marketing_strategy || '',
        }}
        onSave={(plans) => {
          console.log('Saved pricing plans:', plans);
          // Update the product in store with new pricing plan
          updateProduct({ ...product, pricing_plan: plans });
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
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(product.description) as string }} />
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Score Breakdown</h2>
          <button
            onClick={handleRecalculateScores}
            disabled={isRecalculatingScores || !product.ai_opinion}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isRecalculatingScores ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Recalculate with AI
              </>
            )}
          </button>
        </div>
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
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles size={24} />
                Generate Semua Konten dengan AI
              </h2>
              <p className="text-indigo-100 mt-1 text-sm">
                Target Market • Masalah • Demand • Kompetitor • Angle • Opinion • Pitchline • Strategy • Meta Ads • IG Reels • TikTok
              </p>
            </div>
            <button
              onClick={handleGenerateAll}
              disabled={generatingTypes.size > 0}
              className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingTypes.size > 0 ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating... ({generatingTypes.size}/{allGenerateTypes.length})
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate with AI
                </>
              )}
            </button>
          </div>
          
          {/* Progress indicator */}
          {generatingTypes.size > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {allGenerateTypes.map((type) => {
                  const config = generateConfig.find(c => c.type === type);
                  const isGenerating = generatingTypes.has(type);
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        isGenerating
                          ? 'bg-white/30 text-white animate-pulse'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {isGenerating && <Loader2 size={12} className="animate-spin" />}
                      {config?.label || type}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-600">Klik tombol di atas untuk generate semua konten, atau klik Generate pada masing-masing card di bawah untuk generate per bagian.</p>

      </div>

     

      {/* AI Generated Content */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generateConfig.map((item) => {
            const Icon = item.icon;
            // Use product[item.field] to get content dynamically
            const content = (product as any)[item.field] || '';

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
                        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
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
      </>
      )}

      {/* Proposal View */}
      {viewMode === 'proposal' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-indigo-100 mt-1">{category?.name || 'Business Proposal'}</p>
          </div>
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">Harga Modal</p>
                <p className="font-bold text-gray-900">{formatCurrency(product.cost_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Harga Jual</p>
                <p className="font-bold text-gray-900">{formatCurrency(product.selling_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Margin</p>
                <p className={`font-bold ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {margin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Overall Score</p>
                <p className="font-bold text-lg">{summary.scores.overall_score}</p>
              </div>
            </div>
          </div>
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Profit Margin', score: summary.scores.profit_margin },
                { label: 'Market Potential', score: summary.scores.market_potential },
                { label: 'Competition', score: summary.scores.competition_level },
                { label: 'Uniqueness', score: summary.scores.uniqueness },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{item.score}</p>
                  <p className="text-xs text-gray-600 mt-1">{item.label}</p>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.score >= 70 ? 'bg-green-500' : item.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${item.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {product.ai_opinion && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">AI Opinion</h3>
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(product.ai_opinion) as string }} />
            </div>
          )}
          {product.marketing_strategy && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Marketing Strategy</h3>
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(product.marketing_strategy) as string }} />
            </div>
          )}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
            <div className="space-y-2">
              {summary.scores.overall_score >= 70 && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                  Produk ini memiliki potensi tinggi untuk dilaunch
                </div>
              )}
              {margin < 20 && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                  Margin rendah, perlu negosiasi harga supplier
                </div>
              )}
              {summary.scores.market_potential >= 70 && (
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                  Market potential tinggi
                </div>
              )}
              {summary.scores.uniqueness >= 70 && (
                <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                  Uniqueness tinggi - differentiator jelas
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
