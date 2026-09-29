const fs = require('fs');

async function run() {
    const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
    const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';
    
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/productos?linea_id=eq.contemporaneo&select=id,nombre,imagenes`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const data = await res.json();
        
        for (let p of data) {
            if (p.nombre === 'Mesa RAW' || p.nombre === 'Mesa RAW rodela' || p.nombre === 'Mesa RAW tablón') {
                const mesaRawImages = ['assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 1.png', 'assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 2.png'];
                await fetch(`${supabaseUrl}/rest/v1/productos?id=eq.${p.id}`, {
                    method: 'PATCH',
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imagenes: mesaRawImages, nombre: 'Mesa RAW' })
                });
                console.log("Updated Mesa RAW: " + p.id);
            }
        }
        console.log("DONE");
    } catch (e) {
        console.error(e);
    }
}
run();
