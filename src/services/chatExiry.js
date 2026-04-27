const { query } = require('../config/db');

const expire01Chats = async () => {
    const { rowsCount } = await query(
        "DELETE FROM chats WHERE expires_at < NOW()"
    );
    if (rowsCount > 0) console.log(`[cron] Expired ${rowCount} chat(s)`);
};

module.exports = { expire01Chats };