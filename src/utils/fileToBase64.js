const fs = require("fs");

module.exports = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
};
