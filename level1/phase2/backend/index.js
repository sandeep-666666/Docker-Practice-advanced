import express from "express";
import "dotenv/config";

const app = express();

const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send("Server is running!- this is phase 2 of docker learning");
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
