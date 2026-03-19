const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      trim: true,
    },
    externalId: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      default: "",
      trim: true,
    },
    salary: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicationDate: {
      type: String,
      default: "",
      trim: true,
    },
    descriptionSnippet: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ source: 1, externalId: 1 });
jobSchema.index({ url: 1 }, { unique: true });

module.exports = mongoose.model("Job", jobSchema);
