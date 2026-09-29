const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==========================================
// CONFIGURACIÓN DEL USUARIO
// ==========================================
const SIMPLE_API_KEY = "6195-R670-6395-1457-1754"; 
const CERT_PASSWORD = "8511";
const CERT_FILE_NAME = "19209623-5.pfx"; 
const RUT_CERTIFICADO = "19209623-5";
const RUT_EMISOR = "78425423-2"; // RUT de Ikigai
// ==========================================

async function empaquetarYEnviar() {
    console.log("Iniciando proceso de empaquetado (Sobre) y envío al SII...");

    const certPath = path.join(__dirname, CERT_FILE_NAME);
    if (!fs.existsSync(certPath)) return console.error(`❌ ERROR: No se encuentra el certificado ${certPath}`);

    // Buscar las 5 boletas generadas
    const boletasFiles = [];
    for (let i = 1; i <= 5; i++) {
        const file = path.join(__dirname, `Boleta_Generada_Caso${i}.xml`);
        if (!fs.existsSync(file)) {
            return console.error(`❌ ERROR: No se encuentra la boleta ${file}. Debes correr certificacion_boletas.js primero para que se generen las 5 boletas.`);
        }
        boletasFiles.push(file);
    }

    const fechaHoy = new Date().toISOString().split('T')[0];

    // ==========================================
    // PASO 1: GENERAR SOBRE DE ENVÍO
    // ==========================================
    console.log("\n📦 PASO 1: Generando Sobre de Envío (EnvioBoleta)...");
    
    const payloadGenerar = {
        "Certificado": { "Password": CERT_PASSWORD, "Rut": RUT_CERTIFICADO },
        "Caratula": {
            "RutEmisor": RUT_EMISOR,
            "RutReceptor": "60803000-K", // RUT del SII para envíos de boletas
            "FechaResolucion": fechaHoy, // Para certificación, suele ser la fecha actual
            "NumeroResolucion": 0 // 0 indica que es ambiente de certificación
        }
    };

    const tempJsonGenerar = path.join(__dirname, "payload_generar_sobre.json");
    fs.writeFileSync(tempJsonGenerar, JSON.stringify(payloadGenerar));

    // Construir el comando curl para generar el sobre
    // Debe ir primero el input, luego el certificado, y luego las boletas en orden.
    let curlGenerar = `curl.exe -s -X POST "https://api.simpleapi.cl/api/v1/envio/generar" ` +
                      `-H "Authorization: ${SIMPLE_API_KEY}" ` +
                      `-F "input=<${tempJsonGenerar}" ` +
                      `-F "files=@${certPath}"`;

    for (const boleta of boletasFiles) {
        curlGenerar += ` -F "files=@${boleta}"`;
    }

    const sobreXmlPath = path.join(__dirname, "Sobre_Envio_Boletas.xml");

    try {
        const stdout = execSync(curlGenerar, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        
        // Verificamos si la respuesta es el XML del sobre (empieza con <EnvioBoleta o similar)
        if (stdout.includes('<EnvioBoleta') || stdout.includes('<SetDTE')) {
            fs.writeFileSync(sobreXmlPath, stdout);
            console.log("✅ Sobre generado correctamente y guardado como Sobre_Envio_Boletas.xml");
        } else {
            console.error("❌ ERROR al generar el sobre:", stdout);
            return;
        }
    } catch (e) {
        console.error("❌ EXCEPCIÓN AL GENERAR SOBRE:", e.message);
        if (e.stdout) console.log(e.stdout.toString());
        return;
    } finally {
        if (fs.existsSync(tempJsonGenerar)) fs.unlinkSync(tempJsonGenerar);
    }

    // ==========================================
    // PASO 2: ENVIAR AL SII
    // ==========================================
    console.log("\n🚀 PASO 2: Enviando el Sobre al SII...");

    const payloadEnviar = {
        "Certificado": { "Password": CERT_PASSWORD, "Rut": RUT_CERTIFICADO },
        "Ambiente": 0, // 0 = Certificación
        "Tipo": 2 // 2 = EnvioBoleta
    };

    const tempJsonEnviar = path.join(__dirname, "payload_enviar_sii.json");
    fs.writeFileSync(tempJsonEnviar, JSON.stringify(payloadEnviar));

    const curlEnviar = `curl.exe -s -X POST "https://api.simpleapi.cl/api/v1/envio/enviar" ` +
                       `-H "Authorization: ${SIMPLE_API_KEY}" ` +
                       `-F "input=<${tempJsonEnviar}" ` +
                       `-F "files=@${certPath}" ` +
                       `-F "files=@${sobreXmlPath}"`;

    try {
        const stdout2 = execSync(curlEnviar, { encoding: 'utf8' });
        
        try {
            const data = JSON.parse(stdout2);
            if (data.trackId) {
                console.log("\n🎉 ¡ENVÍO EXITOSO AL SII!");
                console.log("==========================================");
                console.log(`TRACK ID: ${data.trackId}`);
                console.log("==========================================");
                console.log("Guarda este número. Debes ingresarlo en la página del SII para solicitar tu revisión.");
            } else {
                console.error("❌ ERROR al enviar al SII:", JSON.stringify(data, null, 2));
            }
        } catch (jsonErr) {
            console.error("❌ ERROR (La respuesta no fue JSON):", stdout2);
        }
    } catch (e) {
        console.error("❌ EXCEPCIÓN AL ENVIAR AL SII:", e.message);
        if (e.stdout) console.log(e.stdout.toString());
    } finally {
        if (fs.existsSync(tempJsonEnviar)) fs.unlinkSync(tempJsonEnviar);
    }
}

empaquetarYEnviar();
