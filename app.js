import express from "express";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { checkAuth } from "./middlewares/authMiddleware.js";
import exchangeRoutes from "./routes/exchangeRoutes.js"
import matchRoutes from "./routes/matchRoutes.js"


dotenv.config({
  path: ".env.local",
  override: true,
  quiet: true,
});

await connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(
  cors({
    origin: process.env.FRONTEND_ENDPOINT,
    credentials: true,
  }),
);

app.use("/user", userRoutes);
app.use("/exchange", checkAuth, exchangeRoutes)
app.use("/match", checkAuth, matchRoutes)

app.listen(process.env.PORT, () => {
  console.log(`App is running on port ${process.env.PORT}`);
});
