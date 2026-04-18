// scripts/send-thank-you-email.ts
// Usage: npx tsx scripts/send-thank-you-email.ts

require('dotenv').config({ path: '.env.local' });

process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_QmVRDtAp_J2GW3M2mRWdczPna3SpxY3pX'; // fallback

import { createClient } from '@supabase/supabase-js';
import { sendThankYouEmail } from '../src/lib/email/sender';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get all users
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('Failed to list users:', usersErr);
    process.exit(1);
  }

  const users = usersData.users.filter(u => u.email);
  console.log(`Sending thank you email to ${users.length} users...`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const result = await sendThankYouEmail(user.email);
      if (result.success) {
        console.log(`Sent to ${user.email}`);
        successCount++;
      } else {
        console.error(`Failed to send to ${user.email}:`, result.error);
        errorCount++;
      }
    } catch (err) {
      console.error(`Error sending to ${user.email}:`, err);
      errorCount++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nCompleted: ${successCount} successful, ${errorCount} errors`);
}

main().catch(console.error);