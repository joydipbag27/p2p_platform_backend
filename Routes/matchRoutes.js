import express from "express";
import {
  confirmMatch,
  createMatch,
  rejectMatch,
  viewMatch,
} from "../controllers/matchController.js";

const router = express.Router();

router.post("/accept/:requestId", createMatch);

router.get("/", viewMatch);

router.patch("/confirm", confirmMatch);

router.patch("/reject", rejectMatch);

export default router;
