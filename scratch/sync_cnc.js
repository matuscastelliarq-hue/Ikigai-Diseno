const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';

async function syncCNC() {
    // 1. Get all lineas
    let res = await fetch(`${supabaseUrl}/rest/v1/lineas?select=*`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const lineas = await res.json();
    console.log("Lineas:", lineas.map(l => ({ id: l.id, nombre: l.nombre })));

    let cncLinea = lineas.find(l => l.nombre === 'Línea CNC');
    if (!cncLinea) {
        console.log("Linea CNC no encontrada!");
        return;
    }

    // 2. Get existing CNC products
    res = await fetch(`${supabaseUrl}/rest/v1/productos?select=*&linea_id=eq.${cncLinea.id}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const existingProducts = await res.json();
    console.log("Existing CNC Products:", existingProducts.map(p => p.nombre));

    // 3. Products to insert
    const cncProducts = [
        { nombre: 'Escritorio pupitre', precio: 140000, medidas: '120 x 60 x a75 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 1.png', 'assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 2.jpg'] },
        { nombre: 'Repisa NET', precio: 100000, medidas: '100 x 30 x a180 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/2. Repisa NET/Repisa NET 1.png', 'assets/2. Línea CNC/2. Repisa NET/Repisa NET 2.jpg'] },
        { nombre: 'Mesa triqueta', precio: 110000, medidas: '120 x 40 x a45 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/3. Mesa Triqueta/Mesa Triqueta 1.jpg', 'assets/2. Línea CNC/3. Mesa Triqueta/Mesa triqueta 2.png'] },
        { nombre: 'Silla N', precio: 60000, medidas: '45 x 45 x a85 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/4. Silla N/Silla N 1.png', 'assets/2. Línea CNC/4. Silla N/Silla N 2.png'] },
        { nombre: 'Piso Eslinga', precio: 45000, medidas: '40 x 40 x a45 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/5. Piso Eslinga/Piso Eslinga 1.jpg', 'assets/2. Línea CNC/5. Piso Eslinga/Piso Eslinga 2.jpg'] }
    ];

    // 4. Insert missing ones
    for (let p of cncProducts) {
        if (!existingProducts.find(ep => ep.nombre === p.nombre)) {
            console.log("Inserting:", p.nombre);
            const body = {
                linea_id: cncLinea.id,
                nombre: p.nombre,
                precio: p.precio,
                medidas: p.medidas,
                material: p.material,
                imagenes: p.imagenes,
                destacado: false
            };
            
            const insertRes = await fetch(`${supabaseUrl}/rest/v1/productos`, {
                method: 'POST',
                headers: { 
                    'apikey': supabaseKey, 
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(body)
            });
            
            if (!insertRes.ok) {
                console.error("Error inserting", p.nombre, await insertRes.text());
            } else {
                console.log("Success:", p.nombre);
            }
        }
    }
}

syncCNC();
