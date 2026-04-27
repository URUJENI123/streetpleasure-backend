const { query } = require('../config/db');

const sendOtp = async (phoneNumber) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await query(
        'UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE phone_number=$3',
        [code, expires, phoneNumber]
    );

    if (process.env.NODE_ENV === 'production') {
        const twilio = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_ACCOUNT_TOKEN
        );
        await twilio.messages.create({
            body: `Kode ya streetpleasure: ${code}. Iramara iminota 10.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });
    } else {
        console.log(`[DEV OTP] ${phoneNumber} -> ${code}`);
    }
    return code;
};

const verifyOtp = async (phoneNumber,code) => {
    const { rows } = await query(
        'SELECT otp_code, otp_expires_at FROM users WHERE phone_number=$1',
        [phoneNumber]
    );
    if (!rows.length) return false;
    const { otp_code, otp_expires_at } = rows[0];
    if (otp_code !== code) return false;
    if(new Date() > new Date(otp_expires_at)) return false;
    await query(
        'UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE phone_number=$1',
        [phoneNumber]
    );
    return true;
};

module.exports = { sendOtp, verifyOtp };