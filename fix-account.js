const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
    if (line.includes('=')) {
        const [key, ...vals] = line.split('=');
        env[key.trim()] = vals.join('=').trim().replace(/"/g, '');
    }
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching users...");
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) {
        console.error("Failed to list users:", usersErr);
        return;
    }

    console.log("Fetching profiles...");
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id');
    if (profErr) {
        console.error("Failed to list profiles:", profErr);
        return;
    }

    const profileIds = new Set(profiles.map(p => p.id));
    let fixed = 0;

    for (const user of usersData.users) {
        if (!profileIds.has(user.id)) {
            const username = user.email.split('@')[0] + '_' + Math.floor(Math.random() * 100000);
            const fullName = user.user_metadata?.full_name || user.email.split('@')[0];

            console.log(`Missing profile for ${user.email} (${user.id}). Creating...`);

            const { error } = await supabase.from('profiles').insert({
                id: user.id,
                username,
                full_name: fullName,
                avatar_url: user.user_metadata?.avatar_url || null
            });

            if (error) {
                console.error(`Error inserting profile for ${user.id}:`, error);
            } else {
                fixed++;
                console.log(`✅ Created profile for ${user.email}`);
            }
        }
    }

    console.log(`\nDone. Fixed ${fixed} missing profiles.`);
}

run();
