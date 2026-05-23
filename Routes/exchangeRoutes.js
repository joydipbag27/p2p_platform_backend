import express from "express";
import {
  cancelRequest,
  createRequest,
  getMyRequests,
  getPublicRequests,
} from "../controllers/exchangeController.js";

const router = express.Router();

router.post("/create", createRequest);

router.patch("/cancel/:requestId", cancelRequest);

router.get("/public", getPublicRequests);

router.get("/me", getMyRequests)

export default router;
