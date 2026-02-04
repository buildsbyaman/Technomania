const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const { treasureHuntClues } = require("../clues");

const requireAuth = async (req, res, next) => {
  if (!req.session.teamId) {
    return res.redirect("/login");
  }
  const team = await Team.findById(req.session.teamId);
  if (!team) {
    req.session.destroy();
    return res.redirect("/login");
  }
  req.team = team;
  next();
};


router.get("/clue", requireAuth, async (req, res) => {
  try {
    const team = req.team;

    if (team.status === "completed") {
      return res.render("winner", { team });
    }

    if (team.status === "disqualified" || team.status === "locked_out") {
      return res.render("locked_out", { team });
    }

    
    const clues = treasureHuntClues.filter(
      (q) => q.round === team.currentRound,
    );

    if (clues.length === 0) {
      return res.render("info", {
        message: "All rounds completed!",
        backLink: "/dashboard",
      });
    }

    
    const randomClue = clues[Math.floor(Math.random() * clues.length)];

    res.render("treasure-clue", {
      team,
      clue: randomClue,
      error: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


router.post("/submit-answer", requireAuth, async (req, res) => {
  try {
    const { answer, round } = req.body;
    const team = req.team;

    if (team.currentRound !== parseInt(round)) {
      return res.status(400).json({
        success: false,
        message: "Invalid round",
      });
    }

    
    const clues = treasureHuntClues.filter(
      (q) => q.round === team.currentRound,
    );

    if (clues.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid round",
      });
    }

    
    const isCorrect = clues.some(
      (clue) =>
        clue.correctAnswer.toLowerCase().trim() === answer.toLowerCase().trim(),
    );

    if (!isCorrect) {
      return res.json({
        success: false,
        message: "Incorrect answer. Try again!",
      });
    }

    
    team.currentRound += 1;

    if (team.currentRound > 2) {
      team.status = "completed";
      team.completedAt = new Date();
    }

    await team.save();

    res.json({
      success: true,
      message: "Correct! Moving to next round.",
      nextRound: team.currentRound,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

module.exports = router;
