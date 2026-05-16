import React from "react";
import "./App.css";

export default function App() {
  const [title, setTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [copiedText, setCopiedText] = React.useState("");
  const [copiedTag, setCopiedTag] = React.useState(null);

  const handleCopy = async (text, label) => {
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopiedText(label);

    setTimeout(() => {
      setCopiedText("");
    }, 1800);
  };

  const fixTitle = async () => {
    if (!title.trim()) return;

    setLoading(true);
    setProgress(10);
    setResult(null);
    setError("");
    setCopiedText("");

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 250);

    try {
      const res = await fetch("http://localhost:3001/api/fix-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Backend failed");
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
      setError("Backend not working. Make sure node server.js is running.");
    }
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return "🔥 High Demand";
    if (score >= 80) return "✅ Strong Listing";
    return "⚠️ Needs Improvement";
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
    <div className="page">
      <header className="hero">
        <div className="badge">Engine33 Beta</div>
        <h1>Etsy Listing Optimizer</h1>
        <p>
          Paste your current Etsy title and get a cleaner, stronger, more
          searchable listing with tags, keywords, and description.
        </p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Your Current Title</h2>
          <p className="helper">
            Paste a rough Etsy title. Engine33 will optimize it for clarity,
            search intent, and buyer appeal.
          </p>

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

          <button onClick={fixTitle} disabled={loading || !title.trim()}>
            {loading ? "Optimizing..." : "Optimize Etsy Listing"}
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

          {result && !loading && (
            <button className="regenerate-btn" onClick={fixTitle}>
              Regenerate Result
            </button>
          )}

          {error && <div className="error">{error}</div>}
        </section>

        <section className="card result-card">
          {!result ? (
            <div className="empty">
              <h2>
                {loading
                  ? "Building your optimized listing..."
                  : "Your optimized listing will appear here"}
              </h2>
              <p>Try: dog svg, summer png bundle, wedding invitation template</p>
            </div>
          ) : (
            <>
              <div className="result-header">
                <h2>Your Optimized Listing</h2>
                <div className="score">
  SEO Score: {result.score}/100
  <span className="score-label">
    {getScoreLabel(result.score)}
  </span>
</div>
              </div>

              <div className="improved-title">{result.improvedTitle}</div>

              <button
                className="copy-btn"
                onClick={() => handleCopy(result.improvedTitle, "title")}
              >
                {copiedText === "title" ? "Copied!" : "Copy Improved Title"}
              </button>
              

              <div className="analysis">
                <div>
                  <h3>Why this is better</h3>
                  {result.whyBetter?.map((item, index) => (
                    <p className="good" key={index}>
                      ✓ {item}
                    </p>
                  ))}
                </div>

                <div>
                  <h3>What was wrong</h3>
                  {result.whatWasWrong?.map((item, index) => (
                    <p className="bad" key={index}>
                      • {item}
                    </p>
                  ))}
                </div>
              </div>

              {result.tags?.length > 0 && (
                <div className="section-block">
                  <div className="section-heading-row">
                    <h3>🔥 13 Etsy Tags</h3>
                    <button
                      className="mini-copy"
                      onClick={() =>
                        handleCopy(result.tags.join(", "), "tags")
                      }
                    >
                      {copiedText === "tags" ? "Copied!" : "Copy All Tags"}
                    </button>
                  </div>

                  <p className="tag-helper">Click any tag to copy</p>

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

                  <p>
                    <strong>Primary:</strong>
                  </p>
                  <div className="tags">
                    {result.keywords.primary?.map((k, i) => (
                      <span key={i} className="tag">
                        {k}
                      </span>
                    ))}
                  </div>

                  <p>
                    <strong>Long Tail:</strong>
                  </p>
                  <div className="tags">
                    {result.keywords.longTail?.map((k, i) => (
                      <span key={i} className="tag">
                        {k}
                      </span>
                    ))}
                  </div>

                  <p>
                    <strong>Buyer Intent:</strong>
                  </p>
                  <div className="tags">
                    {result.keywords.buyerIntent?.map((k, i) => (
                      <span key={i} className="tag">
                        {k}
                      </span>
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
                      <button
                        className="copy-all-btn"
                        onClick={copyFullListing}
                      >
                        {copiedText === "full"
                          ? "Copied!"
                          : "Copy Full Listing"}
                      </button>

                      <button
                        className="small-copy-btn"
                        onClick={() =>
                          handleCopy(result.description, "description")
                        }
                      >
                        {copiedText === "description"
                          ? "Copied!"
                          : "Copy Description"}
                      </button>
                    </div>
                  </div>

                  <div className="description-box">{result.description}</div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}