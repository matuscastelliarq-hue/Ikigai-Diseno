const urlBase = "https://uweuupdtxzkwiugaackz.supabase.co/rest/v1/productos";
const key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E";

const updates = [
    {
        id: 'cnc-2', // Repisa NET en la base de datos
        imagenes: ['assets/2. Línea CNC/2. Repisa NET/Repisa NET 1.png', 'assets/2. Línea CNC/2. Repisa NET/Repisa NET 2.jpg']
    },
    {
        id: 'cnc-3', // Mesa Triqueta en la base de datos
        imagenes: ['assets/2. Línea CNC/3. Mesa Triqueta/Mesa Triqueta 1.png', 'assets/2. Línea CNC/3. Mesa Triqueta/Mesa triqueta 2.png']
    }
];

async function fixCncImages() {
    console.log("Restaurando las imágenes de Repisa NET y Mesa Triqueta en Supabase...");
    try {
        for (const update of updates) {
            console.log(`Actualizando imágenes para ID: ${update.id}...`);
            const res = await fetch(`${urlBase}?id=eq.${update.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({ imagenes: update.imagenes })
            });

            if (!res.ok) {
                console.error(`Error al actualizar ${update.id}: ${res.status}`);
            } else {
                console.log(`> ${update.id} actualizado correctamente.`);
            }
        }
        
        console.log("¡Imágenes corregidas! Recarga tu web local para ver el cambio.");
        
    } catch (err) {
        console.error("Error general:", err);
    }
}

fixCncImages();
