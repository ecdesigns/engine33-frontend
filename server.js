import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/auth/etsy", (req, res) => {
  res.send("Etsy OAuth connection coming next.");
});

app.get("/", (req, res) => {
  res.send("Engine33 backend is running");
});

app.post("/api/fix-title", async (req, res) => {
  try {
    const { title, vibe = "General" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Please enter a title first." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.42,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Engine33, a premium Etsy SEO assistant and expert Etsy seller. Return only valid JSON. No markdown.",
        },
        {
          role: "user",
          content: `
TASK:
Create a high-converting Etsy listing optimized for Etsy search visibility, buyer intent, and clean copy/paste usability.

INPUT:
"${title}"

STYLE / VIBE:
${vibe}

RETURN ONLY THIS JSON STRUCTURE:
{
  "improvedTitle": "",
  "score": 85,
  "tags": [],
  "keywords": {
    "primary": [],
    "longTail": [],
    "buyerIntent": []
  },
  "description": "",
  "whyBetter": [],
  "whatWasWrong": []
}

TITLE RULES:
- Maximum 140 characters.
- Front-load the strongest buyer-intent keyword.
- Include product format when obvious: SVG, PNG, printable, template, wall art, invitation, clipart, bundle, instant download, digital download, MP3, custom song.
- Include use case when natural: Cricut, Silhouette, shirts, stickers, mugs, wall art, planner, invitation, decor, wedding, anniversary, gift.
- Do not keyword stuff.
- Do not repeat the same phrase twice.
- Make the title sound like a real Etsy buyer search, not generic AI copy.

TAG RULES:
- Return exactly 13 Etsy tags.
- Each tag must be 20 characters or less.
- Tags should sound like real Etsy searches.
- Avoid weak standalone tags: art, design, gift, craft, cute, digital.
- Use niche + buyer intent + product format + use case.
- No duplicates or near-duplicates.

KEYWORD RULES:
- primary: exactly 3 main keyword ideas.
- longTail: exactly 3 specific buyer search phrases.
- buyerIntent: exactly 3 ready-to-buy phrases.
- Do not leave keyword groups empty.

ACCURACY RULES:
- Do NOT assume exact quantities.
- Do NOT say "10 files", "25 images", "50 designs", etc. unless clearly provided in the input.
- Use flexible wording like "a collection of", "multiple files", "various designs", or "included files".
- Do NOT invent product details.
- Do NOT mention commercial use unless provided by the input.

TECHNICAL DETAILS:
If the product is digital, printable, PNG, SVG, wall art, clipart, design file, template, invitation, MP3, or custom song, naturally mention:
- Instant Download when relevant
- No physical item will be shipped
- High-Resolution and 300 DPI only for image/print/design products, not songs or MP3s

DESCRIPTION RULES:
- The description must be ready to paste into Etsy.
- Do NOT include WHY BETTER inside the description.
- Do NOT include WHAT WAS WRONG inside the description.
- Do NOT include analysis inside the description.
- Write like a real Etsy seller, not generic AI.
- Start with a direct buyer-focused statement.
- Do NOT start with: Imagine, Looking for, Create stunning, Perfect for.
- Start by clearly saying what the buyer can make, receive, or use the product for.
- Mention who it is for when relevant.
- Use at least 3 tags naturally inside the description.
- Include 1 long-tail keyword naturally in the opening.
- Do not keyword stuff.
- Use plain text only.
- No markdown symbols like ** or ###.

FORBIDDEN DESCRIPTION PHRASES:
Do not use:
- Imagine
- Create stunning
- Perfect for
- Great for
- elevate your projects
- everything you need
- unlock your creativity
- transform your creativity
- bring joy
- looking for a fun way

DESCRIPTION STRUCTURE:
Use these section headings exactly:

OPENING:
Write 2 short persuasive sentences.

WHAT YOU GET:
- Bullet 1 with specific feature + buyer benefit
- Bullet 2 with specific feature + buyer benefit
- Bullet 3 with specific feature + buyer benefit
- Bullet 4 with specific feature + buyer benefit

HOW TO USE:
- Step 1
- Step 2
- Step 3

PERFECT FOR:
- Specific use case 1
- Specific use case 2
- Specific use case 3

PLEASE NOTE:
- Digital download
- No physical item shipped
- Colors may vary by screen when relevant

WHY BETTER:
Return exactly 3 specific seller-friendly reasons.

WHAT WAS WRONG:
Return exactly 3 specific issues from the original input.
`,
        },
      ],
    });

    const raw = completion.choices[0].message.content;
    let data = JSON.parse(raw);

    data.improvedTitle = String(data.improvedTitle || "").trim().slice(0, 140);

    if (!Array.isArray(data.tags)) data.tags = [];
    data.tags = data.tags
      .map((tag) => String(tag).trim().toLowerCase().slice(0, 20))
      .filter(Boolean);

    data.tags = [...new Set(data.tags)].slice(0, 13);
    data.keywords = normalizeKeywords(data.keywords);

    if (!Array.isArray(data.whyBetter)) data.whyBetter = [];
    if (!Array.isArray(data.whatWasWrong)) data.whatWasWrong = [];

    data.whyBetter = data.whyBetter.slice(0, 3);
    data.whatWasWrong = data.whatWasWrong.slice(0, 3);

    data.description = cleanDescription(data.description);
    data = polishListing(data, title, vibe);

    const scoreData = calculateScore(data);

    data.score = scoreData.total;
    data.scoreBreakdown = scoreData.breakdown;
    data.suggestions = getSuggestions(scoreData.breakdown);
    data.missedOpportunities = getMissedOpportunities(data);
    data.quickWins = generateQuickWins(data);
    data.scoreLabel = getScoreLabel(data.score);

    res.json(data);
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({
      error: "Backend failed. Check your API key and terminal.",
    });
  }
});

