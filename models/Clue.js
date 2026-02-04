const mongoose = require("mongoose");

const clueSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
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

module.exports = mongoose.model("Clue", clueSchema);
