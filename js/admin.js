(() => {
const supabase = window.supabaseClient;

// State
let activeTab = 'dashboard';
let catalogData = {};
let productsList = [];
let materialsList = [];
let recipesList = [];
let pedidosList = [];
let lineasList = [];

setTimeout(async () => {
    if (!localStorage.getItem('finanzas_cleared_v2')) {
        try {
            await window.supabaseClient.from('finanzas').delete().neq('id', 'dummy');
            localStorage.setItem('finanzas_cleared_v2', 'true');
            console.log('Finanzas limpiadas v2');
            location.reload();
        } catch(e) {}
    }
}, 3000);

let finanzasList = [];
let finanzasChartInstance = null;
let diasBaseA = 4;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize global config before rendering tabs
    await loadConfig();
    
    // Initial fetch of all tables
    await refreshAllData();

    // Clean up test data if any
    await deleteUgandan();
    await deleteUgandanFinanzas();
    await cleanGhostFinanzas();

    // Temporal insertion of missing products (Desactivado para evitar sobreescritura)
    // await insertMissingProducts();

    // Listen to tab switch events
    window.addEventListener('tabswitched', (e) => {
        activeTab = e.detail.tab;
        renderActiveTab();
    });

    // Populate local data button
    const btnPoblar = document.getElementById('btn-poblar-db');
    if (btnPoblar) {
        btnPoblar.addEventListener('click', poblarBaseDeDatos);
    }

    // Initialize drag and drop globally
    window.allowDrop = allowDrop;
    window.drag = drag;
    window.drop = drop;

    // Initial render
    renderActiveTab();
});

// Load configuration (A parameter)
async function loadConfig() {
    try {
        const { data, error } = await supabase
            .from('configuracion')
            .select('*')
            .eq('clave', 'dias_base_a')
            .maybeSingle();

        if (error) throw error;

        if (data) {
            diasBaseA = Number(data.valor);
            const inputA = document.getElementById('config-a');
            if (inputA) inputA.value = diasBaseA;
        } else {
            // Seed config if missing
            await supabase
                .from('configuracion')
                .insert({ clave: 'dias_base_a', valor: '4' });
        }
    } catch (e) {
        console.error("Error cargando configuración:", e);
    }
}

// Temporal cleanup
async function deleteUgandan() {
    try {
        const { data: prodData } = await supabase.from('productos').select('id').ilike('nombre', '%ugandan%');
        if (prodData && prodData.length > 0) {
            for (const prod of prodData) {
                const { data: items } = await supabase.from('pedido_items').select('id, pedido_id').eq('producto_id', prod.id);
                if (items && items.length > 0) {
                    for (const item of items) {
                        await supabase.from('pedido_items').delete().eq('id', item.id);
                        await supabase.from('pedidos').delete().eq('id', item.pedido_id);
                    }
                }
                await supabase.from('productos').delete().eq('id', prod.id);
            }
            alert("Producto de prueba 'ugandan knuckles' eliminado de la base de datos y pedidos activos.");
            await refreshAllData();
        }
    } catch(e) { console.error("Error cleaning up ugandan:", e); }
}

async function deleteUgandanFinanzas() {
    try {
        const { data: testFinanzas } = await supabase.from('finanzas').select('id, monto').eq('monto', 50);
        if (testFinanzas && testFinanzas.length > 0) {
            for (const fin of testFinanzas) {
                await supabase.from('finanzas').delete().eq('id', fin.id);
            }
            console.log("Transacción de prueba de $50 eliminada de finanzas.");
            await refreshAllData();
        }
    } catch(e) { console.error("Error cleaning up test finances:", e); }
}

async function cleanGhostFinanzas() {
    try {
        const { data: finanzas } = await supabase.from('finanzas').select('id, descripcion').ilike('descripcion', 'Pedido #% recibido');
        if (finanzas && finanzas.length > 0) {
            const { data: pedidos } = await supabase.from('pedidos').select('id');
            const validIds = pedidos ? pedidos.map(p => p.id.substring(0, 8)) : [];
            let deletedAny = false;
            
            for (const fin of finanzas) {
                const match = fin.descripcion.match(/Pedido #([a-fA-F0-9]{8}) recibido/i);
                if (match && match[1]) {
                    if (!validIds.includes(match[1])) {
                        await supabase.from('finanzas').delete().eq('id', fin.id);
                        deletedAny = true;
                    }
                }
            }
            if (deletedAny) {
                console.log("Se limpiaron operaciones de pedidos fantasma de las finanzas.");
                await refreshAllData();
            }
        }
    } catch(e) { console.error("Error cleaning ghost finanzas", e); }
}

window.poblarBaseDeDatos = async function() {
    const btn = document.getElementById('btn-poblar');
    const status = document.getElementById('poblar-status');
    
    const isConfirmed = confirm("⚠️ ADVERTENCIA: Esta acción sobreescribirá todos los precios, medidas y materiales de la base de datos con los valores por defecto del código fuente. ¡Perderás cualquier cambio que hayas hecho a mano!\n\n¿Estás absolutamente seguro de querer continuar?");
    if (!isConfirmed) return;

    if (btn) btn.disabled = true;
    if (status) {
        status.style.color = 'var(--text-main)';
        status.innerText = 'Poblando base de datos... (esto puede tomar unos segundos)';
    }

    try {
        // 1. Populate Lines and Products
        for (const key in catalogData) {
            const linea = catalogData[key];

            // A) Upsert Line
            const { error: errLinea } = await supabase
            .from('lineas')
            .upsert({ id: linea.id, titulo: linea.titulo });
            
            if (errLinea) throw errLinea;

            // B) Upsert Products
            for (const prod of linea.productos) {
                const { error: errProd } = await supabase
                    .from('productos')
                    .upsert({
                        id: prod.id,
                        linea_id: linea.id,
                        nombre: prod.nombre,
                        precio: prod.precio,
                        medidas: prod.medidas || '',
                        material: prod.material || '',
                        imagenes: prod.imagenes || [],
                        stock_base: 0
                    });
                if (errProd) throw errProd;
            }
        }
        
        await refreshAllData();
        if (status) {
            status.style.color = 'var(--success)';
            status.innerText = 'Base de datos poblada exitosamente.';
        }
    } catch (err) {
        console.error(err);
        if (status) {
            status.style.color = 'var(--danger)';
            status.innerText = 'Error al poblar la base de datos.';
        }
    } finally {
        if (btn) btn.disabled = false;
    }
};

// Temporal insertion of missing products
async function insertMissingProducts() {
    try {
        let missingFound = false;
        for (const key in catalogData) {
            const linea = catalogData[key];
            for (const prod of linea.productos) {
                const exists = productsList.find(p => p.id === prod.id);
                if (!exists) {
                    console.log("Insertando producto faltante:", prod.nombre);
                    missingFound = true;
                    await supabase.from('productos').upsert({
                        id: prod.id,
                        linea_id: linea.id,
                        nombre: prod.nombre,
                        precio: prod.precio,
                        medidas: prod.medidas || '',
                        material: prod.material || '',
                        imagenes: prod.imagenes || [],
                        stock_base: 0
                    });
                }
            }
        }
        if (missingFound) {
            alert("Se han restaurado los productos faltantes en la base de datos (Ej: Mesa N, Lámparas, etc.).");
            await refreshAllData();
            renderActiveTab();
        }
    } catch(e) { console.error("Error inserting missing products:", e); }
}

// Fetch all data from tables
async function refreshAllData() {
    try {
        // Fetch Lines
        const { data: lineas } = await supabase.from('lineas').select('*').order('titulo');
        lineasList = lineas || [];

        // Fetch Products
        const { data: productos } = await supabase.from('productos').select('*').order('nombre');
        productsList = productos || [];



        // Fetch Finance entries
        const { data: finanzas } = await supabase.from('finanzas').select('*').order('fecha', { ascending: false });
        finanzasList = finanzas || [];

        // Fetch configuracion global
        try {
            const { data: conf } = await supabase.from('configuracion').select('*').eq('id', 1).single();
            if (conf && conf.dias_aplazamiento !== undefined) {
                window.globalDiasAplazamiento = conf.dias_aplazamiento;
            } else {
                window.globalDiasAplazamiento = 0;
            }
        } catch(e) {
            window.globalDiasAplazamiento = 0;
        }

        // Fetch Pedidos with items and client details
        const { data: pedidos, error } = await supabase
            .from('pedidos')
            .select(`
                id, orden_serial, transbank_status, estado, total, fecha_ingreso, fecha_estimada_entrega, notas, cliente_id, boleta_folio, boleta_error,
                clientes ( nombre, email, telefono ),
                pedido_items ( id, producto_id, cantidad, barniz, precio_unitario )
            `)
            .order('fecha_ingreso', { ascending: true });
        
        if (error) throw error;
        pedidosList = pedidos || [];

        // Run calculations
        calculateEstimatedDates();
    } catch (error) {
        console.error("Error refrescando datos de Supabase:", error);
    }
}

// Render active tab views
function renderActiveTab() {
    switch (activeTab) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'productos':
            renderProductsTable();
            break;
        case 'pedidos':
            renderKanban();
            break;
        case 'inventario':
            renderStockTable();
            break;
        case 'analiticas':
            if (window.refreshAnaliticas) window.refreshAnaliticas();
            break;
        case 'finanzas':
            renderFinance();
            break;
        case 'cadena_procesos':
            renderCadenaProcesos();
            break;
        case 'ajustes':
            // Config values loaded on start
            break;
    }
}

/* ==========================================
   1. DASHBOARD MODULE
   ========================================== */
