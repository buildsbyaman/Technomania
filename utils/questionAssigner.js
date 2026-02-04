const { securityQuestions } = require("../questions");
const { validateAnswerWithLLM } = require("./llmValidator");

function getAllQuestions() {
  const questions = [...securityQuestions.mcq, ...securityQuestions.fillBlanks];

  if (securityQuestions.truefalse) {
    questions.push(...securityQuestions.truefalse);
  }

  return questions;
}

function assignRandomQuestion(team, round) {
  const existing = team.assignedQuestions.find((q) => q.round === round);
  if (existing) {
    return existing.questionData;
  }

  const allQuestions = getAllQuestions();

  const assignedIds = team.assignedQuestions.map(
    (q) => q.questionData?.id || q.questionData,
  );

  const availableQuestions = allQuestions.filter(
    (q) => !assignedIds.includes(q.id),
  );

  if (availableQuestions.length === 0) {
    throw new Error("No more questions available");
  }

  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  const selectedQuestion = availableQuestions[randomIndex];

  team.assignedQuestions.push({
    round,
    questionData: selectedQuestion,
    attempted: false,
    isCorrect: false,
  });

  return selectedQuestion;
}

async function validateAnswer(question, userAnswer) {
  if (question.type === "mcq" || question.type === "truefalse") {
    return (
      userAnswer.trim().toLowerCase() ===
      question.correctAnswer.toString().toLowerCase()
    );
  } else if (question.type === "fill") {
    return await validateAnswerWithLLM(
      question.question,
      userAnswer,
      question.correctAnswer,
    );
  } else if (question.type === "matching") {
    try {
      const userMatches =
        typeof userAnswer === "string" ? JSON.parse(userAnswer) : userAnswer;
      return (
        JSON.stringify(userMatches) === JSON.stringify(question.correctMatches)
      );
    } catch {
      return false;
    }
  }
  return false;
}

module.exports = {
  getAllQuestions,
  assignRandomQuestion,
  validateAnswer,
};
