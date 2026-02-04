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

    const normalizedUser = userAnswer.trim().toLowerCase();
    const hasPlural = correctAnswers.some((ans) => {
      const normalizedAns = ans.trim().toLowerCase();
      return (
        normalizedUser === normalizedAns + "s" ||
        normalizedUser + "s" === normalizedAns
      );
    });

    if (hasPlural) {
      console.log("Plural/singular variation accepted");
      return true;
    }

    const correctAnswersList = correctAnswers.join(" OR ");

    const prompt = `Task: Compare user's answer with correct answer(s) for a quiz question.

Question: ${question}
Correct Answer(s): ${correctAnswersList}
User Submitted: ${userAnswer}

Mark YES if the user's answer is essentially correct. Allow these variations:
1. Plural/singular (e.g., "edge" = "edges")
2. Adding common descriptive words (e.g., "Brute Force" = "brute force attack", "DFS" = "DFS algorithm")
3. Case differences (e.g., "HTTP" = "http")
4. Spelling variations (e.g., "color" = "colour")
5. Abbreviations (e.g., "XSS" = "Cross-Site Scripting")
6. Articles/determiners (e.g., "the internet" = "internet")
7. Word order that doesn't change meaning

Mark NO only if:
1. Fundamentally different concept (e.g., "Paris" vs "France")
2. Wrong specific term (e.g., "HTTP" vs "HTTPS")
3. Random/gibberish text
4. Opposite meaning
5. Missing critical part of multi-part answer

Examples that should be YES:
- Correct: "Brute Force", User: "brute force attack" → YES (adds descriptive word)
- Correct: "Edge", User: "edges" → YES (plural)
- Correct: "DFS", User: "Depth First Search" → YES (abbreviation)
- Correct: "SQL Injection", User: "SQLi" → YES (abbreviation)
- Correct: "Stack", User: "stack data structure" → YES (adds descriptive words)

Examples that should be NO:
- Correct: "Paris", User: "France" → NO (different concept)
- Correct: "HTTP", User: "HTTPS" → NO (different protocol)
- Correct: "JavaScript", User: "Java" → NO (different language)
- Correct: "Binary Tree", User: "tree" → NO (too vague, missing key part)

Reply ONLY: YES or NO`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a fair quiz grader. Accept answers that are essentially correct with minor variations or added descriptive words. Only reject truly wrong answers.",
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
