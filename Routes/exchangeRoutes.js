import express from "express";
import {
  cancelRequest,
  createRequest,
  getRequests,
} from "../controllers/exchangeController.js";

const router = express.Router();

router.post("/create", createRequest);

router.delete("/cancel", cancelRequest);

router.get("/", getRequests);

export default router;
