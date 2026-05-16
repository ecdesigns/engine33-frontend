import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, vibe = "General" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Please enter a title first.",
      });
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
`,
        },
      ],
    });

    const raw = completion.choices[0].message.content;

    let data = JSON.parse(raw);

    data.improvedTitle = String(data.improvedTitle || "")
      .trim()
      .slice(0, 140);

    if (!Array.isArray(data.tags)) data.tags = [];

    data.tags = data.tags
      .map((tag) => String(tag).trim().toLowerCase().slice(0, 20))
      .filter(Boolean);

    data.tags = [...new Set(data.tags)].slice(0, 13);

    data.keywords = normalizeKeywords(data.keywords);

    data.description = cleanDescription(data.description);

    return res.status(200).json(data);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Backend failed",
    });
  }
}