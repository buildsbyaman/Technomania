const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const {
  assignRandomQuestion,
  validateAnswer,
} = require("../utils/questionAssigner");
const { assignRandomClue } = require("../utils/clueAssigner");
const { getLocationBySlug } = require("../utils/locationMapper");

const requireAuth = async (req, res, next) => {
  if (!req.session.teamId) {
    return res.redirect("/login");
  }
  const team = await Team.findById(req.session.teamId);
  if (!team) {
    req.session.destroy();
    return res.redirect("/login");
  }

  if (team.status === "locked_out" && req.path !== "/locked_out") {
    return res.redirect("/locked_out");
  }

  req.team = team;
  next();
};

router.get("/", (req, res) => {
  res.redirect("/dashboard");
});

router.get("/login", (req, res) => {
  if (req.session.teamId) return res.redirect("/dashboard");
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  const { teamId, passcode } = req.body;
  try {
    const team = await Team.findOne({
      teamId: teamId.toUpperCase().trim(),
      passcode: passcode.trim(),
    });

    if (!team) {
      return res.render("login", { error: "Invalid Team ID or Passcode" });
    }

    if (team.status === "disqualified") {
      return res.render("login", { error: "This team has been disqualified." });
    }

    if (team.status === "completed") {
      req.session.teamId = team._id;
      return res.redirect("/complete");
    }

    req.session.teamId = team._id;
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Server Error" });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

router.get("/locked_out", requireAuth, async (req, res) => {
  const team = req.team;

  if (team.status !== "locked_out") {
    return res.redirect("/dashboard");
  }

  res.render("locked_out", { team });
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const team = req.team;

    if (team.status === "completed" || team.questionsAnswered >= 3) {
      return res.redirect("/complete");
    }

    const currentClue = team.assignedClues.find(
      (c) => c.round === team.currentRound,
    );

    const hasClue = !!currentClue;

    res.render("dashboard", {
      team,
      questionsAnswered: team.questionsAnswered,
      currentRound: team.currentRound,
      hasClue: hasClue,
      clue: currentClue?.clueData || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/start", requireAuth, async (req, res) => {
  try {
    const team = req.team;

    if (team.status === "locked_out") {
      return res.redirect("/locked_out");
    }

    if (team.questionsAnswered >= 3) {
      return res.redirect("/complete");
    }

    if (team.currentRound !== 1) {
      return res.render("info", {
        message:
          "You've already started! Check your dashboard for the next clue.",
        backLink: "/dashboard",
      });
    }

    const question = assignRandomQuestion(team, 1);
    await team.save();

    res.render("question-new", {
      team,
      question,
      round: 1,
      error: null,
      oneAttempt: true,
      locationSlug: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/location/:slug", requireAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const team = req.team;

    if (team.questionsAnswered >= 3) {
      return res.redirect("/complete");
    }

    const currentClue = team.assignedClues.find(
      (c) => c.round === team.currentRound,
    );

    if (!currentClue || currentClue.clueData.locationSlug !== slug) {
      return res.render("info", {
        message:
          "This is not your next location. Follow the clue on your dashboard!",
        backLink: "/dashboard",
      });
    }

    const assignedQuestion = team.assignedQuestions.find(
      (q) => q.round === team.currentRound,
    );

    if (assignedQuestion && assignedQuestion.attempted) {
      if (assignedQuestion.isCorrect) {
        return res.render("info", {
          message: "You've already answered this round's question correctly!",
          backLink: "/dashboard",
        });
      } else {
        return res.render("info", {
          message:
            "You've already used your one attempt for this question. Move on!",
          backLink: "/dashboard",
        });
      }
    }

    const question = assignRandomQuestion(team, team.currentRound);
    await team.save();

    res.render("question-new", {
      team,
      question,
      round: team.currentRound,
      error: null,
      oneAttempt: true,
      locationSlug: slug,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/submit-answer", requireAuth, async (req, res) => {
  try {
    const { answer, locationSlug } = req.body;
    const team = req.team;

    const assignedQuestion = team.assignedQuestions.find(
      (q) => q.round === team.currentRound,
    );

    if (!assignedQuestion) {
      return res.status(400).json({
        success: false,
        message: "No question assigned for the current round.",
      });
    }

    if (assignedQuestion.attempted) {
      return res.status(400).json({
        success: false,
        message: "You've already used your one attempt for this question!",
      });
    }

    assignedQuestion.attempted = true;
    assignedQuestion.givenAnswer = answer;
    assignedQuestion.answeredAt = new Date();

    const isCorrect = await validateAnswer(
      assignedQuestion.questionData,
      answer,
    );
    assignedQuestion.isCorrect = isCorrect;

    if (isCorrect) {
      team.questionsAnswered += 1;

      if (team.questionsAnswered >= 3) {
        team.status = "completed";
        team.completedAt = new Date();
        await team.save();

        return res.json({
          success: true,
          message:
            "Correct! You've completed all 3 questions. Thank you for participating!",
          redirect: "/complete",
        });
      }

      team.currentRound += 1;

      const nextClue = assignRandomClue(team, team.currentRound);
      await team.save();

      return res.json({
        success: true,
        message: `Correct! Moving to Round ${team.currentRound}. Check your dashboard for the next clue!`,
        redirect: "/dashboard",
      });
    } else {
      team.status = "locked_out";
      await team.save();

      return res.json({
        success: false,
        message: "Sorry, incorrect answer. Your team has been locked out.",
        canRetry: false,
        redirect: "/dashboard",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

router.get("/complete", requireAuth, async (req, res) => {
  const team = req.team;

  if (team.status !== "completed" && team.questionsAnswered < 3) {
    return res.redirect("/dashboard");
  }

  res.render("winner", { team });
});

module.exports = router;
