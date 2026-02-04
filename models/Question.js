const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  round: {
    type: Number,
    required: false,
    min: 1,
    max: 5,
  },
  question: {
    type: String,
    required: true,
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("Question", questionSchema);
