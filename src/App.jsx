import { useState, useEffect } from "react";

// ─── LIVE PLAYOFF DATA (2025-26 NHL Playoffs) ───────────────────────────────
const PLAYOFF_BRACKET = {
  rounds: [
    {
      name: "Second Round",
      conferences: {
        Eastern: [
          { id: "BUF-MTL", home: "BUF", away: "MTL", homeName: "Buffalo Sabres", awayName: "Montreal Canadiens", homeRecord: 1, awayRecord: 0, status: "inprogress", seriesGame: 2 },
          { id: "CAR-PHI", home: "CAR", away: "PHI", homeName: "Carolina Hurricanes", awayName: "Philadelphia Flyers", homeRecord: 2, awayRecord: 0, status: "inprogress", seriesGame: 3 },
        ],
        Western: [
          { id: "COL-MIN", home: "COL", away: "MIN", homeName: "Colorado Avalanche", awayName: "Minnesota Wild", homeRecord: 2, awayRecord: 0, status: "inprogress", seriesGame: 3 },
          { id: "VGK-ANA", home: "VGK", away: "ANA", homeName: "Vegas Golden Knights", awayName: "Anaheim Ducks", homeRecord: 1, awayRecord: 1, status: "inprogress", seriesGame: 3 },
        ],
      },
    },
    {
      name: "Conference Finals",
      conferences: {
        Eastern: [{ id: "ECF", home: "TBD", away: "TBD", homeName: "East Finalist 1", awayName: "East Finalist 2", status: "scheduled" }],
        Western: [{ id: "WCF", home: "TBD", away: "TBD", homeName: "West Finalist 1", awayName: "West Finalist 2", status: "scheduled" }],
      },
    },
    {
      name: "Stanley Cup Final",
      conferences: {
        "": [{ id: "SCF", home: "TBD", away: "TBD", homeName: "Eastern Champion", awayName: "Western Champion", status: "scheduled" }],
      },
    },
  ],
};

const TOP_SCORERS = {
  BUF: ["Tage Thompson", "Jason Zucker", "JJ Peterka", "Alex Tuch", "Rasmus Dahlin"],
  MTL: ["Nick Suzuki", "Cole Caufield", "Juraj Slafkovsky", "Josh Anderson", "Brendan Gallagher"],
  CAR: ["Sebastian Aho", "Andrei Svechnikov", "Seth Jarvis", "Martin Necas", "Brady Skjei"],
  PHI: ["Travis Konecny", "Owen Tippett", "Matvei Michkov", "Sean Couturier", "Cam York"],
  COL: ["Nathan MacKinnon", "Mikko Rantanen", "Cale Makar", "Valeri Nichushkin", "Artturi Lehkonen"],
  MIN: ["Kirill Kaprizov", "Matt Boldy", "Joel Eriksson Ek", "Mats Zuccarello", "Brock Faber"],
  VGK: ["Jack Eichel", "Mark Stone", "Jonathan Marchessault", "Ivan Barbashev", "Shea Theodore"],
  ANA: ["Trevor Zegras", "Mason McTavish", "Troy Terry", "Frank Vatrano", "Cam Fowler"],
};

