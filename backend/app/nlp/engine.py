"""ContextSense NLP engine. Models load once; every component has an honest fallback
(and reports which method produced a result)."""
import os, re, math
import numpy as np
import spacy

def _load_spacy():
    try:
        return spacy.load(os.getenv("SPACY_MODEL", "en_core_web_sm")), True
    except Exception:
        n = spacy.blank("en"); n.add_pipe("sentencizer"); return n, False

nlp, PARSER = _load_spacy()
EMB = None; EMB_NAME = ""; SENT_PIPE = None
STOP = nlp.Defaults.stop_words

def load():
    global EMB, EMB_NAME, SENT_PIPE
    if EMB is None:
        EMB = False
        if os.getenv("USE_EMBEDDINGS", "1") == "1":
            try:
                from sentence_transformers import SentenceTransformer
                EMB_NAME = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2"); EMB = SentenceTransformer(EMB_NAME)
            except Exception: EMB = False
    if SENT_PIPE is None:
        SENT_PIPE = False
        if os.getenv("USE_TRANSFORMERS", "0") == "1":
            try:
                from transformers import pipeline
                SENT_PIPE = pipeline("sentiment-analysis", model=os.getenv("SENTIMENT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english"))
            except Exception: SENT_PIPE = False
    return status()

def status():
    return {"spacy_parser": PARSER, "embeddings": EMB_NAME if EMB else "tf-idf fallback",
            "transformer_sentiment": bool(SENT_PIPE)}

def words(t): return re.findall(r"[a-z']+", t.lower())
def content(t):
    d = nlp(t)
    return [(x.lemma_.lower() if PARSER else x.text.lower()) for x in d if x.is_alpha and not x.is_stop and len(x) > 2]

# ---------------------------------------------------------------- similarity
def similarity(a, b):
    if EMB:
        v = EMB.encode([a, b], normalize_embeddings=True); s = float(np.dot(v[0], v[1])); method = f"sentence-transformers ({EMB_NAME})"
    else:
        from sklearn.feature_extraction.text import TfidfVectorizer
        m = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit_transform([a.lower(), b.lower()])
        s = float((m[0] @ m[1].T).toarray()[0][0]); method = "tf-idf character n-grams (fallback: measures surface overlap, not meaning)"
    s = max(0.0, min(1.0, s))
    ca, cb = content(a), content(b)
    rel = ("near-paraphrase" if s >= .85 else "closely related" if s >= .65 else "loosely related" if s >= .4 else "mostly unrelated")
    return {"score": round(s, 4), "percentage": round(s * 100, 1), "method": method, "relationship": rel,
            "shared_concepts": sorted(set(ca) & set(cb)), "only_in_first": sorted(set(ca) - set(cb)),
            "only_in_second": sorted(set(cb) - set(ca))}

# ---------------------------------------------------------------- entities
ORG = {"microsoft", "google", "apple", "hp", "amazon", "anthropic", "openai", "ibm", "meta", "tesla", "intel", "nvidia", "infosys", "tcs", "dell", "samsung", "sony", "lenovo"}
TECH = {"ai", "flutter", "python", "react", "java", "javascript", "tensorflow", "pytorch", "blockchain", "nlp", "machine learning", "cryptography", "c++", "kotlin", "swift", "openmp", "fastapi"}
LOC = {"hyderabad", "delhi", "mumbai", "india", "london", "paris", "bangalore", "chennai", "kolkata", "new york", "tokyo", "berlin", "telangana"}
NAMES = {"john", "sarah", "ravi", "mary", "david", "priya", "amit", "anita", "raj", "sam", "alice", "bob", "emma", "kiran", "safa", "rahul", "neha", "maya"}
MAP = {"PERSON": "Person", "ORG": "Organization", "GPE": "Location", "LOC": "Location", "FAC": "Location", "DATE": "Date",
       "TIME": "Time", "MONEY": "Money", "PRODUCT": "Product", "EVENT": "Event"}
PATS = [("Product", r"\b(?:HP|Apple|Dell|Lenovo|Samsung|Sony|Asus|Acer)\s+[A-Z][\w-]+"),
        ("Money", r"[$₹€£]\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:dollars|rupees|usd|inr|euros)\b"),
        ("Time", r"\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b"),
        ("Date", r"\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|yesterday|january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b|\b(?:19|20)\d{2}\b")]
