# Quick Reference: Switching Between Gemini and Ollama

This guide shows you how to switch between Google Gemini (cloud) and Ollama (local) AI backends.

---

## Current Setup: Google Gemini (Default)

Your application is currently configured to use **Google Gemini API**.

The provider is chosen by configuration in `.env.local` at the repository root and
used only by the API server (`apps/api`). No code changes are needed to switch.

**Required:**
- `.env.local` with `LLM_PROVIDER=gemini` and `GEMINI_API_KEY=your-key`
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

### Step 4: Point the API at Ollama

Edit `.env.local` at the repository root:

```bash
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2            # or gemma2, deepseek-r1, ... (must be pulled)
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_NUM_CTX=32768        # context window; larger handles longer papers
```

### Step 5: Restart the API

```bash
npm run dev:api   # terminal 1; logs "provider=ollama, model=..."
npm run dev       # terminal 2
```

`curl http://localhost:8787/api/health` reports the active provider and model.

### Step 6: Test

1. Go to `http://localhost:3000`
2. Upload a PDF or TXT file. The API extracts PDF text server-side, since Ollama
   has no native PDF input (scanned PDFs without a text layer will not work).
3. Click "Start Analysis" and wait (local models are slower).

---

## How to Switch Back to Gemini

Set `LLM_PROVIDER=gemini` (and `GEMINI_API_KEY`) in `.env.local`, then restart `npm run dev:api`.

---

## Adding Another Provider

Implement the `LlmProvider` interface in `apps/api/src/llm/types.ts` as a new adapter
next to `gemini.ts` and `ollama.ts`, then register it in `apps/api/src/llm/index.ts`
and `apps/api/src/config.ts`. The frontend does not change.

---

## Comparison

| Feature | Gemini | Ollama |
|---------|--------|--------|
| **Setup Time** | 5 minutes | 15-30 minutes |
| **File Support** | PDF + TXT (native) | TXT + PDF (text extracted on server) |
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

# Then set LLM_MODEL=gemma2 in .env.local and restart npm run dev:api
```

### PDF Not Working

The API extracts PDF text on the server. If a PDF is scanned (images only, no text
layer), extraction yields nothing useful: run OCR first or upload a TXT export.

---

## Advanced: Running Both

The provider is a server setting, so the simplest way to compare them is two API
instances on different ports, e.g. `LLM_PROVIDER=ollama API_PORT=8788 npm run dev:api`.
Every response includes `meta.provider`, `meta.model`, and `meta.promptVersion`
so results from each run can be told apart.

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
