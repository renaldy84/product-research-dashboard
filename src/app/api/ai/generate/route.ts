import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/db';

// Supported AI Providers
type AIProvider = 'openai' | 'openrouter' | 'sumopod';

interface GenerateRequest {
  type: 'opinion' | 'pitchline' | 'strategy' | 'meta_ad' | 'ig_reels' | 'tiktok' | 'angle' | 'description' | 'target_market' | 'problem_solved' | 'competitors' | 'demand_indication';
  product: {
    name: string;
    description?: string;
    cost_price: number;
    selling_price: number;
    target_market: string;
    problem_solved: string;
    competitors: string;
    potential_angles: string;
  };
}

// Default provider configurations (base URLs)
const providerDefaults: Record<AIProvider, {
  baseUrl: string;
  defaultModel: string;
  models: string[];
}> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3-haiku',
    models: [
      'anthropic/claude-3-haiku',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro',
      'google/gemini-flash',
      'mistralai/mistral-7b-instruct',
      'meta-llama/llama-3-8b-instruct',
      'meta-llama/llama-3-70b-instruct',
    ],
  },
  sumopod: {
    baseUrl: 'https://api.sumopod.com/v1',
    defaultModel: 'claude-3-haiku',
    models: [
      'claude-3-haiku',
      'claude-3-sonnet',
      'claude-3.5-sonnet',
      'gpt-4o-mini',
      'gpt-4o',
      'gemini-pro',
    ],
  },
};

// Get user settings from database
async function getUserSettings(userId: string) {
  const settings = runQuery<{
    openai_api_key: string | null;
    openai_endpoint: string | null;
    openai_custom_model: string | null;
    openrouter_api_key: string | null;
    openrouter_endpoint: string | null;
    openrouter_custom_model: string | null;
    sumopod_api_key: string | null;
    sumopod_endpoint: string | null;
    sumopod_custom_model: string | null;
    active_provider: string;
    active_model: string;
  }>(
    'SELECT * FROM user_settings WHERE user_id = ?',
    [userId]
  );
  return settings.length > 0 ? settings[0] : null;
}

// Build full URL from baseUrl + endpoint
function buildUrl(endpoint: string | null, providerDefault: string): string {
  if (endpoint && endpoint.trim()) {
    // If user provided a full URL, use it
    let url = endpoint.trim();
    // Ensure https:// or http:// prefix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    // Ensure /v1/chat/completions path
    if (!url.includes('/chat/completions')) {
      url = url.replace(/\/$/, '') + '/chat/completions';
    }
    return url;
  }
  // Use default
  const firstProvider = Object.keys(providerDefaults)[0]
  return providerDefaults[firstProvider as AIProvider].baseUrl + '/chat/completions';
}

// Get API key for provider
function getApiKey(provider: AIProvider, settings: any): string | null {
  const keyMap: Record<AIProvider, string> = {
    openai: 'openai_api_key',
    openrouter: 'openrouter_api_key',
    sumopod: 'sumopod_api_key',
  };
  return settings?.[keyMap[provider]] || null;
}

// Get endpoint for provider
function getEndpoint(provider: AIProvider, settings: any): string | null {
  const endpointMap: Record<AIProvider, string> = {
    openai: 'openai_endpoint',
    openrouter: 'openrouter_endpoint',
    sumopod: 'sumopod_endpoint',
  };
  return settings?.[endpointMap[provider]] || null;
}

// Get custom model for provider
function getCustomModel(provider: AIProvider, settings: any): string | null {
  const modelMap: Record<AIProvider, string> = {
    openai: 'openai_custom_model',
    openrouter: 'openrouter_custom_model',
    sumopod: 'sumopod_custom_model',
  };
  return settings?.[modelMap[provider]] || null;
}

