// Vercel serverless entry point for the existing Express API.
// Keep business logic in ../server.js so local/Render deployments remain compatible.
const app = require("../server");

module.exports = app;
