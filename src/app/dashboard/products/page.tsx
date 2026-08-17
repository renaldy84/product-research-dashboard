'use client';

import { useEffect, useState } from 'react';
import { useAuthStore, useProductStore, useScoringStore, calculateProductSummary } from '@/store/useStore';
import Link from 'next/link';
import { formatCurrency, getScoreColor, getScoreLabel } from '@/lib/utils';
import {
  Plus,
  Package,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  ChevronRight,
  X
} from 'lucide-react';

export default function ProductsPage() {
  const { user } = useAuthStore();
  const { products, categories, setProducts, setCategories, deleteProduct } = useProductStore();
  const { weights } = useScoringStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('overall-desc');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products', { headers: { 'x-user-id': user.id } }),
        fetch('/api/categories', { headers: { 'x-user-id': user.id } })
      ]);

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user!.id }
      });

      if (response.ok) {
        deleteProduct(id);
        setDeleteModal(null);
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const catA = categories.find(c => c.id === a.category_id);
    const catB = categories.find(c => c.id === b.category_id);
    const scoresA = a.scores || calculateProductSummary(a, catA, weights).scores;
    const scoresB = b.scores || calculateProductSummary(b, catB, weights).scores;
    
    const [field, order] = sortBy.split('-');
    let valueA: number, valueB: number;
    
    if (field === 'overall') {
      valueA = scoresA.overall_score;
      valueB = scoresB.overall_score;
    } else if (field === 'competition') {
      valueA = scoresA.competition_level;
      valueB = scoresB.competition_level;
    } else if (field === 'uniqueness') {
      valueA = scoresA.uniqueness;
      valueB = scoresB.uniqueness;
    } else {
      valueA = scoresA.profit_margin;
      valueB = scoresB.profit_margin;
    }
    
    return order === 'asc' ? valueA - valueB : valueB - valueA;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Produk Kandidat</h1>
          <p className="text-gray-600 mt-1">Kelola semua produk yang ingin dianalisis</p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Tambah Produk
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-48 pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
            >
              <option value="overall-desc">Overall ↓</option>
              <option value="overall-asc">Overall ↑</option>
              <option value="competition-desc">Kompetisi ↓</option>
              <option value="competition-asc">Kompetisi ↑</option>
              <option value="uniqueness-desc">Keunikan ↓</option>
              <option value="uniqueness-asc">Keunikan ↑</option>
              <option value="profit-desc">Profit Margin ↓</option>
              <option value="profit-asc">Profit Margin ↑</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedCategory !== 'all' ? 'Produk Tidak Ditemukan' : 'Belum Ada Produk'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all'
              ? 'Coba ubah filter atau kata kunci pencarian'
              : 'Mulai tambahkan produk kandidat untuk riset produk'}
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <Link
              href="/dashboard/products/new"
              className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700"
            >
              <Plus size={20} />
              Tambah Produk Pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProducts.map((product) => {
            const category = categories.find(c => c.id === product.category_id);
            const profit = product.selling_price - product.cost_price;
            const margin = product.cost_price > 0 ? (profit / product.cost_price) * 100 : 0;
            const scores = product.scores || calculateProductSummary(product, category, weights).scores;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    {category && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {category.name}
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical size={20} />
                    </button>
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 hidden group-hover:block z-50">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={16} />
                        Lihat Detail
                      </Link>
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit size={16} />
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteModal(product.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <Trash2 size={16} />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Harga Modal</span>
                    <span className="font-medium">{formatCurrency(product.cost_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Harga Jual</span>
                    <span className="font-medium">{formatCurrency(product.selling_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Margin</span>
                    <span className={`font-medium ${margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Profit</span>
                    <span className="font-medium text-green-600">{formatCurrency(profit)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  {/* Overall Score */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Overall</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${getScoreColor(scores.overall_score)}`}>
                      {scores.overall_score}
                    </span>
                  </div>
                  {/* Score Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-500">Profit</span>
                      <span className={`text-xs font-medium ${scores.profit_margin >= 70 ? 'text-green-600' : scores.profit_margin >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scores.profit_margin}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-500">Market</span>
                      <span className={`text-xs font-medium ${scores.market_potential >= 70 ? 'text-green-600' : scores.market_potential >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scores.market_potential}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-500">Kompetisi</span>
                      <span className={`text-xs font-medium ${scores.competition_level >= 70 ? 'text-green-600' : scores.competition_level >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scores.competition_level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-xs text-gray-500">Unik</span>
                      <span className={`text-xs font-medium ${scores.uniqueness >= 70 ? 'text-green-600' : scores.uniqueness >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {scores.uniqueness}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/products/${product.id}`}
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
                >
                  Lihat Detail
                  <ChevronRight size={18} />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModal(null)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Produk?</h3>
            <p className="text-gray-600 mb-6">
              Tindakan ini tidak dapat dibatalkan. Semua data produk akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
