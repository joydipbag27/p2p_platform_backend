import { Session } from "../models/sessionModel.js";

export const checkAuth = async (req, res, next) => {
  try {
    const { sid } = req.signedCookies;

    if (!sid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await Session.findById(sid);

    if (!session) {
      res.clearCookie("sid", { httpOnly: true });
      return res.status(401).json({ error: "Session expired" });
    }

    req.user = {
      id: session.userId,
    };

    next();
  } catch (error) {
    res.status(400).json({ error: "Auth service unavailable" });
  }
};
