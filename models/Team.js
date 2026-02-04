const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  teamName: {
    type: String,
    required: true,
  },
  passcode: {
    type: String,
    required: true,
  },
  currentRound: {
    type: Number,
    default: 1,
    max: 3, 
  },
  status: {
    type: String,
    enum: ["active", "completed", "disqualified", "locked_out"],
    default: "active",
  },
  
  assignedQuestions: [
    {
      round: Number,
      questionData: mongoose.Schema.Types.Mixed,
      attempted: {
        type: Boolean,
        default: false,
      },
      isCorrect: {
        type: Boolean,
        default: false,
      },
      givenAnswer: String,
      answeredAt: Date,
    },
  ],
  
  assignedClues: [
    {
      round: Number,
      clueData: mongoose.Schema.Types.Mixed,
      assignedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
      round: Number,
      answer: String,
      isCorrect: Boolean,
      answeredAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  questionsAnswered: {
    type: Number,
    default: 0,
    max: 3, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
});

module.exports = mongoose.model("Team", teamSchema);