async function generateWithAI(
  provider: AIProvider,
  model: string,
  baseUrl: string,
  apiKey: string,
  prompt: string
): Promise<string> {
  if (!apiKey) {
    return `AI generation requires API key for ${provider}. Please add your API key in the Settings page.`;
  }

  try {
    // Build full URL
    const fullUrl = buildUrl(baseUrl, providerDefaults[provider].baseUrl);
    
    console.log(`Generating with ${provider} at ${fullUrl}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // Add OpenRouter-specific headers
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.OPENROUTER_REFERRER || 'https://product-research-dashboard.local';
      headers['X-Title'] = 'Product Research Dashboard';
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert digital marketer specializing in Indonesian market. You help marketers analyze products and create compelling marketing content. Always respond in Indonesian unless specified otherwise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API error (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    if (provider === 'openrouter') {
      return data.choices?.[0]?.message?.content || data.output || 'No response generated';
    }
    
    return data.choices?.[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error(`${provider} API error:`, error);
    throw error;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getUserSettings(userId);

    // Return available providers info
    const providers = (['openai', 'openrouter', 'sumopod'] as AIProvider[]).map(provider => ({
      id: provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      defaultBaseUrl: providerDefaults[provider].baseUrl,
      defaultModel: providerDefaults[provider].defaultModel,
      models: providerDefaults[provider].models,
      hasApiKey: !!getApiKey(provider, settings),
      customEndpoint: getEndpoint(provider, settings) || '',
      customModel: getCustomModel(provider, settings) || '',
    }));

    return NextResponse.json({
      providers,
      activeProvider: settings?.active_provider || 'openai',
      activeModel: settings?.active_model || '',
    });
  } catch (error) {
    console.error('Get providers error:', error);
    return NextResponse.json({ error: 'Failed to get providers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateRequest = await request.json();
    const { type, product } = body;

    // Get user settings
    const settings = await getUserSettings(userId);
    
    // Determine active provider
    const preferredProvider = (settings?.active_provider || 'openai') as AIProvider;
    const activeModel = settings?.active_model || '';
    
    // Check available providers with API keys
    const availableProviders: AIProvider[] = [];
    if (getApiKey('openai', settings)) availableProviders.push('openai');
    if (getApiKey('openrouter', settings)) availableProviders.push('openrouter');
    if (getApiKey('sumopod', settings)) availableProviders.push('sumopod');
    
    if (availableProviders.length === 0) {
      return NextResponse.json({ 
        error: 'No AI provider configured. Please add your API key in the Settings page.'
      }, { status: 400 });
    }
    
    // Use preferred provider if available, otherwise first available
    const activeProvider = availableProviders.includes(preferredProvider) 
      ? preferredProvider 
      : availableProviders[0];

    // Get custom endpoint (baseUrl from user settings)
    const customEndpoint = getEndpoint(activeProvider, settings);
    const baseUrl = customEndpoint || providerDefaults[activeProvider].baseUrl;
    const apiKey = getApiKey(activeProvider, settings)!;
    const customModel = getCustomModel(activeProvider, settings);
    const modelToUse = activeModel || customModel || providerDefaults[activeProvider].defaultModel;

    const profit = product.selling_price - product.cost_price;
    const margin = product.selling_price > 0 
      ? ((profit / product.selling_price) * 100).toFixed(1) 
      : '0';

    let prompt = '';

    switch (type) {
      case 'angle':
        prompt = `Analisis produk berikut dan SUGGEST POTENTIAL ADVERTISING ANGLES yang bisa digunakan:

**Produk:** ${product.name}
**Harga Modal:** ${formatCurrency(product.cost_price)}
**Harga Jual:** ${formatCurrency(product.selling_price)}
**Margin:** ${margin}%
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Kompetitor:** ${product.competitors || 'Belum ada informasi'}
**Angle yang sudah ada:** ${product.potential_angles || 'Belum ada'}

Buatkan 5-7 POTENTIAL ADVERTISING ANGLES dengan format:

Untuk SETIAP angle, jelaskan:
1. **Nama Angle** - Nama pendek untuk angle ini
2. **Hook/Opening** - Cara membuka iklan yang menarik (1-2 kalimat)
3. **Pain Point** - Rasa sakit/emosi yang dituju
4. **Solution** - Bagaimana produk menyelesaikan masalah
5. **CTA Suggestion** - Call to action yang cocok
6. **Platform Suitability** - Cocok untuk platform mana (Meta/IG/TikTok/All)
7. **Emotion Trigger** - Emosi yang dimunculkan (FOMO, Urgency, Social Proof, dll)

Pilih angle yang VARIATIF dan BERBEDA-BEDA fokusnya (bisa dari sisi fitur, emosi, sosial, harga, dll)

Tanggapi dalam Bahasa Indonesia yang actionable dan ready untuk diimplementasikan.`;
        break;

      case 'opinion':
        prompt = `Analisis produk berikut untuk menentukan apakah produk ini layak untuk dijual:

**Produk:** ${product.name}
**Harga Modal:** ${formatCurrency(product.cost_price)}
**Harga Jual:** ${formatCurrency(product.selling_price)}
**Margin:** ${margin}%
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Kompetitor:** ${product.competitors || 'Belum ada informasi'}
**Potensi Angle:** ${product.potential_angles || 'Belum ada informasi'}

Berikan analisis Anda dalam format:
1. **Kelayakan Jual (Layak/Tidak Layak/Syarat):** [jawaban Anda dengan alasan]
2. **Keuntungan Potensial:** [analisis profit dan margin]
3. **Tantangan Utama:** [3-5 tantangan yang perlu diantisipasi]
4. **Rekomendasi:** [saran untuk meningkatkan kelayakan produk]

Tanggapi dalam Bahasa Indonesia yang natural dan profesional.`;
        break;

      case 'pitchline':
        prompt = `Buatkan 3 variasi PITCHLINE untuk produk berikut:

**Produk:** ${product.name}
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Keunggulan:** ${product.potential_angles || 'Belum ada informasi'}
**Harga:** ${formatCurrency(product.selling_price)}

Pitchline harus:
- Pendek, maksimal 15 kata
- Langsung ke inti manfaat produk
- Memancing rasa ingin tahu
- Mudah diingat

Tanggapi dalam Bahasa Indonesia yang catchy dan compelling. Berikan nomor 1, 2, 3 untuk setiap variasi.`;
        break;

      case 'strategy':
        prompt = `Buatkan STRATEGY MARKETING untuk produk berikut:

**Produk:** ${product.name}
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Kompetitor:** ${product.competitors || 'Belum ada informasi'}
**Potensi Angle:** ${product.potential_angles || 'Belum ada informasi'}
**Budget Estimation:** [asumsikan budget menengah untuk Indonesia]

Strategi harus mencakup:
1. **Positioning:** Cara memposisikan produk di mata konsumen
2. **Channel Strategy:** Platform mana yang paling efektif (Instagram, TikTok, Shopee, dll)
3. **Content Strategy:** Jenis konten apa yang perlu dibuat
4. **Targeting:** Siapa target audience spesifik
5. **Timeline:** Rekomendasi jadwal posting/running ads
6. **Budget Allocation:** Pembagian budget untuk ads vs content

Tanggapi dalam Bahasa Indonesia yang komprehensif dan actionable.`;
        break;

      case 'meta_ad':
        prompt = `Buatkan SAMPLE NARRATIVE untuk Meta/Facebook Ads:

**Produk:** ${product.name}
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Harga:** ${formatCurrency(product.selling_price)}
**Keunggulan:** ${product.potential_angles || 'Belum ada informasi'}

Sertakan:
1. **Primary Text:** Teks utama untuk iklan (maksimal 125 karakter)
2. **Headline:** Judul iklan yang menarik (maksimal 40 karakter)
3. **Description:** Deskripsi singkat (maksimal 30 karakter)
4. **CTA Button:** Rekomendasi tombol call-to-action
5. **Target Audience Note:** Catatan tentang siapa yang ditarget

Format seperti brief iklan Meta Ads yang siap digunakan. Tanggapi dalam Bahasa Indonesia yang persuasive.`;
        break;

      case 'ig_reels':
        prompt = `Buatkan SAMPLE NARRATIVE untuk Instagram Reels:

**Produk:** ${product.name}
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Keunggulan:** ${product.potential_angles || 'Belum ada informasi'}

Sertakan:
1. **Hook (0-3 detik):** Pembuka yang bikin orang berhenti scroll
2. **Script Narration:** Naskah narasi untuk video (15-30 detik)
3. **Text Overlay:** Teks yang perlu muncul di layar
4. **Trending Audio Suggestion:** Rekomendasi audio yang sedang tren
5. **Hashtags:** 5-10 hashtags yang relevan
6. **Caption:** Caption untuk posting dengan emoji

Format seperti brief konten IG Reels yang ready to shoot. Tanggapi dalam Bahasa Indonesia yang engaging dan relatable.`;
        break;

      case 'tiktok':
        prompt = `Buatkan SAMPLE NARRATIVE untuk TikTok Video:

**Produk:** ${product.name}
**Target Market:** ${product.target_market || 'Belum ditentukan'}
**Masalah yang Diselesaikan:** ${product.problem_solved || 'Belum ditentukan'}
**Keunggulan:** ${product.potential_angles || 'Belum ada informasi'}

Sertakan:
1. **Opening Hook:** Pembuka 1-3 detik yang viral-worthy
2. **Script/Spoken Lines:** Dialog atau narasi untuk video (15-60 detik)
3. **Visual Notes:** Apa yang perlu ditunjukkan di layar
4. **Sound/Music:** Rekomendasi sound TikTok yang trending
5. **Effects/Styles:** Filter atau efek yang disarankan
6. **Caption + Hashtags:** caption dengan hashtag viral
7. **CTA:** Call to action di akhir video

Format seperti script TikTok yang siap direkam. Tanggapi dalam Bahasa Indonesia yang casual, fun, dan engaging sesuai gaya TikTok.`;
        break;

      case 'description':
        prompt = `DEEPSEEK: Sebelum menjawab, LAKUKAN WEB BROWSING untuk mencari informasi produk serupa di marketplace Indonesia (Tokopedia, Shopee, Lazada, dll).

Untuk produk "${product.name}" dengan harga ${formatCurrency(product.selling_price)}:

1. CARI di marketplace untuk melihat:
   - Produk serupa apa yang ada di pasaran
   - Harga-rata-rata produk serupa
   - Review pelanggan tentang produk serupa
   - Keywords yang sering digunakan

2. BUAT DESKRIPSI PRODUK yang mencakup:
   - Nama produk yang menarik dan SEO-friendly
   - Judul produk (max 100 karakter)
   - Deskripsi lengkap (500-800 kata) dalam format markdown yang mencakup:
     * **Keunggulan Produk** (3-5 point)
     * **Cara Pemakaian** 
     * **Isi Paket**
     * **Informasi Penting** (berat, ukuran, etc)
     * **Testimoni/Social Proof** (kalau ada dari web browsing)
   
3. Tulis dalam Bahasa Indonesia yang natural, engaging, dan说服力强

Format output dalam markdown. Sertakan emoji yang relevan.`;
        break;
      case 'target_market':
        prompt = `DEEPSEEK: Lakukan WEB BROWSING untuk menganalisis target market produk ini.

Untuk produk "${product.name}" dengan harga ${formatCurrency(product.selling_price)}:

1. CARI di internet dan marketplace:
   - Siapa yang biasanya membeli produk serupa
   - Demografi usia, jenis kelamin, lokasi
   - Psychographics: gaya hidup, minat, nilai-nilai
   - Behavior: bagaimana mereka biasanya menemukan produk seperti ini
   - Pain points utama yang mereka alami

2. BUAT ANALISIS TARGET MARKET yang mencakup:
   - **Demografis**: Usia, Gender, Lokasi geografis, Pekerjaan, Pendapatan
   - **Psikografis**: Gaya hidup, Nilai/Nilai hidup, Minat/Hobi
   - **Perilaku**: Kebutuhan, Kebiasaan belanja online, Budget
   - **Persona**: Buat 1-2 customer persona dengan nama fiktif
   
3. Tulis dalam Bahasa Indonesia yang detail dan actionable untuk marketing

Format output dalam markdown dengan struktur yang jelas.`;
        break;
      case 'problem_solved':
        prompt = `DEEPSEEK: Lakukan WEB BROWSING untuk menganalisis masalah yang diselesaikan produk ini.

Untuk produk "${product.name}":

1. CARI di internet, media sosial, dan marketplace:
   - Apa keluhan utama konsumen tentang masalah yang produk ini selesaikan
   - Review negatif produk kompetitor (bintang 1-3) untuk lihat masalah yang belum solved
   - Forum diskusi (Reddit, Facebook Groups, Kaskus) tentang topik ini
   - Tren di media sosial terkait masalah ini

2. BUAT ANALISIS PROBLEM SOLVED yang mencakup:
   - **Pain Point Utama**: 3-5 masalah utama yang diselesaikan
   - **Before/After**: Bagaimana kondisi sebelum dan sesudah pakai produk
   - **Emotional Journey**: Emosi yang dirasakan konsumen dari awal masalah sampai solusi
   - **Kompetitor Pain Points**: Masalah yang belum solved oleh produk lain
   
3. Tulis dalam Bahasa Indonesia yang empathic dan relatable

Format output dalam markdown. Gunakan poin-poin yang mudah dipahami.`;
        break;
      case 'competitors':
        prompt = `DEEPSEEK: Lakukan WEB BROWSING untuk menganalisis kompetitor produk ini.

Untuk produk "${product.name}" di harga ${formatCurrency(product.selling_price)}:

1. CARI di marketplace dan internet:
   - Siapa saja kompetitor utama (brand dan produk serupa)
   - Harga kompetitor (range dari termurah sampai termahal)
   - Kelebihan dan kekurangan masing-masing kompetitor
   - Market share dan popularitas masing-masing
   - Strategi marketing yang digunakan
   - Unique selling proposition mereka

2. BUAT ANALISIS KOMPETITOR yang mencakup:
   - **Daftar Kompetitor**: 5-10 kompetitor dengan nama, harga, rating
   - **Perbandingan Harga**: Tabel perbandingan harga
   - **Kelebihan Kompetitor**: Apa yang mereka lakukan dengan baik
   - **Kekurangan Kompetitor**: Peluang yang bisa dimanfaatkan
   - **Price Positioning**: Di mana produk ini harus diposisikan
   - **Differential Advantage**: Apa yang membuat produk ini berbeda/lebih baik
   
3. Tulis dalam Bahasa Indonesia yang analytical dan strategic

Format output dalam markdown dengan tabel jika memungkinkan.`;

        break;
      case 'demand_indication':
        prompt = `DEEPSEEK: Lakukan WEB BROWSING untuk menganalisis permintaan pasar produk ini.

Untuk produk "${product.name}":

1. CARI di marketplace dan internet:
   - Berapa banyak produk serupa yang terjual di marketplace (最好是 jumlah)
   - Tren pencarian Google untuk produk serupa (volume pencarian)
   - Review dan rating produk serupa (kepuasan pelanggan)
   - Social media mentions dan engagement
   - Apakah ada trending topics terkait produk ini
   - Seasonal patterns (apakah ada musim tinggi)

2. BUAT ANALISIS DEMAND INDICATION yang mencakup:
   - **Tren Pasar**: Naik, Stabil, atau Turun?
   - **Volume Pencarian**: Indikator jumlah pencarian/search volume
   - **Tingkat Persaingan**: Banyak atau sedikit kompetitor?
   - **Seasonality**: Apakah ada musim tertentu?
   - **Indikator Demand**: Bullet points tentang bukti permintaan
   - **Risiko**: Faktor yang bisa mempengaruhi permintaan
   
3. Tulis dalam Bahasa Indonesia yang factual dan evidence-based

Gunakan data spesifik dari web browsing. Format output dalam markdown.`;

        break;
    }

    const result = await generateWithAI(activeProvider, modelToUse, baseUrl, apiKey, prompt);

    return NextResponse.json({ 
      result, 
      provider: activeProvider, 
      model: modelToUse,
      endpoint: baseUrl,
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content. Please check your API key and try again.' },
      { status: 500 }
    );
  }
}
