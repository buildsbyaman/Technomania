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

    const prompt = `You are a strict quiz answer validator. Determine if the user's answer is correct.

Question: "${question}"
Correct answers: ${correctAnswersList}
User's answer: "${userAnswer}"

The answer is CORRECT only if:
- It means EXACTLY the same thing as one of the correct answers
- Minor spelling variations are acceptable (e.g., "colour" vs "color")
- Case and formatting differences are acceptable

The answer is INCORRECT if:
- It's a different concept, even if related to the topic
- It's only partially correct
- It has extra information that changes the meaning
- It's too vague or generic
- It's the opposite of the correct answer

Respond with ONLY one word: CORRECT or INCORRECT`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a strict quiz grader. Only mark answers as CORRECT if they match the accepted answers exactly in meaning. Be strict.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.0,
      max_tokens: 10,
    });

    const result = response.choices[0].message.content.trim().toUpperCase();
    console.log(
      `LLM Validation - Question: "${question}", User: "${userAnswer}", Expected: [${correctAnswersList}], Result: ${result}`,
    );

    return result === "CORRECT";
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