def _gaz():
    out = []
    for lab, S in (("Organization", ORG), ("Technology", TECH), ("Location", LOC), ("Person", NAMES)):
        for w in sorted(S, key=len, reverse=True): out.append((lab, r"(?<![\w+#])" + re.escape(w) + r"(?![\w])"))
    return out
GAZ = _gaz()

def entities(text):
    found = []
    def add(lab, s, e, src):
        if all(e <= x["start"] or s >= x["end"] for x in found):
            found.append({"text": text[s:e], "label": lab, "start": s, "end": e, "source": src})
    for lab, p in PATS:
        for m in re.finditer(p, text, re.I if lab != "Product" else 0): add(lab, m.start(), m.end(), "pattern")
    for lab, p in GAZ:
        for m in re.finditer(p, text, re.I): add(lab, m.start(), m.end(), "gazetteer")
    if PARSER:
        for e in nlp(text).ents:
            if e.label_ in MAP: add(MAP[e.label_], e.start_char, e.end_char, "spaCy NER")
    found.sort(key=lambda x: x["start"])
    for x in found:
        x["explanation"] = f"“{x['text']}” is tagged {x['label']} by {x['source']}; it is a {x['label'].lower()} mention in this sentence."
    return found

# ---------------------------------------------------------------- sentiment
POS = set("great good happy love excellent amazing fast nice wonderful fantastic perfect satisfied excited glad awesome best thanks thank beautiful brilliant helpful enjoy pleased proud interesting smooth".split())
NEG = set("bad terrible awful hate slow crashed crash broken worst sad angry annoying tired fail failed poor disappointed disappointing useless problem error bug frustrating wrong hurt pain stuck late lost".split())
EMO = {"Happiness": "happy glad love enjoy pleased wonderful great amazing awesome", "Sadness": "sad lost cry unhappy miserable lonely",
       "Anger": "angry hate furious annoying mad", "Frustration": "again stuck crashed broken frustrating useless slow failed error bug",
       "Excitement": "excited thrilled can't wait amazing awesome", "Confusion": "confused unclear don't understand puzzled lost",
       "Fear": "afraid scared worried fear anxious nervous", "Disappointment": "disappointed disappointing expected let down poor",
       "Gratitude": "thanks thank grateful appreciate"}
EMO = {k: set(v.split()) for k, v in EMO.items()}
SARC = re.compile(r"\b(just great|oh great|oh wow|yeah,? right|thanks a lot|how wonderful|perfect timing|nice job)\b", re.I)

