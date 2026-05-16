import React from "react";
import "./App.css";
import logo from "./assets/logo.png";

export default function App() {
  const [title, setTitle] = React.useState("");
  const [vibe, setVibe] = React.useState("General");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [copiedText, setCopiedText] = React.useState("");
  const [copiedTag, setCopiedTag] = React.useState(null);

  const API_BASE = "";

  const handleCopy = async (text, label) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(""), 1800);
    } catch (err) {
      console.error("Copy failed", err);
      setError("Copy failed. Please try again.");
    }
  };

  const getScoreLabel = (score) => {
    if (score >= 86) return "High Performing";
    if (score >= 76) return "Strong";
    if (score >= 66) return "Good";
    return "Needs Work";
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#f59e0b";
    return "#ef4444";
  };

  const fixTitle = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setProgress(10);
    setResult(null);
    setError("");
    setCopiedText("");

    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 250);

    try {
      const res = await fetch(`${API_BASE}/api/fix-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, vibe }),
      });

      const data = await res.json();

console.log("API RESPONSE:", data);

if (!res.ok) {
  throw new Error(data.error || "Backend failed");
}

clearInterval(progressTimer);

setProgress(100);

setResult({
  improvedTitle:
    data.improvedTitle ||
    data.result ||
    "Optimized title generated successfully",

  score: data.score || 82,

  tags: data.tags || [],

  keywords: data.keywords || {
    primary: [],
    longTail: [],
    buyerIntent: [],
  },

  description: data.description || "",

  whyBetter: data.whyBetter || [],

  whatWasWrong: data.whatWasWrong || [],

  suggestions: data.suggestions || [],

  missedOpportunities: data.missedOpportunities || [],
});

setTimeout(() => setLoading(false), 350);
    } catch (err) {
      clearInterval(progressTimer);
      console.error(err);
      setLoading(false);
      setError("Backend connection failed.");
    }
  };

  const improveField = async (type) => {
    if (!result) return;

    try {
      setError("");

      const res = await fetch(`${API_BASE}/api/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          content: type === "title" ? result.improvedTitle : result.description,
          keywords: result.keywords?.primary || [],
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Improve failed");

      if (type === "title") {
        setResult({ ...result, improvedTitle: data.result });
      } else {
        setResult({ ...result, description: data.result });
      }
    } catch (err) {
      console.error("Improve failed", err);
      setError("Improve failed.");
    }
  };

  const copyFullListing = () => {
    if (!result) return;

    const fullListing = `
TITLE:
${result.improvedTitle || ""}

TAGS:
${result.tags?.join(", ") || ""}

PRIMARY KEYWORDS:
${result.keywords?.primary?.join(", ") || ""}

LONG TAIL KEYWORDS:
${result.keywords?.longTail?.join(", ") || ""}

BUYER INTENT:
${result.keywords?.buyerIntent?.join(", ") || ""}

DESCRIPTION:
${result.description || ""}
`;

    handleCopy(fullListing.trim(), "full");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <img src={logo} alt="Engine33" className="topbar-logo" />
          </div>

          <div className="topbar-right">
            <span className="badge">Trusted by Etsy sellers</span>

            <button
              className="etsy-connect-btn"
              onClick={() => {
                window.location.href = `${API_BASE}/api/auth/etsy`;
              }}
            >
              Connect Etsy Shop
            </button>
          </div>
        </div>
      </header>

      {/* KEEP REST OF YOUR JSX EXACTLY THE SAME */}

   

      <main className="page">
        <section className="hero-compact">
          <p className="hero-kicker">Built for Etsy sellers</p>
          <h1>Your title is losing you sales</h1>
          <p>
            Paste your Etsy title below and Engine33 will diagnose what is weak,
            rewrite it, and give you stronger tags, keywords, and listing copy.
          </p>
        </section>

        <section className="tool-grid">
          <section className="card input-card">
            <div className="card-heading-row">
              <div>
                <p className="section-kicker">Start here</p>
                <h2>Your Current Title</h2>
              </div>
            </div>

            <p className="helper">
              Paste a rough Etsy title. Engine33 will optimize it for clarity,
              search intent, and buyer appeal.
            </p>

            <label className="field-label">Style / vibe</label>
            <select value={vibe} onChange={(e) => setVibe(e.target.value)}>
              <option>General</option>
              <option>Retro 70s</option>
              <option>Boho Watercolor</option>
              <option>Professional Minimalist</option>
              <option>Cute Kawaii</option>
              <option>Vintage Distressed</option>
              <option>Modern Neutral</option>
              <option>Faux Crochet</option>
            </select>

            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: dog svg"
              maxLength={140}
            />

            <div className="meta-row">
              <span>{title.length}/140 characters</span>
              <span>Etsy title limit</span>
            </div>

            <button className="primary-btn" onClick={fixTitle} disabled={loading || !title.trim()}>
              {loading ? "Fixing Listing..." : "Fix My Title Free"}
            </button>

            <p className="trust-line">
              Free • Takes 10 seconds • <strong>No signup required</strong> • Instant results
            </p>

            {loading && (
              <div className="progress-wrap">
                <div className="progress-label">
                  <span>Optimizing listing...</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {result && !loading && (
              <button className="regenerate-btn" onClick={fixTitle}>
                Regenerate Full Listing
              </button>
            )}

            {error && <div className="error">{error}</div>}
          </section>
          <section className="card result-card">
            {!result ? (
              <div className="empty">
                <div className="empty-icon">🚀</div>
                <h2>{loading ? "Building your optimized listing..." : "Your optimized listing will appear here"}</h2>
                <p>Try: dog svg, summer png bundle, wedding invitation template</p>
              </div>
            ) : (
              <>
                <div className="result-header">
                  <div>
                    <p className="eyebrow">Your optimized listing</p>
                    <h2>🚀 High-Performing Listing</h2>
                  </div>
                </div>

                <div className="improved-title">{result.improvedTitle}</div>

                {renderScorePanel()}

                <button
                  className="copy-btn"
                  onClick={() => handleCopy(result.improvedTitle, "title")}
                >
                  {copiedText === "title" ? "Copied!" : "Copy Improved Title"}
                </button>

                <div className="improve-actions">
                  <button className="secondary-btn" onClick={() => improveField("title")}>
                    Improve Title
                  </button>

                  <button className="secondary-btn" onClick={() => improveField("description")}>
                    Improve Description
                  </button>
                </div>

                <div className="analysis-card">
                  <div className="analysis-block positive">
                    <h3>Why this will perform better</h3>
                    {result.whyBetter?.map((item, index) => (
                      <p className="good" key={index}>✓ {item}</p>
                    ))}
                  </div>

                  <div className="analysis-block warning">
                    <h3>What was wrong</h3>
                    {result.whatWasWrong?.map((item, index) => (
                      <p className="bad" key={index}>• {item}</p>
                    ))}
                  </div>
                </div>

                {result.suggestions?.length > 0 && (
                  <div className="suggestion-box">
                    <h3>💡 Quick Win</h3>
                    {result.suggestions.map((item, index) => (
                      <p key={index}>{item}</p>
                    ))}
                  </div>
                )}

                {result.missedOpportunities?.length > 0 && (
                  <div className="opportunity-box premium">
                    <h3>🚀 High-Value Opportunities</h3>
                    <p className="opportunity-sub">
                      Optional keyword ideas that may improve visibility when relevant.
                    </p>

                    {result.missedOpportunities.map((item, index) => (
                      <div key={index} className="opportunity-item premium-item">
                        <div className="opportunity-header">
                          <strong>{item.keyword}</strong>
                          <span className="badge-high">Opportunity</span>
                        </div>
                        <p>{item.reason}</p>
                        <small>{item.impact}</small>
                      </div>
                    ))}
                  </div>
                )}

                {result.tags?.length > 0 && (
                  <div className="section-block">
                    <div className="section-heading-row">
                      <div>
                        <h3>🔥 13 Etsy Tags</h3>
                        <p className="tag-helper">Click any tag to copy</p>
                      </div>
                      <button
                        className="mini-copy"
                        onClick={() => handleCopy(result.tags.join(", "), "tags")}
                      >
                        {copiedText === "tags" ? "Copied!" : "Copy All Tags"}
                      </button>
                    </div>

                    <div className="tags">
                      {result.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="tag"
                          onClick={() => {
                            handleCopy(tag, `tag-${i}`);
                            setCopiedTag(i);
                            setTimeout(() => setCopiedTag(null), 1000);
                          }}
                        >
                          {tag} {copiedTag === i && "✓"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.keywords && (
                  <div className="section-block">
                    <h3>Keywords</h3>

                    <p><strong>Primary:</strong></p>
                    <div className="tags">
                      {result.keywords.primary?.map((k, i) => (
                        <span key={i} className="tag">{k}</span>
                      ))}
                    </div>

                    <p><strong>Long Tail:</strong></p>
                    <div className="tags">
                      {result.keywords.longTail?.map((k, i) => (
                        <span key={i} className="tag">{k}</span>
                      ))}
                    </div>

                    <p><strong>Buyer Intent:</strong></p>
                    <div className="tags">
                      {result.keywords.buyerIntent?.map((k, i) => (
                        <span key={i} className="tag">{k}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result.description && (
                  <div className="description-card">
                    <div className="description-header">
                      <div>
                        <h3>Etsy Description</h3>
                        <p>Ready-to-paste listing copy</p>
                      </div>

                      <div className="description-actions">
                        <button className="copy-all-btn" onClick={copyFullListing}>
                          {copiedText === "full" ? "Copied!" : "Copy Full Listing"}
                        </button>

                        <button
                          className="small-copy-btn"
                          onClick={() => handleCopy(result.description, "description")}
                        >
                          {copiedText === "description" ? "Copied!" : "Copy Description"}
                        </button>
                      </div>
                    </div>

                    <div className="description-box">{result.description}</div>
                  </div>
                )}
              </>
            )}
          </section>
         
        </section>
      </main>
    </div>
  );
}

function ScoreBar({ label, value, max }) {
  const percent = Math.min((Number(value || 0) / max) * 100, 100);

  return (
    <>
      <div className="score-line">
        <span>{label}</span>
        <strong>{value}/{max}</strong>
      </div>
      <div className="bar">
        <div style={{ width: `${percent}%` }} />
      </div>
    </>
  );
}
