'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useStore';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, Bot, Key, Loader2, Plus, Eye, EyeOff, Trash2 } from 'lucide-react';

type AIProvider = 'openai' | 'openrouter' | 'sumopod';

interface ProviderInfo {
  id: AIProvider;
  name: string;
  baseUrl: string;
  models: string[];
  hasApiKey: boolean;
  apiKeyMasked: string;
  customEndpoint: string;
  customModel: string;
  defaultModel: string;
}

interface UserSettings {
  openai_api_key: string;
  openai_api_key_exists: boolean;
  openai_endpoint: string;
  openai_custom_model: string;
  openrouter_api_key: string;
  openrouter_api_key_exists: boolean;
  openrouter_endpoint: string;
  openrouter_custom_model: string;
  sumopod_api_key: string;
  sumopod_api_key_exists: boolean;
  sumopod_endpoint: string;
  sumopod_custom_model: string;
  active_provider: AIProvider;
  active_model: string;
}

const defaultModels: Record<AIProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  openrouter: [
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-pro',
    'google/gemini-flash',
    'mistralai/mistral-7b-instruct',
    'meta-llama/llama-3-8b-instruct',
    'meta-llama/llama-3-70b-instruct',
  ],
  sumopod: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3.5-sonnet', 'gpt-4o-mini', 'gpt-4o', 'gemini-pro'],
};