def sentiment(text, context=""):
    toks = words(text); pos = neg = 0.0; key = []
    sarc = 0.0
    if SARC.search(text): sarc += .5
    has_pos = any(t in POS for t in toks); has_neg = any(t in NEG for t in toks)
    if has_pos and has_neg and re.search(r"\bagain\b|\bnow\b", text.lower()): sarc += .3
    elif has_pos and sarc and (has_neg or "again" in toks): sarc += .2
    sarc = min(sarc, .95); sarcastic = sarc >= .5
    contrast = next((i for i, t in enumerate(toks) if t in ("but", "however", "although")), None)
    for i, t in enumerate(toks):
        w = 1.0 if t in POS or t in NEG else 0
        if not w: continue
        if i and toks[i - 1] in ("very", "so", "extremely", "really"): w *= 1.5
        if contrast is not None and i > contrast: w *= 1.4
        flip = any(x in ("not", "never", "no", "n't", "isn't", "wasn't", "don't", "didn't") for x in toks[max(0, i - 3):i])
        p = (t in POS) != flip
        if t in POS and sarcastic: p = False; key.append({"word": t, "effect": "reversed by sarcasm cues"}); w *= 1.2
        else: key.append({"word": t, "effect": "negated" if flip else ("positive" if p else "negative")})
        if p: pos += w
        else: neg += w
    tot = pos - neg; score = math.tanh(tot / 2.5)
    model_note = ""
    if SENT_PIPE and not sarcastic:
        r = SENT_PIPE(text[:512])[0]; ms = r["score"] * (1 if r["label"].upper().startswith("POS") else -1)
        score = .5 * score + .5 * ms if (pos or neg) else ms * .7; model_note = f" Transformer model: {r['label'].lower()} ({r['score']:.2f})."
    if context and abs(score) < .25:
        c = sentiment(context)["score"]; score += .5 * c
    label = "Mixed" if min(pos, neg) >= 1 and abs(tot) <= 1 and not sarcastic else "Positive" if score > .15 else "Negative" if score < -.15 else "Neutral"
    emo = {}
    for e, lex in EMO.items():
        n = sum(t in lex for t in toks)
        if n: emo[e] = n
    if sarcastic: emo["Sarcasm"] = 2; emo["Frustration"] = emo.get("Frustration", 0) + 1
    z = sum(emo.values()) or 1
    emotions = sorted(({"emotion": k, "score": round(v / z, 3)} for k, v in emo.items()), key=lambda x: -x["score"])[:4]
    if sarcastic: expl = "A normally positive word appears alongside a negative event or a sarcasm cue, so the surface sentiment is reversed. Sarcasm detection from text alone is uncertain."
    elif label == "Neutral": expl = "No strong sentiment-bearing words or cues were found."
    else: expl = f"Sentiment comes from {len(key)} cue word(s), adjusted for negation, intensifiers and contrast words ('but').{model_note}"
    return {"label": label, "score": round(float(score), 3), "emotions": emotions, "keywords": key, "sarcasm": round(sarc, 2),
            "explanation": expl, "distribution": {"Positive": round(pos, 2), "Negative": round(neg, 2)}}

# ---------------------------------------------------------------- intent
P = lambda s: re.compile(s, re.I)
RULES = {
 "Request": [(P(r"\b(can|could|would|will) you\b"), 2.2), (P(r"\bplease\b"), 1.3), (P(r"\b(i need|i would like|i'd like|help me)\b"), 1.6)],
 "Question": [(P(r"\?\s*$"), 1.5), (P(r"^\s*(what|why|how|when|where|who|which|is|are|do|does|did)\b"), 1.6)],
 "Command": [(P(r"^\s*(open|close|send|show|give|tell|stop|run|make|go|bring|turn|switch|start|delete)\b"), 2.4)],
 "Suggestion": [(P(r"\b(you should|why don't|let's|how about|maybe we|we could)\b"), 2.2)],
 "Greeting": [(P(r"^\s*(hi|hello|hey|good (morning|evening|afternoon)|greetings)\b"), 3)],
 "Complaint": [(P(r"\b(not working|crashed|terrible|worst|broken|again|unacceptable|always)\b"), 1.5)],
 "Apology": [(P(r"\b(sorry|apologi[sz]e|my bad|forgive me)\b"), 3)],
 "Gratitude": [(P(r"\b(thank|thanks|appreciate|grateful)\b"), 3)],
 "Agreement": [(P(r"^\s*(yes|yeah|sure|agreed|exactly|right|ok|okay|absolutely)\b"), 2.6), (P(r"\bi agree\b"), 3)],
 "Disagreement": [(P(r"^\s*(no|nope)\b"), 2.4), (P(r"\b(disagree|not true|i don't think so)\b"), 3)],
 "Recommendation": [(P(r"\b(i recommend|i suggest|you must try|highly recommend)\b"), 3)],
 "Emotional Expression": [(P(r"\bi(?: am|'m| feel|'m feeling| am feeling)\b.*\b(happy|sad|cold|hot|tired|angry|scared|excited|worried|bored|hungry|thirsty)\b"), 2.4), (P(r"\bmy \w+ (is|are) (tired|sore|aching)\b"), 2)],
}
def intent(text, context=""):
    sc = {k: .0 for k in RULES}; sc["Information Sharing"] = .9; sc["Other"] = .3; why = {}
    for k, rs in RULES.items():
        for rx, w in rs:
            if rx.search(text): sc[k] += w; why.setdefault(k, rx.pattern)
    if sc["Request"] >= 2.2 and sc["Question"]: sc["Question"] *= .5
    if sc["Command"] and re.search(r"\bplease\b", text, re.I): sc["Request"] += 1.5; sc["Command"] *= .6
    if context and len(words(text)) <= 3 and sc["Agreement"] == sc["Disagreement"] == 0 and context.strip().endswith("?"):
        sc["Information Sharing"] += 1  # short answer to a question
    ex = np.exp(np.array(list(sc.values())) / .9); pr = ex / ex.sum()
    order = sorted(zip(sc.keys(), pr), key=lambda x: -x[1]); top = order[0]
    texpl = {"Request": "A polite modal question or 'please' asks someone to do something.", "Question": "The sentence is phrased to elicit information.",
             "Command": "It begins with an imperative verb.", "Emotional Expression": "The speaker reports a personal state or feeling.",
             "Information Sharing": "No request, question or command cues were found, so it reads as a plain statement.",
             "Greeting": "It opens with a greeting.", "Gratitude": "It contains thanks.", "Apology": "It contains an apology.",
             "Complaint": "It contains cues of dissatisfaction."}
    return {"label": top[0], "confidence": round(float(top[1]), 3), "explanation": texpl.get(top[0], "Matched lexical and structural cues for this category."),
            "alternatives": [{"label": k, "confidence": round(float(v), 3)} for k, v in order[1:4]],
            "distribution": [{"label": k, "value": round(float(v), 3)} for k, v in order]}

