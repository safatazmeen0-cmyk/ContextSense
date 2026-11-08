import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import DATABASE_URL

engine_db = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine_db, autoflush=False)
Base = declarative_base()

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True)
    kind = Column(String(24), default="analyze")
    text = Column(Text)
    context = Column(Text, default="")
    intent = Column(String(48))
    sentiment = Column(String(24))
    interpretation = Column(Text)
    confidence = Column(Float)
    result = Column(Text)
    created = Column(DateTime, default=datetime.utcnow)
    def dict(self):
        return dict(id=self.id, kind=self.kind, text=self.text, context=self.context, intent=self.intent,
                    sentiment=self.sentiment, interpretation=self.interpretation, confidence=self.confidence,
                    created=self.created.isoformat() + "Z", result=json.loads(self.result or "{}"))

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(String(40), index=True)
    role = Column(String(12))
    text = Column(Text)
    meta = Column(Text, default="{}")
    created = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
