// scripts/test-email.ts
// Usage: npx tsx scripts/test-email.ts

require('dotenv').config({ path: '.env.local' });

import { sendThankYouEmail } from '../src/lib/email/sender';

async function main() {
  const result = await sendThankYouEmail('tiekujason@gmail.com');
  if (result.success) {
    console.log('Test email sent successfully!');
  } else {
    console.error('Failed to send test email:', result.error);
  }
}

main().catch(console.error);