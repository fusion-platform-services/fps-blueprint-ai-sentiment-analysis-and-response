const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

exports.getAIResponse = async (prompt, userMessage, options = {}) => {
    try {
        const { timeout = 500.0, serviceTier = "default", model = "o3-mini" } = options;
        
        const response = await client.responses.create({
            model,
            input: [
                    { role: "system", content: prompt },
                    { role: "user", content: userMessage ? userMessage : '' },
                ],
            service_tier: serviceTier,
        });

        return response;
    } catch (error) {
        console.error("OpenAI API response error:", error);
        return 'AI - Generate response failed', error;
    }
};