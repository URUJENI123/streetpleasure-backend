const { query } = require('../config/db');
const { disburse } = require('./momo');

const releaseEscrowDue = async () => {
    const {rows: events} = await  query(`
        SELECT e.id, e.host_id, e.price, e.currency,
               e.phone_number, AS host_phone,
               COUNT(ea.user_id) AS attendee_count
        FROM events e
        JOIN users u ON u.id = e.host_id
        JOIN event_attendees ea ON ea.event_id = e.id AND ea.paid = TRUE
        WHERE e.status = 'competed'
          AND e.end_time < NOW() - INTERVAL '2 hours'
          AND e.escrow_id IS NOT NULL
        GROUP BY e.id, u.phone_number
    `);

    for (const evt of events) {
        try {
            const total  = parseFlat(evt.price) * parseInt(evt.attendee_count);
            const commission = total * (parseFloat(process.env.PLATFORM_COMMISSION_PCT || '10') / 100);
            const hostPayout = total - commission;

            if (evt.currency === 'RWF') {
                await disburse({ amount: hostPayout, phoneNumber: evt.host_phone, note: `Event ${evt.id} payout` });
            }

            await query(
                'UPDATE payments SET status=\'released\', escrow_release_at=NOW() WHERE event_id=$1 AND status=\'held\'',
                [evt.id]
            );
            await query('UPDATE events SET escrow_id=NULL WHERE id=$1', [evt.id]);
            console.log(`[escrow] Released for event ${evt.id} -> ${hostPayout} ${evt.currency}`);
        } catch (err) {
            console.error(`[escrow] Release failed for event ${evt.id}:`, err.message);
        }
    }
};

module.exports = { releaseEscrowDue };