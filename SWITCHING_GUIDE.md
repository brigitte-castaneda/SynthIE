# Quick Reference: Switching Between Gemini and Ollama

This guide shows you how to switch between Google Gemini (cloud) and Ollama (local) AI backends.

---

## Current Setup: Google Gemini (Default)

Your application is currently configured to use **Google Gemini API**.

**Files in use:**
- `services/geminiService.ts` - Gemini integration

**Required:**
- `.env.local` with `GEMINI_API_KEY=your-key`
- Internet connection
- Google Cloud account

---

## How to Switch to Ollama (Local)

### Step 1: Install Ollama

**macOS:**
```bash
# Download from ollama.com or use Homebrew
brew install ollama
```

**Windows:**
- Download installer from [ollama.com/download](https://ollama.com/download)

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Download a Model

Choose one based on your hardware:

```bash
# Best quality (requires 16GB+ RAM)
ollama pull llama3.2

# Lightweight (works with 8GB RAM)
ollama pull gemma2

# Good for complex analysis (requires 16GB+ RAM)
ollama pull deepseek-r1
```

### Step 3: Start Ollama

```bash
ollama serve
```

Keep this terminal window open while using the application.

### Step 4: Replace the Service File

**Option A: Rename files (Recommended)**
```bash
# Backup original Gemini service
mv services/geminiService.ts services/geminiService.backup.ts

# Use Ollama version
mv services/geminiService.ollama.ts services/geminiService.ts
```

**Option B: Manual replacement**
1. Delete `services/geminiService.ts`
2. Rename `services/geminiService.ollama.ts` to `services/geminiService.ts`

### Step 5: Update Model Name (if needed)

Edit `services/geminiService.ts` (now the Ollama version):

```typescript
// Line 23 - Change model name if you downloaded a different model
const MODEL_NAME = 'llama3.2'; // or 'gemma2' or 'deepseek-r1'
```

### Step 6: Restart Application

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 7: Test

1. Go to `http://localhost:3000`
2. Upload a **TXT file** (PDF support is limited with Ollama)
3. Click "Start Analysis"
4. Wait 1-3 minutes for results

---

## How to Switch Back to Gemini

```bash
# Restore original Gemini service
mv services/geminiService.ts services/geminiService.ollama.ts
mv services/geminiService.backup.ts services/geminiService.ts

# Restart
npm run dev
```

---

## Comparison

| Feature | Gemini | Ollama |
|---------|--------|--------|
| **Setup Time** | 5 minutes | 15-30 minutes |
| **File Support** | PDF + TXT | TXT (PDF limited) |
| **Analysis Speed** | 30-60 seconds | 1-3 minutes |
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | $0.001/1K chars | Free |
| **Privacy** | Cloud | 100% Local |
| **Offline** | ❌ No | ✅ Yes |

---

## Troubleshooting Ollama

### "Cannot connect to Ollama"

```bash
# Check if Ollama is running
curl http://localhost:11434

# If not, start it
ollama serve
```

### "Model not found"

```bash
# List downloaded models
ollama list

# Download if missing
ollama pull llama3.2
```

### Slow Performance

```bash
# Use smaller model
ollama pull gemma2

# Then update MODEL_NAME in geminiService.ts
```

### PDF Not Working

**Solution:** Convert PDF to TXT before uploading
- Use [pdftotext.com](https://www.pdftotext.com/)
- Or Adobe Acrobat: File → Export To → Text

---

## Advanced: Using Both Simultaneously

You can create a toggle in the UI to switch between backends:

1. Keep both service files:
   - `services/geminiService.gemini.ts`
   - `services/geminiService.ollama.ts`

2. Create a wrapper in `services/geminiService.ts`:

```typescript
// services/geminiService.ts
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';

if (USE_OLLAMA) {
  export * from './geminiService.ollama';
} else {
  export * from './geminiService.gemini';
}
```

3. Toggle in `.env.local`:
```bash
USE_OLLAMA=false  # Use Gemini
# USE_OLLAMA=true  # Use Ollama
```

---

## Model Recommendations

### For Best Quality
- **Gemini 3 Pro** (cloud)
- **Llama 3.2** (local, 16GB RAM)

### For Privacy
- **Llama 3.2** or **DeepSeek R1** (local)

### For Low-End Hardware
- **Gemma 2** (local, 8GB RAM)

### For Cost Savings
- **Any Ollama model** (free)

---

## Need Help?

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for comprehensive troubleshooting.
