import express from "express";
import connectDb from "./lib/db.js";
import User from "./model/user.model.js";
import Redis from "ioredis";
import rateLimiter from "./middleware/rateLimit.js";
import dotenv from "dotenv";
import sendEmail from "./lib/sendEmail.js";
import emailQueue from "./queue.js";
dotenv.config();
const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());

export const redis = new Redis(process.env.REDIS_URL);

app.get("/get-with-redis", async (req, ree) => {
  try {
    const cached = await redis.get("user:all"); //first we check with redis
    if (cached) {
      const user = JSON.parse(cached); //we need to convert the data in json from the string format
      return res.status(200).json({
        success: true,
        message: "Cache hit",
        user,
      });
    }
    const user = await User.find({});
    await redis.set("user:all", JSON.stringify(user)); // we need to store sting or buffer data in redis
    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello form redis" });
});

app.post("/create", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    await redis.del("user:all");
    const user = await User.create({ name, email, password });
    // await sendEmail();
    await emailQueue.add("send-email", { email });
    return res.status(201).json({
      success: true,
      message: "User Created",
      user,
    });
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/get", rateLimiter, async (req, res) => {
  try {
    const user = await User.find({});
    return res.status(200).json(user);
  } catch (error) {
    console.log(error.message);
  }
});

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`otp:${email}`, otp, "EX", "30");

  return res.status(200).json({
    success: true,
    message: "OTP sent succefully and will expire after 30 seconds",
    otp,
  });
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const cashedOtp = await redis.get(`otp:${email}`, email);
  if (!cashedOtp) {
    return res.status(400).json({
      success: false,
      message: "OTP not found or has been expired",
    });
  }
  if (cashedOtp != otp) {
    return res.status(403).json({
      success: false,
      message: "Incorrect OTP",
    });
  }

  await redis.del(`otp:${email}`);

  return res.status(200).json({
    success: true,
    message: "OTP verified",
  });
});

//without redis- 64ms
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
  connectDb();
});
