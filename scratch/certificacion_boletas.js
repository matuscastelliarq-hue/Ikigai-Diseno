const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// CONFIGURACIÓN DEL USUARIO
// ==========================================
const SIMPLE_API_KEY = "6195-R670-6395-1457-1754"; 
const CERT_PASSWORD = "8511";
const CERT_FILE_NAME = "19209623-5.pfx"; 
const CAF_FILE_NAME = "FoliosSII78425423393120269171240.xml";
const RUT_CERTIFICADO = "19209623-5";
// ==========================================

// Extraer el folio inicial del CAF
const cafContent = fs.readFileSync(path.join(__dirname, CAF_FILE_NAME), 'utf8');
const desdeMatch = cafContent.match(/<D>(\d+)<\/D>/);
const folioInicial = desdeMatch ? parseInt(desdeMatch[1], 10) : 1;
console.log(`\n📄 CAF Detectado: Rango comienza en Folio ${folioInicial}`);

const rutEmisor = "78425423-2"; // RUT de Ikigai
const fechaHoy = new Date().toISOString().split('T')[0];

async function enviarCasos() {
    console.log("Iniciando envío de casos de certificación a SimpleAPI mediante curl.exe...");
    
    const certPath = path.join(__dirname, CERT_FILE_NAME);
    const cafPath = path.join(__dirname, CAF_FILE_NAME);
    
    if (!fs.existsSync(certPath)) return console.error(`❌ ERROR: No se encuentra el certificado ${certPath}`);
    if (!fs.existsSync(cafPath)) return console.error(`❌ ERROR: No se encuentra el CAF ${cafPath}`);

    const casos = [
        {
            // CASO 1
            "Documento": {
                "Encabezado": {
                    "IdentificacionDTE": { "TipoDTE": 39, "Folio": folioInicial, "FechaEmision": fechaHoy, "IndicadorServicio": 3 },
                    "Emisor": { "Rut": rutEmisor, "RazonSocialBoleta": "Ikigai Diseno", "GiroBoleta": "Muebles", "DireccionOrigen": "Taller", "ComunaOrigen": "Santiago" },
                    "Receptor": { "Rut": "66666666-6" }
                },
                "Detalles": [
                    { "Nombre": "Cambio de aceite", "Cantidad": 1, "Precio": 19900, "MontoItem": 19900, "IndicadorExento": 0 },
                    { "Nombre": "Alineacion y balanceo", "Cantidad": 1, "Precio": 9900, "MontoItem": 9900, "IndicadorExento": 0 }
                ],
                "Referencias": [{ "NroLinRef": 1, "TipoDocumento": "SET", "CodigoReferencia": "SET", "RazonReferencia": "CASO-1" }]
            },
            "Certificado": { "Rut": RUT_CERTIFICADO, "Password": CERT_PASSWORD }
        },
        {
            // CASO 2
            "Documento": {
                "Encabezado": {
                    "IdentificacionDTE": { "TipoDTE": 39, "Folio": folioInicial + 1, "FechaEmision": fechaHoy, "IndicadorServicio": 3 },
                    "Emisor": { "Rut": rutEmisor, "RazonSocialBoleta": "Ikigai Diseno", "GiroBoleta": "Muebles", "DireccionOrigen": "Taller", "ComunaOrigen": "Santiago" },
                    "Receptor": { "Rut": "66666666-6" }
                },
                "Detalles": [
                    { "Nombre": "Papel de regalo", "Cantidad": 17, "Precio": 120, "MontoItem": 2040, "IndicadorExento": 0 }
                ],
                "Referencias": [{ "NroLinRef": 1, "TipoDocumento": "SET", "CodigoReferencia": "SET", "RazonReferencia": "CASO-2" }]
            },
            "Certificado": { "Rut": RUT_CERTIFICADO, "Password": CERT_PASSWORD }
        },
        {
            // CASO 3
            "Documento": {
                "Encabezado": {
                    "IdentificacionDTE": { "TipoDTE": 39, "Folio": folioInicial + 2, "FechaEmision": fechaHoy, "IndicadorServicio": 3 },
                    "Emisor": { "Rut": rutEmisor, "RazonSocialBoleta": "Ikigai Diseno", "GiroBoleta": "Muebles", "DireccionOrigen": "Taller", "ComunaOrigen": "Santiago" },
                    "Receptor": { "Rut": "66666666-6" }
                },
                "Detalles": [
                    { "Nombre": "Sandwic", "Cantidad": 2, "Precio": 1500, "MontoItem": 3000, "IndicadorExento": 0 },
                    { "Nombre": "Bebida", "Cantidad": 2, "Precio": 550, "MontoItem": 1100, "IndicadorExento": 0 }
                ],
                "Referencias": [{ "NroLinRef": 1, "TipoDocumento": "SET", "CodigoReferencia": "SET", "RazonReferencia": "CASO-3" }]
            },
            "Certificado": { "Rut": RUT_CERTIFICADO, "Password": CERT_PASSWORD }
        },
        {
            // CASO 4
            "Documento": {
                "Encabezado": {
                    "IdentificacionDTE": { "TipoDTE": 39, "Folio": folioInicial + 3, "FechaEmision": fechaHoy, "IndicadorServicio": 3 },
                    "Emisor": { "Rut": rutEmisor, "RazonSocialBoleta": "Ikigai Diseno", "GiroBoleta": "Muebles", "DireccionOrigen": "Taller", "ComunaOrigen": "Santiago" },
                    "Receptor": { "Rut": "66666666-6" }
                },
                "Detalles": [
                    { "Nombre": "item afecto 1", "Cantidad": 8, "Precio": 1590, "MontoItem": 12720, "IndicadorExento": 0 },
                    { "Nombre": "item exento 2", "Cantidad": 2, "Precio": 1000, "MontoItem": 2000, "IndicadorExento": 1 }
                ],
                "Referencias": [{ "NroLinRef": 1, "TipoDocumento": "SET", "CodigoReferencia": "SET", "RazonReferencia": "CASO-4" }]
            },
            "Certificado": { "Rut": RUT_CERTIFICADO, "Password": CERT_PASSWORD }
        },
        {
            // CASO 5
            "Documento": {
                "Encabezado": {
                    "IdentificacionDTE": { "TipoDTE": 39, "Folio": folioInicial + 4, "FechaEmision": fechaHoy, "IndicadorServicio": 3 },
                    "Emisor": { "Rut": rutEmisor, "RazonSocialBoleta": "Ikigai Diseno", "GiroBoleta": "Muebles", "DireccionOrigen": "Taller", "ComunaOrigen": "Santiago" },
                    "Receptor": { "Rut": "66666666-6" }
                },
                "Detalles": [
                    { "Nombre": "Arroz", "Cantidad": 5, "UnidadMedida": "Kg", "Precio": 700, "MontoItem": 3500, "IndicadorExento": 0 }
                ],
                "Referencias": [{ "NroLinRef": 1, "TipoDocumento": "SET", "CodigoReferencia": "SET", "RazonReferencia": "CASO-5" }]
            },
            "Certificado": { "Rut": RUT_CERTIFICADO, "Password": CERT_PASSWORD }
        }
    ];

    const url = 'https://api.simpleapi.cl/api/v1/dte/generar';
    const authHeader = SIMPLE_API_KEY;

    for (let i = 0; i < casos.length; i++) {
        const payload = casos[i];
        
        let mntTotal = 0;
        let mntExe = 0;
        payload.Documento.Detalles.forEach(det => {
            if (det.IndicadorExento === 1) {
                mntExe += det.MontoItem;
            } else {
                mntTotal += det.MontoItem; 
            }
        });
        mntTotal += mntExe;

        payload.Documento.Encabezado.Totales = { "MontoTotal": mntTotal };
        if (mntExe > 0) {
            payload.Documento.Encabezado.Totales.MontoExento = mntExe;
            payload.Documento.Encabezado.Totales.MontoNeto = mntTotal - mntExe;
        } else {
            payload.Documento.Encabezado.Totales.MontoNeto = Math.round(mntTotal / 1.19);
            payload.Documento.Encabezado.Totales.IVA = mntTotal - payload.Documento.Encabezado.Totales.MontoNeto;
        }

        console.log(`\nEnviando CASO-${i + 1} con Folio ${i + 1}...`);
        
        // Escribir el payload a un archivo temporal para curl
        const tempJsonPath = path.join(__dirname, `payload_${i}.json`);
        fs.writeFileSync(tempJsonPath, JSON.stringify(payload));

        try {
            // Ejecutar curl.exe construyendo el multipart form data de forma perfecta
            const curlCmd = `curl.exe -s -X POST "${url}" -H "Authorization: ${authHeader}" -F "input=<${tempJsonPath}" -F "files=@${certPath}" -F "files=@${cafPath}"`;
            
            const stdout = execSync(curlCmd, { encoding: 'utf8' });
            
            try {
                // Primero intentamos parsearlo como JSON (por si hay error o trackId)
                const data = JSON.parse(stdout);
                if (!data.error && data.folio) {
                    console.log(`✅ CASO-${i + 1} EXITOSO: Folio ${data.folio} emitido.`);
                } else {
                    console.error(`❌ CASO-${i + 1} ERROR:`, JSON.stringify(data, null, 2));
                }
            } catch (jsonErr) {
                // Si no es JSON, verificamos si es el XML de la boleta generada exitosamente
                if (stdout.includes('<DTE') && stdout.includes('<Documento')) {
                    console.log(`✅ CASO-${i + 1} EXITOSO: DTE Generado correctamente (Boleta folio ${i + 1}).`);
                    // Guardamos el XML generado por si el usuario lo necesita
                    const xmlPath = path.join(__dirname, `Boleta_Generada_Caso${i + 1}.xml`);
                    fs.writeFileSync(xmlPath, stdout);
                } else {
                    console.error(`❌ CASO-${i + 1} ERROR (Respuesta desconocida):`, stdout);
                }
            }

        } catch (e) {
            console.error(`❌ CASO-${i + 1} EXCEPCIÓN AL EJECUTAR CURL:`, e.message);
            if (e.stdout) console.log("CURL Output:", e.stdout.toString());
            if (e.stderr) console.log("CURL Error:", e.stderr.toString());
        }
        
        // Limpiar archivo temporal
        if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);

        // Esperar 1 segundo por rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n🚀 Proceso finalizado.");
}

enviarCasos();
