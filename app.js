import express from "express";
import dotenv from "dotenv";
import userRoutes from "./Routes/userRoutes.js";
import { connectDB } from "./config/db.js";

dotenv.config({
  path: ".env.local",
  override: true,
  quiet: true,
});

const app = express();
app.use(express.json());
await connectDB()

app.use("/user", userRoutes);

app.listen(process.env.PORT, () => {
  console.log(`App is running on port ${process.env.PORT}`);
});
