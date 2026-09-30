const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Set fecha_estimada_entrega to Oct 7, 2026 local time
    // October 7 in Chile (UTC-3)
    const newDate = new Date('2026-10-07T12:00:00-03:00');
    
    console.log("Updating to:", newDate.toISOString());

    const { data, error } = await supabase
        .from('pedidos')
        .update({ fecha_estimada_entrega: newDate.toISOString() })
        .eq('orden_serial', 1001)
        .select();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success:", data);
    }
}

main();
