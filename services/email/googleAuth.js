import { OAuth2Client } from "google-auth-library";
import env from "../../config/env.js";

const client = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
});

export const verifyCredential = async (credential) => {
  const loginTicket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const userData = loginTicket.getPayload();
  return userData;
};
