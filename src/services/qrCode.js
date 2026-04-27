const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const generateTicket = async () => {
    const code = uuidv4().replace(/-/g, '').toUpperCase();
    const qrDataUrl = await QRCode.toDataURL(`TWIKO:${code}`, { errorCorrectionLevel: 'H',
    width : 300,
 });
    return { code, qrDataUrl };
};

const generateBuffer = async (text) => {
    return QRCode.toBuffer(text, { errorCorrectionLevel: 'H', width: 200 });
};

module.exports = { generateTicket, generateBuffer };