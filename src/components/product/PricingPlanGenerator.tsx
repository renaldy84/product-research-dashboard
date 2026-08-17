'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  Copy,
  Check
} from 'lucide-react';

interface PricingTier {
  name: string;
  icon: string;
  quantity: number;
  sellingPrice: number;
  target: string;
}

interface PricingPlanGeneratorProps {
  costPrice: number;
  onSave?: (plans: PricingTier[]) => void;
}

const defaultPlans: PricingTier[] = [
  { name: 'Trial', icon: '🎁', quantity: 1, sellingPrice: 55000, target: 'Akuisisi' },
  { name: 'Hemat ⭐', icon: '⭐', quantity: 2, sellingPrice: 99000, target: 'AOV utama' },
  { name: 'Rutin 🔥', icon: '🔥', quantity: 3, sellingPrice: 139000, target: 'AOV + LTV' },
  { name: 'Peternak 🏆', icon: '🏆', quantity: 5, sellingPrice: 199000, target: 'Heavy user / stok' },
];

export default function PricingPlanGenerator({ costPrice, onSave }: PricingPlanGeneratorProps) {
  const [plans, setPlans] = useState<PricingTier[]>(defaultPlans);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);

  // Update selling prices when cost price changes
  useEffect(() => {
    if (!isEditing) {
      // Auto-calculate selling prices based on default margins
      const updatedPlans = defaultPlans.map(plan => ({
        ...plan,
        sellingPrice: calculateSellingPrice(costPrice, plan.quantity, plan.target),
      }));
      setPlans(updatedPlans);
    }
  }, [costPrice, isEditing]);

  const calculateSellingPrice = (cost: number, qty: number, target: string): number => {
    if (cost <= 0) return 0;
    
    // Target margin multipliers based on customer lifecycle stage
    const marginMultipliers: Record<string, number> = {
      'Akuisisi': 2.0,      // Higher margin, smaller qty
      'AOV utama': 1.8,     // Medium margin, standard qty  
      'AOV + LTV': 1.7,     // Lower margin, encourage repeat
      'Heavy user / stok': 1.5, // Lowest margin, bulk purchase
    };
    
    const multiplier = marginMultipliers[target] || 2.0;
    return Math.round((cost * multiplier * qty) / 1000) * 1000; // Round to nearest 1000
  };

  const updatePlan = (index: number, field: keyof PricingTier, value: any) => {
    const updated = [...plans];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate selling price if quantity changes
    if (field === 'quantity' || field === 'target') {
      updated[index].sellingPrice = calculateSellingPrice(
        costPrice, 
        field === 'quantity' ? value : updated[index].quantity,
        field === 'target' ? value : updated[index].target
      );
    }
    
    setPlans(updated);
  };

  const calculateMetrics = (plan: PricingTier) => {
    const totalCost = costPrice * plan.quantity;
    const pricePerPcs = plan.sellingPrice / plan.quantity;
    const grossProfit = plan.sellingPrice - totalCost;
    const margin = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
    
    return { totalCost, pricePerPcs, grossProfit, margin };
  };

  const calculateLTV = () => {
    // LTV calculation: sum of all plan revenues
    const totalRevenue = plans.reduce((sum, plan) => sum + plan.sellingPrice, 0);
    const totalCost = plans.reduce((sum, plan) => sum + (costPrice * plan.quantity), 0);
    return {
      totalRevenue,
      totalCost,
      ltv: totalRevenue - totalCost,
      avgOrderValue: totalRevenue / plans.length,
    };
  };

  const copyTableToClipboard = () => {
    const headers = 'Paket\tIsi\tHarga Jual\tHarga/pcs\tModal\tGross Profit\tTarget\n';
    const rows = plans.map(plan => {
      const m = calculateMetrics(plan);
      return `${plan.name}\t${plan.quantity} pcs\t${formatCurrency(plan.sellingPrice)}\t${formatCurrency(m.pricePerPcs)}\t${formatCurrency(m.totalCost)}\t${formatCurrency(m.grossProfit)}\t${plan.target}`;
    }).join('\n');
    
    navigator.clipboard.writeText(headers + rows);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSave = () => {
    onSave?.(plans);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
    setIsEditing(false);
  };

  const ltvMetrics = calculateLTV();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Calculator className="text-emerald-600" size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">Pricing Plan Generator</h3>
            <p className="text-sm text-gray-500">LTV-focused pricing strategy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <span className="text-sm text-emerald-600 font-medium">
              LTV: {formatCurrency(ltvMetrics.ltv)}
            </span>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* LTV Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Total Revenue</p>
              <p className="text-lg font-bold text-blue-900">{formatCurrency(ltvMetrics.totalRevenue)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-orange-600 font-medium">Total Modal</p>
              <p className="text-lg font-bold text-orange-900">{formatCurrency(ltvMetrics.totalCost)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">LTV Potential</p>
              <p className="text-lg font-bold text-green-900">{formatCurrency(ltvMetrics.ltv)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-purple-600 font-medium">Avg Order Value</p>
              <p className="text-lg font-bold text-purple-900">{formatCurrency(ltvMetrics.avgOrderValue)}</p>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Paket</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Isi</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Harga Jual</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Harga/pcs</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Modal</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Profit</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Margin</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Target</th>
                    {isEditing && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, index) => {
                    const metrics = calculateMetrics(plan);
                    const isHighlighted = plan.name.includes('Rutin') || plan.name.includes('Hemat');
                    
                    return (
                      <tr 
                        key={index} 
                        className={`border-t border-gray-100 ${isHighlighted ? 'bg-amber-50' : ''}`}
                      >
                        <td className="px-3 py-2 font-semibold text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={plan.name}
                              onChange={(e) => updatePlan(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            <span className="flex items-center gap-1">
                              {plan.name}
                              {(plan.name.includes('AOV') || plan.name.includes('Hemat')) && (
                                <TrendingUp size={14} className="text-amber-600" />
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={plan.quantity}
                              onChange={(e) => updatePlan(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                            />
                          ) : (
                            <span className="font-medium">{plan.quantity} pcs</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={plan.sellingPrice}
                              onChange={(e) => updatePlan(index, 'sellingPrice', parseInt(e.target.value) || 0)}
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            />
                          ) : (
                            formatCurrency(plan.sellingPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {formatCurrency(metrics.pricePerPcs)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {formatCurrency(metrics.totalCost)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-green-600">
                          {formatCurrency(metrics.grossProfit)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            metrics.margin >= 50 ? 'bg-green-100 text-green-700' :
                            metrics.margin >= 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {metrics.margin.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-500">
                          {isEditing ? (
                            <select
                              value={plan.target}
                              onChange={(e) => updatePlan(index, 'target', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="Akuisisi">Akuisisi</option>
                              <option value="AOV utama">AOV utama</option>
                              <option value="AOV + LTV">AOV + LTV</option>
                              <option value="Heavy user / stok">Heavy user / stok</option>
                            </select>
                          ) : (
                            plan.target
                          )}
                        </td>
                        {isEditing && (
                          <td className="px-3 py-2">
                            <button
                              onClick={() => {
                                const updated = plans.filter((_, i) => i !== index);
                                setPlans(updated);
                              }}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Sparkles size={14} />
                    Edit Plans
                  </button>
                  <button
                    onClick={() => {
                      setPlans(defaultPlans);
                      const updated = defaultPlans.map(plan => ({
                        ...plan,
                        sellingPrice: calculateSellingPrice(costPrice, plan.quantity, plan.target),
                      }));
                      setPlans(updated);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw size={14} />
                    Reset
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save size={14} />
                    {savedMessage ? 'Tersimpan!' : 'Simpan'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      const updated = defaultPlans.map(plan => ({
                        ...plan,
                        sellingPrice: calculateSellingPrice(costPrice, plan.quantity, plan.target),
                      }));
                      setPlans(updated);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      setPlans([...plans, { name: 'Paket Baru', icon: '📦', quantity: 1, sellingPrice: costPrice * 2, target: 'Akuisisi' }]);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm border border-dashed border-gray-400 rounded-lg hover:border-gray-600 transition-colors"
                  >
                    + Tambah Paket
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={copyTableToClipboard}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              {copiedIndex === -1 ? <Check size={14} /> : <Copy size={14} />}
              {copiedIndex === -1 ? 'Tersalin!' : 'Copy Table'}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>💡 Tips LTV:</strong> Gunakan paket &quot;Hemat&quot; atau &quot;Rutin&quot; sebagai AOV utama untuk meningkatkan lifetime value pelanggan. 
              Semakin tinggi margin di awal (Trial), semakin besar toleransi untuk menawarkan paket yang lebih besar nanti.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
