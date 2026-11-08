import json, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .core.config import CORS_ORIGINS
from .database import Base, engine_db, get_db, Analysis, Message
from .nlp import engine as E

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine_db); E.load(); yield

app = FastAPI(title="ContextSense API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

@app.exception_handler(Exception)
async def boom(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": f"Analysis failed: {exc}"})

class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    context: str = Field("", max_length=5000)
    save: bool = True
class SimIn(BaseModel):
    sentence1: str = Field(min_length=1, max_length=2000)
    sentence2: str = Field(min_length=1, max_length=2000)
class ConvIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None

def clean(s: str):
    s = s.strip()
    if not s: raise HTTPException(422, "Text must not be empty.")
    return s

def save(db: Session, kind, text, ctx, res, interp=None, conf=None):
    a = Analysis(kind=kind, text=text, context=ctx, intent=res.get("intent"), sentiment=res.get("sentiment"),
                 interpretation=interp or res["interpretation"], confidence=conf if conf is not None else res["confidence"], result=json.dumps(res))
    db.add(a); db.commit(); res["analysis_id"] = a.id

@app.get("/api/health")
def health(): return {"status": "ok", **E.status()}

@app.post("/api/analyze")
def analyze(b: TextIn, db: Session = Depends(get_db)):
    r = E.analyze(clean(b.text), b.context.strip())
    if b.save: save(db, "analyze", b.text, b.context, r)
    return r

@app.post("/api/context-analyze")
def context_analyze(b: TextIn, db: Session = Depends(get_db)):
    if not b.context.strip(): raise HTTPException(422, "Previous context is required for context analysis.")
    r = E.context_analyze(clean(b.text), b.context.strip())
    r["intent"] = r["analysis"]["intent"]; r["sentiment"] = r["analysis"]["sentiment"]
    if b.save: save(db, "context", b.text, b.context, r, r["contextual_interpretation"], r["confidence"])
    return r

@app.post("/api/intent")
def intent(b: TextIn): return E.intent(clean(b.text), b.context)
@app.post("/api/sentiment")
def sentiment(b: TextIn): return E.sentiment(clean(b.text), b.context)
@app.post("/api/ambiguity")
def ambiguity(b: TextIn): return E.ambiguity(clean(b.text), b.context)
@app.post("/api/entities")
def entities(b: TextIn): return {"entities": E.entities(clean(b.text))}
@app.post("/api/knowledge-graph")
def kg(b: TextIn): t = clean(b.text); return E.graph(t, E.entities(t))
@app.post("/api/similarity")
def sim(b: SimIn, db: Session = Depends(get_db)):
    r = E.similarity(clean(b.sentence1), clean(b.sentence2)); r.update(sentence1=b.sentence1, sentence2=b.sentence2)
    a = Analysis(kind="similarity", text=f"{b.sentence1} ⇄ {b.sentence2}", context="", intent="-", sentiment="-", confidence=r["score"],
                 interpretation=f"{r['relationship'].capitalize()} ({r['percentage']}%)", result=json.dumps(r)); db.add(a); db.commit()
    return r

@app.post("/api/conversation")
def conversation(b: ConvIn, db: Session = Depends(get_db)):
    cid = b.conversation_id or uuid.uuid4().hex[:12]; msg = clean(b.message)
    prior = [m.text for m in db.query(Message).filter_by(conversation_id=cid, role="user").order_by(Message.id)]
    refs = E.resolve(msg, prior[-6:]); res = E.analyze(msg, " ".join(prior[-3:]))
    res["references"] = refs; reply = E.conversation_reply(res, refs, len(prior), prior)
    allm = prior + [msg]; ents = {}
    for t in allm:
        for e in E.entities(t): ents[e["text"]] = e["label"]
    keys = list(dict.fromkeys(k for t in allm for k in E.linguistic(t)["keywords"]))[:6]
    summary = f"{len(allm)} message(s). Entities: {', '.join(f'{k} ({v})' for k, v in ents.items()) or 'none'}. Topics: {', '.join(keys) or 'none'}."
    db.add(Message(conversation_id=cid, role="user", text=msg, meta=json.dumps({"intent": res["intent"], "sentiment": res["sentiment"]})))
    db.add(Message(conversation_id=cid, role="assistant", text=reply)); db.commit()
    return {"conversation_id": cid, "reply": reply, "references": refs, "intent": res["intent"], "sentiment": res["sentiment"],
            "sentiment_detail": res["sentiment_detail"], "intent_detail": res["intent_detail"], "interpretation": res["interpretation"],
            "entities": res["entities"], "confidence": res["confidence"], "summary": summary}

@app.get("/api/history")
def history(q: str = "", kind: str = "", sort: str = Query("newest", pattern="^(newest|oldest)$"), db: Session = Depends(get_db)):
    qs = db.query(Analysis)
    if q: qs = qs.filter(Analysis.text.ilike(f"%{q}%"))
    if kind: qs = qs.filter(Analysis.kind == kind)
    qs = qs.order_by(Analysis.created.asc() if sort == "oldest" else Analysis.created.desc()).limit(500)
    return {"items": [a.dict() for a in qs]}

@app.delete("/api/history/{analysis_id}")
def del_one(analysis_id: int, db: Session = Depends(get_db)):
    a = db.get(Analysis, analysis_id)
    if not a: raise HTTPException(404, "History item not found.")
    db.delete(a); db.commit(); return {"deleted": analysis_id}

@app.delete("/api/history")
def del_all(db: Session = Depends(get_db)):
    n = db.query(Analysis).delete(); db.commit(); return {"deleted": n}
