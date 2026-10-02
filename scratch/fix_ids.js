const urlBase = "https://uweuupdtxzkwiugaackz.supabase.co/rest/v1/productos";
const key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E";

async function swapIds() {
    console.log("Iniciando intercambio de IDs entre Sitial N y Promo Sitial N...");
    try {
        // 1. Cambiar cnc-4 a cnc-temp
        console.log("Moviendo cnc-4 a id temporal...");
        let res = await fetch(`${urlBase}?id=eq.cnc-4`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ id: 'cnc-temp' })
        });
        if (!res.ok) throw new Error("Error moviendo cnc-4");

        // 2. Cambiar cnc-5 a cnc-4
        console.log("Moviendo cnc-5 a cnc-4...");
        res = await fetch(`${urlBase}?id=eq.cnc-5`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ id: 'cnc-4' })
        });
        if (!res.ok) throw new Error("Error moviendo cnc-5");

        // 3. Cambiar cnc-temp a cnc-5
        console.log("Moviendo id temporal a cnc-5...");
        res = await fetch(`${urlBase}?id=eq.cnc-temp`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ id: 'cnc-5' })
        });
        if (!res.ok) throw new Error("Error moviendo cnc-temp");

        console.log("¡Intercambio de IDs completado exitosamente!");
        
    } catch (err) {
        console.error("Error durante el proceso:", err);
    }
}

swapIds();
