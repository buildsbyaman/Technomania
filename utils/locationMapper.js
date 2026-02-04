const { treasureHuntClues } = require("../clues");


function getUniqueLocations() {
  const locationMap = new Map();
  const locations = [];

  treasureHuntClues.forEach((clue) => {
    const location = clue.correctAnswer.trim();
    const slug = location
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    if (!locationMap.has(slug)) {
      locationMap.set(slug, {
        name: location,
        slug: slug,
        clues: [],
      });
      locations.push({
        name: location,
        slug: slug,
      });
    }

    locationMap.get(slug).clues.push(clue);
  });

  return {
    locations,
    locationMap,
  };
}


function getQRUrls(baseUrl = "http://localhost:3000") {
  const { locations } = getUniqueLocations();
  return locations.map((loc) => ({
    location: loc.name,
    url: `${baseUrl}/location/${loc.slug}`,
    slug: loc.slug,
  }));
}


function getLocationBySlug(slug) {
  const { locationMap } = getUniqueLocations();
  return locationMap.get(slug);
}

module.exports = {
  getUniqueLocations,
  getQRUrls,
  getLocationBySlug,
};
