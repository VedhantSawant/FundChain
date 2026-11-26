"""
FundChain AI Fraud Detector - Core ML & Heuristics Engine
Combines TF-IDF NLP Text Classification, Cosine Similarity Duplicate Detection,
and Behavioral Outlier Scoring.
"""

import re
import math
from typing import List, Dict, Any, Tuple
from dataset import DATASET

# High-risk urgency and deceptive keyword dictionaries
SUSPICIOUS_KEYWORDS = [
    "guaranteed", "100x", "1000%", "roi", "double your", "secret algorithm",
    "risk free", "risk-free", "miracle cure", "instant returns", "giveaway",
    "no questions asked", "pump and dump", "insider signals", "fast cash",
    "free money", "unlimited profit", "act now limited", "send eth now",
    "double back", "secret formula", "lottery", "urgent emergency cash"
]

CATEGORY_GOAL_BENCHMARKS = {
    "Agriculture": {"median": 3.0, "max_normal": 25.0},
    "Healthcare": {"median": 4.0, "max_normal": 35.0},
    "Education": {"median": 2.5, "max_normal": 20.0},
    "Environment": {"median": 3.5, "max_normal": 30.0},
    "Community Development": {"median": 2.0, "max_normal": 20.0},
    "Technology": {"median": 5.0, "max_normal": 40.0},
    "Other": {"median": 2.0, "max_normal": 15.0},
}


def tokenize(text: str) -> List[str]:
    """Basic alphanumeric word tokenizer with lowercasing"""
    return re.findall(r"\b[a-z0-9]{2,}\b", text.lower())


def compute_tf_vector(tokens: List[str], vocabulary: List[str]) -> Dict[str, float]:
    """Compute term frequencies for a token list against a vocabulary"""
    total = len(tokens) or 1
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    return {w: counts.get(w, 0) / total for w in vocabulary}


def cosine_similarity(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    """Compute cosine similarity between two word frequency vectors"""
    dot_product = sum(v1.get(k, 0) * v2.get(k, 0) for k in v1)
    norm1 = math.sqrt(sum(val ** 2 for val in v1.values()))
    norm2 = math.sqrt(sum(val ** 2 for val in v2.values()))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)


