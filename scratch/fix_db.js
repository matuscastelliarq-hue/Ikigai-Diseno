const urlBase = "https://uweuupdtxzkwiugaackz.supabase.co/rest/v1/productos";
const key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E";

const updates = [
    {
        id: 'cnc-1',
        imagenes: ['assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 1.png', 'assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 2.png']
    },
    {
        id: 'cnc-2',
        imagenes: ['assets/2. Línea CNC/3. Mesa Triqueta/Mesa Triqueta 1.png', 'assets/2. Línea CNC/3. Mesa Triqueta/Mesa triqueta 2.png']
    },
    {
        id: 'cont-3',
        imagenes: ['assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Recibidor Giraffe 1.png', 'assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Recibidor Giraffe 2.png']
    },
    {
        id: 'cont-6',
        imagenes: ['assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 1.png', 'assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 2.png']
    },
    {
        id: 'cont-7',
        imagenes: ['assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 1.png', 'assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 2.png']
    },
    {
        id: 'cont-9',
        imagenes: ['assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 1.png', 'assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 2.png']
    },
    {
        id: 'dec-2',
        imagenes: ['assets/4. Iluminación y Decoración/2. Lámpara Origami/Lámpara Origami.png', 'assets/4. Iluminación y Decoración/2. Lámpara Origami/Planos lámpara origami.png']
    }
];

async function fixDatabase() {
    console.log("Obteniendo todos los productos para buscar Sitial N duplicado...");
    try {
        const getRes = await fetch(urlBase + '?select=*', {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        const productos = await getRes.json();
        
        // Buscar el Sitial N que es promo (precio mayor a 60000, probablemente 120000)
        const promoSitialN = productos.find(p => p.nombre === 'Sitial N' && p.precio > 60000);
        if (promoSitialN) {
            console.log(`Encontrado Sitial N promo (ID: ${promoSitialN.id}, Precio: ${promoSitialN.precio}). Cambiando nombre a 'Promo Sitial N'...`);
            updates.push({
                id: promoSitialN.id,
                nombre: 'Promo Sitial N'
            });
        } else {
            console.log("No se encontró un Sitial N con precio de promo, o ya está renombrado.");
        }

        // Ejecutar todas las actualizaciones
        for (const update of updates) {
            const body = {};
            if (update.imagenes) body.imagenes = update.imagenes;
            if (update.nombre) body.nombre = update.nombre;

            console.log(`Actualizando producto ID: ${update.id}...`);
            const patchRes = await fetch(`${urlBase}?id=eq.${update.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify(body)
            });

            if (!patchRes.ok) {
                console.error(`Error al actualizar ${update.id}: ${patchRes.status}`);
            } else {
                console.log(`> ${update.id} actualizado correctamente.`);
            }
        }
        
        console.log("¡Todo listo! Recarga tu web local y verifica los cambios.");
        
    } catch (err) {
        console.error("Error general:", err);
    }
}

fixDatabase();
