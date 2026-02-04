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

    if (!userAnswer || userAnswer.trim().length === 0) {
      console.log("Empty answer rejected");
      return false;
    }

    const exactMatch = fallbackValidation(userAnswer, correctAnswers);
    if (exactMatch) {
      console.log("Exact match found - accepted without LLM");
      return true;
    }

    const correctAnswersList = correctAnswers.join(" OR ");

    const prompt = `Task: Compare user's answer with correct answer(s) for a quiz question.

Question: ${question}
Correct Answer(s): ${correctAnswersList}
User Submitted: ${userAnswer}

Rules for marking YES (answer is correct):
1. The meaning is IDENTICAL to one of the correct answers
2. Only spelling variations allowed (e.g., "color" vs "colour")
3. Abbreviations that mean the exact same thing (e.g., "XSS" = "Cross-Site Scripting")

Rules for marking NO (answer is wrong):
1. Different concept, even if related
2. Partially correct but missing key information
3. Contains correct answer plus wrong information
4. Opposite meaning
5. Too vague or generic
6. Random text, gibberish, or unrelated content
7. ANY doubt whatsoever

Examples that should be NO:
- Correct: "Paris", User: "France" → NO
- Correct: "HTTP", User: "HTTPS" → NO  
- Correct: "2", User: "two" → NO (unless question accepts number words)
- Correct: "Array", User: "List" → NO
- Correct: "JavaScript", User: "Java" → NO
- Correct: "Paris", User: "asdf" → NO
- Correct: "Paris", User: "city" → NO

Reply ONLY with: YES or NO`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a strict quiz grader. Default to NO unless you are 100% certain the meanings are identical. Random or gibberish text is always NO.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.0,
      max_tokens: 3,
    });

    const result = response.choices[0].message.content.trim().toUpperCase();

    if (result !== "YES" && result !== "NO") {
      console.error(`Unexpected LLM response: "${result}" - defaulting to NO`);
      return false;
    }

    const isCorrect = result === "YES";

    console.log(
      `LLM Validation - Q: "${question}" | User: "${userAnswer}" | Expected: [${correctAnswersList}] | LLM: ${result} | Result: ${isCorrect ? "✓ CORRECT" : "✗ INCORRECT"}`,
    );

    return isCorrect;
  } catch (error) {
    console.error("Error validating answer with LLM:", error.message);
    console.log("Falling back to exact match only");
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
