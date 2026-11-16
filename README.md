# SynthIE - Research Paper Analysis Tool

**An AI-Powered Editorial Board for Industrial Engineering Papers**

> 📚 **Academic Purpose**: Automated, criterion-based feedback system for research papers based on ABET, IISE, ISO 9001, Six Sigma, and Industry 5.0 standards.

🌐 **Live Demo / Aplicación en vivo:** [https://synthie.ai.studio/](https://synthie.ai.studio/)
---

## Quick Start

### Option 1: Google Cloud (Gemini) - Recommended

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key to .env.local
GEMINI_API_KEY=your-api-key-here

# 3. Run the application
npm run dev

# 4. Open http://localhost:3000
```

### Option 2: Local Deployment (Ollama)

```bash
# 1. Install Ollama from ollama.com
# 2. Download a model
ollama pull llama3.2

# 3. Modify services/geminiService.ts (see DEPLOYMENT_GUIDE.md)
# 4. Run the application
npm run dev
```

---

## What is SynthIE?

SynthIE is an automated editorial board that evaluates Industrial Engineering research papers using AI. It provides:

✅ **Multi-dimensional scoring** across 4 specialized clusters  
✅ **Section-by-section critique** with actionable feedback  
✅ **Interactive chat** for specific improvement questions  
✅ **Visual dashboard** showing strengths and weaknesses

### The 4 Evaluation Pillars

| Cluster | Focus Area | Evaluates |
|---------|-----------|-----------|
| **A - Mathematical & Economic** | The Solver | Operations Research, Engineering Economy, Mathematical Models |
| **B - Physical & Production** | The Builder | Manufacturing, Facilities, Quality & Reliability |
| **C - Operational & Systemic** | The Orchestrator | Supply Chain, Production Planning, System Integration |
| **D - Human & Social** | The Steward | Ergonomics, Safety, Management, Ethics |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ File Upload  │  │  Dashboard   │  │     Chat     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Service Layer (TypeScript)                  │
│                  geminiService.ts                        │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│  Google Gemini API   │  │   Ollama (Local)     │
│  (Cloud - Default)   │  │   (Privacy-First)    │
└──────────────────────┘  └──────────────────────┘
```

### File Structure

```
synthie/
├── App.tsx                    # Main application logic
├── index.tsx                  # Entry point
├── components/                # React components
│   ├── AnalysisDashboard.tsx  # Results display
│   ├── ChatInterface.tsx      # Interactive Q&A
│   ├── ClusterVisualizer.tsx  # 4 Pillars visualization
│   └── SimulationStep.tsx     # Processing animation
├── services/
│   └── geminiService.ts       # AI integration (Gemini/Ollama)
├── types.ts                   # TypeScript definitions
├── constants.tsx              # Cluster definitions
└── .env.local                 # API configuration
```

---

## How It Works

### Analysis Pipeline

```
1. Upload Document (PDF/TXT)
         ↓
2. Orchestrator: Parse structure
         ↓
3. Review Board: Calculate metrics
         ↓
4. 4 Clusters: Evaluate rigor (A, B, C, D)
         ↓
5. Editor: Generate feedback
         ↓
6. Display Results + Interactive Chat
```

### Scoring System

- **90-100**: Publication-ready (Q1 journal quality)
- **80-89**: Strong paper, minor revisions
- **70-79**: Good foundation, major revisions
- **60-69**: Significant improvements needed
- **<60**: Fundamental issues

---

## Deployment Options Comparison

| Feature | Google Cloud (Gemini) | Local (Ollama) |
|---------|----------------------|----------------|
| **Setup Difficulty** | Easy | Moderate |
| **Cost** | $300 free credits, then pay-per-use | Free (hardware only) |
| **Quality** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Very Good |
| **Privacy** | Data sent to Google | 100% local |
| **Internet Required** | Yes | No |
| **Hardware Requirements** | None | 16GB+ RAM recommended |

> 💡 **See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#-cost-estimation) for detailed cost breakdown and optimization tips**

---

## 💰 Quick Cost Reference

### Gemini 3 Pro Preview (Cloud)

| Usage Level | Papers/Year | Estimated Annual Cost |
|-------------|-------------|----------------------|
| **Light** | 5-10 | $0.35 - $0.70 |
| **Moderate** | 20-50 | $1.40 - $3.50 |
| **Heavy** | 100+ | $7.00+ |

**Per Analysis**: ~$0.07 (includes analysis + chat)  
**Free Credits**: $300 for new Google Cloud users (~4,285 analyses)

### Ollama (Local)

**Cost**: $0.00 (free)  
**Requirements**: 16GB RAM, 20GB storage  
**One-time setup**: 30-45 minutes

**Bottom Line**: For most academic users, Gemini costs less than $2/year. Ollama is free but requires capable hardware.

---

## Complete Documentation

📖 **For detailed deployment instructions**, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

The comprehensive guide includes:
- Step-by-step Google Cloud setup (with screenshots guidance)
- Complete Ollama installation and configuration
- Code modifications for local deployment
- Troubleshooting common issues
- FAQ and best practices
- Model comparison and recommendations

---

## Prerequisites

### For Google Cloud Deployment
- Node.js 18+ and npm
- Google Cloud account
- Gemini API key

### For Local Deployment (Ollama)
- Node.js 18+ and npm
- Ollama installed
- 16GB+ RAM (8GB for Gemma 2)
- 20GB+ free storage

---

## Environment Variables

Create a `.env.local` file:

```bash
# For Google Cloud (Gemini)
GEMINI_API_KEY=your-api-key-here

# For Ollama (optional)
OLLAMA_API_URL=http://localhost:11434
```

---

## Usage

1. **Upload** a research paper (PDF or TXT)
2. **Add context** (optional): e.g., "Evaluate for Q1 Manufacturing Journal"
3. **Start analysis** and wait ~30-60 seconds
4. **Review results**: Overall score, cluster scores, section feedback
5. **Ask questions**: Use chat to get specific improvement advice

---

## Troubleshooting

### Common Issues

**"API key not valid"**
- Verify API key in `.env.local`
- Check Google Cloud Console for API status

**"Cannot connect to Ollama"**
```bash
# Verify Ollama is running
ollama serve

# Check API
curl http://localhost:11434
```

**Slow performance with Ollama**
- Use smaller model: `ollama pull gemma2`
- Close other applications
- Ensure GPU is being used (if available)

For more troubleshooting, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#troubleshooting)

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS (via inline classes)
- **Icons**: Lucide React
- **AI Integration**: 
  - Google Generative AI SDK (`@google/genai`)
  - Ollama REST API (alternative)
- **Markdown Rendering**: react-markdown

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Academic Use & Citation

This tool is designed for **educational purposes** to help students and researchers improve their Industrial Engineering papers.

### Citation

```
Castaneda, B., & Polanco, J. (2026). SynthIE: An AI-Powered Research 
Analysis Tool for Industrial Engineering Education.
```

### Ethical Guidelines

- ✅ Use for feedback and improvement
- ✅ Cite AI assistance in your acknowledgments
- ❌ Do not use to generate entire papers
- ❌ Do not submit AI-generated content as your own work

---

## License & Credits

**Developed by**: Brigitte Castaneda and Jaime Polanco  
**Purpose**: Academic tool for Industrial Engineering research  
**AI Models**: Google Gemini, Meta Llama, Google Gemma, DeepSeek  

---

## Support

For issues or questions:
1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Review browser console (F12) for errors
3. Check Ollama logs: `ollama logs` (if using Ollama)

---

**Version**: 1.0.0  
**Last Updated**: February 2026