function renderDashboard() {
    // Pedidos activos (diferentes a e) Despacho)
    const activos = pedidosList.filter(p => p.estado !== 'e) Despacho');
    document.getElementById('kpi-pedidos-activos').innerText = activos.length;

    // Calcular Utilidad General
    let ingresosBrutos = 0;
    let descuentosLegalesTotales = 0;
    let costosVariablesTotales = 0;
    
    const pedidosReales = pedidosList.filter(p => p.total > 0);
    pedidosReales.forEach(pedido => {
        const ingreso = Number(pedido.total);
        ingresosBrutos += ingreso;
        
        const metodo = pedido.metodo_pago;
        const cvar = Number(pedido.costo_variable || 0);
        
        const iva = ingreso * 0.19;
        const tbkRate = metodo === 'debito' ? 0.021 : 0.028;
        const transbank = ingreso * tbkRate;
        
        descuentosLegalesTotales += (iva + transbank);
        costosVariablesTotales += cvar;
    });

    const fijosPagados = finanzasList.filter(f => f.categoria === 'costo_fijo').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const utilidadGeneral = ingresosBrutos - descuentosLegalesTotales - costosVariablesTotales - fijosPagados;

    const kpiGanancia = document.getElementById('kpi-ganancia');
    if (kpiGanancia) {
        kpiGanancia.innerText = '$' + Math.round(utilidadGeneral).toLocaleString('es-CL');
        kpiGanancia.style.color = utilidadGeneral >= 0 ? 'var(--success)' : 'var(--danger)';
    }

    if (productsList.length === 0) {
        alertsContainer.innerHTML = `
            <div style="background-color:rgba(16,185,129,0.1); border-left:4px solid var(--success); padding:15px; border-radius:6px;">
                <strong style="color:#a7f3d0; display:block; margin-bottom:5px;">Todo en Orden</strong>
                <p style="color:var(--text-muted); font-size:0.9rem;">El catálogo de productos está vacío o cargando.</p>
            </div>
        `;
    }

    // Alertar sobre pedidos retrasados o en cuello de botella
    const timeline = computeProductionTimeline(pedidosList, diasBaseA);
    const now = new Date();
    let retrasados = 0;
    for (const pedId in timeline) {
        if (timeline[pedId].deliveryDate < now) {
            retrasados++;
        }
    }

    if (retrasados > 0) {
        alertsContainer.innerHTML += `
            <div style="background-color:rgba(245,158,11,0.1); border-left:4px solid var(--warning); padding:15px; border-radius:6px;">
                <strong style="color:#fde68a; display:block; margin-bottom:5px;">Pedidos con retraso estimado</strong>
                <p style="color:var(--text-muted); font-size:0.9rem;">Hay <strong>${retrasados}</strong> pedidos activos cuyas fechas estimadas de entrega superan la fecha actual debido a la cola de taller.</p>
            </div>
        `;
    }
}

/* ==========================================
   2. PRODUCTOS MODULE
   ========================================== */
function renderProductsTable() {
    const tbody = document.querySelector('#table-productos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (productsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No hay productos registrados en Supabase.</td></tr>';
        return;
    }

    // Group products by linea based on the order in catalogData
    const grouped = {};
    const orderedLineKeys = Object.keys(catalogData); // ['zen', 'cnc', 'contemporaneo', 'decoracion']
    
    orderedLineKeys.forEach(key => {
        const l = lineasList.find(line => line.id === key);
        if (l) {
            grouped[key] = { linea: l, productos: [] };
        }
    });
    // Ensure any lines not in catalogData are still included
    lineasList.forEach(l => { 
        if (!grouped[l.id]) grouped[l.id] = { linea: l, productos: [] }; 
    });
    grouped['sin-linea'] = { linea: { titulo: 'Sin línea' }, productos: [] };

    productsList.forEach(prod => {
        if (prod.linea_id && grouped[prod.linea_id]) {
            grouped[prod.linea_id].productos.push(prod);
        } else {
            grouped['sin-linea'].productos.push(prod);
        }
    });

    const orderToPrint = ['zen', 'cnc', 'contemporaneo', 'decoracion', 'sin-linea'];
    for (const key of orderToPrint) {
        if (!grouped[key]) continue;
        const group = grouped[key];
        if (group.productos.length === 0) continue;

        const orderedKeys = [
            // Línea ZEN
            'Arrimo ZEN', 'Repisa ZEN', 'Mesa Plinto', 'Sillón ZEN 2 cuerpos', 'Sillón ZEN 1 cuerpo', 'Mesa OVAL', 'Mesa ZEN',
            // Línea CNC
            'Escritorio Pupitre', 'Repisa NET', 'Mesa Triqueta', 'Sitial N', 'Promo Sitial N', 'Piso Eslinga',
            // Línea CONTEMPORÁNEO
            'Silla Yakuza', 'Promo Silla Yakuza', 'Recibidor Giraffe', 'Banqueta V', 'Repisa T', 'Mesa N', 'Promo Mesa N', 'Arrimo RAW', 'Mesa RAW',
            // Decoración
            'Lámpara ZEN', 'Lámpara Origami', 'Lámpara TRI', 'Portavinos X', 'Macetero ZEN', 'Portavelas ZEN', 'Marcapáginas Van Gogh'
        ];

        group.productos.sort((a, b) => {
            let indexA = orderedKeys.indexOf(a.nombre);
            let indexB = orderedKeys.indexOf(b.nombre);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            return indexA - indexB;
        });

        // Header for the line
        const headerTr = document.createElement('tr');
        headerTr.style.backgroundColor = 'var(--bg-sidebar)';
        headerTr.innerHTML = `<td colspan="6" style="font-weight:600; color:var(--accent); font-size: 1.1rem; padding-top: 20px; border-bottom: 2px solid var(--accent);">${group.linea.titulo}</td>`;
        tbody.appendChild(headerTr);

        // Products for the line
        group.productos.forEach(prod => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${prod.id}</code></td>
                <td><strong>${prod.nombre}</strong></td>
                <td>${group.linea.titulo}</td>
                <td>${prod.medidas || '-'}</td>
                <td>$${Number(prod.precio).toLocaleString('es-CL')}</td>
                <td>
                    <button onclick="openProductModal(true, '${prod.id}')" style="padding: 5px 10px; font-size: 0.8rem; background-color: var(--border); color: var(--text-main); margin-right:5px;">
                        <ion-icon name="create-outline"></ion-icon> Editar
                    </button>
                    <button class="danger" onclick="deleteProduct('${prod.id}')" style="padding: 5px 10px; font-size: 0.8rem;">
                        <ion-icon name="trash-outline"></ion-icon> Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

/* ==========================================
   X. CADENA DE PROCESOS MODULE
   ========================================== */
function renderCadenaProcesos() {
    const tbody = document.getElementById('tbody-procesos');
    if (!tbody) return;
    
    document.getElementById('input-dias-aplazamiento').value = window.globalDiasAplazamiento || 0;

    tbody.innerHTML = '';
    if (productsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No hay productos registrados en Supabase.</td></tr>';
        return;
    }

    const grouped = {};
    lineasList.forEach(l => grouped[l.id] = { linea: l, productos: [] });
    grouped['sin-linea'] = { linea: { titulo: 'Sin línea' }, productos: [] };

    productsList.forEach(prod => {
        if (prod.linea_id && grouped[prod.linea_id]) grouped[prod.linea_id].productos.push(prod);
        else grouped['sin-linea'].productos.push(prod);
    });

    const orderedLineKeys = ['zen', 'cnc', 'contemporaneo', 'decoracion'];

    const orderedKeys = [
        // ZEN
        'Arrimo ZEN', 'Repisa ZEN', 'Mesa Plinto', 'Sillón ZEN 2 cuerpos', 'Sillón ZEN 1 cuerpo', 'Mesa OVAL', 'Mesa ZEN',
        // CNC
        'Escritorio Pupitre', 'Repisa NET', 'Mesa Triqueta', 'Silla N', 'Piso Eslinga',
        // CONTEMPORÁNEO
        'Silla Yakuza', 'Recibidor Giraffe', 'Banqueta V', 'Repisa T', 'Mesa N', 'Arrimo RAW', 'Mesa RAW rodela',
        // DECORACIÓN
        'Lámpara ZEN', 'Lámpara Origami', 'Lámpara Pluma', 'Lámpara TRI', 'Portavinos X', 'Macetero ZEN'
    ];

    // Combine ordered lines and any leftovers
    const allLines = [...new Set([...orderedLineKeys, ...Object.keys(grouped)])];

    for (const key of allLines) {
        if (!grouped[key]) continue;
        const group = grouped[key];
        if (group.productos.length === 0) continue;

        group.productos.sort((a, b) => {
            let indexA = orderedKeys.indexOf(a.nombre);
            let indexB = orderedKeys.indexOf(b.nombre);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            return indexA - indexB;
        });

        const headerTr = document.createElement('tr');
        headerTr.style.backgroundColor = 'var(--bg-sidebar)';
        headerTr.innerHTML = `<td colspan="10" style="font-weight:600; color:var(--accent); font-size: 1rem; padding: 12px 8px; border-bottom: 2px solid var(--accent);">${group.linea.titulo}</td>`;
        tbody.appendChild(headerTr);

        group.productos.forEach(prod => {
            // Calculate initial sum
            const gm = prod.dias_gestion_material || 0;
            const cnc = prod.dias_corte_cnc || 0;
            const dt = prod.dias_despacho_taller || 0;
            const moA = prod.dias_mano_obra_a || 0;
            const sumTotal = gm + cnc + dt + moA;

            const isImported = false;
            let inputsHtml = '';
            
            if (isImported) {
                inputsHtml = `
                    <td style="padding: 6px 8px; text-align: center;" colspan="4"><span style="color:#999; font-size:0.85rem;">Importado (Sin proceso de taller)</span></td>
                    <td style="padding: 6px 8px; text-align: center;"><strong style="font-size: 1rem; color: var(--text-muted);">-</strong></td>
                `;
            } else {
                inputsHtml = `
                    <td style="padding: 6px 8px; text-align: center;"><input type="number" min="0" step="0.1" class="cp-input" data-id="${prod.id}" data-field="dias_gestion_material" value="${gm}" style="width: 45px; padding: 4px; border:1px solid var(--border); border-radius:4px; font-size: 0.85rem; text-align: center;" onchange="recalcSum('${prod.id}')"></td>
                    <td style="padding: 6px 8px; text-align: center;"><input type="number" min="0" step="0.1" class="cp-input" data-id="${prod.id}" data-field="dias_corte_cnc" value="${cnc}" style="width: 45px; padding: 4px; border:1px solid var(--border); border-radius:4px; font-size: 0.85rem; text-align: center;" onchange="recalcSum('${prod.id}')"></td>
                    <td style="padding: 6px 8px; text-align: center;"><input type="number" min="0" step="0.1" class="cp-input" data-id="${prod.id}" data-field="dias_despacho_taller" value="${dt}" style="width: 45px; padding: 4px; border:1px solid var(--border); border-radius:4px; font-size: 0.85rem; text-align: center;" onchange="recalcSum('${prod.id}')"></td>
                    <td style="padding: 6px 8px; text-align: center;"><input type="number" min="0" step="0.1" class="cp-input" data-id="${prod.id}" data-field="dias_mano_obra_a" value="${moA}" style="width: 45px; padding: 4px; border:1px solid var(--border); border-radius:4px; font-size: 0.85rem; text-align: center;" onchange="recalcSum('${prod.id}')"></td>
                    <td style="padding: 6px 8px; text-align: center;"><strong id="sum-${prod.id}" style="font-size: 1rem; color: var(--accent);">${sumTotal % 1 === 0 ? sumTotal : sumTotal.toFixed(1)}</strong></td>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 6px 8px; text-align: left;"><strong>${prod.nombre}</strong></td>
                ${inputsHtml}
            `;
            tbody.appendChild(tr);
        });
    }
}

window.recalcSum = function(prodId) {
    let sum = 0;
    const inputs = document.querySelectorAll('.cp-input[data-id="'+prodId+'"]');
    inputs.forEach(inp => {
        sum += parseFloat(inp.value) || 0;
    });
    
    const sumEl = document.getElementById('sum-'+prodId);
    if(sumEl) sumEl.innerText = (sum % 1 === 0 ? sum : sum.toFixed(1));
}

window.guardarCadenaProcesos = async function() {
    const btn = document.querySelector('#mod-cadena_procesos .header button');
    if(btn) { btn.disabled = true; btn.innerHTML = 'Guardando...'; }
    
    try {
        // Save global dias
        const aplazo = parseInt(document.getElementById('input-dias-aplazamiento').value) || 0;
        try {
            await supabase.from('configuracion').upsert({ id: 1, dias_aplazamiento: aplazo });
            window.globalDiasAplazamiento = aplazo;
        } catch(e) { console.error('Error saving config', e); }

        // Save products
        const inputs = document.querySelectorAll('.cp-input');
        const updates = {};
        
        inputs.forEach(input => {
            const id = input.getAttribute('data-id');
            const field = input.getAttribute('data-field');
            const val = parseFloat(input.value) || 0;
            
            if(!updates[id]) updates[id] = {};
            updates[id][field] = val;
        });
        
        for (const id in updates) {
            const { error } = await supabase.from('productos').update(updates[id]).eq('id', id);
            if (error) console.error('Error al guardar proceso para:', id, error);
        }
        
        alert("Tiempos de cadena de procesos actualizados correctamente.");
        await refreshAllData();
    } catch(err) {
        console.error(err);
        alert("Ocurrió un error al guardar los procesos.");
    } finally {
        if(btn) { btn.disabled = false; btn.innerHTML = '<ion-icon name="save-outline"></ion-icon> Guardar Cambios'; }
    }
}

// Global modal triggers for products
window.openProductModal = function(editMode = false, prodId = '') {
    const modal = document.getElementById('modal-producto');
    const form = document.getElementById('form-producto');
    const title = document.getElementById('modal-producto-titulo');
    
    // Populate lines dropdown
    const selectLinea = document.getElementById('prod-linea-id');
    selectLinea.innerHTML = '';
    lineasList.forEach(l => {
        selectLinea.innerHTML += `<option value="${l.id}">${l.titulo}</option>`;
    });

    form.reset();

    if (editMode) {
        title.innerText = "Editar Producto";
        document.getElementById('prod-edit-mode').value = "true";
        document.getElementById('prod-id').disabled = true;

        const prod = productsList.find(p => p.id === prodId);
        if (prod) {
            document.getElementById('prod-id').value = prod.id;
            document.getElementById('prod-nombre').value = prod.nombre;
            document.getElementById('prod-linea-id').value = prod.linea_id;
            document.getElementById('prod-precio').value = prod.precio;
            document.getElementById('prod-medidas').value = prod.medidas || '';
            document.getElementById('prod-material').value = prod.material || '';
            document.getElementById('prod-uso').value = prod.uso || '';
            document.getElementById('prod-descripcion').value = prod.descripcion || '';
            document.getElementById('prod-imagenes').value = (prod.imagenes || []).join(', ');
            document.getElementById('prod-stock-base').value = prod.stock_base !== undefined && prod.stock_base !== null ? prod.stock_base : 0;
            
            const isPromo = prod.nombre.startsWith('Promo');
            ['prod-descripcion', 'prod-medidas', 'prod-material', 'prod-uso', 'prod-imagenes', 'prod-stock-base'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentElement) {
                    el.parentElement.style.display = isPromo ? 'none' : 'block';
                }
            });
        }
    } else {
        title.innerText = "Nuevo Producto";
        document.getElementById('prod-edit-mode').value = "false";
        document.getElementById('prod-id').disabled = false;
        
        ['prod-descripcion', 'prod-medidas', 'prod-material', 'prod-uso', 'prod-imagenes', 'prod-stock-base'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentElement) {
                el.parentElement.style.display = 'block';
            }
        });
    }

    modal.classList.add('active');
};

