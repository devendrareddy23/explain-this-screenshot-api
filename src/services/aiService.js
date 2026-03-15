const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.analyzeImage = async (base64Image, mimeType = "image/png") => {
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Explain this screenshot clearly. Mention any visible errors, UI elements, charts, messages, code, or important details in simple language.",
          },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64Image}`,
          },
        ],
      },
    ],
  });

  return {
    explanation: response.output_text,
  };
};