# ---------------------------------------------------------------- references
PRON = {"it": "thing", "this": "thing", "that": "thing", "they": "any", "them": "any", "he": "person", "him": "person", "she": "person"}
def candidates(msg, idx):
    out = []
    for m in re.finditer(r"\b(?:a|an|the|my|his|her|their|our)\s+(?:[a-z]+\s+)?[a-z]{3,}\b", msg, re.I):
        phrase = m.group(0); phrase = re.sub(r"^(a|an|the|my|his|her|their|our)\s+", "", phrase, flags=re.I)
        if not set(words(phrase)) <= STOP: out.append({"text": phrase, "kind": "thing", "msg": idx, "pos": m.start()})
    for m in re.finditer(r"\b(?:[A-Z][\w-]*)(?:\s+[A-Z][\w-]*)*", msg):
        t = re.sub(r"^(A|An|The|My)\s+", "", m.group(0))
        if t.lower() in NAMES or (PARSER and any(e.text == t and e.label_ == "PERSON" for e in nlp(msg).ents)): out.append({"text": t, "kind": "person", "msg": idx, "pos": m.start()})
        elif m.start() > 0 and t.lower() not in ("i",) or " " in t or t.lower() in ORG: out.append({"text": t, "kind": "thing", "msg": idx, "pos": m.start()})
    return out

def resolve(text, history):
    refs = []; hist = [c for h in history for c in candidates(h, len(refs))]
    cands = []
    for i, h in enumerate(history): cands += candidates(h, i)
    cands.sort(key=lambda c: (c["msg"], c["pos"]))
    for m in re.finditer(r"\b(it|they|them|this|that|he|him|she)\b", text, re.I):
        p = m.group(1).lower(); kind = PRON[p]
        if p == "that" and re.match(r"\s+(is|was|'s)?\s*(a|an|the|\w+ing)\b", text[m.end():], re.I) is None and not re.match(r"\s+(is|was|sounds|looks|seems)", text[m.end():], re.I): continue
        pool = [c for c in cands if kind == "any" or c["kind"] == kind] or []
        if pool:
            c = pool[-1]
            refs.append({"pronoun": m.group(1), "resolved_to": c["text"], "message_index": c["msg"], "start": m.start(), "end": m.end(),
                         "confidence": round(0.8 if kind != "any" and len(pool) == 1 else .6, 2)})
        else: refs.append({"pronoun": m.group(1), "resolved_to": None, "message_index": None, "start": m.start(), "end": m.end(), "confidence": 0})
    return refs

