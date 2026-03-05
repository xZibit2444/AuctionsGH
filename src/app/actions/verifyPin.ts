'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function verifyOrderPinAction(orderId: string, pin: string) {
    if (!pin || pin.length !== 4) {
        return { success: false, error: 'PIN must be 4 digits.' };
    }

    try {
        // Call the RPC function 'verify_order_pin'
        const { data: result, error } = await supabaseAdmin.rpc('verify_order_pin', {
            p_order_id: orderId,
            p_pin: pin
        });

        if (error) {
            console.error('PIN verify RPC error:', error);
            return { success: false, error: 'Server error verifying PIN.' };
        }

        // RPC returns: 'verified' | 'wrong_pin' | 'max_attempts' | 'expired' | 'not_found'
        if (result === 'verified') {
            return { success: true };
        } else if (result === 'wrong_pin') {
            return { success: false, error: 'Incorrect PIN. Please try again.' };
        } else if (result === 'max_attempts') {
            return { success: false, error: 'Maximum attempts reached. Order locked.' };
        } else if (result === 'expired') {
            return { success: false, error: 'PIN has expired.' };
        } else if (result === 'not_found') {
            return { success: false, error: 'PIN record not found for this order.' };
        }

        return { success: false, error: 'Unknown response.' };

    } catch (err: any) {
        console.error('PIN verify action failed:', err);
        return { success: false, error: err.message };
    }
}
