const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

main();