# ---------------------------------------------------------------- ambiguity
SENSES = {
 "bank": [("a financial institution", "money loan account deposit cash atm"), ("the side of a river", "river water fish shore stream")],
 "bat": [("a flying mammal", "cave night wings animal fly"), ("sports equipment", "cricket baseball ball hit game")],
 "bark": [("the sound a dog makes", "dog loud pet"), ("the outer covering of a tree", "tree trunk wood")],
 "spring": [("the season", "flowers season summer winter"), ("a metal coil", "coil metal bounce mattress"), ("a water source", "water hot well")],
 "match": [("a contest", "game team play score"), ("a fire-lighting stick", "fire light flame candle")],
 "mouse": [("a rodent", "cheese cat animal"), ("a computer device", "click computer cursor laptop")],
 "python": [("a snake", "snake zoo reptile"), ("a programming language", "code programming script software")],
 "crane": [("a bird", "bird lake wings"), ("construction machinery", "construction lift building")],
 "plant": [("vegetation", "water leaf garden soil"), ("a factory", "factory workers manufacturing")],
 "cold": [("low temperature", "weather winter window freezing"), ("an illness", "fever cough sneezing flu"), ("unfriendly in manner", "attitude behaviour stare")],
 "book": [("reading material", "read author library"), ("to reserve", "ticket hotel flight table")]}
PPV = r"(saw|watched|observed|met|hit|found|followed|noticed|heard|caught|spotted|photographed)"
IMPL = {"cold": ("close a window or turn up the heating", "window door heater fan ac air"), "hot": ("open a window or turn on the fan or AC", "window fan ac air"),
        "tired": ("rest or end the activity", "hours work late long"), "hungry": ("get something to eat", "food lunch dinner eat"),
        "thirsty": ("bring something to drink", "water drink"), "bored": ("suggest something to do", "nothing free")}

def ambiguity(text, context=""):
    items = []; ctxw = set(words(text + " " + context))
    for m in re.finditer(r"\b[a-z]+\b", text.lower()):
        w = m.group(0)
        if w in SENSES:
            sc = [(g, 0.5 + len(set(c.split()) & ctxw)) for g, c in SENSES[w]]; z = sum(s for _, s in sc)
            ranked = sorted(({"meaning": f"“{w}” means {g}", "score": round(s / z, 2)} for g, s in sc), key=lambda x: -x["score"])
            items.append({"type": "Lexical", "span": text[m.start():m.end()], "start": m.start(), "end": m.end(),
                          "explanation": f"“{w}” has {len(sc)} common senses.", "interpretations": ranked, "resolved": ranked[0]["score"] - ranked[1]["score"] > .2})
    pp = re.search(PPV + r"\s+(?:the|a|an|my|his|her)\s+(\w+)\s+(with|in|on)\s+(?:a|an|the|his|her)\s+(\w+)", text, re.I)
    if pp:
        v, n, prep, o = pp.group(1), pp.group(2), pp.group(3), pp.group(4)
        c = set(words(context)); inst = .5 + (.4 if c & {"using", "through", "binoculars", "lens"} else 0); mod = .5 + (.4 if c & {"carrying", "holding", "had", "wearing"} else 0)
        z = inst + mod
        its = sorted([{"meaning": f"The speaker used {'a ' if True else ''}{o} to {v} the {n} (“{prep} {o}” attaches to the verb).", "score": round(inst / z, 2)},
                      {"meaning": f"The {n} had or carried the {o} (“{prep} {o}” attaches to the noun).", "score": round(mod / z, 2)}], key=lambda x: -x["score"])
        items.append({"type": "Syntactic", "span": pp.group(0), "start": pp.start(), "end": pp.end(), "explanation": f"The phrase “{prep} {o}” can attach to “{v}” or to “{n}”.",
                      "interpretations": its, "resolved": abs(inst - mod) > .2})
    im = re.search(r"\b(?:i am|i'm|it is|it's|its)\s+(?:feeling\s+)?(?:so\s+|very\s+|really\s+)?(cold|hot|tired|hungry|thirsty|bored)\b", text, re.I)
    if im:
        s = im.group(1).lower(); act, cues = IMPL[s]; cue = len(set(cues.split()) & ctxw)
        base = [("literal", f"A report of a physical or mental state: the speaker is {s}.", .6), ("disc", "An expression of discomfort or mood, with no request attached.", .25),
                ("req", f"An indirect request: the speaker may want someone to {act}.", .15 + .4 * min(cue, 1))]
        z = sum(b[2] for b in base)
        its = sorted(({"meaning": b[1], "score": round(b[2] / z, 2)} for b in base), key=lambda x: -x["score"])
        items.append({"type": "Contextual", "span": im.group(0), "start": im.start(), "end": im.end(),
                      "explanation": "Statements about feelings are often literal, but can be indirect requests depending on the situation.", "interpretations": its, "resolved": its[0]["score"] - its[1]["score"] > .3})
    items.sort(key=lambda x: x["start"])
    unresolved = [i for i in items if not i["resolved"]]
    msg = ("Not enough context to choose between interpretations confidently." if unresolved else "Ambiguity found, but context favours one reading." if items else "No ambiguity patterns detected.")
    return {"items": items, "confident": not unresolved, "message": msg}