app.post("/api/improve", async (req, res) => {
  try {
    const { type, content, keywords = [] } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: "Missing type or content." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.36,
      messages: [
        {
          role: "system",
          content:
            "You are an Etsy SEO expert improving one part of a listing. Return only the improved text. No explanations.",
        },
        {
          role: "user",
          content: `
Improve the following ${type} ONLY.

Rules:
- Do not rewrite the full listing.
- Do not add fake quantities or fake details.
- Do not include WHY BETTER.
- Do not include WHAT WAS WRONG.
- Do not include analysis.
- Keep it natural, clear, buyer-focused, and SEO-friendly.
- Avoid generic AI phrases.
- Do not start descriptions with Imagine, Looking for, Create stunning, or Perfect for.

Content:
"${content}"

Use these keywords naturally only if relevant:
${keywords.join(", ")}

Return ONLY the improved ${type}.
`,
        },
      ],
    });

    res.json({
      result: cleanDescription(completion.choices[0].message.content.trim()),
    });
  } catch (err) {
    console.error("Improve error:", err);
    res.status(500).json({ error: "Improve failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function normalizeKeywords(keywords = {}) {
  const cleanArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
  };

  return {
    primary: cleanArray(keywords.primary),
    longTail: cleanArray(keywords.longTail),
    buyerIntent: cleanArray(keywords.buyerIntent),
  };
}

function cleanDescription(text = "") {
  return String(text || "")
    .split(/\n(?=WHY BETTER:|WHAT WAS WRONG:)/i)[0]
    .replace(/\*\*/g, "")
    .replace(/###/g, "")
    .trim();
}

function polishListing(data, originalTitle, vibe) {
  const allText = `
    ${originalTitle}
    ${data.improvedTitle}
    ${data.description}
    ${(data.tags || []).join(" ")}
  `.toLowerCase();

  const type = detectProductType(allText);
  const style = String(vibe || "").toLowerCase();

  const tagIdeas = {
    song: [
      "custom song gift",
      "personalized song",
      "anniversary song",
      "wedding song gift",
      "romantic music gift",
      "digital mp3 gift",
      "unique music gift",
    ],
    fruit: [
      "fruit clipart png",
      "fruit svg bundle",
      "kawaii fruit svg",
      "fruit png files",
      "cricut fruit svg",
      "fruit stickers",
      "fruit wall art",
    ],
    animal: [
      "animal clipart png",
      "animal svg bundle",
      "kawaii animal svg",
      "animal stickers",
      "cricut animal svg",
      "printable animals",
    ],
    dog: [
      "dog svg for cricut",
      "dog shirt design",
      "dog mom svg",
      "pet lover svg",
      "dog clipart png",
      "funny dog svg",
    ],
    cat: [
      "cat svg for cricut",
      "cat mom svg",
      "cat shirt design",
      "cat clipart png",
      "cat lover svg",
    ],
    wedding: [
      "wedding template",
      "bridal invite",
      "editable invite",
      "wedding printable",
      "wedding invite pdf",
    ],
    planner: [
      "planner stickers",
      "printable planner",
      "digital planner",
      "planner png",
      "planner inserts",
    ],
    wallart: [
      "printable wall art",
      "digital wall art",
      "boho wall decor",
      "gallery wall print",
      "home decor print",
    ],
    svg: [
      "svg for cricut",
      "instant download svg",
      "svg bundle",
      "cricut design",
      "cut file svg",
    ],
    clipart: [
      "clipart bundle",
      "png clipart",
      "digital clipart",
      "clipart png files",
      "printable clipart",
    ],
    general: [
      "instant download",
      "digital download",
      "printable design",
      "cricut design",
      "digital file",
    ],
  };

  let smartTags = [...(tagIdeas[type] || tagIdeas.general)];

  if (style.includes("kawaii")) smartTags.unshift("kawaii clipart", "cute png files");
  if (style.includes("boho")) smartTags.unshift("boho clipart", "watercolor png");
  if (style.includes("retro")) smartTags.unshift("retro clipart", "vintage png");
  if (style.includes("crochet")) smartTags.unshift("faux crochet svg", "crochet style png");

  const weakTags = ["art", "design", "gift", "craft", "cute", "digital"];

  data.tags = [...smartTags, ...(data.tags || [])]
    .map((tag) => String(tag).trim().toLowerCase().slice(0, 20))
    .filter((tag) => tag && !weakTags.includes(tag));

  data.tags = [...new Set(data.tags)].slice(0, 13);

  while (data.tags.length < 13) {
    data.tags.push(type === "song" ? "custom song gift" : "instant download");
    data.tags = [...new Set(data.tags)].slice(0, 13);
  }

  let improvedTitle = data.improvedTitle || "";
  const titleLower = improvedTitle.toLowerCase();

  if (type === "song" && !titleLower.includes("custom song")) {
    improvedTitle = `Custom Song Gift | ${improvedTitle}`;
  }

  if (type === "fruit" && !titleLower.includes("fruit")) {
    improvedTitle = `Fruit Clipart Bundle | ${improvedTitle}`;
  }

  if (type === "animal" && !titleLower.includes("animal")) {
    improvedTitle = `Animal Clipart Bundle | ${improvedTitle}`;
  }

  if (type !== "song" && !improvedTitle.toLowerCase().includes("bundle")) {
    improvedTitle = improvedTitle.replace(/clipart/i, "Clipart Bundle");
  }

  if (
    (type === "fruit" || type === "animal") &&
    !improvedTitle.toLowerCase().includes("stickers")
  ) {
    improvedTitle += " | Stickers & Wall Art";
  }

  if (type !== "song" && allText.includes("svg") && !improvedTitle.toLowerCase().includes("svg")) {
    improvedTitle += " | SVG";
  }

  if (type !== "song" && allText.includes("png") && !improvedTitle.toLowerCase().includes("png")) {
    improvedTitle += " | PNG";
  }

  if (!improvedTitle.toLowerCase().includes("instant download") && type !== "song") {
    improvedTitle += " | Instant Download";
  }

  data.improvedTitle = improvedTitle
    .replace(/\s+\|\s+\|/g, " | ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);

  return data;
}

function calculateScore(data) {
  const breakdown = {
    title: 0,
    tags: 0,
    keywords: 0,
    description: 0,
  };

  const title = (data.improvedTitle || "").toLowerCase();
  const tags = data.tags || [];
  const primary = data.keywords?.primary || [];
  const longTail = data.keywords?.longTail || [];
  const buyerIntent = data.keywords?.buyerIntent || [];
  const description = (data.description || "").toLowerCase();

  if (title.length >= 70 && title.length <= 140) breakdown.title += 10;
  else if (title.length >= 45) breakdown.title += 7;
  else if (title.length >= 25) breakdown.title += 4;

  let titleKeywordMatches = 0;
  primary.forEach((keyword) => {
    if (title.includes(String(keyword).toLowerCase())) titleKeywordMatches++;
  });
  breakdown.title += Math.min(titleKeywordMatches * 4, 12);

  if (
    title.includes("download") ||
    title.includes("svg") ||
    title.includes("png") ||
    title.includes("template") ||
    title.includes("printable") ||
    title.includes("wall art") ||
    title.includes("bundle") ||
    title.includes("custom song")
  ) {
    breakdown.title += 5;
  }

  if (
    title.includes("stickers") ||
    title.includes("shirts") ||
    title.includes("mugs") ||
    title.includes("planner") ||
    title.includes("wedding") ||
    title.includes("anniversary")
  ) {
    breakdown.title += 2;
  }

  if (title.split("|").length >= 3) breakdown.title += 3;

  if (tags.length === 13) breakdown.tags += 10;
  else if (tags.length >= 10) breakdown.tags += 7;

  const validLengthTags = tags.filter((tag) => tag.length <= 20);
  breakdown.tags += Math.min(validLengthTags.length, 10);

  const uniqueTags = new Set(tags.map((tag) => tag.toLowerCase()));
  if (uniqueTags.size === tags.length) breakdown.tags += 5;

  const weakTags = tags.filter((tag) =>
    ["art", "design", "gift", "craft", "cute", "digital"].includes(tag)
  );
  breakdown.tags -= weakTags.length * 2;

  if (primary.length >= 3) breakdown.keywords += 5;
  if (longTail.length >= 3) breakdown.keywords += 5;
  if (buyerIntent.length >= 3) breakdown.keywords += 5;

  let descriptionKeywordMatches = 0;
  [...primary, ...longTail].forEach((keyword) => {
    const cleanKeyword = String(keyword).toLowerCase();
    if (cleanKeyword && description.includes(cleanKeyword.split(" ")[0])) {
      descriptionKeywordMatches++;
    }
  });
  breakdown.keywords += Math.min(descriptionKeywordMatches * 2, 10);

  if (description.includes("what you get")) breakdown.description += 4;
  if (description.includes("how to use")) breakdown.description += 4;
  if (description.includes("perfect for")) breakdown.description += 4;
  if (description.includes("please note")) breakdown.description += 4;

  if (
    description.includes("300 dpi") ||
    description.includes("high-resolution") ||
    description.includes("high resolution") ||
    description.includes("mp3")
  ) {
    breakdown.description += 4;
  }

  if (description.includes("why better") || description.includes("what was wrong")) {
    breakdown.description -= 8;
  }

  const aiPhrases = [
    "create stunning",
    "elevate your",
    "unlock your creativity",
    "transform your",
    "bring joy",
    "looking for a fun way",
    "imagine creating",
  ];

  if (aiPhrases.some((phrase) => description.includes(phrase))) {
    breakdown.description -= 4;
  }

  breakdown.title = Math.max(0, Math.min(breakdown.title, 30));
breakdown.tags = Math.max(0, Math.min(breakdown.tags, 25));
breakdown.keywords = Math.max(0, Math.min(breakdown.keywords, 25));
breakdown.description = Math.max(0, Math.min(breakdown.description, 20));

let total =
  breakdown.title +
  breakdown.tags +
  breakdown.keywords +
  breakdown.description;

// realism balancing
if (title.length < 12) total -= 18;
if (tags.length < 8) total -= 10;
if (primary.length < 2) total -= 8;

// prevent fake perfect scores
if (total > 94) total = 94;

// never negative
if (total < 8) total = 8;

return { total, breakdown };

}

function getSuggestions(breakdown) {
  const suggestions = [];

  if (breakdown.title < 24) {
    suggestions.push("Strengthen the title with clearer buyer-intent keywords and product format.");
  }

  if (breakdown.tags < 22) {
    suggestions.push("Improve tag variety with more niche use cases and less generic wording.");
  }

  if (breakdown.keywords < 20) {
    suggestions.push("Add stronger primary, long-tail, and buyer-intent keyword coverage.");
  }

  if (breakdown.description < 17) {
    suggestions.push("Improve the description with clearer benefits, structure, and technical details when relevant.");
  }

  if (!suggestions.length) {
    suggestions.push("Test one alternate version of this title to compare buyer appeal.");
  }

  return suggestions.slice(0, 1);
}

function getMissedOpportunities(data) {
  const allText = `
    ${data.improvedTitle || ""}
    ${data.description || ""}
    ${(data.tags || []).join(" ")}
  `.toLowerCase();

  const type = detectProductType(allText);

  const map = {
    song: ["custom song gift", "anniversary song", "wedding song gift"],
    fruit: ["fruit svg bundle", "fruit clipart png", "kawaii fruit svg"],
    animal: ["animal clipart png", "animal svg bundle", "kawaii animal svg"],
    dog: ["dog svg for cricut", "dog mom svg", "dog shirt design"],
    cat: ["cat svg for cricut", "cat mom svg", "cat shirt design"],
    wedding: ["editable invite", "wedding template", "bridal shower invite"],
    planner: ["planner stickers", "printable planner", "digital planner"],
    wallart: ["printable wall art", "digital wall art", "boho wall decor"],
    svg: ["svg for cricut", "instant download svg", "svg bundle"],
    clipart: ["clipart bundle", "png clipart", "digital clipart"],
    general: ["instant download", "digital download", "printable design"],
  };

  return (map[type] || map.general)
    .filter((keyword) => !allText.includes(keyword))
    .slice(0, 2)
    .map((keyword) => ({
      keyword,
      reason: "Strong search keyword missing from your listing.",
      impact: "Adding this can improve visibility and buyer intent matching when relevant.",
    }));
}

function generateQuickWins(data) {
  const wins = [];
  const title = String(data.improvedTitle || "").toLowerCase();
  const description = String(data.description || "").toLowerCase();
  const tags = data.tags || [];

  if (!title.includes("bundle") && !title.includes("song")) {
    wins.push("Add 'Bundle' to your title to increase perceived value.");
  }

  if (!title.includes("instant download") && !title.includes("custom song")) {
    wins.push("Include 'Instant Download' to capture ready-to-buy traffic.");
  }

  if (!description.includes("300 dpi") && !description.includes("mp3")) {
    wins.push("Mention technical details clearly to build buyer trust.");
  }

  if (tags.length < 13) {
    wins.push("Use all 13 tags to maximize Etsy visibility.");
  }

  if (!title.includes("stickers") && !title.includes("mugs") && !title.includes("wall art") && !title.includes("wedding") && !title.includes("anniversary")) {
    wins.push("Add a clear use case like stickers, mugs, wall art, wedding, or anniversary.");
  }

  return wins.slice(0, 2);
}

function detectProductType(text) {
  if (text.includes("song") || text.includes("music") || text.includes("mp3")) return "song";
  if (text.includes("fruit")) return "fruit";
  if (text.includes("animal")) return "animal";
  if (text.includes("dog")) return "dog";
  if (text.includes("cat")) return "cat";
  if (text.includes("wedding") || text.includes("bridal")) return "wedding";
  if (text.includes("planner") || text.includes("sticker")) return "planner";
  if (text.includes("wall art") || text.includes("decor")) return "wallart";
  if (text.includes("clipart") || text.includes("clip art") || text.includes("png")) return "clipart";
  if (text.includes("svg") || text.includes("cricut")) return "svg";
  return "general";
}

function getScoreLabel(score) {
  if (score >= 86) return "High-performing estimate";
  if (score >= 76) return "Strong estimate";
  if (score >= 66) return "Good estimate";
  return "Needs improvement";
}