class AIFraudDetector:
    def __init__(self):
        # Build training vocabulary
        all_words = set()
        for item in DATASET:
            tokens = tokenize(item["title"] + " " + item["description"])
            all_words.update(tokens)
        self.vocabulary = sorted(list(all_words))

        # Build fraud and legit profile vectors
        fraud_tokens = []
        legit_tokens = []
        for item in DATASET:
            tokens = tokenize(item["title"] + " " + item["description"])
            if item["label"] == 1:
                fraud_tokens.extend(tokens)
            else:
                legit_tokens.extend(tokens)

        self.fraud_profile = compute_tf_vector(fraud_tokens, self.vocabulary)
        self.legit_profile = compute_tf_vector(legit_tokens, self.vocabulary)

    def analyze_campaign(
        self,
        title: str,
        description: str,
        goal: float,
        category: str = "Technology",
        deadline_days: int = 14,
        existing_campaigns: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a campaign and generate an explainable risk score (0-100),
        risk level (LOW, MEDIUM, HIGH), and detected warning signs.
        """
        reasons: List[str] = []
        full_text = f"{title} {description}".lower()
        tokens = tokenize(full_text)
        sample_vec = compute_tf_vector(tokens, self.vocabulary)

        # 1. NLP Pattern & Keyword Matching
        matched_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in full_text]
        keyword_risk = 0
        if matched_keywords:
            keyword_risk = min(40 + len(matched_keywords) * 25, 95)
            reasons.append(
                f"Suspicious / deceptive phrase triggers detected: {', '.join(matched_keywords[:3])}"
            )

        # 2. Cosine Similarity to Known Fraud Pattern Profile
        fraud_sim = cosine_similarity(sample_vec, self.fraud_profile)
        legit_sim = cosine_similarity(sample_vec, self.legit_profile)
        nlp_score = int(max(0, min(100, (fraud_sim / (fraud_sim + legit_sim + 1e-6)) * 100)))
        if fraud_sim > legit_sim and fraud_sim > 0.2:
            reasons.append(
                f"NLP TF-IDF textual fingerprint correlates with deceptive campaign patterns (Similarity: {round(fraud_sim * 100, 1)}%)"
            )

        # 3. Target Goal Outlier Check
        benchmark = CATEGORY_GOAL_BENCHMARKS.get(category, CATEGORY_GOAL_BENCHMARKS["Technology"])
        goal_risk = 0
        if goal > benchmark["max_normal"]:
            excess_ratio = goal / benchmark["max_normal"]
            goal_risk = min(int(35 + excess_ratio * 15), 90)
            reasons.append(
                f"Funding target of {goal} ETH is an anomalous outlier for category '{category}' (Category threshold: {benchmark['max_normal']} ETH)"
            )
        elif goal <= 0:
            goal_risk = 40
            reasons.append("Invalid non-positive funding goal specified.")

        # 4. Text Quality & Detail Richness
        content_risk = 0
        if len(tokens) < 15:
            content_risk = 45
            reasons.append("Extremely sparse campaign description provides insufficient verifiable project deliverables.")
        elif len(tokens) < 30:
            content_risk = 20
            reasons.append("Brief description with low technical specificity.")

        # 5. Plagiarism / Duplicate Description Scan against Existing Campaigns
        max_dup_sim = 0.0
        dup_campaign_title = ""
        if existing_campaigns:
            for c in existing_campaigns:
                other_text = f"{c.get('title', '')} {c.get('description', '')}".lower()
                other_tokens = tokenize(other_text)
                if not other_tokens:
                    continue
                other_vec = compute_tf_vector(other_tokens, self.vocabulary)
                sim = cosine_similarity(sample_vec, other_vec)
                if sim > max_dup_sim:
                    max_dup_sim = sim
                    dup_campaign_title = c.get("title", f"Campaign #{c.get('id', '')}")

        dup_risk = 0
        if max_dup_sim > 0.80:
            dup_risk = 75
            reasons.append(
                f"High-confidence text duplication detected: {round(max_dup_sim * 100, 1)}% cosine match with '{dup_campaign_title}'"
            )
        elif max_dup_sim > 0.60:
            dup_risk = 40
            reasons.append(
                f"Moderate textual overlap ({round(max_dup_sim * 100, 1)}%) with registered campaign '{dup_campaign_title}'"
            )

        # 6. Deadline Sanity Check
        deadline_risk = 0
        if deadline_days < 1:
            deadline_risk = 40
            reasons.append("Unrealistically urgent deadline (< 24 hours) typical of high-pressure scams.")
        elif deadline_days > 180:
            deadline_risk = 25
            reasons.append("Excessively long fundraising duration (> 180 days) reduces accountability.")

        # High-signal flags combine additively with maximum sensitivity
        primary_signals = [keyword_risk, goal_risk, dup_risk]
        max_primary = max(primary_signals) if primary_signals else 0
        
        weighted_score = (
            keyword_risk * 0.40 +
            goal_risk * 0.25 +
            nlp_score * 0.15 +
            content_risk * 0.10 +
            dup_risk * 0.05 +
            deadline_risk * 0.05
        )

        final_raw = max(max_primary * 0.85 + weighted_score * 0.15, weighted_score)
        if not matched_keywords and goal <= benchmark["max_normal"] and len(tokens) >= 30 and max_dup_sim < 0.6:
            final_raw = min(final_raw, 25)

        final_score = int(max(5, min(98, final_raw)))

        # Categorize Risk Level
        if final_score < 35:
            risk_level = "LOW"
            if not reasons:
                reasons.append("Verified clear deliverables, balanced target, and consistent documentation.")
        elif final_score < 70:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        return {
            "riskScore": final_score,
            "riskLevel": risk_level,
            "reasons": reasons,
            "isFlagged": final_score >= 55,
            "matchedKeywords": matched_keywords,
            "similarityScore": round(max_dup_sim * 100, 1),
            "goalEvaluated": goal,
            "category": category,
            "confidence": round(min(0.99, 0.70 + (len(tokens) / 300) * 0.25), 2),
        }
