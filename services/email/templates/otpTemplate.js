export const otpTemplate = (otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #111827; margin-bottom: 12px;">Your OTP Code</h2>
    <p style="color: #374151; font-size: 16px;">Use the following code to verify your account:</p>
    <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0;">
      ${otp}
    </div>
    <p style="color: #6b7280; font-size: 14px;">This code will expire soon. Please do not share it with anyone.</p>
  </div>
`;
