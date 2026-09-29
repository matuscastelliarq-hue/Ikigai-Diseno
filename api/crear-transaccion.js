const { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require('transbank-sdk');
const { createClient } = require('@supabase/supabase-js');

// Configuración Transbank (Entorno de Producción)
const commerceCode = process.env.TBK_COMMERCE_CODE || '597053089023';
const apiKey = process.env.TBK_API_KEY || '35872856-7100-4776-8f5a-cb1e7e837622';
const tx = new WebpayPlus.Transaction(
  new Options(commerceCode, apiKey, Environment.Production)
);

// Configuración Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'TU_SUPABASE_URL_AQUI';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY_AQUI';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercel auto-parses application/json, but we fallback just in case
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { clienteId, total, items, returnUrl, notas, fechaEstimada } = data;

    // 1. Crear pedido "PENDING" en Supabase para obtener un ID de orden único y serial
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert([{ 
        cliente_id: clienteId || null, 
        total: total,
        notas: notas,
        fecha_estimada_entrega: fechaEstimada || null,
        transbank_status: 'INITIALIZED'
      }])
      .select('id, orden_serial')
      .single();

    if (pedidoError) throw pedidoError;

    // Usar el número correlativo de la base de datos para Transbank
    const buyOrder = "O-" + (pedidoData.orden_serial || pedidoData.id.split('-')[0]); 
    const sessionId = "S-" + Date.now();
    const amount = total;

    // 2. Crear transacción en Transbank
    const createResponse = await tx.create(buyOrder, sessionId, amount, returnUrl);

    // 3. Guardar el token_ws en la base de datos
    await supabase
      .from('pedidos')
      .update({ transbank_token: createResponse.token })
      .eq('id', pedidoData.id);

    // Guardar los items del carrito (opcional pero recomendado)
    if (items && items.length > 0) {
      const itemsToInsert = items.map(i => ({
        pedido_id: pedidoData.id,
        producto_id: i.id,
        cantidad: i.cantidad || 1,
        barniz: i.barniz || i.terminacion || 'Transparente',
        precio_unitario: i.precio || 0
      }));
      await supabase.from('pedido_items').insert(itemsToInsert);
    }

    // 4. Devolver la URL y token al frontend
    return res.status(200).json({
      url: createResponse.url,
      token: createResponse.token,
      pedido_id: pedidoData.id
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({ error: error.message });
  }
};
