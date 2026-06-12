import env from "./config/env.js";
import express from "express";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { checkAuth } from "./middlewares/authMiddleware.js";
import exchangeRoutes from "./routes/exchangeRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { initializeSocket } from "./socket/index.js";
import { socketAuth } from "./socket/middlewares/socketMiddleware.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js"


await connectDB();

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_ENDPOINT,
    credentials: true,
  },
});

io.use(socketAuth);
initializeSocket(io);

app.use(express.json());
app.use(cookieParser(env.SESSION_SECRET));
app.use(
  cors({
    origin: env.FRONTEND_ENDPOINT,
    credentials: true,
  }),
);

app.use("/user", userRoutes);
app.use("/exchange", checkAuth, exchangeRoutes);
app.use("/match", checkAuth, matchRoutes);
app.use("/chat", checkAuth, chatRoutes);
app.use("/notification", checkAuth, notificationRoutes);
app.use("/reviews",checkAuth, reviewRoutes)

server.listen(env.PORT, () => {
  console.log(`App is running on port ${env.PORT}`);
});
