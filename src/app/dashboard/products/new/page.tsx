'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useProductStore } from '@/store/useStore';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Package,
  DollarSign,
  Users,
  Target,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { categories, setCategories, addProduct } = useProductStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    cost_price: '',
    selling_price: '',
    target_market: '',
    problem_solved: '',
    demand_indication: '',
    competitors: '',
    potential_angles: '',
  });
  
  const [generatingFields, setGeneratingFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/categories', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsFetchingCategories(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleGenerateField = async (field: string) => {
    if (!user || !formData.name) {
      alert('Mohon isi nama produk terlebih dahulu');
      return;
    }
    
    setGeneratingFields(prev => new Set(prev).add(field));
    
    try {
      // Map field to AI type
      const typeMap: Record<string, string> = {
        description: 'description',
        target_market: 'target_market',
        problem_solved: 'problem_solved',
        competitors: 'competitors',
        demand_indication: 'demand_indication',
        potential_angles: 'angle',
      };
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          type: typeMap[field],
          product: {
            name: formData.name,
            cost_price: parseFloat(formData.cost_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            target_market: formData.target_market,
            problem_solved: formData.problem_solved,
            competitors: formData.competitors,
            potential_angles: formData.potential_angles,
          }
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate');
      }
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, [field]: data.result }));
    } catch (error) {
      console.error('Generate error:', error);
      alert('Gagal generate. Pastikan API key sudah benar dan saldo mencukupi.');
    } finally {
      setGeneratingFields(prev => {
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id || null,
          cost_price: parseFloat(formData.cost_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          target_market: formData.target_market,
          problem_solved: formData.problem_solved,
          demand_indication: formData.demand_indication,
          competitors: formData.competitors,
          potential_angles: formData.potential_angles,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const newProduct = await response.json();
      addProduct(newProduct);
      router.push(`/dashboard/products/${newProduct.id}`);
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Gagal membuat produk. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Produk Baru</h1>
          <p className="text-gray-600">Lengkapi informasi produk kandidat</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Informasi Dasar</h2>
              <p className="text-sm text-gray-500">Detail utama produk</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Contoh: Smart Water Bottle"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Deskripsi Produk
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField('description')}
                  disabled={generatingFields.has('description') || !formData.name}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {generatingFields.has('description') ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} /> AI Suggestion</>
                  )}
                </button>
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Deskripsi lengkap produk untuk marketplace (deskripsi akan di-generate dengan deepseeking untuk hasil optimal)"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              {isFetchingCategories ? (
                <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Harga</h2>
              <p className="text-sm text-gray-500">Harga modal dan harga jual</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Modal (Cost)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Jual
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  name="selling_price"
                  value={formData.selling_price}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {formData.cost_price && formData.selling_price && (
                <p className="mt-2 text-sm text-green-600">
                  Margin: {((parseFloat(formData.selling_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price) * 100).toFixed(1)}%
                  {' '}&bull;{' '}
                  Profit: Rp {(parseFloat(formData.selling_price) - parseFloat(formData.cost_price)).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Market Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Analisis Market</h2>
              <p className="text-sm text-gray-500">Target market dan demand</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Target Market
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField('target_market')}
                  disabled={generatingFields.has('target_market') || !formData.name}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {generatingFields.has('target_market') ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} /> AI (DeepSeek)</>
                  )}
                </button>
              </div>
              <textarea
                name="target_market"
                value={formData.target_market}
                onChange={handleChange}
                placeholder="Siapa target konsumen produk ini? Contoh: Perempuan 20-35 tahun, pekerja kantoran di kota besar"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Indikasi Demand
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField('demand_indication')}
                  disabled={generatingFields.has('demand_indication') || !formData.name}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {generatingFields.has('demand_indication') ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} /> AI (DeepSeek)</>
                  )}
                </button>
              </div>
              <textarea
                name="demand_indication"
                value={formData.demand_indication}
                onChange={handleChange}
                placeholder="Bagaimana indikasi permintaan pasar? Contoh: Trend pencarian naik 200%, banyak konten TikTok viral tentang produk serupa"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Competition Analysis */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Analisis Kompetitor</h2>
              <p className="text-sm text-gray-500">Siapa kompetitor dan bagaimana diferensiasi</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Kompetitor
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField('competitors')}
                  disabled={generatingFields.has('competitors') || !formData.name}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {generatingFields.has('competitors') ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} /> AI (DeepSeek)</>
                  )}
                </button>
              </div>
              <textarea
                name="competitors"
                value={formData.competitors}
                onChange={handleChange}
                placeholder="Siapa saja kompetitor utama? Contoh: Brand A (harga Rp 150rb), Brand B (premium Rp 300rb)"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Potensi Angle Iklan
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField('potential_angles')}
                  disabled={generatingFields.has('potential_angles') || !formData.name}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {generatingFields.has('potential_angles') ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} /> AI Suggestion</>
                  )}
                </button>
              </div>
              <textarea
                name="potential_angles"
                value={formData.potential_angles}
                onChange={handleChange}
                placeholder="Apa unique selling point yang bisa menjadi angle iklan? Contoh: Auto-brew coffee dalam 3 menit, bahan food-grade certified"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Masalah yang Diselesaikan
                </label>
                <button
                  type="button"
                  onClick={() => handleGenerateField('problem_solved')}
                  disabled={generatingFields.has('problem_solved') || !formData.name}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  {generatingFields.has('problem_solved') ? (
                    <><Loader2 size={14} className="animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles size={14} /> AI (DeepSeek)</>
                  )}
                </button>
              </div>
              <textarea
                name="problem_solved"
                value={formData.problem_solved}
                onChange={handleChange}
                placeholder="Masalah apa yang diselesaikan produk ini? Contoh: Ibu menyusui butuh botol yang bisa hangatkan susu otomatis"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/products"
            className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                Simpan Produk
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
