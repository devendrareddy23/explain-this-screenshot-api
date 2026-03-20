const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    const db = mongoose.connection.db;
    const collection = db.collection("jobs");

    const indexesBefore = await collection.indexes();
    console.log("\nIndexes before:");
    console.log(JSON.stringify(indexesBefore, null, 2));

    const hasOldIndex = indexesBefore.some(
      (index) => index.name === "jobId_1_profileEmail_1"
    );

    if (hasOldIndex) {
      await collection.dropIndex("jobId_1_profileEmail_1");
      console.log("\nDropped old index: jobId_1_profileEmail_1");
    } else {
      console.log("\nOld index not found: jobId_1_profileEmail_1");
    }

    const deleteResult = await collection.deleteMany({
      $or: [
        { jobId: { $exists: false } },
        { jobId: "" },
        { profileEmail: { $exists: false } },
        { profileEmail: "" }
      ]
    });

    console.log(`\nDeleted bad blank job docs: ${deleteResult.deletedCount}`);

    await collection.createIndex(
      { jobId: 1, profileEmail: 1 },
      {
        unique: true,
        partialFilterExpression: {
          jobId: { $gt: "" },
          profileEmail: { $gt: "" }
        }
      }
    );

    console.log("\nCreated safe partial unique index on { jobId, profileEmail }");

    const indexesFinal = await collection.indexes();
    console.log("\nFinal indexes:");
    console.log(JSON.stringify(indexesFinal, null, 2));

    await mongoose.disconnect();
    console.log("\nDone");
  } catch (error) {
    console.error("\nFailed:", error.message);
    process.exit(1);
  }
}

run();
