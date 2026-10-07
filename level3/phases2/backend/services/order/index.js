import express from "express";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello form Order service" });
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
