'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore, useProductStore, useScoringStore, calculateProductSummary } from '@/store/useStore';
import { formatCurrency, getScoreColor, getScoreLabel } from '@/lib/utils';
import Link from 'next/link';
import {
  TrendingUp,
  Trophy,
  Target,
  DollarSign,
  ArrowUpRight,
  Plus,
  Package,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { products, categories, setProducts, setCategories } = useProductStore();
  const { weights } = useScoringStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [productsRes, categoriesRes, weightsRes] = await Promise.all([
        fetch('/api/products', {
          headers: { 'x-user-id': user.id }
        }),
        fetch('/api/categories', {
          headers: { 'x-user-id': user.id }
        }),
        fetch('/api/weights', {
          headers: { 'x-user-id': user.id }
        })
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      const weightsData = await weightsRes.json();

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      
      if (weightsData.profit_margin) {
        useScoringStore.getState().setWeights(weightsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const productSummaries = useMemo(() => {
    return products
      .map(product => {
        const category = categories.find(c => c.id === product.category_id);
        return calculateProductSummary(product, category, weights);
      })
      .sort((a, b) => b.scores.overall_score - a.scores.overall_score);
  }, [products, categories, weights]);

  const topProduct = productSummaries[0];
  const avgScore = productSummaries.length > 0
    ? Math.round(productSummaries.reduce((sum, p) => sum + p.scores.overall_score, 0) / productSummaries.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ringkasan Produk</h1>
          <p className="text-gray-600 mt-1">Analisis perbandingan semua produk kandidat</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Tambah Produk
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Package className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Produk</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rata-rata Score</p>
              <p className="text-2xl font-bold text-gray-900">{avgScore}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Trophy className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Top Produk</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {topProduct?.product.name || '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Kategori</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Product Recommendation */}
      {topProduct && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-green-100 mb-2">
                <Trophy size={20} />
                <span className="text-sm font-medium">REKOMENDASI TERBAIK</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{topProduct.product.name}</h2>
              <p className="text-green-100 max-w-xl">
                Dengan score keseluruhan {topProduct.scores.overall_score}, produk ini memiliki 
                margin keuntungan {topProduct.profit_margin_pct.toFixed(1)}% dan potensi 
                {topProduct.scores.market_potential >= 70 ? ' pasar yang besar' : ' pasar yang menjanjikan'}.
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div className="bg-white/20 rounded-lg px-4 py-2">
                  <p className="text-xs text-green-100">Margin</p>
                  <p className="font-bold">{topProduct.profit_margin_pct.toFixed(1)}%</p>
                </div>
                <div className="bg-white/20 rounded-lg px-4 py-2">
                  <p className="text-xs text-green-100">Profit</p>
                  <p className="font-bold">{formatCurrency(topProduct.profit)}</p>
                </div>
                <div className="bg-white/20 rounded-lg px-4 py-2">
                  <p className="text-xs text-green-100">Harga Jual</p>
                  <p className="font-bold">{formatCurrency(topProduct.product.selling_price)}</p>
                </div>
              </div>
            </div>
            <Link
              href={`/dashboard/products/${topProduct.product.id}`}
              className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              Detail
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      )}

      {/* Product Rankings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Peringkat Produk</h2>
          <p className="text-sm text-gray-600">Berdasarkan weighted scoring analysis</p>
        </div>

        {productSummaries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Produk</h3>
            <p className="text-gray-600 mb-4">Mulai tambahkan produk kandidat untuk dianalisis</p>
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700"
            >
              <Plus size={20} />
              Tambah Produk Pertama
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {productSummaries.map((summary, index) => (
              <Link
                key={summary.product.id}
                href={`/dashboard/products/${summary.product.id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{summary.product.name}</h3>
                    {index === 0 && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                        Best Pick
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {summary.category?.name || 'Tanpa Kategori'} • Margin {summary.profit_margin_pct.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(summary.scores.overall_score)}`}>
                    {summary.scores.overall_score}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{getScoreLabel(summary.scores.overall_score)}</p>
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <AlertCircle className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">Tips Penggunaan Dashboard</h3>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• Tambahkan 3-5 produk kandidat untuk perbandingan optimal</li>
              <li>• Isi semua detail produk untuk hasil analisis yang lebih akurat</li>
              <li>• Gunakan fitur AI untuk mendapatkan insight dan content ideas</li>
              <li>• Atur bobot scoring di Settings sesuai prioritas bisnismu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
