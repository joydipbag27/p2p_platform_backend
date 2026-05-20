import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { exchangeRequestSchema } from "../validators/zodSchema.js";

export const createRequest = async (req, res) => {
  const existingExchangeReq = await ExchangeRequest.find({
    creator: req.user.id,
  });

  if (existingExchangeReq.length > 0) {
    return res
      .status(400)
      .json({ error: "You already have a exchange request" });
  }

  const { success, data, error } = exchangeRequestSchema.safeParse(req.body);

  if (!success) {
    return res.status(400).json({ error: error.issues[0].message });
  }

  const { type, amount, radius, note, expiry } = data;

  try {
    const request = await ExchangeRequest.create({
      creator: req.user.id,
      type,
      amount,
      radius,
      note,
      expiresAt: Date.now() + 1000 * expiry * 60,
    });

    return res
      .status(200)
      .json({ info: "Exchange request created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create exchange request" });
  }
};

export const deleteRequest = async (req, res) => {
  const existingExchangeReq = await ExchangeRequest.findOne({
    creator: req.user.id,
  });

  if (!existingExchangeReq) {
    return res.status(400).json({ error: "You don't have a exchange request" });
  }

  try {
    await ExchangeRequest.findByIdAndDelete(existingExchangeReq._id);

    return res
      .status(200)
      .json({ info: "Exchange request deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete exchange request" });
  }
};
