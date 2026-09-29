const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';

async function clearDb() {
    try {
        console.log("Eliminando pedido_items...");
        let res = await fetch(`${supabaseUrl}/rest/v1/pedido_items`, {
            method: 'DELETE',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        console.log(res.status, res.statusText);
        
        console.log("Eliminando pedidos...");
        res = await fetch(`${supabaseUrl}/rest/v1/pedidos`, {
            method: 'DELETE',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        console.log(res.status, res.statusText);

        console.log("Eliminando finanzas de pagos...");
        res = await fetch(`${supabaseUrl}/rest/v1/finanzas?categoria=eq.pago_cliente`, {
            method: 'DELETE',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        console.log(res.status, res.statusText);
        
        console.log("Limpieza exitosa.");
    } catch (e) {
        console.error("Error:", e);
    }
}

clearDb();
