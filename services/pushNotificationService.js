const axios = require("axios");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Send push notification to a single device
 * @param {string} deviceToken - The Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data to send with notification
 * @returns {Promise<boolean>} - Success status
 */
exports.sendPushNotification = async (deviceToken, title, body, data = {}) => {
  try {
    if (!deviceToken) {
      console.log("No device token provided, skipping push notification");
      return false;
    }

    const payload = {
      to: deviceToken,
      title: title,
      body: body,
      data: data,
    };

    console.log("Sending push notification:", payload);

    const response = await axios.post(EXPO_PUSH_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
    });

    console.log("Push notification response:", response.data);
    return true;
  } catch (error) {
    console.error(
      "Error sending push notification:",
      error.response?.data || error.message
    );
    return false;
  }
};

/**
 * Send push notification to multiple devices
 * @param {string[]} deviceTokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data to send with notification
 * @returns {Promise<boolean>} - Success status
 */
exports.sendBulkPushNotification = async (
  deviceTokens,
  title,
  body,
  data = {}
) => {
  try {
    if (!deviceTokens || deviceTokens.length === 0) {
      console.log("No device tokens provided, skipping bulk push notification");
      return false;
    }

    const messages = deviceTokens.map((token) => ({
      to: token,
      title: title,
      body: body,
      data: data,
    }));

    console.log(
      "Sending bulk push notifications:",
      messages.length,
      "messages"
    );

    const response = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
    });

    console.log("Bulk push notification response:", response.data);
    return true;
  } catch (error) {
    console.error(
      "Error sending bulk push notification:",
      error.response?.data || error.message
    );
    return false;
  }
};

/**
 * Send chat notification to a user
 * @param {string} deviceToken - The recipient's device token
 * @param {string} senderName - Name of the message sender
 * @param {string} message - The message content
 * @param {number} shipmentId - The shipment ID
 * @returns {Promise<boolean>} - Success status
 */
exports.sendChatNotification = async (
  deviceToken,
  senderName,
  message,
  shipmentId
) => {
  const title = `New message from ${senderName}`;
  const body = message.length > 50 ? message.substring(0, 50) + "..." : message;
  const data = {
    type: "chat",
    shipmentId: shipmentId,
    senderName: senderName,
  };

  return await this.sendPushNotification(deviceToken, title, body, data);
};
