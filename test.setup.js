const dotenv = require("dotenv");
const path = require("path");

[("./.env", "./.env.test")].forEach(path => {
  dotenv.config({ path });
});

process.env.GITHUB_WORKSPACE = path.resolve(__dirname, "./test/example");
