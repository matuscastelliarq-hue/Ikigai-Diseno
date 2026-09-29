const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';

async function clean() {
    // 1. Find product
    let res = await fetch(`${supabaseUrl}/rest/v1/productos?select=*&nombre=ilike.*ugandan%20knuckles*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    let data = await res.json();
    if (!data || data.length === 0) {
        console.log("No se encontró el producto 'ugandan knuckles'");
        return;
    }
    const productIds = data.map(p => p.id);
    console.log("Found products to delete:", productIds);

    // 2. Find order items pointing to these products
    for (const prodId of productIds) {
        res = await fetch(`${supabaseUrl}/rest/v1/pedido_items?select=*&producto_id=eq.${prodId}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const items = await res.json();
        console.log(`Found ${items.length} items for product ${prodId}`);

        for (const item of items) {
            // Delete the item
            await fetch(`${supabaseUrl}/rest/v1/pedido_items?id=eq.${item.id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            console.log(`Deleted order item ${item.id} (from order ${item.pedido_id})`);
            
            // Optionally delete the order if it's just a test
            // Note: Not doing this automatically just in case, but let's do it if it's safe.
            await fetch(`${supabaseUrl}/rest/v1/pedidos?id=eq.${item.pedido_id}`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            console.log(`Deleted order ${item.pedido_id}`);
        }

        // Delete the product
        await fetch(`${supabaseUrl}/rest/v1/productos?id=eq.${prodId}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        console.log(`Deleted product ${prodId}`);
    }
}

clean();
