const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';

async function check() {
    const res = await fetch(`${supabaseUrl}/rest/v1/pedidos?select=*,clientes(nombre,email)&order=fecha_ingreso.desc&limit=20`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

check();
