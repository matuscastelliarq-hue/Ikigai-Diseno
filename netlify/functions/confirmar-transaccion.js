const { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require('transbank-sdk');
const { createClient } = require('@supabase/supabase-js');
const querystring = require('querystring');

// Configuración Transbank (Entorno de Producción)
const commerceCode = process.env.TBK_COMMERCE_CODE || '597053089023';
const apiKey = process.env.TBK_API_KEY || '35872856-7100-4776-8f5a-cb1e7e837622';
const tx = new WebpayPlus.Transaction(
  new Options(commerceCode, apiKey, Environment.Production)
);

const supabaseUrl = process.env.SUPABASE_URL || 'TU_SUPABASE_URL_AQUI';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY_AQUI';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  try {
    let token = '';
    
    // Obtener token desde QueryString (GET) o Body (POST)
    if (event.queryStringParameters && event.queryStringParameters.token_ws) {
      token = event.queryStringParameters.token_ws;
    } else if (event.body) {
      const parsedBody = querystring.parse(event.body);
      token = parsedBody.token_ws || parsedBody.TBK_TOKEN;
    }

    // Si el pago fue cancelado por el usuario
    if (!token) {
       return {
         statusCode: 302,
         headers: { Location: '/?pago=cancelado' }
       };
    }

    // Confirmar transacción
    const commitResponse = await tx.commit(token);

    // Buscar el pedido por token e incluir items para la boleta
    const { data: pedidoData, error } = await supabase
      .from('pedidos')
      .select('id, orden_serial, total, clientes(nombre, email), pedido_items(cantidad, precio_unitario, productos(nombre))')
      .eq('transbank_token', token)
      .single();

    if (commitResponse.response_code === 0 && commitResponse.status === 'AUTHORIZED') {
      // Pago Aprobado
      if (pedidoData) {
        await supabase.from('pedidos')
          .update({ transbank_status: 'AUTHORIZED', estado: 'a) Recibido y gestión de materiales' })
          .eq('id', pedidoData.id);

        const zeptoToken = process.env.ZEPTOMAIL_TOKEN;
        const simpleApiKey = process.env.SIMPLE_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL || 'contacto@ikigaidiseno.cl';
        const clienteEmail = pedidoData.clientes?.email;
        const clienteNombre = pedidoData.clientes?.nombre || 'Cliente';
        const numeroOrden = pedidoData.orden_serial || pedidoData.id.split('-')[0];
        
        let boletaBase64 = null;
        let boletaFolio = '';
        let boletaError = null;

        // Emisión Automática de Boleta Electrónica con SimpleAPI
        if (simpleApiKey && pedidoData.pedido_items) {
            try {
                let detalles = [];
                let sumItems = 0;
                pedidoData.pedido_items.forEach((item, index) => {
                    const monto = Math.round(item.cantidad * item.precio_unitario);
                    sumItems += monto;
                    detalles.push({
                        "NroLinDet": index + 1,
                        "NmbItem": item.productos?.nombre || 'Producto Ikigai',
                        "QtyItem": item.cantidad,
                        "PrcItem": Math.round(item.precio_unitario),
                        "MontoItem": monto
                    });
                });

                // Si hay diferencia (ej. despacho), agregar como ítem extra
                if (Math.round(pedidoData.total) > sumItems) {
                    const diff = Math.round(pedidoData.total - sumItems);
                    detalles.push({
                        "NroLinDet": detalles.length + 1,
                        "NmbItem": "Despacho a Domicilio",
                        "QtyItem": 1,
                        "PrcItem": diff,
                        "MontoItem": diff
                    });
                }

                const payloadBoleta = {
                    "Encabezado": {
                        "IdDoc": {
                            "TipoDTE": 39, // Boleta Electrónica
                            "Folio": 0,
                            "FchEmis": new Date().toISOString().split('T')[0]
                        },
                        "Emisor": {
                            "RUTEmisor": "78425423-2" // RUT de la empresa proveído por el usuario
                        },
                        "Receptor": {
                            "RUTRecep": "66666666-6", // Boletas pueden llevar 66666666-6 si no hay rut del cliente
                            "RznSocRecep": clienteNombre
                        },
                        "Totales": {
                            "MntTotal": Math.round(pedidoData.total)
                        }
                    },
                    "Detalle": detalles
                };

                const boletaRes = await fetch('https://api.simpleapi.cl/api/v1/dte/generar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Basic ' + Buffer.from('apikey:' + simpleApiKey).toString('base64')
                    },
                    body: JSON.stringify(payloadBoleta)
                });
                
                const boletaData = await boletaRes.json();
                
                if (boletaRes.ok && boletaData.pdf) {
                    boletaBase64 = boletaData.pdf;
                    boletaFolio = boletaData.folio || '0';
                    console.log("Boleta generada con folio:", boletaFolio);
                } else {
                    console.error("SimpleAPI respondió con error:", boletaData);
                    boletaError = JSON.stringify(boletaData).substring(0, 250);
                }
            } catch (apiError) {
                console.error("Excepción al generar boleta con SimpleAPI:", apiError);
                boletaError = apiError.message ? apiError.message.substring(0, 250) : 'Error desconocido';
            }
        } else if (!simpleApiKey) {
            boletaError = 'No hay SIMPLE_API_KEY';
        }

        // Guardar boleta_folio y boleta_error en la base de datos
        if (boletaFolio || boletaError) {
            await supabase.from('pedidos')
                .update({
                    boleta_folio: boletaFolio || null,
                    boleta_error: boletaError
                })
                .eq('id', pedidoData.id);
        }

        // Enviar correos con ZeptoMail
        if (zeptoToken) {
          try {
            const toArray = [];
            if (clienteEmail) {
              toArray.push({ "email_address": { "address": clienteEmail, "name": clienteNombre } });
            }
            if (adminEmail) {
              toArray.push({ "email_address": { "address": adminEmail, "name": "Admin Ikigai" } });
            }

            if (toArray.length > 0) {
              
              // Construir resumen HTML de items para el correo
              let itemsHtmlTable = '';
              let sumItems = 0;
              if (pedidoData.pedido_items) {
                  pedidoData.pedido_items.forEach(item => {
                      const monto = Math.round(item.cantidad * item.precio_unitario);
                      sumItems += monto;
                      itemsHtmlTable += `
                          <tr>
                              <td align="left" style="padding-bottom: 15px;">
                                  <div style="margin-bottom: 3px;">${item.cantidad > 1 ? item.cantidad + 'x ' : ''}${item.productos?.nombre || 'Producto Ikigai'}</div>
                                  <div style="color: #777; font-size: 13px;">Terminación ${item.barniz}</div>
                              </td>
                              <td align="right" style="padding-bottom: 15px; font-weight: bold; vertical-align: top;">
                                  $${monto.toLocaleString('es-CL')}
                              </td>
                          </tr>
                      `;
                  });
              }
              
              let shippingHtmlTable = '';
              if (Math.round(pedidoData.total) > sumItems) {
                  const diff = Math.round(pedidoData.total - sumItems);
                  shippingHtmlTable = `
                      <tr>
                          <td align="left" style="padding-top: 5px; padding-bottom: 15px;">Despacho a domicilio</td>
                          <td align="right" style="padding-top: 5px; padding-bottom: 15px; font-weight: bold;">$${diff.toLocaleString('es-CL')}</td>
                      </tr>
                  `;
              } else {
                  shippingHtmlTable = `
                      <tr>
                          <td align="left" style="padding-top: 5px; padding-bottom: 15px;">Retiro en taller</td>
                          <td align="right" style="padding-top: 5px; padding-bottom: 15px; font-weight: bold;">$0</td>
                      </tr>
                  `;
              }
              
              let etaDateText = 'A coordinar';
              if (pedidoData.fecha_estimada_entrega) {
                  const d = new Date(pedidoData.fecha_estimada_entrega);
                  const dd = String(d.getDate()).padStart(2, '0');
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  etaDateText = `${dd}/${mm}`;
              }
              
              const emailResumenHTML = `
                  <div style="background-color: #f9f9f9; padding: 25px; border-radius: 8px; margin: 25px 40px;">
                      <h3 style="margin-top: 0; font-size: 16px; color: #333; margin-bottom: 20px; font-weight: bold;">Resumen del pedido</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 15px; color: #333;">
                          ${itemsHtmlTable}
                          ${shippingHtmlTable}
                      </table>
                      <hr style="border: 0; border-top: 1.5px solid #ddd; margin: 15px 0 20px 0;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 20px; color: #333; font-weight: bold;">
                          <tr>
                              <td align="left">Total:</td>
                              <td align="right">$${Math.round(pedidoData.total).toLocaleString('es-CL')}</td>
                          </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 15px; color: #333; margin-top: 25px;">
                          <tr>
                              <td align="left" style="font-weight: 500; padding-bottom: 6px;">Fecha estimada de realización:</td>
                              <td align="right" style="font-weight: bold; padding-bottom: 6px;">${etaDateText}</td>
                          </tr>
                          <tr>
                              <td colspan="2" align="left" style="color: #777; font-size: 13px; font-weight: normal; line-height: 1.4;">
                                  Se te contactará antes para ver opciones de días de despacho
                              </td>
                          </tr>
                      </table>
                  </div>
              `;

              const emailBody = {
                "from": { "address": "contacto@ikigaidiseno.cl", "name": "Ikigai Diseño" },
                "to": toArray,
                "subject": `Ikigai Diseño - Pago Confirmado #${numeroOrden}`,
                "htmlbody": `
                  <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <img src="https://ikigaidiseno.cl/assets/Ik%20negro.png" alt="Ikigai Diseño" style="width: 100%; max-width: 450px; height: auto;">
                    </div>

                    <h2 style="color: #c79c6e; font-size: 22px;">¡Hola ${clienteNombre}!</h2>
                    
                    <p style="margin: 20px 0; font-size: 16px; line-height: 1.6;">Hemos recibido tu pedido <strong>#${numeroOrden}</strong>.</p>
                    
                    ${emailResumenHTML}

                    <p style="margin: 20px 0; font-size: 16px; line-height: 1.6;">Nuestro equipo ya está en proceso de ingreso y gestión del pedido, te notificaremos unos días antes de terminar tus productos para coordinar la entrega.</p>

                    <br>
                    <p style="font-size: 15px; line-height: 1.6; color: #555; font-style: italic;">Gracias por confiar en Ikigai Diseño</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px; margin-bottom: 20px;">
                    
                    <div style="text-align: center; font-size: 12px; color: #999;">
                      <p>Este es un correo automático, favor no responder.</p>
                      <p>© 2026 Ikigai Diseño</p>
                    </div>
                  </div>
                `
              };

              // Si generamos exitosamente el PDF, lo adjuntamos
              if (boletaBase64) {
                  emailBody.attachments = [
                      {
                          "content": boletaBase64,
                          "mime_type": "application/pdf",
                          "name": "Boleta_Ikigai_" + boletaFolio + ".pdf"
                      }
                  ];
              }

              await fetch('https://api.zeptomail.com/v1.1/email', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': zeptoToken
                },
                body: JSON.stringify(emailBody)
              });
              console.log("Correo de confirmación enviado.");
            }
          } catch (mailError) {
            console.error("Error al enviar correo con ZeptoMail:", mailError);
          }
        }
      }
      return {
        statusCode: 302,
        headers: { Location: `/?pago=exito&orden=${commitResponse.buy_order}` }
      };
    } else {
      // Pago Rechazado
      if (pedidoData) {
        await supabase.from('pedidos')
          .update({ transbank_status: 'REJECTED' })
          .eq('id', pedidoData.id);
      }
      return {
        statusCode: 302,
        headers: { Location: '/?pago=rechazado' }
      };
    }

  } catch (error) {
    console.error("Error confirm transaction:", error);
    return {
      statusCode: 302,
      headers: { Location: '/?pago=error' }
    };
  }
};
