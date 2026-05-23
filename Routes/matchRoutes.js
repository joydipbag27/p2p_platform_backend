import express from "express";
import {
  confirmMatch,
  createMatch,
  rejectMatch,
  viewActiveMatch,
  viewPendingMatch,
  
} from "../controllers/matchController.js";

const router = express.Router();

router.post("/accept/:requestId", createMatch);

router.get("/active", viewActiveMatch);

router.get("/pending", viewPendingMatch)

router.patch("/confirm/:matchId", confirmMatch);

router.patch("/reject/:matchId", rejectMatch);

export default router;
