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
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Please enter a title first." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
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
          - Use strong action-based language (create, design, build, sell, customize)
- Focus on saving time or improving results for the buyer
- Avoid vague emotional phrases like "inspire creativity"
Your goal is to create an Etsy listing that RANKS and CONVERTS.

Optimize this Etsy listing title:
"${title}"

Return:
- improved Etsy title
- realistic SEO score
- 13 Etsy tags
- keyword groups
- high-converting Etsy description
- why better
- what was wrong

TITLE RULES:
- Max 140 characters
- Front-load high-intent keywords
- Make it readable, not spammy
- Combine SEO + clarity + buyer appeal

TAG RULES:
- Exactly 13 tags
- Each tag must be 20 characters or less
- Avoid generic tags like "art", "design", "gift", "craft"
- Focus on niche + buyer intent

KEYWORD RULES:
- primary = 3 main search terms
- longTail = 3 specific phrases buyers search
- buyerIntent = 3 phrases buyers use when ready to buy

SEO SCORE RULES:
- Score must be between 70 and 98
- Never return 0
- Base score on keyword strength, clarity, buyer intent, and product format clarity

KEYWORD USAGE RULES:
- Use primary keywords naturally in the title
- Use at least 3 tags naturally inside the description
- Include 1 long-tail keyword in the opening
- Do NOT keyword stuff
- Avoid repeating the same keyword more than 2 times
- Must sound human, not robotic

DESCRIPTION RULES:
- Write like a high-converting Etsy seller
- Opening must describe a REAL use case (what the buyer will physically create)
- Mention WHO this is for (e.g. Cricut users, Etsy sellers, small shop owners)
- Mention speed, ease, or result (e.g. "in minutes", "ready to use", "no design needed")
- Avoid vague adjectives like "stunning", "versatile", "unique" unless paired with a specific use
- Focus on benefits, not just features
- Avoid generic phrases like "elevate your projects", "everything you need", or "perfect for anything"
- Make the buyer feel confident and ready to purchase
- Keep it scannable and clean
- Use plain text only
- Do not use markdown symbols like ** or ###
- Use line breaks between sections
- Do not write one long paragraph
- Target a specific buyer (not everyone)
- Make the product feel like a smart purchase decision
- Highlight what makes this better than similar Etsy listings
- Use strong action verbs (create, design, sell, customize)
- Avoid generic phrases like "transform your creativity"

USE THIS EXACT DESCRIPTION STRUCTURE:

OPENING:
Write 2 short, high-converting sentences.

- Speak directly to a specific buyer (e.g. Cricut users, dog lovers, small shop owners)
- Clearly explain what they can create using this product
- Avoid generic phrases like "unlock your creativity", "elevate", or "perfect for"
- Focus on real use cases (shirts, decals, mugs, etc.)
- Include 1 primary keyword and 1 long-tail keyword naturally
- Make it sound like a real Etsy seller, not AI
- Include 1 primary keyword and 1 long-tail keyword naturally
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

TONE:
- Natural
- Confident
- Slightly persuasive but not pushy
- Written like a real successful Etsy shop

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

    data.score = calculateScore(data);
    if (!data.score || data.score < 70) data.score = 82;
    if (data.score > 98) data.score = 98;

    if (!Array.isArray(data.tags)) data.tags = [];
    data.tags = data.tags
      .map((tag) => String(tag).trim().slice(0, 20))
      .filter(Boolean)
      .slice(0, 13);

    while (data.tags.length < 13) {
      data.tags.push(`etsy tag ${data.tags.length + 1}`);
    }

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


function calculateScore(data) {
  let score = 0;

  const title = (data.improvedTitle || "").toLowerCase();
  const tags = data.tags || [];
  const primary = data.keywords?.primary || [];
  const description = (data.description || "").toLowerCase();

  // ---------------------------
  // TITLE SCORE (30)
  // ---------------------------
  if (title.length >= 90 && title.length <= 140) score += 10;

  let keywordMatches = 0;
  primary.forEach(k => {
    if (title.includes(k.toLowerCase())) keywordMatches++;
  });
  score += Math.min(keywordMatches * 5, 15);

  if (title.includes("download") || title.includes("svg") || title.includes("png")) {
    score += 5;
  }

  // ---------------------------
  // TAG SCORE (25)
  // ---------------------------
  if (tags.length === 13) score += 10;

  const shortTags = tags.filter(t => t.length <= 20);
  score += Math.min(shortTags.length, 10);

  const uniqueTags = new Set(tags);
  if (uniqueTags.size === tags.length) score += 5;

  // ---------------------------
  // KEYWORD MATCH (25)
  // ---------------------------
  let keywordCoverage = 0;
  primary.forEach(k => {
    if (description.includes(k.toLowerCase())) keywordCoverage++;
  });
  score += Math.min(keywordCoverage * 5, 15);

  if (data.keywords?.longTail?.length >= 2) score += 5;
  if (data.keywords?.buyerIntent?.length >= 2) score += 5;

  // ---------------------------
  // DESCRIPTION QUALITY (20)
  // ---------------------------
  if (description.includes("what you get")) score += 5;
  if (description.includes("how to use")) score += 5;
  if (description.includes("perfect for")) score += 5;
  if (description.includes("please note")) score += 5;

  // ---------------------------
  // FINAL CLAMP
  // ---------------------------
  if (score < 70) score = 70 + Math.floor(Math.random() * 5);
  if (score > 98) score = 98;

  return score;
}