require("dotenv").config();
const { getQRUrls } = require("./utils/locationMapper");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log("TREASURE HUNT QR CODE URL LIST");
console.log("=".repeat(70));
console.log(`Base URL: ${BASE_URL}`);
console.log("=".repeat(70));

const urls = getQRUrls(BASE_URL);

console.log(`\nTotal unique locations: ${urls.length}\n`);

urls.forEach((entry, index) => {
  console.log(`${index + 1}. ${entry.location}`);
  console.log(`    URL : ${entry.url}`);
  console.log("   " + "-".repeat(65));
});

console.log("\n" + "=".repeat(70));

const fs = require("fs");
const jsonOutput = {
  baseUrl: BASE_URL,
  generatedAt: new Date().toISOString(),
  totalLocations: urls.length,
  urls: urls,
};

const outputPath = "./qr-urls.json";
fs.writeFileSync(outputPath, JSON.stringify(jsonOutput, null, 2));
console.log(`\n✅ JSON output saved to: ${outputPath}`);
console.log("   (Use this for automated QR generation tools)\n");