# ---------------------------------------------------------------- linguistic + graph
WH = {"what", "why", "how", "when", "where", "who", "which"}
def linguistic(text):
    doc = nlp(text); toks = [t.text for t in doc if not t.is_space]
    first = toks[0].lower() if toks else ""
    st = ("interrogative" if text.strip().endswith("?") or first in WH else "exclamatory" if text.strip().endswith("!") else
          "imperative" if first in {"open", "close", "send", "show", "give", "tell", "stop", "run", "make", "go", "please"} else "declarative")
    kws = []
    for t in doc:
        ok = t.pos_ in ("NOUN", "PROPN", "VERB", "ADJ") if PARSER else (t.is_alpha and not t.is_stop)
        w = t.lemma_.lower() if PARSER else t.text.lower()
        if ok and len(w) > 2 and w not in kws and not t.is_stop: kws.append(w)
    out = {"sentence_type": st, "subject": None, "predicate": None, "object": None, "structure": None, "keywords": kws[:8], "parser": PARSER,
           "note": None if PARSER else "Install the spaCy model (en_core_web_sm) to enable subject/predicate/object analysis."}
    if PARSER:
        sents = list(doc.sents)
        if sents:
            r = sents[0].root
            s = [c for c in r.children if c.dep_ in ("nsubj", "nsubjpass")]; o = [c for c in r.children if c.dep_ in ("dobj", "attr", "acomp", "dative")]
            for p in [c for c in r.children if c.dep_ == "prep"]: o += [c for c in p.children if c.dep_ == "pobj"]
            span = lambda t: " ".join(x.text for x in t.subtree)
            out.update(subject=span(s[0]) if s else None, predicate=r.text, object=span(o[0]) if o else None)
            out["structure"] = ("Subject – Verb – Object" if s and o else "Subject – Verb" if s else "Verb phrase (implied subject)") + (", passive" if any(c.dep_ == "nsubjpass" for c in r.children) else "")
    return out

def graph(text, ents):
    doc = nlp(text); nodes = {}; edges = []; typ = {e["text"].lower(): e["label"] for e in ents}
    def phrase(t): return " ".join([c.text for c in t.lefts if c.dep_ in ("compound", "amod")] + [t.text])
    def node(t):
        k = t.lower(); nodes.setdefault(k, {"id": k, "label": t, "type": typ.get(k, "Concept")}); return k
    def edge(a, b, l):
        if a != b and not any(e["source"] == a and e["target"] == b and e["label"] == l for e in edges): edges.append({"source": a, "target": b, "label": l})
    if PARSER:
        for sent in doc.sents:
            for v in sent:
                if v.pos_ not in ("VERB", "AUX"): continue
                subs = [phrase(c) for c in v.children if c.dep_ in ("nsubj", "nsubjpass")]
                objs = [(phrase(c), v.text) for c in v.children if c.dep_ in ("dobj", "attr", "dative", "acomp")]
                for p in [c for c in v.children if c.dep_ == "prep"]: objs += [(phrase(c), f"{v.text} {p.text}") for c in p.children if c.dep_ == "pobj"]
                if v.dep_ in ("advcl", "xcomp", "acl", "ccomp") and v.head.pos_ in ("VERB", "AUX"):
                    mains = [phrase(c) for c in v.head.children if c.dep_ in ("dobj", "attr")] or [phrase(c) for c in v.head.children if c.dep_ == "nsubj"]
                    subs = subs or mains
                    if not [c for c in v.children if c.dep_ in ("dobj", "pobj")]: continue
                    if mains: subs = mains
                for s in subs:
                    for o, l in objs: edge(node(s), node(o), l)
            for t in sent:
                if t.dep_ == "prep" and t.head.pos_ in ("NOUN", "PROPN"):
                    for c in t.children:
                        if c.dep_ == "pobj": edge(node(phrase(t.head)), node(phrase(c)), t.text)
    fb = not edges
    if fb:
        seq = [e["text"] for e in ents] or linguistic(text)["keywords"][:5]
        for a, b in zip(seq, seq[1:]): edge(node(a), node(b), "co-occurs with")
        for x in seq: node(x)
    for e in ents: node(e["text"])
    return {"nodes": list(nodes.values()), "edges": edges, "fallback": fb,
            "note": "Dependency parser unavailable or no relations found; edges show co-occurrence only." if fb else None}

