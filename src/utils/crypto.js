const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const COST = 12;

const hashId  =(plaintext) => bcrypt.hash(plaintext, COST);
const compareId = (plaintext, hash) => bcrypt.compare(plaintext, hash);

const signAccess = (userId) =>
    jwt.sign({userId}, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    });

const signRefresh = (userId) =>
    jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    });

const verifyRefresh = (token) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);

module.exports = { hashId, compareId, signAccess, signRefresh, verifyRefresh};
