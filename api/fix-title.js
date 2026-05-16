export default async function handler(req, res) {
    // Allow POST only
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    try {
      const { title, vibe } = req.body;
  
      if (!title) {
        return res.status(400).json({
          error: "Title is required",
        });
      }
  
      const prompt = `
  You are a top Etsy SEO expert.
  
  Rewrite this Etsy title to improve:
  - SEO
  - buyer appeal
  - clarity
  - search intent
  
  STYLE/VIBE:
  ${vibe || "General"}
  
  CURRENT TITLE:
  ${title}
  
  Return ONLY the improved Etsy title.
  `;
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an Etsy SEO optimization expert.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 120,
        }),
      });
  
      const data = await response.json();
  
      const optimizedTitle =
        data.choices?.[0]?.message?.content || "No title generated.";
  
      return res.status(200).json({
        success: true,
        optimizedTitle,
      });
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        error: "Something went wrong.",
      });
    }
  }