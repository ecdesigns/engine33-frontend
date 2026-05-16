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

  const renderScorePanel = () => {
    if (!result?.score) return null;

    return (
      <div className="score-panel">
        <div className="score-top">
          <div>
            <p className="score-kicker">SEO SCORE</p>
            <h2 style={{ color: getScoreColor(result.score) }}>
              {result.score}/100
            </h2>
          </div>

          <div
            className="score-badge"
            style={{ background: getScoreColor(result.score) }}
          >
            {getScoreLabel(result.score)}
          </div>
        </div>

        <ScoreBar label="SEO Strength" value={result.score} max={100} />
      </div>
    );
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
      const res = await fetch("/api/fix-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          vibe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "API failed");
      }

      clearInterval(progressTimer);
      setProgress(100);
      setResult(data);

      setTimeout(() => {
        setLoading(false);
      }, 350);
    } catch (err) {
      clearInterval(progressTimer);
      console.error(err);
      setLoading(false);
      setError(err.message || "API connection failed.");
    }
  };

  const improveField = async (type) => {
    if (!result) return;

    try {
      setError("");

      const res = await fetch("/api/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          content:
            type === "title"
              ? result.improvedTitle
              : result.description,
          keywords: result.keywords?.primary || [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Improve failed");
      }

      if (type === "title") {
        setResult({
          ...result,
          improvedTitle: data.result,
        });
      } else {
        setResult({
          ...result,
          description: data.result,
        });
      }
    } catch (err) {
      console.error(err);
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
          </div>
        </div>
      </header>

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
            <p className="section-kicker">START HERE</p>

            <h2>Your Current Title</h2>

            <p className="helper">
              Paste a rough Etsy title. Engine33 will optimize it for clarity,
              search intent, and buyer appeal.
            </p>

            <label className="field-label">Style / vibe</label>

            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
            >
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

            <button
              className="primary-btn"
              onClick={fixTitle}
              disabled={loading || !title.trim()}
            >
              {loading ? "Fixing Listing..." : "Fix My Title Free"}
            </button>

            {loading && (
              <div className="progress-wrap">
                <div className="progress-label">
                  <span>Optimizing listing...</span>
                  <span>{progress}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && <div className="error">{error}</div>}
          </section>

          <section className="card result-card">
            {!result ? (
              <div className="empty">
                <div className="empty-icon">🚀</div>

                <h2>
                  {loading
                    ? "Building your optimized listing..."
                    : "Your optimized listing will appear here"}
                </h2>

                <p>
                  Try: dog svg, summer png bundle, wedding invitation template
                </p>
              </div>
            ) : (
              <>
                <div className="improved-title">
                  {result.improvedTitle}
                </div>

                {renderScorePanel()}
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
        <strong>
          {value}/{max}
        </strong>
      </div>

      <div className="bar">
        <div style={{ width: `${percent}%` }} />
      </div>
    </>
  );
}