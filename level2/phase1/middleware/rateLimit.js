import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL);
const rateLimiter = async (req, res, next) => {
  try {
    const ip = req.ip;
    const key = `rate_limit:${ip}`;
    const requests = await redis.incr(key);
    if ((requests = 1)) {
      await redis.expire(key, 60);
    }
    if (requests > 5) {
      return res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    }
    next();
  } catch (error) {
    console.log(error);
  }
};

export default rateLimiter;
