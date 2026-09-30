import express from "express";
import "dotenv/config";

const app = express();

const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.status(200).json({
    message: `Hello from ${process.env.SERVER_NAME}`,
    port: PORT,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
