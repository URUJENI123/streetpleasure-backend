const { query } = require('../config/db');
const { sendOtp, verifyOtp } = require('../services/otp');
const { signAccess, signRefresh, verifyRefresh, hashId } = require('../utils/crypto');
const { verifyDocument } = require('../services/smileId');
const { badReq, notFound } = require('../utils/errors');

const register = async (req, res, next) => {
    try {
        const { phone_number } = req.body;
        const { rows } = await query(`
            INSERT INTO users (phone_number) VALUES ($1)
            ON CONFLICT (phone_number) DO UPDATE SET upadated_at = NOW()
            RETURNING id, role, locked_at
            `, [phone_number]);

        const user = rows[0];
        if(user.locked_at) return next(badReq('Account locked'));
        
        await sendOtp(phone_number);
        res.json({ message: 'OTP sent' });
    } catch (err) { next(err);}
};

