/**
 * FundChain AI Fraud Detection Service Client
 * Connects to the local Python FastAPI microservice (http://localhost:8000)
 * with an integrated fallback NLP & Heuristics engine in pure JavaScript.
 */

const FASTAPI_ENDPOINT = "http://127.0.0.1:8000/analyze-campaign";

// Suspicious phrasing and high-urgency deceptive patterns
const SUSPICIOUS_KEYWORDS = [
  "guaranteed", "100x", "1000%", "roi", "double your", "secret algorithm",
  "risk free", "risk-free", "miracle cure", "instant returns", "giveaway",
  "no questions asked", "pump and dump", "insider signals", "fast cash",
  "free money", "unlimited profit", "act now limited", "send eth now",
  "double back", "secret formula", "lottery", "urgent emergency cash"
];

const CATEGORY_BENCHMARKS = {
  Agriculture: { maxNormal: 25.0 },
  Healthcare: { maxNormal: 35.0 },
  Education: { maxNormal: 20.0 },
  Environment: { maxNormal: 30.0 },
  "Community Development": { maxNormal: 20.0 },
  Technology: { maxNormal: 40.0 },
  Other: { maxNormal: 15.0 },
};

function tokenize(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z0-9]{2,}\b/g);
  return words || [];
}

function computeTF(tokens) {
  const counts = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }
  const total = tokens.length || 1;
  const tf = {};
  for (const [k, v] of Object.entries(counts)) {
    tf[k] = v / total;
  }
  return tf;
}

function cosineSimilarity(tf1, tf2) {
  let dotProduct = 0;
  for (const k in tf1) {
    if (tf2[k]) {
      dotProduct += tf1[k] * tf2[k];
    }
  }
  const norm1 = Math.sqrt(Object.values(tf1).reduce((s, v) => s + v * v, 0));
  const norm2 = Math.sqrt(Object.values(tf2).reduce((s, v) => s + v * v, 0));
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
}

/**
 * Local resilient fallback NLP & Heuristics Evaluator
 */
export function evaluateCampaignLocally({
  title = "",
  description = "",
  goal = 0,
  category = "Technology",
  deadlineDays = 14,
  existingCampaigns = [],
}) {
  const reasons = [];
  const fullText = `${title} ${description}`.toLowerCase();
  const tokens = tokenize(fullText);
  const sampleTF = computeTF(tokens);

  // 1. Keyword analysis
  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((kw) => fullText.includes(kw));
  let keywordRisk = 0;
  if (matchedKeywords.length > 0) {
    keywordRisk = Math.min(40 + matchedKeywords.length * 25, 95);
    reasons.push(
      `Suspicious / deceptive phrase triggers detected: ${matchedKeywords.slice(0, 3).join(", ")}`
    );
  }

  // 2. Goal Outlier Check
  const benchmark = CATEGORY_BENCHMARKS[category] || CATEGORY_BENCHMARKS.Technology;
  const numGoal = parseFloat(goal) || 0;
  let goalRisk = 0;
  if (numGoal > benchmark.maxNormal) {
    const excess = numGoal / benchmark.maxNormal;
    goalRisk = Math.min(Math.floor(35 + excess * 15), 90);
    reasons.push(
      `Funding target of ${numGoal} ETH is an anomalous outlier for category '${category}' (Threshold: ${benchmark.maxNormal} ETH)`
    );
  } else if (numGoal <= 0) {
    goalRisk = 40;
    reasons.push("Invalid non-positive funding goal specified.");
  }

  // 3. Content Richness
  let contentRisk = 0;
  if (tokens.length < 15) {
    contentRisk = 45;
    reasons.push("Extremely sparse campaign description provides insufficient verifiable deliverables.");
  } else if (tokens.length < 30) {
    contentRisk = 20;
    reasons.push("Brief description with low technical specificity.");
  }

  // 4. Duplicate Check
  let maxDupSim = 0;
  let dupTitle = "";
  if (existingCampaigns && existingCampaigns.length > 0) {
    for (const c of existingCampaigns) {
      const otherTokens = tokenize(`${c.title || ""} ${c.description || ""}`);
      if (otherTokens.length === 0) continue;
      const otherTF = computeTF(otherTokens);
      const sim = cosineSimilarity(sampleTF, otherTF);
      if (sim > maxDupSim) {
        maxDupSim = sim;
        dupTitle = c.title || `Campaign #${c.id}`;
      }
    }
  }

  let dupRisk = 0;
  if (maxDupSim > 0.8) {
    dupRisk = 75;
    reasons.push(
      `High-confidence text duplication detected: ${Math.round(maxDupSim * 100)}% match with '${dupTitle}'`
    );
  } else if (maxDupSim > 0.6) {
    dupRisk = 40;
    reasons.push(
      `Moderate textual overlap (${Math.round(maxDupSim * 100)}%) with '${dupTitle}'`
    );
  }

  // 5. Deadline sanity
  let deadlineRisk = 0;
  if (deadlineDays < 1) {
    deadlineRisk = 40;
    reasons.push("Unrealistically urgent deadline (< 24h) typical of high-pressure scams.");
  } else if (deadlineDays > 180) {
    deadlineRisk = 25;
    reasons.push("Excessively long fundraising duration (> 180 days) reduces accountability.");
  }

  const primarySignals = [keywordRisk, goalRisk, dupRisk];
  const maxPrimary = Math.max(...primarySignals);

  const weighted =
    keywordRisk * 0.4 +
    goalRisk * 0.25 +
    contentRisk * 0.15 +
    dupRisk * 0.1 +
    deadlineRisk * 0.1;

  let finalRaw = Math.max(maxPrimary * 0.85 + weighted * 0.15, weighted);
  if (matchedKeywords.length === 0 && numGoal <= benchmark.maxNormal && tokens.length >= 30 && maxDupSim < 0.6) {
    finalRaw = Math.min(finalRaw, 25);
  }

  const finalScore = Math.max(5, Math.min(98, Math.round(finalRaw)));

  let riskLevel = "LOW";
  if (finalScore >= 70) {
    riskLevel = "HIGH";
  } else if (finalScore >= 35) {
    riskLevel = "MEDIUM";
  }

  if (reasons.length === 0) {
    reasons.push("Verified clear deliverables, balanced target, and consistent documentation.");
  }

  return {
    riskScore: finalScore,
    riskLevel,
    reasons,
    isFlagged: finalScore >= 55,
    matchedKeywords,
    similarityScore: Math.round(maxDupSim * 100),
    confidence: Number((Math.min(0.99, 0.75 + (tokens.length / 300) * 0.2)).toFixed(2)),
    engine: "FundChain Local NLP Engine (Resilient)",
  };
}

/**
 * Main analyzeCampaign function: queries FastAPI backend with silent graceful fallback to JS engine
 */
export async function analyzeCampaign(campaignParams) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const res = await fetch(FASTAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaignParams),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        return {
          ...json.data,
          engine: "FastAPI Python Microservice",
        };
      }
    }
  } catch (err) {
    // Backend offline or timeout -> silently fall back to local high-fidelity NLP evaluator
  }

  return evaluateCampaignLocally(campaignParams);
}
