const twilio = require("twilio");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

exports.sendOTP = async (phone, code) => {
  try {
    const message = await client.messages.create({
      body: `Your FreightMate OTP code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log("OTP sent:", message.sid);
  } catch (err) {
    console.error("Twilio send failed:", err.message);
    throw new Error("OTP sending failed");
  }
};