const providerInfo: Record<AIProvider, { name: string; docsUrl: string; description: string }> = {
  openai: { 
    name: 'OpenAI', 
    docsUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-4o, GPT-4, GPT-3.5'
  },
  openrouter: { 
    name: 'OpenRouter', 
    docsUrl: 'https://openrouter.ai/keys',
    description: 'Claude, Gemini, Llama, Mistral & more'
  },
  sumopod: { 
    name: 'Sumopod', 
    docsUrl: 'https://sumopod.com/api',
    description: 'Claude, GPT, Gemini'
  },
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingProviders, setIsFetchingProviders] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [weights, setWeightsLocal] = useState({
    profit_margin: 0.3,
    market_potential: 0.25,
    competition_level: 0.25,
    uniqueness: 0.2,
  });

  const [aiSettings, setAiSettings] = useState<UserSettings>({
    openai_api_key: '',
    openai_api_key_exists: false,
    openai_endpoint: '',
    openai_custom_model: '',
    openrouter_api_key: '',
    openrouter_api_key_exists: false,
    openrouter_endpoint: '',
    openrouter_custom_model: '',
    sumopod_api_key: '',
    sumopod_api_key_exists: false,
    sumopod_endpoint: '',
    sumopod_custom_model: '',
    active_provider: 'openai',
    active_model: '',
  });

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [customModels, setCustomModels] = useState<Record<AIProvider, string[]>>({
    openai: [],
    openrouter: [],
    sumopod: [],
  });

  const [newCustomModel, setNewCustomModel] = useState<Record<AIProvider, string>>({
    openai: '',
    openrouter: '',
    sumopod: '',
  });

  const [showApiKey, setShowApiKey] = useState<Record<AIProvider, boolean>>({
    openai: false,
    openrouter: false,
    sumopod: false,
  });

  const totalWeight = weights.profit_margin + weights.market_potential + weights.competition_level + weights.uniqueness;
  const isValid = Math.abs(totalWeight - 1) < 0.01;

  useEffect(() => {
    fetchWeights();
    fetchProviders();
    fetchUserSettings();
  }, [user]);

  useEffect(() => {
    setIsLoading(false);
  }, [user]);

  const fetchWeights = async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/weights', {
        headers: { 'x-user-id': user.id }
      });

      if (res.ok) {
        const data = await res.json();
        setWeightsLocal({
          profit_margin: data.profit_margin || 0.3,
          market_potential: data.market_potential || 0.25,
          competition_level: data.competition_level || 0.25,
          uniqueness: data.uniqueness || 0.2,
        });
      }
    } catch (error) {
      console.error('Failed to fetch weights:', error);
    }
  };

  const fetchProviders = async () => {
    if (!user) return;

    setIsFetchingProviders(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'GET',
        headers: { 'x-user-id': user.id }
      });

      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setIsFetchingProviders(false);
    }
  };

  const fetchUserSettings = async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/settings', {
        headers: { 'x-user-id': user.id }
      });

      if (res.ok) {
        const data = await res.json();
        setAiSettings({
          openai_api_key: data.openai_api_key || '',
          openai_api_key_exists: data.openai_api_key_exists || false,
          openai_endpoint: data.openai_endpoint || '',
          openai_custom_model: data.openai_custom_model || '',
          openrouter_api_key: data.openrouter_api_key || '',
          openrouter_api_key_exists: data.openrouter_api_key_exists || false,
          openrouter_endpoint: data.openrouter_endpoint || '',
          openrouter_custom_model: data.openrouter_custom_model || '',
          sumopod_api_key: data.sumopod_api_key || '',
          sumopod_api_key_exists: data.sumopod_api_key_exists || false,
          sumopod_endpoint: data.sumopod_endpoint || '',
          sumopod_custom_model: data.sumopod_custom_model || '',
          active_provider: data.active_provider || 'openai',
          active_model: data.active_model || '',
        });

        // Build custom models list from existing settings
        const custom: Record<AIProvider, string[]> = { openai: [], openrouter: [], sumopod: [] };
        ['openai', 'openrouter', 'sumopod'].forEach(p => {
          const customModel = data[`${p}_custom_model` as keyof typeof data];
          if (customModel) {
            custom[p as AIProvider].push(customModel);
          }
        });
        setCustomModels(custom);
      }
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
    }
  };

  const handleSaveAISettings = async () => {
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(aiSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save AI settings');
      }

      const result = await response.json();
      
      // Update settings with masked keys
      setAiSettings(prev => ({
        ...prev,
        openai_api_key: result.openai_api_key || prev.openai_api_key,
        openrouter_api_key: result.openrouter_api_key || prev.openrouter_api_key,
        sumopod_api_key: result.sumopod_api_key || prev.sumopod_api_key,
      }));

      // Refresh providers list
      await fetchProviders();
      
      setMessage({ type: 'success', text: 'Pengaturan AI berhasil disimpan!' });
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan AI.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomModel = (provider: AIProvider) => {
    const model = newCustomModel[provider].trim();
    if (!model) return;

    // Check if model already exists
    const allModels = [...defaultModels[provider], ...customModels[provider]];
    if (allModels.includes(model)) {
      // Just select the existing model
      setAiSettings(prev => ({
        ...prev,
        active_model: model,
      }));
      setNewCustomModel(prev => ({ ...prev, [provider]: '' }));
      return;
    }

    // Add to custom models list
    setCustomModels(prev => ({
      ...prev,
      [provider]: [...prev[provider], model],
    }));

    // Update settings - set as active model and custom model
    setAiSettings(prev => ({
      ...prev,
      active_model: model,
      [`${provider}_custom_model`]: model,
    }));

    setNewCustomModel(prev => ({ ...prev, [provider]: '' }));
  };

  const handleRemoveCustomModel = (provider: AIProvider, model: string) => {
    setCustomModels(prev => ({
      ...prev,
      [provider]: prev[provider].filter(m => m !== model),
    }));
  };

  const handleSelectProvider = (providerId: AIProvider) => {
    // Only update if it's a different provider
    if (aiSettings.active_provider === providerId) {
      return;
    }
    
    const provider = providers.find(p => p.id === providerId);
    setAiSettings(prev => ({
      ...prev,
      active_provider: providerId,
      active_model: prev.active_model || provider?.defaultModel || '',
    }));
  };

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'openai':
        return <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">AI</div>;
      case 'openrouter':
        return <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">OR</div>;
      case 'sumopod':
        return <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">SP</div>;
    }
  };

  const getProviderColor = (provider: AIProvider) => {
    switch (provider) {
      case 'openai':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'openrouter':
        return 'border-purple-200 bg-purple-50 hover:bg-purple-100';
      case 'sumopod':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
    }
  };

  const getSelectedColor = (provider: AIProvider) => {
    switch (provider) {
      case 'openai':
        return 'ring-2 ring-green-500';
      case 'openrouter':
        return 'ring-2 ring-purple-500';
      case 'sumopod':
        return 'ring-2 ring-blue-500';
    }
  };

  const getAllModels = (provider: AIProvider) => {
    return [...defaultModels[provider], ...customModels[provider]];
  };

  const selectedProvider = providers.find(p => p.id === aiSettings.active_provider);
  const hasAnyApiKey = ['openai', 'openrouter', 'sumopod'].some(p => 
    aiSettings[`${p}_api_key_exists` as keyof typeof aiSettings] || (
      aiSettings[`${p}_api_key` as keyof typeof aiSettings] && 
      !String(aiSettings[`${p}_api_key` as keyof typeof aiSettings]).startsWith('***')
    )
  );

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600 mt-1">Atur preferensi dan konfigurasi AI</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* AI Provider Configuration */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Bot className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Konfigurasi AI Provider</h2>
            <p className="text-sm text-gray-500">Atur API key, endpoint, dan model AI</p>
          </div>
        </div>

        {isFetchingProviders ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
            <span className="ml-2 text-gray-500">Memuat provider...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Key Status */}
            {!hasAnyApiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-medium text-yellow-900">API Key belum diinput</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Tambahkan API key untuk salah satu provider di bawah untuk bisa menggunakan fitur AI generation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['openai', 'openrouter', 'sumopod'] as AIProvider[]).map((providerId) => {
                const info = providerInfo[providerId];
                const apiKeyExists = aiSettings[`${providerId}_api_key_exists` as keyof typeof aiSettings] as boolean;
                const hasApiKey = apiKeyExists || (
                  aiSettings[`${providerId}_api_key` as keyof typeof aiSettings] && 
                  !String(aiSettings[`${providerId}_api_key` as keyof typeof aiSettings]).startsWith('***')
                );
                const isActive = aiSettings.active_provider === providerId;
                
                return (
                  <div
                    key={providerId}
                    className={`rounded-xl border-2 transition-all ${
                      isActive
                        ? `${getProviderColor(providerId)} ${getSelectedColor(providerId)}`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getProviderIcon(providerId)}
                          <div>
                            <h3 className="font-semibold text-gray-900">{info.name}</h3>
                            <p className="text-xs text-gray-500">{info.description}</p>
                          </div>
                        </div>
                        {hasApiKey && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            ✓ Configured
                          </span>
                        )}
                      </div>

                      {/* API Key Input */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey[providerId] ? 'text' : 'password'}
                            value={aiSettings[`${providerId}_api_key` as keyof typeof aiSettings] as string}
                            onChange={(e) => setAiSettings(prev => ({
                              ...prev,
                              [`${providerId}_api_key` as keyof typeof prev]: e.target.value,
                            }))}
                            placeholder={hasApiKey ? 'Already saved (enter new to replace)' : 'Enter API key...'}
                            className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(prev => ({ ...prev, [providerId]: !prev[providerId] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiKey[providerId] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <a
                          href={info.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-700 mt-1 inline-block"
                        >
                          Get API Key →
                        </a>
                      </div>

                      {/* Provider Configuration (when active) */}
                      {isActive && (
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                          {/* Custom Endpoint */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Base URL (opsional)
                            </label>
                            <input
                              type="text"
                              value={aiSettings[`${providerId}_endpoint` as keyof typeof aiSettings] as string}
                              onChange={(e) => setAiSettings(prev => ({
                                ...prev,
                                [`${providerId}_endpoint` as keyof typeof prev]: e.target.value,
                              }))}
                              placeholder="https://api.openai.com/v1"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Kosongkan untuk default URL atau isi URL lengkap, contoh: https://api.openai.com/v1</p>
                          </div>

                          {/* Model Selection */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Model
                            </label>
                            <select
                              value={aiSettings.active_model && getAllModels(providerId).includes(aiSettings.active_model) 
                                ? aiSettings.active_model 
                                : selectedProvider?.defaultModel || ''}
                              onChange={(e) => setAiSettings(prev => ({
                                ...prev,
                                active_model: e.target.value,
                              }))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <optgroup label="Model Default">
                                {defaultModels[providerId].map(model => (
                                  <option key={model} value={model}>{model}</option>
                                ))}
                              </optgroup>
                              {customModels[providerId].length > 0 && (
                                <optgroup label="Model Custom">
                                  {customModels[providerId].map(model => (
                                    <option key={model} value={model}>{model} (custom)</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          {/* Add Custom Model */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tambah Model Custom
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCustomModel[providerId]}
                                onChange={(e) => setNewCustomModel(prev => ({
                                  ...prev,
                                  [providerId]: e.target.value,
                                }))}
                                placeholder="Nama model (e.g., custom-model-v1)"
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomModel(providerId)}
                              />
                              <button
                                onClick={() => handleAddCustomModel(providerId)}
                                className="px-3 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                            {customModels[providerId].length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {customModels[providerId].map(model => (
                                  <span
                                    key={model}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                                  >
                                    {model}
                                    <button
                                      onClick={() => handleRemoveCustomModel(providerId, model)}
                                      className="hover:text-indigo-900"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Select Button */}
                      <button
                        onClick={() => handleSelectProvider(providerId)}
                        className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isActive ? '✓ Provider Aktif' : 'Pilih Provider Ini'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveAISettings}
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Simpan Pengaturan AI
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scoring Weights */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Settings className="text-indigo-600" size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Bobot Scoring Produk</h2>
            <p className="text-sm text-gray-500">Atur prioritas untuk setiap faktor dalam perhitungan score</p>
          </div>
        </div>

        <div className="space-y-6">
          {[
            { key: 'profit_margin', label: 'Profit Margin', description: 'Seberapa besar margin keuntungan produk', color: 'bg-green-500', colorBg: 'bg-green-100' },
            { key: 'market_potential', label: 'Market Potential', description: 'Potensi permintaan pasar untuk produk', color: 'bg-blue-500', colorBg: 'bg-blue-100' },
            { key: 'competition_level', label: 'Competition Level', description: 'Tingkat kompetisi dengan produk lain', color: 'bg-orange-500', colorBg: 'bg-orange-100' },
            { key: 'uniqueness', label: 'Uniqueness', description: 'Keunikan dan diferensiasi produk', color: 'bg-purple-500', colorBg: 'bg-purple-100' },
          ].map((field) => (
            <div key={field.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${field.color}`} />
                  <div>
                    <h3 className="font-medium text-gray-900">{field.label}</h3>
                    <p className="text-sm text-gray-500">{field.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[field.key as keyof typeof weights]}
                    onChange={(e) => setWeightsLocal(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="text-gray-500 font-medium">({((weights[field.key as keyof typeof weights]) * 100).toFixed(0)}%)</span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${field.colorBg} transition-all duration-300`}
                  style={{ width: `${((weights[field.key as keyof typeof weights]) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total Weight */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Total Bobot</h3>
              {!isValid && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle size={16} />
                  Total harus 100%
                </span>
              )}
            </div>
            <div className={`text-xl font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {(totalWeight * 100).toFixed(0)}%
            </div>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isValid ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(totalWeight * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => setWeightsLocal({
              profit_margin: 0.3,
              market_potential: 0.25,
              competition_level: 0.25,
              uniqueness: 0.2,
            })}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={18} />
            Reset
          </button>
          <button
            onClick={async () => {
              if (!user || !isValid) return;
              setIsSaving(true);
              try {
                const response = await fetch('/api/weights', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
                  body: JSON.stringify(weights),
                });
                if (response.ok) {
                  setMessage({ type: 'success', text: 'Bobot scoring berhasil disimpan!' });
                }
              } catch (error) {
                setMessage({ type: 'error', text: 'Gagal menyimpan bobot scoring.' });
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={!isValid || isSaving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Simpan Bobot
          </button>
        </div>

        {/* How Scoring Works */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
            <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <span className="text-xl">📊</span> Cara Kerja Perhitungan Score
            </h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Rumus Perhitungan:</h4>
                <div className="bg-white rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <p className="text-gray-600">Overall Score =</p>
                  <p className="text-gray-600 pl-4">(Profit Margin Score × Bobot Profit) +</p>
                  <p className="text-gray-600 pl-4">(Market Potential Score × Bobot Market) +</p>
                  <p className="text-gray-600 pl-4">(Competition Score × Bobot Competition) +</p>
                  <p className="text-gray-600 pl-4">(Uniqueness Score × Bobot Uniqueness)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Detail Score per Faktor:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <strong>Profit Margin:</strong> Berdasarkan persentase margin (0-100%)</li>
                    <li>• <strong>Market Potential:</strong> Indikasi demand yang diisi (tinggi jika ada)</li>
                    <li>• <strong>Competition:</strong> Semakin sedikit kompetitor, semakin tinggi score</li>
                    <li>• <strong>Uniqueness:</strong> Berdasarkan angle/keunikan yang diisi</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Contoh Perhitungan:</h4>
                  <div className="bg-white rounded-lg p-3 text-xs">
                    <p className="text-gray-600">Jika:</p>
                    <p className="text-gray-600">• Profit = 70, Bobot = 30%</p>
                    <p className="text-gray-600">• Market = 80, Bobot = 25%</p>
                    <p className="text-gray-600">• Competition = 60, Bobot = 25%</p>
                    <p className="text-gray-600">• Uniqueness = 75, Bobot = 20%</p>
                    <p className="text-gray-600 mt-2 border-t pt-2">
                      <strong>Score = (70×0.30) + (80×0.25) + (60×0.25) + (75×0.20) = 71</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-medium text-yellow-800 mb-1">💡 Tips Penentuan Bobot:</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• <strong>Bisnis baru / margin tipis:</strong> Perbesar bobot Profit Margin</li>
                  <li>• <strong>Produk trending:</strong> Perbesar bobot Market Potential</li>
                  <li>• <strong>Produk unik / baru:</strong> Perbesar bobot Uniqueness</li>
                  <li>• <strong>Pasar sudah ramai:</strong> Perbesar bobot Competition Level</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-medium text-blue-900 mb-2">Tips Pengaturan</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>API Key per User:</strong> Setiap user bisa punya API key masing-masing</li>
          <li>• <strong>Custom Endpoint:</strong> Isi jika menggunakan proxy atau custom API server</li>
          <li>• <strong>Custom Model:</strong> Tambah model baru yang tidak ada di daftar default</li>
          <li>• Model custom akan otomatis masuk ke dropdown setelah ditambahkan</li>
          <li>• Scoring weights harus total 100% agar valid</li>
        </ul>
      </div>
    </div>
  );
}
