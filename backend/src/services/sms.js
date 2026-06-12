const axios = require('axios');
const logger = require('../utils/logger');

async function sendOtp(phone, otp) {
  if (!process.env.MSG91_AUTH_KEY) {
    logger.warn(`SMS not configured. OTP for ${phone}: ${otp}`);
    return;
  }

  try {
    await axios.post('https://api.msg91.com/api/v5/otp', {
      authkey: process.env.MSG91_AUTH_KEY,
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile: `91${phone}`,
      otp,
    });
    logger.info(`OTP sent to ${phone}`);
  } catch (err) {
    logger.error(`SMS error: ${err.message}`);
    throw new Error('Failed to send OTP. Please try again.');
  }
}

async function sendOrderConfirmation(phone, orderNumber, total) {
  if (!process.env.MSG91_AUTH_KEY) return;
  // Use MSG91 transactional SMS
  try {
    await axios.post('https://api.msg91.com/api/sendhttp.php', null, {
      params: {
        authkey: process.env.MSG91_AUTH_KEY,
        mobiles: `91${phone}`,
        message: `Your order ${orderNumber} from Absolute Naansense is confirmed! Total: Rs.${total}. Thank you!`,
        sender: process.env.MSG91_SENDER_ID || 'ABSNAN',
        route: 4,
      },
    });
  } catch (err) {
    logger.error(`SMS confirmation error: ${err.message}`);
  }
}

module.exports = { sendOtp, sendOrderConfirmation };
