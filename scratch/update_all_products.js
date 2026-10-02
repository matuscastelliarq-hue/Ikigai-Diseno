const urlBase = "https://uweuupdtxzkwiugaackz.supabase.co/rest/v1/productos?id=eq.";
const key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E";

const updates = [
    {
        id: 'zen-3',
        imagenes: ['assets/1. Línea ZEN/3. Mesa PLINTO/Mesa Plinto 1.png', 'assets/1. Línea ZEN/3. Mesa PLINTO/Mesa Plinto 2.png']
    },
    {
        id: 'zen-4',
        imagenes: ['assets/1. Línea ZEN/4. Sillón ZEN 2 cuerpos/Sillón 2 cuerpos ZEN 1.png', 'assets/1. Línea ZEN/4. Sillón ZEN 2 cuerpos/Sillón 2 cuerpos ZEN 2.jpg']
    },
    {
        id: 'zen-5',
        imagenes: ['assets/1. Línea ZEN/5. Sillón ZEN 1 cuerpo/Sillón 1 cuerpo ZEN 1.png', 'assets/1. Línea ZEN/5. Sillón ZEN 1 cuerpo/Sillón 1 cuerpo ZEN 2.jpg']
    },
    {
        id: 'zen-6',
        imagenes: ['assets/1. Línea ZEN/6. Mesa OVAL/Mesa OVAL 1.png', 'assets/1. Línea ZEN/6. Mesa OVAL/Mesa OVAL 2.jpg']
    },
    {
        id: 'zen-7',
        imagenes: ['assets/1. Línea ZEN/7. Mesa ZEN/Mesa ZEN 1.png', 'assets/1. Línea ZEN/7. Mesa ZEN/Mesa ZEN 2.png']
    },
    {
        id: 'cnc-5',
        nombre: 'Sitial N',
        imagenes: ['assets/2. Línea CNC/4. Sitial N/Sitial N 1.png', 'assets/2. Línea CNC/4. Sitial N/Sitial N2.png']
    },
    {
        id: 'cont-8',
        imagenes: ['assets/3. Línea CONTEMPORÁNEO/6. Arrimo RAW/Arrimo RAW 1.png', 'assets/3. Línea CONTEMPORÁNEO/6. Arrimo RAW/Arrimo RAW 2.png']
    }
];

async function runUpdates() {
    for (const update of updates) {
        const body = { imagenes: update.imagenes };
        if (update.nombre) body.nombre = update.nombre;

        console.log(`Actualizando ${update.id}...`);
        
        try {
            const res = await fetch(urlBase + update.id, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify(body)
            });
            
            if (!res.ok) throw new Error("Status: " + res.status);
            console.log(`> ${update.id} actualizado correctamente.`);
        } catch (err) {
            console.error(`> Error actualizando ${update.id}:`, err);
        }
    }
    console.log("¡Todas las actualizaciones terminadas!");
}

runUpdates();
