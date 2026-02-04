const { treasureHuntClues } = require("../clues");


function assignRandomClue(team, round, locationSlug = null) {
  
  const existing = team.assignedClues.find((c) => c.round === round);
  if (existing) {
    return existing.clueData;
  }

  
  const assignedAnswers = team.assignedClues.map(
    (c) => c.clueData.correctAnswer,
  );

  
  let availableClues = treasureHuntClues.filter(
    (clue) => !assignedAnswers.includes(clue.correctAnswer),
  );

  
  if (locationSlug) {
    const locationClues = availableClues.filter((clue) => {
      const clueSlug = clue.correctAnswer
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      return clueSlug === locationSlug;
    });

    if (locationClues.length > 0) {
      availableClues = locationClues;
    }
  }

  if (availableClues.length === 0) {
    throw new Error("No more clues available");
  }

  
  const seed = parseInt(team.teamId.replace(/\D/g, ""), 10) + round * 500;
  const index = seed % availableClues.length;
  const selectedClue = availableClues[index];

  
  const slug = selectedClue.correctAnswer
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  
  const clueData = {
    question: selectedClue.question,
    correctAnswer: selectedClue.correctAnswer,
    locationSlug: slug,
  };

  team.assignedClues.push({
    round,
    clueData,
  });

  return clueData;
}

module.exports = {
  assignRandomClue,
};
