import cookie from "cookie";
import cookieParser from "cookie-parser";
import { Session } from "../../models/sessionModel.js";

export const socketAuth = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie);

    const signedSid = cookieParser.signedCookie(
      cookies.sid,
      process.env.SESSION_SECRET,
    );

    const sid = cookieParser.JSONCookie(signedSid);

    if (!sid) {
      return next(new Error("Unauthorized"));
    }

    const session = await Session.findById(sid);

    if (!session) {
      return next(new Error("Session Expired"));
    }

    socket.user = {
      id: session.userId,
    };

    next();
  } catch (error) {
    return next(new Error("Auth service unavailable"));
  }
};
