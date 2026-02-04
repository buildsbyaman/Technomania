const mongoose = require("mongoose");
const crypto = require("crypto");
const Question = require("./models/Question");
const Clue = require("./models/Clue");
const Team = require("./models/Team");
const { securityQuestions } = require("./questions");
const { treasureHuntClues } = require("./clues");
require("dotenv").config();

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/quizApp";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

async function seedTeams() {
  try {
    await Question.deleteMany({});
    await Clue.deleteMany({});
    await Team.deleteMany({});
    console.log("✅  Cleared existing questions, clues, and teams");

    const sampleTeams = [];
    for (let i = 1; i <= 100; i++) {
      sampleTeams.push({
        teamId: `TEAM${i.toString().padStart(3, "0")}`,
        teamName: `Team ${i}`,
        passcode: `PASS${i.toString().padStart(3, "0")}`,
      });
    }

    const insertedTeams = await Team.insertMany(sampleTeams);

    const allQuestions = [];
    let order = 1;

    securityQuestions.mcq.forEach((q) => {
      allQuestions.push({
        uuid: crypto.randomUUID(),
        round: 1,
        question: q.question,
        correctAnswer: Array.isArray(q.correctAnswer)
          ? q.correctAnswer[0]
          : q.correctAnswer,
        order: order++,
      });
    });

    securityQuestions.fillBlanks.forEach((q) => {
      allQuestions.push({
        uuid: crypto.randomUUID(),
        round: 1,
        question: q.question,
        correctAnswer: Array.isArray(q.correctAnswer)
          ? q.correctAnswer[0]
          : q.correctAnswer,
        order: order++,
      });
    });

    if (securityQuestions.truefalse) {
      securityQuestions.truefalse.forEach((q) => {
        allQuestions.push({
          uuid: crypto.randomUUID(),
          round: 1,
          question: q.question,
          correctAnswer: Array.isArray(q.correctAnswer)
            ? q.correctAnswer[0]
            : q.correctAnswer,
          order: order++,
        });
      });
    }

    const insertedQuestions = await Question.insertMany(allQuestions);
    
    const clueDocuments = [];
    let clueOrder = 1;

    treasureHuntClues.forEach((clue) => {
      clueDocuments.push({
        uuid: crypto.randomUUID(),
        question: clue.question,
        correctAnswer: clue.correctAnswer,
        order: clueOrder++,
      });
    });

    const insertedClues = await Clue.insertMany(clueDocuments);

    
    const uniqueLocations = [
      ...new Set(clueDocuments.map((c) => c.correctAnswer)),
    ];

    console.log(`✅ Created ${insertedTeams.length} teams`);
    console.log(`✅ Created ${insertedQuestions.length} total questions`);
    console.log(`   - MCQ: ${securityQuestions.mcq.length}`);
    console.log(`   - Fill Blanks: ${securityQuestions.fillBlanks.length}`);
    if (securityQuestions.truefalse) {
      console.log(`   - True/False: ${securityQuestions.truefalse.length}`);
    }
    console.log(`✅ Created ${insertedClues.length} treasure hunt clues`);
    console.log(`   - Unique locations: ${uniqueLocations.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
}

seedTeams();
