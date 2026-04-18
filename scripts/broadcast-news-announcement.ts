require('dotenv').config({ path: '.env.local' });

import { createAdminClient } from '../src/lib/supabase/admin';
import { sendNewsAnnouncementEmail } from '../src/lib/email/sender';

const args = new Set(process.argv.slice(2));

type NewsRow = {
  title: string;
  content: string;
};

type ProfileRow = {
  id: string;
  notification_preferences?: {
    promotions?: boolean;
  } | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    name?: string;
  } | null;
};

function getDisplayName(user: AuthUser) {
  return user.user_metadata?.full_name?.trim()
    || user.user_metadata?.name?.trim()
    || (user.email ? user.email.split('@')[0] : undefined)
    || 'there';
}

async function listAllUsers() {
  const admin = createAdminClient();
  const users: AuthUser[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = (data?.users ?? []) as AuthUser[];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users.filter((user) => user.email);
}

async function getPromotionsOptOutMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, boolean>();
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, notification_preferences')
    .in('id', userIds);

  if (error) throw error;

  const profiles = (data ?? []) as ProfileRow[];

  return new Map(
    profiles.map((profile) => [profile.id, profile.notification_preferences?.promotions === false])
  );
}

async function getLatestUpdates(limit = 3) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('news_updates')
    .select('title, content')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as NewsRow[]).map((item) => ({
    title: item.title,
    content: item.content.split('\n').slice(0, 3).join('\n'),
  }));
}

async function main() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing Supabase admin environment variables');
  }

  const [users, updates] = await Promise.all([
    listAllUsers(),
    getLatestUpdates(3),
  ]);
  const promotionsOptOutMap = await getPromotionsOptOutMap(users.map((user) => user.id));

  const dryRun = args.has('--dry-run');
  const maxRecipients = Number(process.env.MAX_RECIPIENTS || users.length);
  const optedInUsers = users.filter((user) => !promotionsOptOutMap.get(user.id));
  const targetUsers = optedInUsers.slice(0, Number.isFinite(maxRecipients) ? maxRecipients : optedInUsers.length);

  if (updates.length === 0) {
    throw new Error('No published news updates found to include in the announcement email');
  }

  console.log(`${dryRun ? 'Previewing' : 'Sending'} news announcement to ${targetUsers.length} users...`);
  console.log(`Skipped ${users.length - optedInUsers.length} users who opted out of promotions.`);

  if (dryRun) {
    console.log(JSON.stringify({
      recipients: targetUsers.map((user) => user.email),
      updates,
    }, null, 2));
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const user of targetUsers) {
    if (!user.email) continue;

    try {
      const result = await sendNewsAnnouncementEmail(user.email, {
        recipientName: getDisplayName(user),
        updates,
      });

      if (result.success) {
        console.log(`Sent to ${user.email}`);
        successCount += 1;
      } else {
        console.error(`Failed to send to ${user.email}:`, result.error);
        errorCount += 1;
      }
    } catch (error) {
      console.error(`Error sending to ${user.email}:`, error);
      errorCount += 1;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log(`\nCompleted: ${successCount} successful, ${errorCount} errors`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
