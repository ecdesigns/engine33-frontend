export default async function handler(req, res) {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Method not allowed",
        });
      }
  
      const { title, vibe } = req.body;
  
      console.log("REQUEST:", title, vibe);
  
      return res.status(200).json({
        improvedTitle: `${title} | Optimized Etsy Title`,
        score: 82,
  
        tags: [
          "dog svg",
          "pet svg",
          "cute dog png",
          "dog lover gift",
          "puppy clipart",
          "animal svg",
          "etsy dog file",
          "pet lover png",
          "dog mom gift",
          "cricut dog svg",
          "funny dog art",
          "dog design",
          "digital download",
        ],
  
        keywords: {
          primary: ["dog svg", "pet png"],
          longTail: ["cute dog svg for cricut"],
          buyerIntent: ["dog lover gift"],
        },
  
        description:
          "This optimized Etsy listing is designed to improve click-through rate and search visibility.",
  
        whyBetter: [
          "Better keyword placement",
          "Improved buyer intent",
          "More searchable structure",
        ],
  
        whatWasWrong: [
          "Original title too short",
          "Missing searchable phrases",
        ],
  
        suggestions: [
          "Add seasonal keywords during holidays",
        ],
  
        missedOpportunities: [
          {
            keyword: "dog mom svg",
            reason: "High search potential",
            impact: "Could improve visibility",
          },
        ],
      });
    } catch (err) {
      console.error(err);
  
      return res.status(500).json({
        error: "Server crashed",
      });
    }
  }