const OpenAI = require("openai");
const dotenv = require('dotenv');

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

exports.getAIResponse = async (prompt, userMessage, conversationHistory, options) => {
    try {
        const { timeout = 900.0, serviceTier = "default", model = "o3-mini" } = options;
        const lastResponseId = conversationHistory && conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].externalResponseId : null;
        
        const response = await client.responses.create({
            model,
            previous_response_id: lastResponseId,
            input: lastResponseId 
                ? [] // Skip prompt and conversationHistory if lastResponseId exists
                : [
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