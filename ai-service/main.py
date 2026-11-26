"""
FundChain AI Fraud Detection Service - FastAPI Server
Provides real-time NLP and anomaly detection API for campaigns.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from model import AIFraudDetector

app = FastAPI(
    title="FundChain AI Campaign Fraud Detection Engine",
    description="NLP and Heuristic Risk Assessment Microservice for Blockchain Crowdfunding",
    version="3.0.0"
)

# Enable CORS for local Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = AIFraudDetector()

class CampaignAnalyzeRequest(BaseModel):
    title: str
    description: str
    goal: float
    category: Optional[str] = "Technology"
    deadlineDays: Optional[int] = 14
    creatorAddress: Optional[str] = None
    existingCampaigns: Optional[List[Dict[str, Any]]] = None

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "FundChain AI Fraud Detection Service",
        "version": "3.0.0",
        "engine": "TF-IDF + Cosine Similarity + Outlier Scoring"
    }

@app.post("/analyze-campaign")
def analyze_campaign_endpoint(req: CampaignAnalyzeRequest):
    try:
        result = detector.analyze_campaign(
            title=req.title,
            description=req.description,
            goal=req.goal,
            category=req.category or "Technology",
            deadline_days=req.deadlineDays or 14,
            existing_campaigns=req.existingCampaigns or []
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
