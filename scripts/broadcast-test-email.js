// scripts/broadcast-test-email.js
// Usage: node scripts/broadcast-test-email.js

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseKey || !resendApiKey) {
  console.error('Missing Supabase or Resend env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendApiKey);

const SENDER_EMAIL = 'AuctionsGH <onboarding@resend.dev>';

async function main() {
  // Get all users
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('Failed to list users:', usersErr);
    process.exit(1);
  }

  const emails = usersData.users.map(u => u.email).filter(Boolean);
  console.log(`Broadcasting to ${emails.length} users...`);

  for (const email of emails) {
    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: email,
        subject: 'Test Broadcast',
        text: 'Hi, this is a test',
      });
      if (error) {
        console.error(`Failed to send to ${email}:`, error);
      } else {
        console.log(`Sent to ${email}`);
      }
    } catch (err) {
      console.error(`Error sending to ${email}:`, err);
    }
  }
  console.log('Broadcast complete.');
}

main();
