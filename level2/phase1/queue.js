import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis("redis://localhost:6379", {
  maxRetriesPreRequest: null,
});

const emailQueue = new Queue("emailQueue", { connection });

export default emailQueue;
