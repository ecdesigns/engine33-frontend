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
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Engine33, a premium Etsy SEO assistant and top 1% Etsy seller. Return only valid JSON. No markdown.",
        },
        {
          role: "user",
          content: `
TASK:
Turn this product info into a high-converting Etsy listing that is optimized for search visibility and buyer conversions.

INPUT:
"${title}"

STYLE / VIBE:
${vibe}

STYLE RULES:
Use the selected style naturally across title, tags, keywords, and description tone.

Style guidance:
- General: clean, clear, broad Etsy-friendly wording
- Retro 70s: retro, vintage, groovy, bold colors
- Boho Watercolor: watercolor, soft tones, boho, artistic
- Professional Minimalist: clean, modern, simple, elegant
- Cute Kawaii: cute, kawaii, playful, adorable
- Faux Crochet: crochet, yarn, handmade, cozy, textured
- Vintage Distressed: distressed, worn, vintage, rustic
- Modern Neutral: neutral, clean, soft, minimal

OUTPUT REQUIRED:
Return ONLY valid JSON using this exact structure:

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
- Maximum 140 characters
- Front-load the strongest buyer-intent keyword
- Include product format when obvious: SVG, PNG, printable, template, wall art, invitation, clipart, bundle, instant download
- Include use case when natural: Cricut, Silhouette, shirts, stickers, mugs, wall art, planner, invitation, decor
- Make it readable, not spammy
- Do not repeat the same phrase twice

TAG RULES:
- Return exactly 13 Etsy tags
- Each tag must be 20 characters or less
- Tags should sound like real Etsy searches
- Avoid weak standalone tags: art, design, gift, craft
- Use niche + buyer intent + product format + use case
- No duplicates or near-duplicates

KEYWORD RULES:
- primary: exactly 3 main keyword ideas
- longTail: exactly 3 specific buyer search phrases
- buyerIntent: exactly 3 ready-to-buy phrases
- Keywords can be longer than Etsy tags
- Do not leave any keyword group empty

TECHNICAL DETAILS:
If the product is digital, printable, PNG, SVG, wall art, clipart, design file, template, or invitation, naturally mention:
- High-Resolution
- 300 DPI
- Instant Download
- No physical item will be shipped

Mention file types only when relevant: PNG, SVG, JPG, PDF.
Mention CMYK only for printable or wall art products. Do not force CMYK into SVG-only craft files.

DESCRIPTION RULES:
- Write like a real successful Etsy seller, not generic AI
- Opening must sound human and product-specific
- Start with a real buyer scenario showing what the buyer can create
- Mention who it is for when relevant: Cricut users, Etsy sellers, small shop owners, dog lovers, brides, parents, teachers, DIY crafters
- Mention speed, ease, or result when natural: in minutes, ready to use, no design needed, saves time, professional-looking results
- Use at least 3 tags naturally inside the description
- Include 1 long-tail keyword naturally in the opening
- Do not keyword stuff
- Do not repeat the same keyword more than 2 times
- Use plain text only
- No markdown symbols like ** or ###
- Use line breaks between sections

FORBIDDEN DESCRIPTION PHRASES:
Do not use:
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
Use these section headings exactly as shown:

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
- Colors may vary by screen

WHY BETTER:
Return 3 specific seller-friendly reasons.

WHAT WAS WRONG:
Return 3 specific issues from the original input.
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

    while (data.tags.length < 13) {
      data.tags.push(`etsy tag ${data.tags.length + 1}`);
    }

    data.keywords = normalizeKeywords(data.keywords);

    if (!Array.isArray(data.whyBetter)) data.whyBetter = [];
    if (!Array.isArray(data.whatWasWrong)) data.whatWasWrong = [];

    data.whyBetter = data.whyBetter.slice(0, 3);
    data.whatWasWrong = data.whatWasWrong.slice(0, 3);

    const scoreData = calculateScore(data);

    data.score = scoreData.total;
    data.scoreBreakdown = scoreData.breakdown;
    data.suggestions = getSuggestions(scoreData.breakdown);
    data.missedOpportunities = getMissedOpportunities(data);
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
      temperature: 0.55,
      messages: [
        {
          role: "user",
          content: `
You are an Etsy SEO expert.

Improve the following ${type} ONLY.
Do not rewrite the full listing.
Keep it natural, clear, buyer-focused, and SEO-friendly.

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
      result: completion.choices[0].message.content.trim(),
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
  else if (title.length >= 45 && title.length < 70) breakdown.title += 7;
  else if (title.length >= 25) breakdown.title += 4;

  let titleKeywordMatches = 0;
  primary.forEach((keyword) => {
    if (title.includes(String(keyword).toLowerCase())) titleKeywordMatches++;
  });
  breakdown.title += Math.min(titleKeywordMatches * 5, 15);

  if (
    title.includes("download") ||
    title.includes("svg") ||
    title.includes("png") ||
    title.includes("template") ||
    title.includes("printable") ||
    title.includes("wall art") ||
    title.includes("bundle")
  ) {
    breakdown.title += 5;
  }

  if (tags.length === 13) breakdown.tags += 10;
  else if (tags.length >= 10) breakdown.tags += 7;

  const validLengthTags = tags.filter((tag) => tag.length <= 20);
  breakdown.tags += Math.min(validLengthTags.length, 10);

  const uniqueTags = new Set(tags.map((tag) => tag.toLowerCase()));
  if (uniqueTags.size === tags.length) breakdown.tags += 5;

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
    description.includes("high resolution")
  ) {
    breakdown.description += 4;
  }

  const aiPhrases = [
    "create stunning",
    "elevate your",
    "unlock your creativity",
    "transform your",
    "bring joy",
    "looking for a fun way",
  ];

  if (aiPhrases.some((phrase) => description.includes(phrase))) {
    breakdown.description -= 3;
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

  if (
    breakdown.title === 30 &&
    breakdown.tags === 25 &&
    breakdown.keywords === 25 &&
    breakdown.description === 20
  ) {
    total -= 3;
  }

  if (total < 60) total = 60;
  if (total > 92) total = 92;

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
    suggestions.push("Improve the description with clearer benefits, structure, and technical details like 300 DPI when relevant.");
  }

  if (!suggestions.length) {
    suggestions.push("This listing is strong. Test a second variation to compare buyer appeal.");
  }

  return suggestions;
}

