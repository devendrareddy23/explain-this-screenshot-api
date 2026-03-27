import OpenAI from "openai";

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

export const findAmazonProducts = async (keyword) => {
  const client = getOpenAIClient();

  if (!client) {
    return {
      success: false,
      message: "OPENAI_API_KEY is missing in environment variables",
      products: [],
    };
  }

  const prompt = `
You are an expert Amazon FBA product research analyst.

Find 3 potential products for keyword: "${keyword}".

For each product return:
- name
- demandScore (0-100)
- competitionScore (0-100)
- estimatedProfit
- riskLevel (Low, Medium, High)
- shortReason

Return valid JSON only in this format:
{
  "products": [
    {
      "name": "Product name",
      "demandScore": 80,
      "competitionScore": 45,
      "estimatedProfit": "$8/unit",
      "riskLevel": "Medium",
      "shortReason": "Why this product looks promising"
    }
  ]
}
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      }
    ],
    temperature: 0.7,
  });

  const text = response.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(text);

    return {
      success: true,
      ...parsed,
    };
  } catch (error) {
    return {
      success: false,
      message: "AI response parsing failed",
      raw: text,
      products: [],
    };
  }
};
