const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Quiz App",
  },
});

async function validateAnswerWithLLM(question, userAnswer, correctAnswers) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.warn(
        "OPENROUTER_API_KEY not set. Falling back to exact string matching.",
      );
      return fallbackValidation(userAnswer, correctAnswers);
    }

    const correctAnswersList = correctAnswers.join(", ");

    const prompt = `You are validating quiz answers. Determine if the user's answer is semantically correct.

Question: "${question}"
Accepted answers: ${correctAnswersList}
User's answer: "${userAnswer}"

The user's answer is CORRECT if it means the same thing as any accepted answer, even with:
- Different formatting (hyphens, spaces, capitalization)
- Abbreviations (XSS = Cross-Site Scripting)
- Minor spelling differences
- Extra descriptive words that don't change the core meaning

Reply with exactly one word: CORRECT or INCORRECT`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 50,
    });

    const result = response.choices[0].message.content.trim().toUpperCase();

    return result === "CORRECT" || result.includes("CORRECT");
  } catch (error) {
    console.error("Error validating answer with LLM:", error.message);
    return fallbackValidation(userAnswer, correctAnswers);
  }
}

function fallbackValidation(userAnswer, correctAnswers) {
  const normalized = userAnswer.trim().toLowerCase();
  return correctAnswers.some((ans) => ans.toLowerCase().trim() === normalized);
}

module.exports = {
  validateAnswerWithLLM,
};