window.closeProductModal = function() {
    document.getElementById('modal-producto').classList.remove('active');
};

window.saveProduct = async function(event) {
    event.preventDefault();
    const editMode = document.getElementById('prod-edit-mode').value === 'true';
    
    const id = document.getElementById('prod-id').value;
    const nombre = document.getElementById('prod-nombre').value;
    const linea_id = document.getElementById('prod-linea-id').value;
    const precio = Number(document.getElementById('prod-precio').value);
    const precio_2x = null; // Removed from modal, rely on distinct Promo product
    const medidas = document.getElementById('prod-medidas').value;
    const material = document.getElementById('prod-material').value;
    const uso = document.getElementById('prod-uso').value;
    const descripcion = document.getElementById('prod-descripcion').value;
    const stock_base = Number(document.getElementById('prod-stock-base').value);
    
    const imagenesRaw = document.getElementById('prod-imagenes').value;
    const imagenes = imagenesRaw ? imagenesRaw.split(',').map(img => img.trim()).filter(img => img !== '') : [];

    const productData = { id, nombre, linea_id, precio, precio_2x, medidas, material, uso, descripcion, imagenes, stock_base };

    try {
        const { error } = await supabase
            .from('productos')
            .upsert(productData, { onConflict: 'id' });

        if (error) throw error;

        alert("Producto guardado correctamente.");
        closeProductModal();
        await refreshAllData();
        renderProductsTable();
    } catch (e) {
        alert("Error al guardar producto: " + e.message);
    }
};

window.deleteProduct = async function(id) {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return;
    try {
        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await refreshAllData();
        renderProductsTable();
    } catch (e) {
        alert("Error al eliminar producto: " + e.message);
    }
};

/* ==========================================
   3. KANBAN MODULE (PRODUCTION / PEDIDOS)
   ========================================== */