const TEAM_COLORS = {
  BUF: { primary: "#003087", accent: "#FCB514" },
  MTL: { primary: "#AF1E2D", accent: "#192168" },
  CAR: { primary: "#CC0000", accent: "#000000" },
  PHI: { primary: "#F74902", accent: "#000000" },
  COL: { primary: "#6F263D", accent: "#236192" },
  MIN: { primary: "#154734", accent: "#A6192E" },
  VGK: { primary: "#B4975A", accent: "#333F42" },
  ANA: { primary: "#F47A38", accent: "#B09862" },
  TBD: { primary: "#555", accent: "#888" },
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function NHLPredictorApp() {
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("bracket");
  const [allPredictions, setAllPredictions] = useState({});

  async function predictScorers(series) {
    const seriesKey = series.id;
    if (allPredictions[seriesKey]) {
      setSelectedSeries({ ...series, prediction: allPredictions[seriesKey] });
      return;
    }

    setLoading(true);
    setSelectedSeries(series);

    const homeScorers = TOP_SCORERS[series.home] || ["Player A", "Player B", "Player C"];
    const awayScorers = TOP_SCORERS[series.away] || ["Player A", "Player B", "Player C"];

    const prompt = `You are an NHL playoff analyst. Predict the scorers for Game ${series.seriesGame || 1} of the series between the ${series.homeName} (home, series record ${series.homeRecord || 0}-${series.awayRecord || 0}) vs ${series.awayName} (away).

Home team top scorers: ${homeScorers.join(", ")}
Away team top scorers: ${awayScorers.join(", ")}

Respond ONLY with a JSON object (no markdown, no backticks) in this exact format:
{
  "homeScore": 3,
  "awayScore": 2,
  "homeScorers": [
    {"player": "Player Name", "goals": 1, "assists": 1, "analysis": "one sentence reason"},
    {"player": "Player Name", "goals": 1, "assists": 0, "analysis": "one sentence reason"}
  ],
  "awayScorers": [
    {"player": "Player Name", "goals": 1, "assists": 2, "analysis": "one sentence reason"},
    {"player": "Player Name", "goals": 1, "assists": 0, "analysis": "one sentence reason"}
  ],
  "gameAnalysis": "2-3 sentence game prediction summary",
  "seriesWinner": "${series.homeName} or ${series.awayName}",
  "seriesGames": 6,
  "confidence": 72
}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const updated = { ...allPredictions, [seriesKey]: parsed };
      setAllPredictions(updated);
      setSelectedSeries({ ...series, prediction: parsed });
    } catch (e) {
      setSelectedSeries({ ...series, prediction: { error: "Could not generate prediction. Check API key." } });
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e8eaf0", fontFamily: "'Georgia', serif" }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0d1b2a 0%, #1a0a0a 50%, #0a1a2a 100%)", borderBottom: "2px solid #c8a951", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#c8a951", fontFamily: "monospace", marginBottom: 4 }}>🏒 2025–26 NHL PLAYOFFS</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: "bold", color: "#fff", letterSpacing: 1 }}>
              PLAYOFF SCORER <span style={{ color: "#c8a951" }}>PREDICTOR</span>
            </h1>
            <div style={{ fontSize: 12, color: "#8899aa", marginTop: 4 }}>AI-powered game-by-game scoring predictions</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["bracket", "github"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 18px", borderRadius: 4, border: `1px solid ${tab === t ? "#c8a951" : "#334"}`,
                background: tab === t ? "#c8a951" : "transparent", color: tab === t ? "#0a0e1a" : "#aab",
                cursor: "pointer", fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1
              }}>
                {t === "bracket" ? "🏆 Bracket" : "📂 GitHub"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        {tab === "bracket" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedSeries ? "1fr 1fr" : "1fr", gap: 24 }}>
            {/* LEFT: BRACKET */}
            <div>
              {PLAYOFF_BRACKET.rounds.map((round, ri) => (
                <div key={ri} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, color: "#c8a951", fontFamily: "monospace", marginBottom: 12, borderBottom: "1px solid #223", paddingBottom: 8 }}>
                    ── {round.name.toUpperCase()} ──
                  </div>
                  {Object.entries(round.conferences).map(([conf, series]) => (
                    <div key={conf}>
                      {conf && <div style={{ fontSize: 10, color: "#556", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace" }}>{conf.toUpperCase()} CONFERENCE</div>}
                      {series.map(s => (
                        <SeriesCard key={s.id} series={s} onPredict={predictScorers} isSelected={selectedSeries?.id === s.id} prediction={allPredictions[s.id]} />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* RIGHT: PREDICTION PANEL */}
            {selectedSeries && (
              <div style={{ position: "sticky", top: 20 }}>
                <PredictionPanel series={selectedSeries} loading={loading} onClose={() => setSelectedSeries(null)} />
              </div>
            )}
          </div>
        )}

        {tab === "github" && <GitHubGuide />}
      </div>
    </div>
  );
}

// ─── SERIES CARD ─────────────────────────────────────────────────────────────
function SeriesCard({ series, onPredict, isSelected, prediction }) {
  const hc = TEAM_COLORS[series.home] || TEAM_COLORS.TBD;
  const ac = TEAM_COLORS[series.away] || TEAM_COLORS.TBD;
  const isLive = series.status === "inprogress";
  const isTBD = series.home === "TBD";

  return (
    <div onClick={() => !isTBD && onPredict(series)} style={{
      background: isSelected ? "linear-gradient(135deg, #1a2030, #1a1510)" : "linear-gradient(135deg, #111520, #0d1015)",
      border: `1px solid ${isSelected ? "#c8a951" : "#1e2840"}`,
      borderRadius: 8, padding: "14px 16px", marginBottom: 10,
      cursor: isTBD ? "default" : "pointer", transition: "all 0.2s",
      opacity: isTBD ? 0.5 : 1,
      boxShadow: isSelected ? "0 0 20px rgba(200,169,81,0.15)" : "none"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {/* Home team */}
        <TeamBadge team={series.home} name={series.homeName} color={hc} record={series.homeRecord} />
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: isLive ? "#4cff91" : "#556", letterSpacing: 2, fontFamily: "monospace" }}>
            {isLive ? "● LIVE" : isTBD ? "TBD" : "UPCOMING"}
          </div>
          {isLive && <div style={{ fontSize: 11, color: "#889", marginTop: 2 }}>
            {series.homeRecord}-{series.awayRecord} series
          </div>}
          {prediction && <div style={{ fontSize: 10, color: "#c8a951", marginTop: 3 }}>✓ predicted</div>}
        </div>
        {/* Away team */}
        <TeamBadge team={series.away} name={series.awayName} color={ac} record={series.awayRecord} flip />
      </div>
    </div>
  );
}

function TeamBadge({ team, name, color, record, flip }) {
  const short = name.split(" ").pop();
  return (
    <div style={{ display: "flex", flexDirection: flip ? "row-reverse" : "row", alignItems: "center", gap: 8, minWidth: 0 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${color.primary}, ${color.accent})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: "bold", color: "#fff" }}>
        {team === "TBD" ? "?" : team.slice(0, 3)}
      </div>
      <div style={{ textAlign: flip ? "right" : "left", minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: "bold", color: "#dde", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>{short}</div>
        {record !== undefined && <div style={{ fontSize: 10, color: "#c8a951" }}>W{record}</div>}
      </div>
    </div>
  );
}

// ─── PREDICTION PANEL ────────────────────────────────────────────────────────
function PredictionPanel({ series, loading, onClose }) {
  const pred = series.prediction;
  const hc = TEAM_COLORS[series.home] || TEAM_COLORS.TBD;
  const ac = TEAM_COLORS[series.away] || TEAM_COLORS.TBD;

  return (
    <div style={{ background: "linear-gradient(160deg, #111825, #0d1015)", border: "1px solid #c8a951", borderRadius: 12, padding: 20, minHeight: 300 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: "#c8a951", letterSpacing: 3, fontFamily: "monospace" }}>AI PREDICTION</div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff", marginTop: 4 }}>
            Game {series.seriesGame || "—"}: {series.homeName.split(" ").pop()} vs {series.awayName.split(" ").pop()}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#556", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🏒</div>
          <div style={{ color: "#c8a951", fontFamily: "monospace", fontSize: 13, letterSpacing: 2 }}>ANALYZING MATCHUP...</div>
          <div style={{ color: "#556", fontSize: 11, marginTop: 8 }}>Running AI scorer model</div>
        </div>
      )}

      {!loading && pred?.error && (
        <div style={{ color: "#ff6666", padding: 20, textAlign: "center", fontSize: 13 }}>{pred.error}</div>
      )}

      {!loading && pred && !pred.error && (
        <>
          {/* Score prediction */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, margin: "16px 0", padding: "14px", background: "#0a0e1a", borderRadius: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#889", marginBottom: 4 }}>{series.homeName.split(" ").pop()}</div>
              <div style={{ fontSize: 40, fontWeight: "bold", color: hc.primary === "#0a0e1a" ? "#eee" : hc.primary }}>{pred.homeScore}</div>
            </div>
            <div style={{ fontSize: 20, color: "#445" }}>—</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#889", marginBottom: 4 }}>{series.awayName.split(" ").pop()}</div>
              <div style={{ fontSize: 40, fontWeight: "bold", color: ac.primary === "#0a0e1a" ? "#eee" : ac.primary }}>{pred.awayScore}</div>
            </div>
          </div>

          {/* Analysis */}
          {pred.gameAnalysis && (
            <div style={{ fontSize: 12, color: "#99aabb", lineHeight: 1.6, marginBottom: 16, padding: "10px 12px", background: "#0d111a", borderRadius: 6, borderLeft: "3px solid #c8a951" }}>
              {pred.gameAnalysis}
            </div>
          )}

          {/* Scorers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <ScorerList title={`${series.homeName.split(" ").pop()} Scorers`} scorers={pred.homeScorers} color={hc.primary} />
            <ScorerList title={`${series.awayName.split(" ").pop()} Scorers`} scorers={pred.awayScorers} color={ac.primary} />
          </div>

          {/* Series prediction */}
          <div style={{ background: "#0a0e1a", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: "#556", letterSpacing: 2, fontFamily: "monospace" }}>SERIES WINNER</div>
              <div style={{ fontSize: 14, color: "#c8a951", fontWeight: "bold", marginTop: 2 }}>{pred.seriesWinner}</div>
              <div style={{ fontSize: 11, color: "#778" }}>in {pred.seriesGames} games</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#556", letterSpacing: 2, fontFamily: "monospace" }}>CONFIDENCE</div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: pred.confidence > 70 ? "#4cff91" : pred.confidence > 50 ? "#c8a951" : "#ff8866" }}>
                {pred.confidence}%
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScorerList({ title, scorers, color }) {
  const safeColor = (!color || color === "#0a0e1a") ? "#aabbcc" : color;
  return (
    <div>
      <div style={{ fontSize: 10, color: safeColor, letterSpacing: 2, fontFamily: "monospace", marginBottom: 8 }}>{title.toUpperCase()}</div>
      {(scorers || []).map((s, i) => (
        <div key={i} style={{ marginBottom: 8, padding: "8px 10px", background: "#0d111a", borderRadius: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: "bold", color: "#dde" }}>{s.player}</div>
            <div style={{ fontSize: 11, color: safeColor, fontFamily: "monospace" }}>
              {s.goals}G {s.assists}A
            </div>
          </div>
          {s.analysis && <div style={{ fontSize: 10, color: "#667", marginTop: 4, lineHeight: 1.4 }}>{s.analysis}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── GITHUB GUIDE ────────────────────────────────────────────────────────────
function GitHubGuide() {
  const [copied, setCopied] = useState("");

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  const readmeContent = `# 🏒 NHL Playoff Scorer Predictor

An AI-powered model that predicts goal scorers for every game of the 2025-26 NHL Playoffs using the Anthropic Claude API.

## Features
- Live 2025-26 playoff bracket (Second Round through Stanley Cup Final)
- Per-game scorer predictions with goals, assists, and analysis
- Series winner predictions with confidence scores
- Real team rosters and top scorer data

## Setup

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Installation
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/Sports-Predictions
cd Sports-Predictions
npm install
\`\`\`

### Configuration
\`\`\`bash
cp .env.example .env
# Edit .env and add your Anthropic API key:
# VITE_ANTHROPIC_API_KEY=sk-ant-...
\`\`\`

### Run Locally
\`\`\`bash
npm run dev
# Open http://localhost:5173
\`\`\`

## How It Works
1. Select any active playoff series from the bracket
2. Click to generate an AI prediction for the next game
3. The model uses team records, home/away advantage, and top scorer data
4. Claude returns a predicted final score, individual scorers, and series forecast

## Model Logic
The prediction model considers:
- Series momentum (current wins/losses)
- Home ice advantage
- Top scorer probabilities by team
- Historical playoff scoring patterns

## Tech Stack
- React + Vite
- Anthropic Claude API (claude-sonnet-4)
- SportRadar NHL data (via Claude.ai sports tools)

## Disclaimer
This is a hypothetical prediction model for entertainment purposes only.
Not intended for gambling or wagering. Predictions are AI-generated and not guaranteed.

## License
MIT`;

  const steps = [
    {
      num: "01",
      title: "Create a GitHub Account",
      desc: "Go to github.com and sign up for a free account if you don't have one.",
      code: null,
    },
    {
      num: "02",
      title: "Create a New Repository",
      desc: 'Click the "+" icon → "New repository". Name it nhl-playoff-predictor, set it to Public, check "Add README".',
      code: null,
    },
    {
      num: "03",
      title: "Install Git & Node.js",
      desc: "Download Git from git-scm.com and Node.js (v18+) from nodejs.org.",
      code: null,
    },
    {
      num: "04",
      title: "Scaffold the React App",
      desc: "In your terminal, create a Vite React project:",
      code: `npm create vite@latest nhl-playoff-predictor -- --template react
cd nhl-playoff-predictor
npm install`,
      codeKey: "scaffold",
    },
    {
      num: "05",
      title: "Add Your Code",
      desc: "Replace src/App.jsx with the nhl-playoff-predictor.jsx file from this artifact. Create a .env file:",
      code: `# .env
VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE`,
      codeKey: "env",
    },
    {
      num: "06",
      title: "Update package.json proxy (CORS fix)",
      desc: "Add a Vite proxy so the API key isn't exposed in the browser. In vite.config.js:",
      code: `export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\\/api/, ''),
        headers: {
          'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      }
    }
  }
}`,
      codeKey: "vite",
    },
    {
      num: "07",
      title: "Push to GitHub",
      desc: "Initialize git and push your code:",
      code: `git init
git add .
git commit -m "Initial commit: NHL Playoff Scorer Predictor"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nhl-playoff-predictor.git
git push -u origin main`,
      codeKey: "push",
    },
    {
      num: "08",
      title: "Deploy to GitHub Pages (Optional)",
      desc: "To host it live for free:",
      code: `npm install --save-dev gh-pages

# In package.json, add:
"homepage": "https://YOUR_USERNAME.github.io/nhl-playoff-predictor",
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}

npm run deploy`,
      codeKey: "deploy",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: "#c8a951", letterSpacing: 3, fontFamily: "monospace" }}>── DEPLOYMENT GUIDE ──</div>
        <h2 style={{ margin: "8px 0 4px", color: "#fff", fontSize: 22 }}>How to Submit on GitHub</h2>
        <p style={{ color: "#778", fontSize: 13, margin: 0 }}>Step-by-step instructions to publish this predictor as an open source project</p>
      </div>

      {steps.map((s) => (
        <div key={s.num} style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #c8a951, #8a6a20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", color: "#0a0e1a", fontFamily: "monospace" }}>
            {s.num}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#dde", marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: "#889", lineHeight: 1.6, marginBottom: s.code ? 10 : 0 }}>{s.desc}</div>
            {s.code && (
              <div style={{ position: "relative" }}>
                <pre style={{ background: "#0a0e1a", border: "1px solid #1e2840", borderRadius: 6, padding: "12px 14px", fontSize: 11, color: "#7ec8a0", fontFamily: "monospace", overflowX: "auto", margin: 0, lineHeight: 1.6 }}>
                  {s.code}
                </pre>
                <button onClick={() => copy(s.code, s.codeKey)} style={{
                  position: "absolute", top: 8, right: 8, background: copied === s.codeKey ? "#4cff91" : "#1e2840",
                  border: "none", borderRadius: 4, color: copied === s.codeKey ? "#0a0e1a" : "#889",
                  padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "monospace"
                }}>
                  {copied === s.codeKey ? "✓ COPIED" : "COPY"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* README section */}
      <div style={{ marginTop: 28, borderTop: "1px solid #1e2840", paddingTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "#c8a951", letterSpacing: 3, fontFamily: "monospace" }}>── README.md ──</div>
            <div style={{ fontSize: 14, color: "#dde", fontWeight: "bold", marginTop: 4 }}>Copy this into your README.md</div>
          </div>
          <button onClick={() => copy(readmeContent, "readme")} style={{
            background: copied === "readme" ? "#4cff91" : "#c8a951", border: "none", borderRadius: 6,
            color: "#0a0e1a", padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: "bold", fontFamily: "monospace"
          }}>
            {copied === "readme" ? "✓ COPIED!" : "📋 COPY README"}
          </button>
        </div>
        <pre style={{ background: "#0a0e1a", border: "1px solid #1e2840", borderRadius: 8, padding: 16, fontSize: 11, color: "#7ec8a0", fontFamily: "monospace", overflowX: "auto", maxHeight: 280, lineHeight: 1.7 }}>
          {readmeContent}
        </pre>
      </div>

      <div style={{ marginTop: 20, padding: "14px 16px", background: "#0d1a0d", border: "1px solid #1a3a1a", borderRadius: 8, fontSize: 12, color: "#6a9a6a" }}>
        ⚠️ <strong style={{ color: "#8aba8a" }}>API Key Safety:</strong> Never commit your .env file. Add it to .gitignore. Use environment variables on your hosting platform (Vercel, Netlify, GitHub Pages) for production deployments.
      </div>
    </div>
  );
}