# ---------------------------------------------------------------- orchestration
def interpret(text, intent_, sent, amb):
    for it in amb["items"]:
        if it["type"] == "Contextual" and it["interpretations"][0]["score"] > .5 or (it["type"] == "Syntactic" and it["resolved"]):
            return it["interpretations"][0]["meaning"]
    t = text.strip().rstrip(".!?")
    lead = {"Request": "The speaker is politely asking for something", "Question": "The speaker is asking a question", "Command": "The speaker is giving an instruction",
            "Greeting": "The speaker is greeting someone", "Gratitude": "The speaker is expressing thanks", "Apology": "The speaker is apologising",
            "Complaint": "The speaker is voicing a complaint", "Emotional Expression": "The speaker is expressing a personal state",
            "Agreement": "The speaker agrees", "Disagreement": "The speaker disagrees", "Suggestion": "The speaker is making a suggestion",
            "Recommendation": "The speaker is recommending something"}.get(intent_["label"], "The speaker is sharing information")
    tone = "" if sent["label"] == "Neutral" else f", in a {sent['label'].lower()} tone" + (" (possibly sarcastic)" if sent["sarcasm"] >= .5 else "")
    return f"{lead}{tone}: “{t}”."

def analyze(text, context=""):
    ents = entities(text); it = intent(text, context); se = sentiment(text, context); am = ambiguity(text, context)
    ling = linguistic(text); refs = resolve(text, [context]) if context.strip() else []
    if not context.strip():
        for m in re.finditer(r"^(it|they|this|he|she)\b", text.strip(), re.I):
            am["items"].append({"type": "Contextual", "span": m.group(0), "start": m.start(), "end": m.end(), "resolved": False,
                "explanation": f"“{m.group(0)}” has no antecedent in the supplied text.", "interpretations": [{"meaning": "Referent unknown; add previous context.", "score": 1.0}]})
            am["confident"] = False; am["message"] = "Not enough context to choose between interpretations confidently."
    unresolved = sum(1 for i in am["items"] if not i["resolved"])
    conf = max(.05, min(.95, .65 * it["confidence"] + .35 * min(1, abs(se["score"]) + .5) - .12 * unresolved + (.1 if context else 0)))
    interp = interpret(text, it, se, am)
    ins = [f"Primary intent: {it['label']} ({it['confidence']:.0%})."]
    if se["sarcasm"] >= .5: ins.append("Sentiment cues conflict; the sentence may be sarcastic.")
    if am["items"]: ins.append(am["message"])
    if refs: ins += [f"“{r['pronoun']}” most likely refers to {r['resolved_to']}." for r in refs if r["resolved_to"]]
    if ling["sentence_type"] != "declarative": ins.append(f"Sentence type: {ling['sentence_type']}.")
    return {"original_text": text, "context": context, "interpretation": interp,
            "contextual_meaning": ("Meaning was interpreted using the supplied previous context." if context.strip() else "No previous context supplied, so only the sentence itself was used."),
            "intent": it["label"], "intent_detail": it, "sentiment": se["label"], "sentiment_detail": se, "confidence": round(conf, 3),
            "ambiguity": am["items"], "ambiguity_summary": am, "entities": ents, "keywords": ling["keywords"], "linguistic": ling,
            "references": refs, "graph": graph(text, ents), "insights": ins,
            "disclaimer": "Confidence is the system's own estimate, not a guarantee of correctness."}

