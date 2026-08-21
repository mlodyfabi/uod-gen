// api/check-reminders.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { data: contracts, error } = await supabase
      .schema('contracts')
      .from('contracts')
      .select('artist_name, contract_end_date, notice_period_days')
      .not('contract_end_date', 'is', null)
      .not('notice_period_days', 'is', null);

    if (error) {
      console.error('check-reminders: supabase error', error);
      return res.status(500).json({ error: error.message });
    }

    const today = new Date();
    const dueSoon = contracts.filter((c) => {
      const endDate = new Date(c.contract_end_date);
      const noticeDeadline = new Date(endDate);
      noticeDeadline.setDate(noticeDeadline.getDate() - c.notice_period_days);
      const daysUntilDeadline = Math.ceil((noticeDeadline - today) / (1000 * 60 * 60 * 24));
      return daysUntilDeadline >= 0 && daysUntilDeadline <= 7;
    });

    if (dueSoon.length === 0) {
      return res.status(200).json({ sent: false, message: 'Brak terminów w tym tygodniu' });
    }

    const summary = dueSoon
      .map((c) => `${c.artist_name} — koniec umowy: ${c.contract_end_date}`)
      .join('\n');

    const webhookRes = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: dueSoon.length, summary }),
    });

    if (!webhookRes.ok) {
      console.error('check-reminders: webhook responded with', webhookRes.status);
      return res.status(502).json({ error: `Webhook zwrócił status ${webhookRes.status}` });
    }

    return res.status(200).json({ sent: true, count: dueSoon.length });
  } catch (err) {
    console.error('check-reminders: unexpected error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
