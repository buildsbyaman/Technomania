const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const Team = require("../models/Team");
const Question = require("../models/Question");
const { requireAuth } = require("../middleware/adminAuth");
const { body, validationResult } = require("express-validator");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleString();
};

router.get("/login", (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin/login", { error: null });
});

router.post(
  "/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("admin/login", { error: errors.array()[0].msg });
    }

    try {
      const { username, password } = req.body;
      console.log("Login attempt:", { username, password: "***" });

      const admin = await Admin.findOne({ username });
      console.log("Admin found:", admin ? "Yes" : "No");

      if (!admin || admin.password !== password) {
        console.log("Login failed: Invalid credentials");
        return res.render("admin/login", {
          error: "Invalid username or password",
        });
      }

      req.session.adminId = admin._id;
      console.log("Session set:", req.session.adminId);

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.render("admin/login", { error: "Session error" });
        }
        console.log("Session saved, redirecting...");
        res.redirect("/admin/dashboard");
      });
    } catch (error) {
      console.error("Login error:", error);
      res.render("admin/login", { error: "Server error" });
    }
  },
);

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const completedTeams = await Team.countDocuments({ status: "completed" });
    const disqualifiedTeams = await Team.countDocuments({
      status: "disqualified",
    });
    const lockedOutTeams = await Team.countDocuments({ status: "locked_out" });

    const teams = await Team.find().sort({
      status: 1,
      currentRound: -1,
      updatedAt: 1,
    });
    const leaderboard = await Team.find({}).lean();
    leaderboard.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return -1;
      if (b.status === "completed" && a.status !== "completed") return 1;
      if (a.status === "completed" && b.status === "completed") {
        return new Date(a.completedAt) - new Date(b.completedAt);
      }
      if (b.currentRound !== a.currentRound) {
        return b.currentRound - a.currentRound;
      }
      return new Date(a.updatedAt) - new Date(b.updatedAt);
    });

    res.render("admin/dashboard", {
      stats: {
        totalTeams,
        completedTeams,
        disqualifiedTeams,
        lockedOutTeams,
      },
      leaderboard: leaderboard,
      formatDate,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Error loading dashboard");
  }
});

router.get("/teams/:id", requireAuth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).send("Team not found");
    }

    res.render("admin/team-detail", { team, formatDate });
  } catch (error) {
    console.error("Team detail error:", error);
    res.status(500).send("Error loading team");
  }
});

router.post("/teams/:id/edit", requireAuth, async (req, res) => {
  try {
    const { teamName, passcode } = req.body;
    await Team.findByIdAndUpdate(req.params.id, { teamName, passcode });
    res.redirect(`/admin/teams/${req.params.id}`);
  } catch (error) {
    console.error("Team edit error:", error);
    res.status(500).send("Error updating team");
  }
});

router.post("/teams/:id/approve-answer", requireAuth, async (req, res) => {
  try {
    const { round } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).send("Team not found");
    }

    const question = team.assignedQuestions.find(
      (q) => q.round === parseInt(round),
    );

    if (!question) {
      return res.status(404).send("Question not found");
    }

    question.isCorrect = true;

    const wasLocked = team.status === "locked_out";
    const alreadyCounted =
      team.assignedQuestions.filter(
        (q) => q.round < parseInt(round) && q.isCorrect,
      ).length >= parseInt(round);

    if (wasLocked) {
      team.status = "active";
    }

    if (!alreadyCounted) {
      team.questionsAnswered += 1;
    }

    if (team.questionsAnswered < 3 && team.currentRound === parseInt(round)) {
      team.currentRound += 1;

      const { assignRandomClue } = require("../utils/clueAssigner");
      assignRandomClue(team, team.currentRound);
    } else if (team.questionsAnswered >= 3) {
      team.status = "completed";
      if (!team.completedAt) {
        team.completedAt = new Date();
      }
    }

    await team.save();
    res.redirect(`/admin/teams/${req.params.id}`);
  } catch (error) {
    console.error("Approve answer error:", error);
    res.status(500).send("Error approving answer");
  }
});

router.post("/teams/:id/delete", requireAuth, async (req, res) => {
  try {
    await Question.deleteMany({ teamId: req.params.id });
    await Team.findByIdAndDelete(req.params.id);
    res.redirect("/admin/teams");
  } catch (error) {
    console.error("Team delete error:", error);
    res.status(500).send("Error deleting team");
  }
});

module.exports = router;
