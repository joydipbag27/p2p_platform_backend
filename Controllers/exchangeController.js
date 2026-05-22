import { ExchangeRequest } from "../models/exchangeRequestModel.js";
import { exchangeRequestSchema } from "../validators/zodSchema.js";

//a created it
export const createRequest = async (req, res) => {
  const existingExchangeReq = await ExchangeRequest.findOne({
    creator: req.user.id,
    status: "ACTIVE",
  });

  if (existingExchangeReq) {
    return res
      .status(400)
      .json({ error: "You already have a active exchange request" });
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
      expiresAt: new Date(Date.now() + 1000 * expiry * 60),
    });

    return res
      .status(200)
      .json({ info: "Exchange request created successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create exchange request" });
  }
};

//a can cancel it
export const cancelRequest = async (req, res) => {
  const existingExchangeReq = await ExchangeRequest.findOne({
    creator: req.user.id,
    status: "ACTIVE",
  });

  if (!existingExchangeReq) {
    return res
      .status(400)
      .json({ error: "This request can no longer be cancelled" });
  }

  try {
    await existingExchangeReq.updateOne({
      $set: {
        status: "CANCELLED",
      },
    });

    return res
      .status(200)
      .json({ info: "Exchange request deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete exchange request" });
  }
};

//show discoverable requests
export const getRequests = async (req, res) => {
  const requests = await ExchangeRequest.find({
    creator: { $ne: req.user.id },
    status: "ACTIVE",
  });

  res.json(requests);
};