DISC = re.compile(r"\b(tired|sore|hurt|hurts|ache|aching|headache|strain|exhausted|burning)\b", re.I)
ACT = re.compile(r"\b(?:working on|using|reading|watching|studying|typing|driving|playing|staring at)\s+(?:on\s+)?(?:his|her|their|my|the|a|an)?\s*(\w+)", re.I)
DUR = re.compile(r"\b(?:for|since)\s+(?:\w+\s+)?(?:hours?|days?|minutes?)\b|\ball (?:day|night)\b", re.I)
def context_analyze(text, context):
    base = analyze(text); ctx = analyze(text, context)
    rel = similarity(context, text)
    kws = [w for w in content(context) if w in set(content(text))]
    if EMB and not kws:
        cw = list(dict.fromkeys(content(context)))
        if cw:
            v = EMB.encode(cw + [text], normalize_embeddings=True); sims = v[:-1] @ v[-1]
            kws = [cw[i] for i in np.argsort(-sims)[:3] if sims[i] > .2]
    act = ACT.search(context)
    if DISC.search(text) and (DUR.search(context) or act):
        what = act.group(1) if act else "activity"
        interp = f"The speaker is likely expressing discomfort caused by prolonged {what} use described in the earlier context."; kws = kws or [what]; rel_s = max(rel["score"], .6)
    elif ctx["references"] and any(r["resolved_to"] for r in ctx["references"]):
        r = next(r for r in ctx["references"] if r["resolved_to"]); interp = f"“{r['pronoun']}” refers to {r['resolved_to']} from the earlier context. {ctx['interpretation']}"; rel_s = rel["score"]; kws = kws or [r["resolved_to"]]
    elif rel["score"] >= .4 or kws:
        interp = f"{ctx['interpretation']} The earlier context relates to this through: {', '.join(kws) or 'overall topic'}."; rel_s = rel["score"]
    else:
        interp = f"{ctx['interpretation']} The earlier context does not clearly change the meaning."; rel_s = rel["score"]
    diffs = []
    if base["intent"] != ctx["intent"]: diffs.append(f"Intent shifts from {base['intent']} to {ctx['intent']}.")
    if base["sentiment"] != ctx["sentiment"]: diffs.append(f"Sentiment shifts from {base['sentiment']} to {ctx['sentiment']}.")
    for r in ctx["references"]:
        if r["resolved_to"]: diffs.append(f"“{r['pronoun']}” becomes resolvable: {r['resolved_to']}.")
    if interp != base["interpretation"] and not diffs: diffs.append("The interpretation is enriched by the context, but intent and sentiment are unchanged.")
    if not diffs: diffs.append("No measurable change; the sentence is interpreted the same with or without context.")
    return {"previous_context": context, "sentence": text, "contextual_interpretation": interp, "independent_interpretation": base["interpretation"],
            "differences": diffs, "keywords": kws, "relatedness": round(rel_s, 3), "relatedness_method": rel["method"],
            "confidence": round(min(.95, ctx["confidence"] * (.7 + .3 * rel_s)), 3), "independent_confidence": base["confidence"], "analysis": ctx}

def conversation_reply(res, refs, n_prior, tracked):
    parts = []
    rr = [r for r in refs if r["resolved_to"]]
    if rr: parts.append("; ".join(f"“{r['pronoun']}” refers to {r['resolved_to']}" for r in rr) + ".")
    elif any(not r["resolved_to"] for r in refs): parts.append("I can't tell what the pronoun refers to yet; no earlier mention fits.")
    parts.append(f"I read this as {res['intent'].lower()} with {res['sentiment'].lower()} sentiment.")
    if rr and res["sentiment"] != "Neutral": parts.append(f"You're describing {rr[0]['resolved_to']} in a {res['sentiment'].lower()} way.")
    if res["entities"]: parts.append("Mentioned: " + ", ".join(f"{e['text']} ({e['label']})" for e in res["entities"][:4]) + ".")
    if n_prior == 0: parts.insert(0, "Conversation started; I'll keep earlier messages as context.")
    return " ".join(parts)
