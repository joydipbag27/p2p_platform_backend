import { Session } from "../models/sessionModel.js";

export const checkAuth = async (req, res, next) => {
  try {
    const { sid } = req.signedCookies;

    if (!sid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await Session.findById(sid).populate(
      "userId",
      "username email trustScore",
    );

    if (!session) {
      res.clearCookie("sid", { httpOnly: true });
      return res.status(401).json({ error: "Session expired" });
    }

    req.user = {
      id: session.userId,
      username: session.userId.username,
      email: session.userId.email,
      trustScore: session.userId.trustScore,
    };

    next();
  } catch (error) {
    res.status(400).json({ error: "Auth service unavailable" });
  }
};
