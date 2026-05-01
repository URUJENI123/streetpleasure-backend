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
            ON CONFLICT (phone_number) DO UPDATE SET updated_at = NOW()
            RETURNING id, role, locked_at
            `, [phone_number]);

        const user = rows[0];
        if(user.locked_at) return next(badReq('Account locked'));
        
        await sendOtp(phone_number);
        res.json({ message: 'OTP sent' });
    } catch (err) { next(err);}
};

const verifyOtpHandler = async (req, res, next) => {
    try {
        const { phone_number, otp } = req.body;
        const ok = await verifyOtp(phone_number, otp);
        if (!ok) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const { rows } = await query(
            `SELECT id, role FROM users WHERE phone_number=$1`, [phone_number]
        );
        const user = rows[0];

        const accessToken = signAccess(user.id);
        const refreshToken = signRefresh(user.id);
        await query('UPDATE users SET refresh_token=$1, updated_at=NOW() WHERE id=$2', [refreshToken, user.id]);

        res.json({ accessToken, refreshToken, role: user.role, userId: user.id });
    } catch (err) { next(err); }
};

const refreshTokenHandler = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

        const payload = verifyRefresh(refreshToken);
        const { rows } = await query(
            'SELECT id, role, refresh_token FROM users WHERE id=$1', [payload.userId]
        );
        if (!rows.length || rows[0].refresh_token !== refreshToken) {
            return res.status(401).json({ error: 'Refresh token revoked' });
        }

        const newAccess = signAccess(rows[0].id);
        const newRefresh = signRefresh(rows[0].id);
        await query('UPDATE users SET refresh_token=$1 WHERE id=$2', [newRefresh, row[0].id]);

        res.json({ accessToken: newAccess, refreshToken: newRefresh });
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        await query('UPDATE users SET refresh_token=NULL WHERE id=$1', [req.user.id]);
        res.json({ message: 'Logged out' });
    } catch (err) { next(err); }
};

const verifyId = async (req, res, next) => {
    try {
        const { id_type } = req.body; 
        const files = req.files || {};
        const idImageUrl = files.id_image?.[0]?.location;
        const selfieUrl = files.selfie?.[0]?.location;

        if (!idImageUrl || !selfieUrl) {
            return res.status(400).json({ error: 'id_image and selfie files required' });
        }

        const result = await verifyDocument({
            idImageUrl,
            selfieUrl,
            idType: id_type || 'NATIONAL_ID',
            country: 'RW',
        });

        if (!result.verified) {
            return res.status(400).json({ error: 'ID verification failed', score: result.matchScore });
        }

        const idHash = await hashId(result.idNumber);
        const newRole = id_type === 'PASSPORT' ? 'verified_tourist' : 'verified_local';

        await query(`
            UPDATE users SET
            national_id_hash = $1
            id_verified_at =NOW(),
            liveness_url =$2,
            full_name =COALESCE(full_name, $3),
            role =$4,
            updated_at =NOW()
        WHERE id = $5
        `, [idHash, selfieUrl, result.name, newRole, req.user.id]);

        res.json({ message: 'Identity verified', role: newRole });
    } catch (err) { next(err); }
};

module.exports = { register, verifyOtpHandler, refreshTokenHandler, logout, verifyId };