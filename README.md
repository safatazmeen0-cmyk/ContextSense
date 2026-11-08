# ContextSense – Context-Aware Natural Language Understanding

React + Vite + TypeScript + Tailwind + Framer Motion frontend; FastAPI + spaCy + Sentence-Transformers backend; SQLite history.

## Run
```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python -m spacy download en_core_web_sm
cp .env.example .env
uvicorn app.main:app --reload            # http://localhost:8000/docs

# frontend (new terminal)
cd frontend && npm install && npm run dev  # http://localhost:5173 (proxies /api)
```

## How it works / honest fallbacks
- `GET /api/health` shows which models actually loaded.
- No spaCy model → no parser: subject/object and dependency graph fall back to co-occurrence (labelled in the UI).
- No sentence-transformers → similarity uses TF-IDF character n-grams (surface overlap only; the method is reported with every score).
- `USE_TRANSFORMERS=1` adds a Hugging Face sentiment model on top of the contextual rules.
- Intent, sarcasm, ambiguity and reference resolution are rule/lexicon-based and explainable; confidence is a heuristic estimate, not a guarantee.

## Endpoints
`POST /api/analyze | context-analyze | intent | sentiment | ambiguity | similarity | entities | knowledge-graph | conversation`, `GET /api/history`, `DELETE /api/history[/{id}]`, `GET /api/health`.
