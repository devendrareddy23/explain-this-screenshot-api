const cron = require("node-cron");
const AutoHuntProfile = require("../models/AutoHuntProfile");
const { runIndiaAutoHunt } = require("./indiaAutoHuntService");

let cronStarted = false;

const startAutoHuntCron = () => {
  if (cronStarted) {
    console.log("Auto Hunt cron already started.");
    return;
  }

  cronStarted = true;

  console.log("Starting India Auto Hunt cron...");

  cron.schedule("0 */3 * * *", async () => {
    console.log("Auto Hunt cron triggered:", new Date().toISOString());

    try {
      const activeProfiles = await AutoHuntProfile.find({ isActive: true });

      console.log(`Active profiles found: ${activeProfiles.length}`);

      for (const profile of activeProfiles) {
        try {
          console.log(`Running hunt for: ${profile.profileEmail}`);
          const savedJobs = await runIndiaAutoHunt(profile);
          console.log(
            `Auto Hunt finished for ${profile.profileEmail}. Saved/updated jobs: ${savedJobs.length}`
          );
        } catch (profileError) {
          console.error(
            `Auto Hunt failed for ${profile.profileEmail}:`,
            profileError.message
          );
        }
      }
    } catch (error) {
      console.error("Auto Hunt cron failed:", error.message);
    }
  });

  console.log("India Auto Hunt cron started. Schedule: every 3 hours.");
};

module.exports = {
  startAutoHuntCron,
};
