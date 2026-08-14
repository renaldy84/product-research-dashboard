# Product Research Dashboard

Dashboard untuk marketer dalam perencanaan dan riset produk sebelum dipasarkan. Dengan fitur AI-powered content generation untuk membuat pitchline, strategi marketing, dan sample narasi iklan.

## Fitur Utama

### 📊 Summary Dashboard
- Perbandingan 3-5 produk kandidat
- Scoring system dengan weighted average
- Rekomendasi produk terbaik berdasarkan analisis

### 📦 Produk
- Input detail produk: nama, kategori, harga modal, harga jual
- Target market dan indikasi demand
- Analisis kompetitor dan potential angle iklan
- AI opinion untuk kelayakan produk

### 🤖 AI-Powered Content Generation
- **Angle Iklan**: AI memberikan suggest angle/hook untuk iklan berdasarkan analisis produk
- **AI Opinion**: Analisis kelayakan jual dan tantangan
- **Pitchline**: Hook lines yang menarik untuk iklan
- **Marketing Strategy**: Rencana marketing lengkap
- **Meta Ads**: Sample narrative untuk Facebook/Instagram Ads
- **IG Reels**: Script untuk konten Instagram Reels
- **TikTok**: Script untuk video TikTok

### 📁 Kategori
- Organize produk dengan kategori

### ⚙️ Settings
- Customizable scoring weights
- Konfigurasi AI Provider (OpenAI, OpenRouter, Sumopod)
  - Custom endpoint URL per provider
  - Custom model input dengan add to dropdown

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **State Management**: Zustand
- **Icons**: Lucide React
- **AI**: OpenAI / OpenRouter / Sumopod API

## AI Providers

Dashboard ini mendukung beberapa AI provider:

| Provider | API Key Variable | Model Default |
|----------|------------------|---------------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini |
| OpenRouter | `OPENROUTER_API_KEY` | claude-3-haiku |
| Sumopod | `SUMOPOD_API_KEY` | claude-3-haiku |

### Model yang Tersedia

**OpenAI:**
- gpt-4o-mini
- gpt-4o
- gpt-4-turbo
- gpt-3.5-turbo

**OpenRouter:**
- anthropic/claude-3-haiku
- anthropic/claude-3-sonnet
- anthropic/claude-3.5-sonnet
- google/gemini-pro
- google/gemini-flash
- mistralai/mistral-7b-instruct
- meta-llama/llama-3-8b-instruct
- meta-llama/llama-3-70b-instruct

**Sumopod:**
- claude-3-haiku
- claude-3-sonnet
- claude-3.5-sonnet
- gpt-4o-mini
- gpt-4o
- gemini-pro

## Instalasi

### Prerequisites
- Node.js 18+
- npm atau yarn

### Steps

1. Clone repository:
```bash
git clone <repository-url>
cd product-research-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Setup environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` dan tambahkan API key (pilih salah satu atau lebih):
```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# OpenRouter (supports many models)
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Sumopod
SUMOPOD_API_KEY=your-sumopod-key
```

5. Run development server:
```bash
npm run dev
```

6. Buka [http://localhost:3000](http://localhost:3000)

## Penggunaan

### 1. Daftar & Login
Buat akun baru atau login untuk mengakses dashboard.

### 2. Setup AI Provider
Di Settings page, pilih AI provider yang sudah dikonfigurasi dengan API key.

### 3. Buat Kategori (Opsional)
Organisir produk dengan membuat kategori seperti "Fashion", "Elektronik", dll.

### 4. Tambah Produk Kandidat
Masukkan 3-5 produk yang ingin dianalisis dengan detail:
- Nama produk
- Harga modal dan harga jual
- Target market
- Masalah yang diselesaikan
- Indikasi demand
- Kompetitor
- Potential angle iklan

### 5. Lihat Summary
Dashboard akan menampilkan:
- Peringkat produk berdasarkan weighted score
- Rekomendasi produk terbaik
- Breakdown score untuk setiap faktor

### 6. Generate Konten Marketing
Di halaman detail produk, gunakan tombol "Generate" untuk:
- Mendapatkan AI opinion
- Membuat pitchline menarik
- Mendapat strategi marketing lengkap
- Sample narasi untuk Meta Ads, IG Reels, dan TikTok

## Scoring System

Produk di-scoring berdasarkan 4 faktor utama:

| Faktor | Default Weight | Deskripsi |
|--------|----------------|-----------|
| Profit Margin | 30% | Margin keuntungan produk |
| Market Potential | 25% | Potensi permintaan pasar |
| Competition Level | 25% | Tingkat kompetisi |
| Uniqueness | 20% | Keunikan/diferensiasi |

Total weight harus 100%. Anda dapat menyesuaikan bobot di Settings.

## Struktur Database

### Users
- `id`: User ID
- `email`: Email (unique)
- `name`: Nama lengkap
- `password_hash`: Password terenkripsi

### Categories
- `id`: Category ID
- `name`: Nama kategori
- `description`: Deskripsi
- `user_id`: Foreign key ke users

### Products
- `id`: Product ID
- `name`: Nama produk
- `category_id`: Foreign key ke categories
- `cost_price`: Harga modal
- `selling_price`: Harga jual
- `target_market`: Target market
- `problem_solved`: Masalah yang diselesaikan
- `demand_indication`: Indikasi demand
- `competitors`: Kompetitor
- `potential_angles`: Potential angle iklan
- `ai_opinion`: Opinion dari AI
- `pitchline`: Generated pitchline
- `marketing_strategy`: Generated strategy
- `meta_ad_narrative`: Sample narasi Meta Ads
- `ig_reels_narrative`: Sample narasi IG Reels
- `tiktok_narrative`: Sample narasi TikTok
- `scores_json`: JSON score breakdown

### Scoring Weights
- `user_id`: Foreign key ke users
- `profit_margin`: Bobot profit margin
- `market_potential`: Bobot market potential
- `competition_level`: Bobot competition level
- `uniqueness`: Bobot uniqueness

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No* | - | OpenAI API key |
| `OPENROUTER_API_KEY` | No* | - | OpenRouter API key |
| `SUMOPOD_API_KEY` | No* | - | Sumopod API key |

*Minimal salah satu API key diperlukan untuk fitur AI. Sistem akan otomatis mendeteksi provider yang memiliki API key.

## Deployment

### Vercel (Recommended)
1. Push ke GitHub repository
2. Connect repository ke Vercel
3. Set environment variables di Vercel dashboard
4. Deploy!

### Other Platforms
Build untuk production:
```bash
npm run build
npm start
```

## License

MIT License
