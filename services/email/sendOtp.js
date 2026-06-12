import env from "../../config/env.js";
import { Resend } from "resend";
import { otpTemplate } from "./templates/otpTemplate.js";

const resend = new Resend(env.RESEND_KEY);

export const sendOtpFunc = async (email, otp) => {
  const result = await resend.emails.send({
    from: `UpiSathi <${env.OTP_EMAILID}>`,
    to: [email],
    subject: "Your OTP Code",
    html: otpTemplate(otp),
  });

  if (result.error) {
    return { isSent: false };
  }
  return { isSent: true };
};