function getMissedOpportunities(data) {
  const opportunities = [];

  const allText = `
    ${data.improvedTitle || ""}
    ${data.description || ""}
    ${(data.tags || []).join(" ")}
    ${(data.keywords?.primary || []).join(" ")}
    ${(data.keywords?.longTail || []).join(" ")}
    ${(data.keywords?.buyerIntent || []).join(" ")}
  `.toLowerCase();

  const productType = detectProductType(allText);

  const keywordMap = {
    dog: ["dog mom svg", "pet lover gift", "dog shirt design", "cricut dog svg"],
    cat: ["cat mom svg", "cat lover gift", "cat shirt design", "cricut cat svg"],
    wedding: ["wedding invitation", "editable template", "bridal shower invite", "wedding printable"],
    planner: ["printable planner", "daily planner pdf", "planner stickers", "digital planner"],
    wallart: ["printable wall art", "boho wall decor", "gallery wall print", "digital wall art"],
    clipart: ["clipart bundle", "png clipart", "commercial use png", "sublimation png"],
    svg: ["svg for cricut", "instant download svg", "svg bundle", "cricut design"],
    general: ["instant download", "digital download", "printable design", "editable template"],
  };

  const possibleKeywords = keywordMap[productType] || keywordMap.general;

  possibleKeywords.forEach((keyword) => {
    if (!allText.includes(keyword)) {
      opportunities.push({
        keyword,
        reason: "Relevant buyer-intent phrase not currently used.",
        impact: "Could improve visibility if it matches the product.",
      });
    }
  });

  return opportunities.slice(0, 3);
}

function detectProductType(text) {
  if (text.includes("dog")) return "dog";
  if (text.includes("cat")) return "cat";
  if (text.includes("wedding") || text.includes("bride") || text.includes("bridal")) return "wedding";
  if (text.includes("planner") || text.includes("sticker")) return "planner";
  if (text.includes("wall art") || text.includes("decor") || text.includes("print")) return "wallart";
  if (text.includes("clipart") || text.includes("clip art") || text.includes("png")) return "clipart";
  if (text.includes("svg") || text.includes("cricut")) return "svg";
  return "general";
}

function getScoreLabel(score) {
  if (score >= 90) return "High-performing estimate";
  if (score >= 80) return "Strong estimate";
  if (score >= 70) return "Good estimate";
  return "Needs improvement";
}