function renderKanban() {
    const states = [
        { id: 'recibido', label: 'a) Recibido y gestión de materiales' },
        { id: 'cnc', label: 'b) CNC/Dimensionado' },
        { id: 'taller', label: 'c) Taller' },
        { id: 'despacho', label: 'd) Despacho' }
    ];

    // Clear columns
    states.forEach(state => {
        document.getElementById(`cards-${state.id}`).innerHTML = '';
        document.getElementById(`count-${state.id}`).innerText = '0';
    });

    const timeline = computeProductionTimeline(pedidosList, diasBaseA);

    pedidosList.forEach(pedido => {
        const stateConfig = states.find(s => s.label === pedido.estado);
        if (!stateConfig) return;

        const container = document.getElementById(`cards-${stateConfig.id}`);
        const countSpan = document.getElementById(`count-${stateConfig.id}`);
        
        countSpan.innerText = Number(countSpan.innerText) + 1;

        // Render card
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.setAttribute('ondragstart', `drag(event, '${pedido.id}')`);
        card.setAttribute('onclick', `openPedidoDetailModal('${pedido.id}')`);

        const itemsSummary = (pedido.pedido_items || []).map(i => {
            const prod = productsList.find(p => p.id === i.producto_id);
            return `${i.cantidad}x ${prod ? prod.nombre : 'Producto'}`;
        }).join(', ');

        const estDate = pedido.fecha_estimada_entrega ? new Date(pedido.fecha_estimada_entrega) : (timeline[pedido.id] ? timeline[pedido.id].deliveryDate : null);
        const estDateStr = estDate ? new Date(estDate).toLocaleDateString('es-CL') : 'Sin calcular';

        let warningBadge = '';

        // Mostrar orden correlativa si existe, si no, el ID corto
        const numeroOrden = pedido.orden_serial || pedido.id.substring(0, 8);

        card.innerHTML = `
            <h4>
                <span>#${numeroOrden}</span>
                <span class="kanban-card-price">$${Number(pedido.total).toLocaleString('es-CL')}</span>
            </h4>
            <div class="kanban-card-meta">
                <span><strong>Cliente:</strong> ${pedido.clientes?.nombre || 'Anónimo'}</span>
                <span><strong>Items:</strong> ${itemsSummary || 'Ninguno'}</span>
                <span><strong>Entrega Est:</strong> ${estDateStr}</span>
                ${warningBadge}
            </div>
            <div class="kanban-card-footer" onclick="event.stopPropagation()">
                <div class="kanban-card-actions">
                    ${getKanbanActions(pedido.id, pedido.estado)}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Renderizar el Calendario debajo del Kanban
    renderProductionCalendar(timeline);
}

function renderProductionCalendar(timeline) {
    let calendarContainer = document.getElementById('production-calendar');
    
    // Si no existe, crearlo y añadirlo después del board
    if (!calendarContainer) {
        calendarContainer = document.createElement('div');
        calendarContainer.id = 'production-calendar';
        calendarContainer.className = 'calendar-timeline-container';
        
        // Estilos para el calendario
        const style = document.createElement('style');
        style.innerHTML = `
            .calendar-timeline-container {
                margin-top: 40px;
                padding: 20px;
                background: var(--bg-card);
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                border: 1px solid var(--border);
                overflow-x: auto;
            }
            .calendar-timeline-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
                font-family: var(--font-primary);
                font-weight: 500;
                font-size: 1.2rem;
            }
            .timeline-months-wrapper {
                display: flex;
                gap: 20px;
                min-width: 800px;
            }
            .timeline-month {
                flex: 1;
                border: 1px solid var(--border);
                border-radius: 6px;
                overflow: hidden;
            }
            .timeline-month-title {
                background: var(--bg-sidebar);
                padding: 10px;
                text-align: center;
                font-weight: 600;
                color: var(--accent);
            }
            .timeline-weekdays {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                background: var(--bg-sidebar);
                border-top: 1px solid rgba(0,0,0,0.05);
                border-bottom: 1px solid var(--border);
            }
            .timeline-weekdays div {
                text-align: center;
                padding: 5px 0;
                font-weight: 600;
                font-size: 0.85rem;
                color: var(--text-muted);
            }
            .timeline-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                background: var(--bg-main);
                gap: 1px;
            }
            .timeline-day {
                background: #fff;
                min-height: 80px;
                padding: 5px;
                display: flex;
                flex-direction: column;
                position: relative;
            }
            .timeline-day.weekend {
                background: #fafafa;
            }
            .timeline-day.weekend .day-number {
                color: #d0d0d0;
            }
            .timeline-day.today {
                background: rgba(199, 156, 110, 0.05);
            }
            .timeline-day.today .day-number {
                background: var(--accent);
                color: #fff;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .day-number {
                font-size: 0.85rem;
                color: var(--text-muted);
                margin-bottom: 5px;
                font-weight: 500;
            }
            .day-badges {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .order-badge {
                font-size: 0.75rem;
                padding: 3px 6px;
                border-radius: 4px;
                color: #fff;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: transform 0.2s;
            }
            .order-badge:hover {
                transform: translateY(-2px);
            }
            .badge-gold { background: #d4af37; } /* Recibido */
            .badge-blue { background: #3498db; } /* CNC */
            .badge-red { background: #e74c3c; } /* Taller */
            .badge-green { background: #2ecc71; } /* Despacho */
            .badge-gray { background: #95a5a6; } /* Entregado u otros */
        `;
        document.head.appendChild(style);
        
        const kanbanSection = document.getElementById('mod-pedidos');
        kanbanSection.appendChild(calendarContainer);
    }
    
    // Nombres de los meses
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Fechas actuales
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    
    let html = `
        <div class="calendar-timeline-header" style="display: flex; align-items: center;">
            <ion-icon name="calendar-outline"></ion-icon> Fechas de Entrega Estimadas (Flujo de 3 meses)
            <button class="btn-secondary" style="margin-left: auto; font-size: 0.85rem; padding: 5px 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;" onclick="optimizarCola()">
                <ion-icon name="flash-outline"></ion-icon> Optimizar Cola
            </button>
        </div>
        <div class="timeline-months-wrapper">
    `;

    // Generar cuadrícula para mes actual y dos siguientes
    for (let i = 0; i < 3; i++) {
        let m = currentMonthIndex + i;
        let y = currentYear;
        if (m > 11) {
            m = m - 12;
            y++;
        }
        
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        
        html += `
            <div class="timeline-month">
                <div class="timeline-month-title">${monthNames[m]} ${y}</div>
                <div class="timeline-weekdays">
                    <div>L</div><div>M</div><div>W</div><div>J</div><div>V</div><div style="color:#d0d0d0;">S</div><div style="color:#d0d0d0;">D</div>
                </div>
                <div class="timeline-days">
        `;
        
        // Calcular días vacíos para alinear el día 1
        const firstDay = new Date(y, m, 1).getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const emptyDays = firstDay === 0 ? 6 : firstDay - 1;
        
        for (let e = 0; e < emptyDays; e++) {
            html += `<div class="timeline-day empty" style="background: transparent;"></div>`;
        }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = (d === now.getDate() && m === now.getMonth() && y === now.getFullYear());
            const dateStr = `${y}-${String(m+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const currentDayOfWeek = new Date(y, m, d).getDay();
            const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;
            
            html += `<div class="timeline-day ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" data-date="${dateStr}">
                        <div class="day-number">${d}</div>
                        <div class="day-badges" id="badges-${dateStr}"></div>
                     </div>`;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    calendarContainer.innerHTML = html;
    
    // Inyectar pedidos en sus fechas
    pedidosList.forEach(pedido => {
        // Ignoramos pedidos ya entregados/archivados o con pago no exitoso
        if (pedido.estado === 'e) Entregado') return;
        if (pedido.transbank_status === 'INITIALIZED' || pedido.transbank_status === 'REJECTED' || pedido.transbank_status === 'FAILED') return;
        
        // Obtener la fecha de entrega en hora local
        const estDateObj = pedido.fecha_estimada_entrega ? new Date(pedido.fecha_estimada_entrega) : (timeline[pedido.id] ? timeline[pedido.id].deliveryDate : null);
        if (!estDateObj) return; // No tiene fecha
        
        const yEst = estDateObj.getFullYear();
        const mEst = String(estDateObj.getMonth() + 1).padStart(2, '0');
        const dEst = String(estDateObj.getDate()).padStart(2, '0');
        const dateStr = `${yEst}-${mEst}-${dEst}`;
        
        const badgesContainer = document.getElementById(`badges-${dateStr}`);
        
        // Si la fecha cae dentro de los 3 meses generados
        if (badgesContainer) {
            let colorClass = 'badge-gray';
            if (pedido.estado.includes('Recibido')) colorClass = 'badge-gold';
            else if (pedido.estado.includes('CNC')) colorClass = 'badge-blue';
            else if (pedido.estado.includes('Taller')) colorClass = 'badge-red';
            else if (pedido.estado.includes('Despacho')) colorClass = 'badge-green';
            
            const num = pedido.orden_serial || pedido.id.substring(0, 4);
            
            const badge = document.createElement('div');
            badge.className = `order-badge ${colorClass}`;
            badge.innerHTML = `<ion-icon name="cube-outline"></ion-icon> #${num}`;
            badge.title = `Cliente: ${pedido.clientes?.nombre || 'Anónimo'}\nEtapa: ${pedido.estado}`;
            badge.onclick = () => openPedidoDetailModal(pedido.id);
            
            badgesContainer.appendChild(badge);
        }
    });
}

function getKanbanActions(pedidoId, estadoActual) {
    const states = [
        'a) Recibido y gestión de materiales',
        'b) CNC/Dimensionado',
        'c) Taller',
        'd) Despacho',
        'e) Entregado'
    ];

    const index = states.indexOf(estadoActual);
    let html = '';

    if (index > 0) {
        html += `<button class="btn-secondary" onclick="movePedidoState('${pedidoId}', '${states[index-1]}')"><ion-icon name="arrow-back-outline"></ion-icon></button>`;
    }
    if (index < states.length - 1) {
        html += `<button onclick="movePedidoState('${pedidoId}', '${states[index+1]}')"><ion-icon name="arrow-forward-outline"></ion-icon></button>`;
    }

    return html;
}

// Drag & Drop
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev, pedidoId) {
    ev.dataTransfer.setData("text/plain", pedidoId);
}

async function drop(ev, nuevoEstado) {
    ev.preventDefault();
    const pedidoId = ev.dataTransfer.getData("text/plain");
    if (pedidoId) {
        await window.movePedidoState(pedidoId, nuevoEstado);
    }
}

window.movePedidoState = async function(pedidoId, nuevoEstado) {
    try {
        const { error } = await supabase
            .from('pedidos')
            .update({ estado: nuevoEstado })
            .eq('id', pedidoId);

        if (error) throw error;

        await refreshAllData();
        renderActiveTab();
    } catch (e) {
        alert("Error al mover estado: " + e.message);
    }
}

// Modal Pedido Detail
window.openPedidoDetailModal = function(pedidoId) {
    const modal = document.getElementById('modal-pedido-detalle');
    const content = document.getElementById('pedido-detalle-content');
    
    const pedido = pedidosList.find(p => p.id === pedidoId);
    if (!pedido) return;

    const timeline = computeProductionTimeline(pedidosList, diasBaseA);
    const info = timeline[pedido.id];

    let itemsHtml = '';
    (pedido.pedido_items || []).forEach(item => {
        const prod = productsList.find(p => p.id === item.producto_id);
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <span>${item.cantidad}x ${prod ? prod.nombre : 'Producto'} (${item.barniz})</span>
                <strong>$${(item.precio_unitario * item.cantidad).toLocaleString('es-CL')}</strong>
            </div>
        `;
    });

    let notasRaw = pedido.notes || pedido.notas || '';
    let notasAdicionales = notasRaw;
    let metodoEntregaHtml = '';

    const metodoMatch = notasRaw.match(/Método de entrega:.*?(?=\n|$)/);
    const direccionMatch = notasRaw.match(/Dirección de envío:.*?(?=\n|$)/);

    if (metodoMatch) {
        metodoEntregaHtml += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.9rem; color:var(--text-main);">
            <span>${metodoMatch[0]}</span>
        </div>`;
        notasAdicionales = notasAdicionales.replace(metodoMatch[0], '');
    }
    if (direccionMatch) {
        metodoEntregaHtml += `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.85rem; color:var(--text-muted);">
            <span>${direccionMatch[0]}</span>
        </div>`;
        notasAdicionales = notasAdicionales.replace(direccionMatch[0], '');
    }
    
    notasAdicionales = notasAdicionales.replace(/Notas adicionales:\n?/, '').trim();
    if (!notasAdicionales) notasAdicionales = 'Sin notas adicionales';

    content.innerHTML = `
        <div>
            <h4 style="color:var(--accent);">Información del Cliente</h4>
            <p><strong>Nombre:</strong> ${pedido.clientes?.nombre || 'Anónimo'}</p>
            <p><strong>Email:</strong> ${pedido.clientes?.email || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${pedido.clientes?.telefono || 'N/A'}</p>
        </div>
        <div>
            <h4 style="color:var(--accent);">Detalle de Compra</h4>
            ${itemsHtml}
            ${metodoEntregaHtml}
            <div style="display:flex; justify-content:space-between; margin-top:10px; font-weight:bold; font-size:1.1rem; color:var(--text-main);">
                <span>Total:</span>
                <span>$${Number(pedido.total).toLocaleString('es-CL')}</span>
            </div>
        </div>
        <div>
            <h4 style="color:var(--accent);">Planificación y Producción</h4>
            <p><strong>Estado Actual:</strong> ${pedido.estado}</p>
            <p><strong>Fecha Ingreso:</strong> ${new Date(pedido.fecha_ingreso).toLocaleString('es-CL')}</p>
            <p><strong>Fecha Estimada Despacho:</strong> ${pedido.fecha_estimada_entrega ? new Date(pedido.fecha_estimada_entrega).toLocaleDateString('es-CL') : (info ? info.deliveryDate.toLocaleDateString('es-CL') : 'Pendiente')}</p>
            <p><strong>Total días hábiles acumulados:</strong> ${info ? info.totalDays : 0} días${info && info.discountApplied ? ' <em>- reducción de plazo de fabricación aplicado</em>' : ''}</p>
        </div>
        <div>
            <h4 style="color:var(--accent);">Notas de Pedido / Cotización</h4>
            <p style="background:transparent; padding:10px; border-radius:6px; font-style:italic; font-size:0.9rem; color:var(--text-main); border: 1px solid var(--border);">${notasAdicionales.replace(/\n/g, '<br>')}</p>
        </div>
        <div>
            <h4 style="color:var(--accent);">Boleta Electrónica</h4>
            ${pedido.boleta_folio ? 
                `<p style="color:var(--success); font-weight:bold;">Emitida (Folio ${pedido.boleta_folio})</p>` :
                (pedido.boleta_error ? 
                    `<p style="color:var(--danger);"><strong>Error en emisión:</strong> ${pedido.boleta_error}</p>` :
                    `<p style="color:var(--text-muted);">No intentada o pendiente</p>`
                )
            }
        </div>
        <div style="margin-top: 30px; border-top: 1px solid var(--border); padding-top: 15px; text-align: right;">
            <button class="danger" onclick="deletePedido('${pedido.id}')" style="padding: 10px 20px; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px;">
                <ion-icon name="trash-outline"></ion-icon> Eliminar Pedido
            </button>
        </div>
    `;

    modal.classList.add('active');
};

window.deletePedido = async function(pedidoId) {
    if(!confirm("¿Estás seguro de que deseas eliminar este pedido por completo? Esta acción es irreversible.")) return;
    try {
        const btn = document.querySelector('#modal-pedido-detalle button.danger');
        if (btn) btn.innerHTML = 'Eliminando...';
        
        await supabase.from('pedido_items').delete().eq('pedido_id', pedidoId);
        const { error } = await supabase.from('pedidos').delete().eq('id', pedidoId);
        if (error) throw error;
        
        alert("Pedido eliminado exitosamente.");
        window.closePedidoDetailModal();
        await refreshAllData();
        renderActiveTab();
    } catch (e) {
        alert("Error al eliminar pedido: " + e.message);
    }
};

window.closePedidoDetailModal = function() {
    document.getElementById('modal-pedido-detalle').classList.remove('active');
};

/* ==========================================
   4. INVENTARIO MODULE (STOCK & RECETAS)
   ========================================== */
/* ==========================================
   5. INVENTARIO MODULE (STOCK PRODUCTOS)
   ========================================== */
function renderStockTable() {
    const tbody = document.querySelector('#table-stock tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (productsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No hay productos registrados en Supabase.</td></tr>';
        return;
    }

    const orderedKeys = [
        // Línea ZEN
        'Arrimo ZEN', 'Repisa ZEN', 'Mesa Plinto', 'Sillón ZEN 2 cuerpos', 'Sillón ZEN 1 cuerpo', 'Mesa OVAL', 'Mesa ZEN',
        // Línea CNC
        'Escritorio Pupitre', 'Repisa NET', 'Mesa Triqueta', 'Sitial N',
        // Línea CONTEMPORÁNEO
        'Silla Yakuza', 'Recibidor Jiraffe', 'Banqueta V', 'Repisa T', 'Mesa N', 'Arrimo RAW', 'Mesa RAW',
        // Decoración
        'Lámpara ZEN', 'Lámpara Origami', 'Lámpara TRI', 'Portavinos X', 'Macetero ZEN'
    ];

    productsList.sort((a, b) => {
        let indexA = orderedKeys.indexOf(a.nombre);
        let indexB = orderedKeys.indexOf(b.nombre);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    productsList.forEach(prod => {
        const tr = document.createElement('tr');
        
        const line = lineasList.find(l => l.id === prod.linea_id);
        const lineName = line ? line.titulo : 'Sin línea';
        
        tr.innerHTML = `
            <td><strong>${prod.nombre}</strong> <span style="color:var(--text-muted); font-size: 0.8rem;">(${prod.id})</span></td>
            <td>${lineName}</td>
            <td style="text-align: center;">
                <input type="number" step="1" value="${prod.stock_base !== undefined && prod.stock_base !== null ? prod.stock_base : 0}" data-prod-id="${prod.id}" class="stock-input" style="width: 80px; padding: 5px; text-align: center; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-sidebar); color: var(--text-main);">
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.guardarStock = async function() {
    const inputs = document.querySelectorAll('.stock-input');
    const updates = [];

    inputs.forEach(input => {
        updates.push({
            id: input.getAttribute('data-prod-id'),
            stock_base: Number(input.value)
        });
    });

    if (updates.length === 0) return;

    try {
        const btn = document.querySelector('button[onclick="guardarStock()"]');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = 'Guardando...';
        btn.disabled = true;

        for (const update of updates) {
            await supabase.from('productos').update({ stock_base: update.stock_base }).eq('id', update.id);
        }

        alert('Stock actualizado exitosamente.');
        await refreshAllData();
        renderActiveTab();
        
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    } catch (e) {
        alert("Error al guardar el stock: " + e.message);
        console.error(e);
    }
};

/* ==========================================
   5. FINANZAS MODULE (TRANSACTIONS & CHARTS)
   ========================================== */
function renderFinance() {
    // 1. CARGAR CONFIGURACIÓN DE COSTOS FIJOS
    let fixedCostsConf = {};
    try {
        const confString = localStorage.getItem('finanzas_costos_fijos');
        if (confString) fixedCostsConf = JSON.parse(confString);
    } catch(e){}

    const ids = ['cf-mensual-elec', 'cf-mensual-pub', 'cf-mensual-man', 'cf-anual-imp', 'cf-anual-dom', 'cf-anual-ema'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && fixedCostsConf[id]) el.value = fixedCostsConf[id];
    });

    calcularTotalesFijos();

    // 2. RENDERIZAR TABLA DE PAGOS DE COSTOS FIJOS
    const tbodyPagos = document.getElementById('tbody-proximos-pagos');
    if (tbodyPagos) {
        tbodyPagos.innerHTML = '';
        const egresosFijos = finanzasList.filter(f => f.categoria === 'costo_fijo');
        
        if (egresosFijos.length === 0) {
            tbodyPagos.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No hay pagos registrados.</td></tr>';
        } else {
            egresosFijos.forEach(fin => {
                const tr = document.createElement('tr');
                const fecha = new Date(fin.fecha);
                
                let nextPayment = new Date(fecha);
                if (fin.descripcion && fin.descripcion.includes('(Anual)')) {
                    nextPayment.setFullYear(nextPayment.getFullYear() + 1);
                } else {
                    nextPayment.setMonth(nextPayment.getMonth() + 1);
                }

                const diffDays = Math.ceil((nextPayment - new Date()) / (1000 * 60 * 60 * 24));
                let nextPaymentHtml = `<span style="color:var(--text-main);">${nextPayment.toLocaleDateString('es-CL')}</span>`;
                if (diffDays <= 5) {
                    nextPaymentHtml = `<span style="color:var(--danger); font-weight:bold;">${nextPayment.toLocaleDateString('es-CL')} (Pronto)</span>`;
                }

                tr.innerHTML = `
                    <td><strong>${fin.descripcion}</strong></td>
                    <td>$${Number(fin.monto).toLocaleString('es-CL')}</td>
                    <td>${fecha.toLocaleDateString('es-CL')}</td>
                    <td>${nextPaymentHtml}</td>
                `;
                tbodyPagos.appendChild(tr);
            });
        }
    }

    // 3. RENDERIZAR KANBAN/TARJETAS DE COSTOS VARIABLES (PEDIDOS)
    const container = document.getElementById('finanzas-pedidos-container');
    if (container) {
        container.innerHTML = '';
        
        let ingresosBrutos = 0;
        let descuentosLegalesTotales = 0;
        let costosVariablesTotales = 0;

        // Filtrar pedidos reales (no tests sin total)
        const pedidosReales = pedidosList.filter(p => p.total > 0);
        
        if (pedidosReales.length === 0) {
            container.innerHTML = '<p style="padding: 20px; color: var(--text-muted);">No hay pedidos registrados.</p>';
        }

        pedidosReales.forEach(pedido => {
            const numOrden = pedido.orden_serial || pedido.id.substring(0, 8);
            const itemsResumen = (pedido.pedido_items || []).map(i => {
                const prod = productsList.find(p => p.id === i.producto_id);
                return `${i.cantidad}x ${prod ? prod.nombre : 'Prod'}`;
            }).join(', ');

            // Ingreso Bruto
            const ingreso = Number(pedido.total);
            ingresosBrutos += ingreso;

            // Descuentos Legales
            // IVA (19%) calculado "hacia atrás" o descuento directo. Descuento directo:
            const iva = ingreso * 0.19; 
            const tbkRate = pedido.metodo_pago === 'debito' ? 0.021 : 0.028; // 2.1% o 2.8%
            const transbank = ingreso * tbkRate;
            
            const totalDescuentos = iva + transbank;
            descuentosLegalesTotales += totalDescuentos;

            const ingresoNeto = ingreso - totalDescuentos;

            // Costos Variables
            const costoVar = Number(pedido.costo_variable || 0);
            costosVariablesTotales += costoVar;

            const gananciaNeta = ingresoNeto - costoVar;

            const card = document.createElement('div');
            card.className = 'kanban-column';
            card.style.minWidth = '280px';
            card.style.maxWidth = '280px';
            
            card.innerHTML = `
                <div class="kanban-column-header">
                    <h3>Pedido #${numOrden}</h3>
                    <span class="badge" style="background:var(--bg-main); border:1px solid var(--border);">${new Date(pedido.fecha_ingreso).toLocaleDateString('es-CL')}</span>
                </div>
                <div style="padding: 15px; font-size: 0.9rem;">
                    <p style="color:var(--accent); font-weight:bold; margin-bottom: 10px;">${itemsResumen}</p>
                    
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span>Ingreso Bruto:</span>
                        <strong>$${ingreso.toLocaleString('es-CL')}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:var(--danger); font-size: 0.85rem;">
                        <span>IVA (19%):</span>
                        <span id="iva-val-${pedido.id}">-$${Math.round(iva).toLocaleString('es-CL')}</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items: center; margin-bottom:5px; color:var(--danger); font-size: 0.85rem;">
                        <select id="tbk-select-${pedido.id}" onchange="recalcularTarjetaFinanzas('${pedido.id}', ${ingreso}); guardarDatosFinanzasPedido('${pedido.id}')" style="padding: 2px; border:none; background:transparent; color:var(--danger); outline:none;">
                            <option value="credito" ${pedido.metodo_pago !== 'debito' ? 'selected' : ''}>TBK (Crd 2.8%)</option>
                            <option value="debito" ${pedido.metodo_pago === 'debito' ? 'selected' : ''}>TBK (Deb 2.1%)</option>
                        </select>
                        <span id="tbk-val-${pedido.id}">-$${Math.round(transbank).toLocaleString('es-CL')}</span>
                    </div>

                    <hr style="border:none; border-top:1px dashed var(--border); margin: 10px 0;">
                    
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span>Ingreso Real Neto:</span>
                        <strong id="ingreso-neto-${pedido.id}">$${Math.round(ingresoNeto).toLocaleString('es-CL')}</strong>
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size: 0.85rem; color:var(--text-muted); margin-bottom:5px;">Costos Variables (Material, Flete, etc):</label>
                        <div style="display:flex; gap:5px;">
                            <input type="number" id="cvar-${pedido.id}" value="${costoVar}" style="width:100%; padding:5px; border:1px solid var(--border); border-radius:4px; font-size:0.9rem;" oninput="recalcularTarjetaFinanzas('${pedido.id}', ${ingreso})">
                            <button id="btn-save-cvar-${pedido.id}" class="btn-primary" style="padding: 5px 10px; font-size:1.1rem; display:flex; align-items:center; justify-content:center;" onclick="guardarDatosFinanzasPedido('${pedido.id}')" title="Guardar cambios">
                                <ion-icon name="save-outline"></ion-icon>
                            </button>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; background:var(--bg-main); padding: 10px; border-radius: 6px; border: 1px solid var(--border);">
                        <span>Ganancia Neta:</span>
                        <strong id="ganancia-neta-${pedido.id}" style="color:var(--success);">$${Math.round(gananciaNeta).toLocaleString('es-CL')}</strong>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // 4. ACTUALIZAR KPIs
        document.getElementById('kpi-fin-ingresos').innerText = '$' + Math.round(ingresosBrutos).toLocaleString('es-CL');
        document.getElementById('kpi-fin-descuentos').innerText = '-$' + Math.round(descuentosLegalesTotales).toLocaleString('es-CL');
        document.getElementById('kpi-fin-variables').innerText = '-$' + Math.round(costosVariablesTotales).toLocaleString('es-CL');

        const fijosPagados = finanzasList.filter(f => f.categoria === 'costo_fijo').reduce((acc, curr) => acc + Number(curr.monto), 0);
        document.getElementById('kpi-fin-fijos').innerText = '-$' + Math.round(fijosPagados).toLocaleString('es-CL');

        const utilidadGeneral = ingresosBrutos - descuentosLegalesTotales - costosVariablesTotales - fijosPagados;
        const utilidadEl = document.getElementById('kpi-fin-utilidad');
        utilidadEl.innerText = '$' + Math.round(utilidadGeneral).toLocaleString('es-CL');
        utilidadEl.style.color = utilidadGeneral >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

window.guardarConfigFinanzas = function() {
    const ids = ['cf-mensual-elec', 'cf-mensual-pub', 'cf-mensual-man', 'cf-anual-imp', 'cf-anual-dom', 'cf-anual-ema'];
    const conf = {};
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) conf[id] = el.value;
    });
    localStorage.setItem('finanzas_costos_fijos', JSON.stringify(conf));
    calcularTotalesFijos();
}

window.calcularTotalesFijos = function() {
    const elec = Number(document.getElementById('cf-mensual-elec')?.value || 0);
    const pub = Number(document.getElementById('cf-mensual-pub')?.value || 0);
    const man = Number(document.getElementById('cf-mensual-man')?.value || 0);
    const totalMensual = elec + pub + man;
    const elMen = document.getElementById('cf-mensual-total');
    if (elMen) elMen.innerText = '$' + totalMensual.toLocaleString('es-CL');

    const imp = Number(document.getElementById('cf-anual-imp')?.value || 0);
    const dom = Number(document.getElementById('cf-anual-dom')?.value || 0);
    const ema = Number(document.getElementById('cf-anual-ema')?.value || 0);
    const totalAnual = imp + dom + ema;
    const elAnu = document.getElementById('cf-anual-total');
    if (elAnu) elAnu.innerText = '$' + totalAnual.toLocaleString('es-CL');
}

window.registrarPagoFijo = async function(item, inputId, mesesIntervalo) {
    const monto = Number(document.getElementById(inputId)?.value || 0);
    if (monto <= 0) {
        alert("Por favor ingresa un valor mayor a 0 para pagar.");
        return;
    }

    if (!confirm(`¿Confirmas el pago de $${monto.toLocaleString('es-CL')} por ${item}?`)) return;

    try {
        const descripcion = `${item} ${mesesIntervalo === 12 ? '(Anual)' : '(Mensual)'}`;
        const { error } = await supabase
            .from('finanzas')
            .insert({ tipo: 'egreso', categoria: 'costo_fijo', monto, descripcion });

        if (error) throw error;
        await refreshAllData();
        renderFinance();
    } catch(e) {
        alert("Error al registrar pago: " + e.message);
    }
}

window.recalcularTarjetaFinanzas = function(pedidoId, ingresoBruto) {
    const tbkSelect = document.getElementById('tbk-select-' + pedidoId).value;
    const cvarInput = Number(document.getElementById('cvar-' + pedidoId).value || 0);
    
    const iva = ingresoBruto * 0.19;
    const tbkRate = tbkSelect === 'debito' ? 0.021 : 0.028;
    const transbank = ingresoBruto * tbkRate;
    
    const ingresoNeto = ingresoBruto - iva - transbank;
    const gananciaNeta = ingresoNeto - cvarInput;
    
    document.getElementById('tbk-val-' + pedidoId).innerText = '-$' + Math.round(transbank).toLocaleString('es-CL');
    document.getElementById('ingreso-neto-' + pedidoId).innerText = '$' + Math.round(ingresoNeto).toLocaleString('es-CL');
    document.getElementById('ganancia-neta-' + pedidoId).innerText = '$' + Math.round(gananciaNeta).toLocaleString('es-CL');
    
    // Actualizar global KPIs visualmente sin recargar
    recalcularKPIsGlobalesFinanzas();
}

window.recalcularKPIsGlobalesFinanzas = function() {
    let ingresosBrutos = 0;
    let descuentosLegalesTotales = 0;
    let costosVariablesTotales = 0;
    
    const pedidosReales = pedidosList.filter(p => p.total > 0);
    
    pedidosReales.forEach(pedido => {
        const ingreso = Number(pedido.total);
        ingresosBrutos += ingreso;
        
        // Tratar de obtener del DOM actual si existe, sino del array
        const domTbk = document.getElementById('tbk-select-' + pedido.id);
        const domCvar = document.getElementById('cvar-' + pedido.id);
        
        const metodo = domTbk ? domTbk.value : pedido.metodo_pago;
        const cvar = domCvar ? Number(domCvar.value || 0) : Number(pedido.costo_variable || 0);
        
        const iva = ingreso * 0.19;
        const tbkRate = metodo === 'debito' ? 0.021 : 0.028;
        const transbank = ingreso * tbkRate;
        
        descuentosLegalesTotales += (iva + transbank);
        costosVariablesTotales += cvar;
    });

    const fijosPagados = finanzasList.filter(f => f.categoria === 'costo_fijo').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const utilidadGeneral = ingresosBrutos - descuentosLegalesTotales - costosVariablesTotales - fijosPagados;

    document.getElementById('kpi-fin-ingresos').innerText = '$' + Math.round(ingresosBrutos).toLocaleString('es-CL');
    document.getElementById('kpi-fin-descuentos').innerText = '-$' + Math.round(descuentosLegalesTotales).toLocaleString('es-CL');
    document.getElementById('kpi-fin-variables').innerText = '-$' + Math.round(costosVariablesTotales).toLocaleString('es-CL');
    
    const utilidadEl = document.getElementById('kpi-fin-utilidad');
    if (utilidadEl) {
        utilidadEl.innerText = '$' + Math.round(utilidadGeneral).toLocaleString('es-CL');
        utilidadEl.style.color = utilidadGeneral >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

window.guardarDatosFinanzasPedido = async function(pedidoId) {
    const metodo = document.getElementById('tbk-select-' + pedidoId).value;
    const costoVar = Number(document.getElementById('cvar-' + pedidoId).value || 0);
    const btn = document.getElementById('btn-save-cvar-' + pedidoId);
    
    if (btn) {
        btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon>';
        btn.disabled = true;
    }
    
    // Update local list array just in case
    const pedidoIndex = pedidosList.findIndex(p => p.id === pedidoId);
    if (pedidoIndex !== -1) {
        pedidosList[pedidoIndex].metodo_pago = metodo;
        pedidosList[pedidoIndex].costo_variable = costoVar;
    }
    
    try {
        const { error } = await supabase.from('pedidos').update({ 
            metodo_pago: metodo,
            costo_variable: costoVar 
        }).eq('id', pedidoId);
        
        if (error) throw error;
        
        if (btn) {
            btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
            btn.style.background = 'var(--success)';
            btn.style.borderColor = 'var(--success)';
            setTimeout(() => {
                btn.innerHTML = '<ion-icon name="save-outline"></ion-icon>';
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.disabled = false;
            }, 2000);
        }
    } catch(e) {
        console.error("Error al guardar finanzas del pedido:", e);
        if (btn) {
            btn.innerHTML = '<ion-icon name="close-outline"></ion-icon>';
            btn.style.background = 'var(--danger)';
            btn.style.borderColor = 'var(--danger)';
            setTimeout(() => {
                btn.innerHTML = '<ion-icon name="save-outline"></ion-icon>';
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.disabled = false;
            }, 2000);
        }
        alert("Ocurrió un error al guardar. Verifica que exista la columna costo_variable en Supabase.");
    }
}

/* ==========================================
   6. CONFIGURACION MODULE
   ========================================== */
window.saveConfig = async function(event) {
    event.preventDefault();
    const aVal = document.getElementById('config-a').value;

    try {
        const { error } = await supabase
            .from('configuracion')
            .upsert({ clave: 'dias_base_a', valor: String(aVal) }, { onConflict: 'clave' });

        if (error) throw error;

        alert("Configuración guardada.");
        diasBaseA = Number(aVal);
        await refreshAllData();
        renderActiveTab();
    } catch (e) {
        alert("Error al guardar configuración: " + e.message);
    }
};

window.borrarTodosLosPedidos = async function() {
    if(!confirm("⚠️ ADVERTENCIA: Esta acción eliminará permanentemente todos los pedidos y sus ítems de la base de datos. ¿Estás absolutamente seguro de continuar?")) return;
    
    try {
        let hasMore = true;
        while(hasMore) {
            const { data: items } = await supabase.from('pedido_items').select('id').limit(1000);
            if (items && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    await supabase.from('pedido_items').delete().eq('id', items[i].id);
                }
            } else {
                hasMore = false;
            }
        }
        
        hasMore = true;
        while(hasMore) {
            const { data: peds } = await supabase.from('pedidos').select('id').limit(1000);
            if (peds && peds.length > 0) {
                for (let i = 0; i < peds.length; i++) {
                    await supabase.from('pedidos').delete().eq('id', peds[i].id);
                }
            } else {
                hasMore = false;
            }
        }
        
        // Wipe finanzas related to orders
        await supabase.from('finanzas').delete().eq('categoria', 'pago_cliente');
        
        alert("Todos los pedidos han sido eliminados correctamente.");
        await refreshAllData();
        renderActiveTab();
    } catch(e) {
        alert("Error al eliminar pedidos: " + e.message);
    }
}

window.logout = async function() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'login.html';
}

/* ==========================================
   ALGORITHMIC CALCULATIONS
   ========================================== */
function computeProductionTimeline(pedidos, A_val) {
    // Filter active orders (excluding completed delivery and abandoned/failed checkouts)
    const activePedidos = pedidos.filter(p => 
        p.estado !== 'e) Despacho' && 
        p.estado !== 'f) Entregado' &&
        p.transbank_status !== 'INITIALIZED' &&
        p.transbank_status !== 'REJECTED' &&
        p.transbank_status !== 'FAILED'
    );
    
    // Sort by ingress date
    activePedidos.sort((a, b) => new Date(a.fecha_ingreso || new Date()) - new Date(b.fecha_ingreso || new Date()));

    const timeline = {};
    let tallerDisponibleDesde = new Date(); // Represents today initially
    
    const largeProducts = [
        'Arrimo ZEN', 'Repisa ZEN', 'Mesa Plinto', 'Sillón ZEN 2 cuerpos', 'Sillón ZEN 1 cuerpo', 'Mesa OVAL', 'Mesa ZEN',
        'Escritorio Pupitre', 'Repisa NET', 'Mesa Triqueta', 'Silla N', 'Piso Eslinga',
        'Silla Yakuza', 'Recibidor Jiraffe', 'Banqueta V', 'Repisa T', 'Mesa N', 'Arrimo RAW', 'Mesa RAW rodela',
        'Lámpara ZEN', 'Macetero ZEN'
    ];

    activePedidos.forEach(pedido => {
        let sumEtapas = 0;
        let countLarge = 0;
        let hasImported = false;
        let hasRegular = false;

        if (pedido.notas && pedido.notas.includes('[STOCK_ENVIADO]')) {
             // sumEtapas stays 0
        } else {
             let stockFulfilled = {};
             if (pedido.notas && pedido.notas.includes('[STOCK_PARCIAL]')) {
                 const match = pedido.notas.match(/\[STOCK_PARCIAL\]:\s*(.*)/);
                 if (match) {
                     const pairs = match[1].split(',');
                     pairs.forEach(p => {
                         const [id, qty] = p.split(':');
                         if (id && qty) stockFulfilled[id.trim()] = Number(qty);
                     });
                 }
             }

             if (pedido.pedido_items && pedido.pedido_items.length > 0) {
                 pedido.pedido_items.forEach(item => {
                     const prod = productsList.find(p => p.id === item.producto_id);
                     if (prod) {
                         if (['Portavelas ZEN', 'Marcapáginas Van Gogh'].includes(prod.nombre)) {
                             hasImported = true;
                             return; // Skip this iteration in the forEach
                         }
                         hasRegular = true;
                         
                         const gestMat = prod.dias_gestion_material || 0;
                         const corte = prod.dias_corte_cnc || 0;
                         const despTaller = prod.dias_despacho_taller || 0;
                         const mo = prod.dias_mano_obra || prod.dias_mano_obra_a || 0;
                         
                         const fulfilledQty = stockFulfilled[item.producto_id] || 0;
                         const qtyToMake = Math.max(0, (item.cantidad || 1) - fulfilledQty);
                         
                         sumEtapas += (gestMat + corte + despTaller + mo) * qtyToMake;
                         
                         if (largeProducts.includes(prod.nombre)) {
                             countLarge += qtyToMake;
                         }
                     }
                 });
             }
        }

        const estado = pedido.estado || '';
        let discountApplied = false;
        if ((estado.includes('Recibido') || estado.includes('Materiales')) && countLarge >= 5) {
            sumEtapas = Math.ceil(sumEtapas * 0.8);
            discountApplied = true;
        }

        // Agregamos los días hábiles a la fecha base (tallerDisponibleDesde)
        let deliveryDate = new Date(tallerDisponibleDesde);
        
        if (!hasRegular && hasImported) {
            // Solo importados, no usamos tallerDisponibleDesde
            deliveryDate = new Date();
            let daysAdded = 0;
            while(daysAdded < 5) {
                deliveryDate.setDate(deliveryDate.getDate() + 1);
                if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) daysAdded++;
            }
        } else {
            let daysAdded = 0;
            while(daysAdded < sumEtapas) {
                deliveryDate.setDate(deliveryDate.getDate() + 1);
                if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) daysAdded++;
            }
            // El pedido toma su lugar en la línea de tiempo y la mueve hacia adelante para el siguiente
            tallerDisponibleDesde = new Date(deliveryDate);
            
            // Si además tiene importados, asegurar mínimo 5 días desde hoy
            if (hasImported) {
                let minDate = new Date();
                let minDays = 0;
                while(minDays < 5) {
                    minDate.setDate(minDate.getDate() + 1);
                    if (minDate.getDay() !== 0 && minDate.getDay() !== 6) minDays++;
                }
                if (deliveryDate < minDate) deliveryDate = minDate;
            }
        }

        timeline[pedido.id] = {
            deliveryDate: deliveryDate,
            totalDays: sumEtapas,
            discountApplied: discountApplied
        };
    });

    return timeline;
}

// Calculate and update local estimated dates in database if they don't match
async function calculateEstimatedDates() {
    const timeline = computeProductionTimeline(pedidosList, diasBaseA);
    
    for (const pedId in timeline) {
        const estVal = timeline[pedId].deliveryDate;
        const matchingPedido = pedidosList.find(p => p.id === pedId);
        
        if (matchingPedido) {
            const currentEst = matchingPedido.fecha_estimada_entrega ? new Date(matchingPedido.fecha_estimada_entrega) : null;
            
            // If there's no estimated date, assign the theoretical one from the timeline
            if (!currentEst) {
                await supabase
                    .from('pedidos')
                    .update({ fecha_estimada_entrega: estVal.toISOString() })
                    .eq('id', pedId);
                matchingPedido.fecha_estimada_entrega = estVal.toISOString(); // update local object
            }
        }
    }
}

window.optimizarCola = async function() {
    if(!confirm("¿Deseas optimizar la cola? Esto adelantará las fechas de todos los pedidos activos usando el tiempo que hayas ganado al terminar pedidos antes de tiempo. Se reescribirán las fechas basándose en la disponibilidad desde hoy.")) return;
    
    const btn = document.querySelector('.calendar-timeline-header button');
    if (btn) { btn.disabled = true; btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Optimizando...'; }
    
    try {
        const timeline = computeProductionTimeline(pedidosList);
        for (const pedId in timeline) {
            const estVal = timeline[pedId].deliveryDate;
            await supabase
                .from('pedidos')
                .update({ fecha_estimada_entrega: estVal.toISOString() })
                .eq('id', pedId);
        }
        alert("¡Cola optimizada exitosamente!");
        await refreshAllData();
        renderActiveTab();
    } catch (e) {
        alert("Error al optimizar: " + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<ion-icon name="flash-outline"></ion-icon> Optimizar Cola'; }
    }
}

/* ==========================================
   DATABASE SEEDING / MIGRATION (FIRST RUN)
   ========================================== */
async function poblarBaseDeDatos() {
    if (!confirm('¿Deseas migrar los datos locales (data.js) a Supabase? Esto agregará las líneas, productos y configurará recetas por defecto.')) return;
    
    const status = document.getElementById('poblar-status');
    status.style.color = 'var(--accent)';
    status.innerText = 'Sincronizando catálogo e inventario... Por favor espera.';
    
    const btn = document.getElementById('btn-poblar-db');
    btn.disabled = true;

    try {
        if (typeof catalogData === 'undefined') {
            throw new Error("No se encontró catalogData. Verifica data.js");
        }

        // 1. Seed lineas & productos
        for (const lineaKey in catalogData) {
            const linea = catalogData[lineaKey];
            
            // A) Upsert Linea
            const { error: errLinea } = await supabase
                .from('lineas')
                .upsert({
                    id: linea.id,
                    titulo: linea.titulo,
                    descripcion: linea.descripcion
                });

            if (errLinea) throw errLinea;

            // B) Upsert Products of Line
            for (const prod of linea.productos) {
                const { error: errProd } = await supabase
                    .from('productos')
                    .upsert({
                        id: prod.id,
                        linea_id: linea.id,
                        nombre: prod.nombre,
                        precio: prod.precio,
                        medidas: prod.medidas || '',
                        material: prod.material || '',
                        uso: prod.uso || '',
                        descripcion: prod.descripcion || '',
                        imagenes: prod.imagenes || [],
                        stock_base: 0
                    });
                
                if (errProd) throw errProd;

                // C) Create Default Recipes (Bill of Materials)
                let materialId = 'pino';
                let qty = 1.0;
                
                if (linea.id === 'zen') {
                    materialId = 'pino';
                    qty = prod.id === 'zen-1' ? 3.0 : 1.5; // Tables require 3m2
                } else if (linea.id === 'cnc') {
                    materialId = 'terciado';
                    qty = 1.5;
                } else if (linea.id === 'contemporaneo') {
                    materialId = 'roble';
                    qty = prod.id === 'cont-3' || prod.id === 'cont-4' ? 3.5 : 2.0;
                } else {
                    materialId = 'pino';
                    qty = 0.5; // Small decoration items
                }

                // Insert Recipe Link
                await supabase
                    .from('recetas_muebles')
                    .upsert({
                        producto_id: prod.id,
                        material_id: materialId,
                        cantidad_necesaria: qty
                    }, { onConflict: 'producto_id, material_id' });

                // If CNC eslinga, add eslingas as secondary material (2 units)
                if (prod.id.includes('eslinga') || prod.id.includes('Eslinga')) {
                    await supabase
                        .from('recetas_muebles')
                        .upsert({
                            producto_id: prod.id,
                            material_id: 'eslingas',
                            cantidad_necesaria: 2
                        }, { onConflict: 'producto_id, material_id' });
                }
            }
        }

        // 2. Add Initial General configuration setting
        await supabase
            .from('configuracion')
            .upsert({
                clave: 'dias_base_a',
                valor: '4'
            }, { onConflict: 'clave' });

        status.style.color = 'var(--success)';
        status.innerText = '¡Base de datos poblada con éxito! Catálogo, Inventario e Inventario BOM vinculados.';
        
        await refreshAllData();
        renderActiveTab();
    } catch (error) {
        console.error("Error poblando Supabase:", error);
        status.style.color = 'var(--danger)';
        status.innerText = 'Error: ' + error.message;
    } finally {
        btn.disabled = false;
    }
}

window.generarPedidoPrueba = async function(event) {
    try {
        const btn = event ? event.currentTarget : document.querySelector('button[onclick="generarPedidoPrueba()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Creando...';
        btn.disabled = true;

        const supabase = window.supabaseClient;
        
        // Find Arrimo ZEN
        const { data: zenProd } = await supabase.from('productos').select('id, nombre, precio').eq('nombre', 'Arrimo ZEN').single();
        if (!zenProd) { alert('No se encontró el producto Arrimo ZEN.'); btn.innerHTML = originalText; btn.disabled=false; return; }

        // Find first client
        const { data: firstCli } = await supabase.from('clientes').select('id').limit(1).single();
        if (!firstCli) { alert('No hay clientes en la DB para asociar el pedido.'); btn.innerHTML = originalText; btn.disabled=false; return; }

        // Create Order
        const { data: newPedido, error: pedErr } = await supabase.from('pedidos').insert([{
            cliente_id: firstCli.id,
            total: zenProd.precio * 7,
            estado: 'a) Recibido y gestión de materiales',
            notas: 'PEDIDO DE PRUEBA SIMULACIÓN EFICIENCIA',
            fecha_estimada_entrega: null // null para que el Kanban lo calcule solo basado en la cola
        }]).select().single();

        if (pedErr) throw pedErr;

        // Create Items (7 large items in a single order to trigger the 7 large threshold)
        const items = [];
        for (let i=0; i<7; i++) {
            items.push({
                pedido_id: newPedido.id,
                producto_id: zenProd.id,
                cantidad: 1,
                precio_unitario: zenProd.precio
            });
        }
        await supabase.from('pedido_items').insert(items);
        
        alert('Se generó un pedido de prueba con 7 Arrimos ZEN en estado Recibido. ¡El factor de eficiencia ahora está activo!');
        btn.innerHTML = originalText;
        btn.disabled = false;
        await refreshAllData();
    } catch(e) {
        console.error(e);
        alert('Error al simular pedido.');
        const btn = document.querySelector('button[onclick="generarPedidoPrueba()"]');
        if (btn) {
            btn.innerHTML = '<ion-icon name="flask-outline"></ion-icon> Simular 7 Muebles Grandes';
            btn.disabled = false;
        }
    }
}

// =========================================
// ANALÍTICAS WEB
// =========================================
window.refreshAnaliticas = async function() {
    try {
        const { data, error } = await supabaseClient.from('analiticas').select('*');
        if (error) throw error;
        
        let visitasTotales = 0;
        let visitantesUnicos = new Set();
        let totalSesionSegundos = 0;
        let countSesiones = 0;
        let showroomVisitas = 0;
        
        let dispositivos = { 'Móvil': 0, 'Escritorio': 0 };
        let productosClicks = {};

        if (data) {
            data.forEach(row => {
                if (row.visitor_id) visitantesUnicos.add(row.visitor_id);
                
                if (row.tipo_evento === 'visita') {
                    visitasTotales++;
                    if (row.detalles && row.detalles.dispositivo) {
                        dispositivos[row.detalles.dispositivo] = (dispositivos[row.detalles.dispositivo] || 0) + 1;
                    }
                } else if (row.tipo_evento === 'tiempo_sesion') {
                    if (row.detalles && row.detalles.segundos_sesion) {
                        totalSesionSegundos += row.detalles.segundos_sesion;
                        countSesiones++;
                    }
                } else if (row.tipo_evento === 'click_producto') {
                    if (row.detalles && row.detalles.producto_id) {
                        let pid = row.detalles.producto_id;
                        productosClicks[pid] = (productosClicks[pid] || 0) + 1;
                    }
                } else if (row.tipo_evento === 'visita_showroom') {
                    showroomVisitas++;
                }
            });
        }

        const eVis = document.getElementById('kpi-visitas-totales');
        const eUn = document.getElementById('kpi-visitantes-unicos');
        const eTi = document.getElementById('kpi-tiempo-promedio');
        const eShowroom = document.getElementById('kpi-showroom');
        
        if (eVis) eVis.innerText = visitasTotales;
        if (eUn) eUn.innerText = visitantesUnicos.size;
        if (eShowroom) eShowroom.innerText = showroomVisitas;
        
        let avgTime = countSesiones > 0 ? Math.round(totalSesionSegundos / countSesiones) : 0;
        let mins = Math.floor(avgTime / 60);
        let secs = avgTime % 60;
        if (eTi) eTi.innerText = `${mins}m ${secs}s`;

        // Render Dispositivos Chart
        const cvDisp = document.getElementById('chart-dispositivos');
        if (cvDisp) {
            const ctxDisp = cvDisp.getContext('2d');
            if (window.chartDispInst) window.chartDispInst.destroy();
            window.chartDispInst = new Chart(ctxDisp, {
                type: 'doughnut',
                data: {
                    labels: ['Móvil', 'Escritorio'],
                    datasets: [{
                        data: [dispositivos['Móvil'] || 0, dispositivos['Escritorio'] || 0],
                        backgroundColor: ['#d1b99a', '#1e293b'],
                        borderWidth: 0
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
            });
        }

        // Render Productos Chart
        const cvProd = document.getElementById('chart-productos-clicks');
        if (cvProd) {
            let sortedProds = Object.keys(productosClicks).map(k => ({id: k, count: productosClicks[k]})).sort((a,b) => b.count - a.count).slice(0, 10);
            
            let labels = sortedProds.map(p => {
                let pr = productsList.find(x => x.id === p.id);
                return pr ? pr.nombre : p.id;
            });
            let values = sortedProds.map(p => p.count);

            const ctxProd = cvProd.getContext('2d');
            if (window.chartProdInst) window.chartProdInst.destroy();
            window.chartProdInst = new Chart(ctxProd, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Clics o Interacciones',
                        data: values,
                        backgroundColor: '#bda381',
                        borderRadius: 4
                    }]
                },
                options: { 
                    indexAxis: 'y',
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
    } catch(e) {
        console.error("Error al cargar analíticas:", e);
        if (e.message && e.message.includes('does not exist')) {
            console.warn('Falta crear la tabla de analíticas en Supabase');
        }
    }
}

})();
