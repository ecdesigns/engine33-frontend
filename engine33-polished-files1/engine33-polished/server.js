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
      temperature: 0.65,
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
Act as a top 1% Etsy SEO expert.

Turn this product info into a high-converting Etsy listing that is optimized to RANK and CONVERT.

INPUT:
"${title}"

STYLE / VIBE:
Match the listing style to: ${vibe || "General"}
Examples: Retro 70s, Boho Watercolor, Professional Minimalist, Cute Kawaii, Vintage Distressed, Modern Neutral.

OUTPUT REQUIRED:
- Optimized Etsy title
- 13 Etsy tags
- Keyword groups
- High-converting Etsy description
- Why this is better
- What was wrong

TITLE RULES:
- improvedTitle max 140 characters
- Front-load high-intent keywords
- Make it readable and natural, not spammy
- Avoid repeating the same phrase twice in the title
- Include product format when obvious: SVG, PNG, printable, template, wall art, invitation, clipart, bundle, instant download, etc.
- Use strong buyer terms only when natural: Cricut, Silhouette, T-shirts, stickers, mugs, wall art, decor, planner, invitation, printable

TAG RULES:
- Exactly 13 tags
- Each tag must be 20 characters or less
- Avoid generic standalone tags like "art", "design", "gift", "craft"
- Focus on niche + buyer intent + product format + use case
- Tags must not be duplicates or near-duplicates

KEYWORD RULES:
- primary must include exactly 3 useful keyword ideas
- longTail must include exactly 3 specific buyer search phrases
- buyerIntent must include exactly 3 phrases used by buyers ready to purchase
- Keywords can be longer than Etsy tags
- Do not leave keyword groups empty

TECHNICAL PRODUCT DETAILS:
- If the product is a digital image, printable, PNG, SVG, wall art, clipart, design file, template, or invitation, naturally mention relevant details:
  High-Resolution
  300 DPI
  Instant Download
  No physical item will be shipped
- Mention file types only when relevant: PNG, SVG, JPG, PDF
- Mention CMYK for printing only when it makes sense for printable/wall art products. Do not force CMYK into SVG-only craft files.

KEYWORD USAGE RULES:
- Use primary keywords naturally in the title when possible
- Use at least 3 tags naturally inside the description
- Include 1 long-tail keyword in the opening
- Avoid repeating the same keyword more than 2 times
- Never keyword stuff

DESCRIPTION RULES:
- Write like a successful Etsy seller, not AI
- Opening must describe a real use case: what the buyer will physically create
- Mention who this is for: Cricut users, Etsy sellers, small shop owners, dog lovers, brides, parents, teachers, DIY crafters, etc. when relevant
- Mention speed, ease, or result: in minutes, ready to use, no design needed, professional-looking results, saves time
- Focus on benefits, not just features
- Keep it scannable and clean
- Use plain text only
- Do not use markdown symbols like ** or ###
- Use line breaks between sections
- Do not write one long paragraph
- Avoid AI/generic phrases such as:
  "elevate your projects"
  "everything you need"
  "perfect for anything"
  "unlock your creativity"
  "transform your creativity"
  "bring joy"
  "looking for a fun way"
  "create stunning"

USE THIS EXACT DESCRIPTION STRUCTURE:

OPENING:
Write 2 short, high-converting sentences.
Speak directly to a specific buyer.
Clearly explain what they can create using this product.
Include 1 primary keyword and 1 long-tail keyword naturally.

WHAT YOU GET:
- Bullet 1 with a specific feature and buyer benefit
- Bullet 2 with a specific feature and buyer benefit
- Bullet 3 with a specific feature and buyer benefit
- Bullet 4 with a specific feature and buyer benefit

HOW TO USE:
- Step 1
- Step 2
- Step 3

PERFECT FOR:
- Specific use case 1
- Specific use case 2
- Specific use case 3

PLEASE NOTE:
- This is a digital download
- No physical item will be shipped
- Colors may vary due to screen settings

WHY BETTER / WHAT WAS WRONG RULES:
- whyBetter should include 3 clear seller-friendly reasons
- whatWasWrong should include 3 clear issues from the original input
- Be specific, not generic

RETURN JSON EXACTLY:
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

    data.whyBetter = data.whyBetter.slice(0, 4);
    data.whatWasWrong = data.whatWasWrong.slice(0, 4);

    const scoreData = calculateScore(data);
    data.score = scoreData.total;
    data.scoreBreakdown = scoreData.breakdown;
    data.suggestions = getSuggestions(scoreData.breakdown);

    res.json(data);
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({
      error: "Backend failed. Check your API key and terminal.",
    });
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

  // TITLE QUALITY / 30
  if (title.length >= 70 && title.length <= 140) breakdown.title += 10;
  else if (title.length >= 45 && title.length < 70) breakdown.title += 7;

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

  // TAG OPTIMIZATION / 25
  if (tags.length === 13) breakdown.tags += 10;
  else if (tags.length >= 10) breakdown.tags += 7;

  const validLengthTags = tags.filter((tag) => tag.length <= 20);
  breakdown.tags += Math.min(validLengthTags.length, 10);

  const uniqueTags = new Set(tags.map((tag) => tag.toLowerCase()));
  if (uniqueTags.size === tags.length) breakdown.tags += 5;

  // KEYWORD COVERAGE / 25
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

  // DESCRIPTION QUALITY / 20
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

  breakdown.title = Math.min(breakdown.title, 30);
  breakdown.tags = Math.min(breakdown.tags, 25);
  breakdown.keywords = Math.min(breakdown.keywords, 25);
  breakdown.description = Math.min(breakdown.description, 20);

  let total =
    breakdown.title +
    breakdown.tags +
    breakdown.keywords +
    breakdown.description;

  if (total < 55) total = 55;
  if (total > 98) total = 98;

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
    suggestions.push("Improve the description with clearer benefits, sections, and technical details like 300 DPI when relevant.");
  }

  if (!suggestions.length) {
    suggestions.push("This listing is well optimized. Test a second variation to compare buyer appeal.");
  }

  return suggestions;
}
