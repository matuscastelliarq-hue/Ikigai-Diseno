(() => {
const supabase = window.supabaseClient;

let carrito = [];
let vistaActual = 'home';
let visitas = 0;
let catalogData = {};

// Analítica Interna (Supabase)
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

let visitorId = localStorage.getItem('ikigai_visitor_id');
if (!visitorId) {
    visitorId = generateUUID();
    localStorage.setItem('ikigai_visitor_id', visitorId);
}

let sessionId = sessionStorage.getItem('ikigai_session_id');
let isNewSession = false;

if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('ikigai_session_id', sessionId);
    isNewSession = true;
}

window.logAnalyticsEvent = async (tipo, detalles) => {
    if (!window.supabaseClient) return;
    try {
        await window.supabaseClient.from('analiticas').insert({
            session_id: sessionId,
            visitor_id: visitorId,
            tipo_evento: tipo,
            detalles: detalles
        });
    } catch(e) { console.error("Analytics Error", e); }
};

if (isNewSession) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    window.logAnalyticsEvent('visita', { 
        dispositivo: isMobile ? 'Móvil' : 'Escritorio',
        userAgent: navigator.userAgent
    });
}

let lastVisibilityTime = Date.now();
let totalActiveTime = 0;

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') {
        const timeActive = Math.round((Date.now() - lastVisibilityTime) / 1000);
        totalActiveTime += timeActive;
        window.logAnalyticsEvent('tiempo_sesion', {
            segundos_sesion: totalActiveTime
        });
    } else {
        lastVisibilityTime = Date.now();
    }
});

window.addEventListener('beforeunload', () => {
    const timeActive = Math.round((Date.now() - lastVisibilityTime) / 1000);
    totalActiveTime += timeActive;
    window.logAnalyticsEvent('tiempo_sesion', {
        segundos_sesion: totalActiveTime
    });
});

// Exponer funciones a window para llamadas inline en HTML
window.navigate = navigate;
let lightboxScale = 1;

window.openLightbox = function(src, isVideo, isZoomable = false, customMaxHeight = '90vh') {
    const overlay = document.getElementById('lightbox-overlay');
    const content = document.getElementById('lightbox-content');
    
    // Resetear overflow por si quedó de antes
    content.style.overflow = 'visible';

    if (isVideo) {
        content.innerHTML = `<video src="${src}" autoplay loop controls style="max-width:100%; max-height:${customMaxHeight}; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.8); outline:none;"></video>`;
    } else {
        const cursorStyle = isZoomable ? 'cursor: zoom-in;' : 'cursor: default;';
        // Sin transición para que el cálculo del scroll sea exacto al instante
        content.innerHTML = `<img id="lightbox-img" src="${src}" style="max-width:100%; max-height:${customMaxHeight}; border-radius:4px; box-shadow:0 10px 40px rgba(0,0,0,0.8); ${cursorStyle}">`;
        
        if (isZoomable) {
            content.style.overflow = 'auto'; // Activar scrollbars si el contenido crece
            
            setTimeout(() => {
                const img = document.getElementById('lightbox-img');
                if (img) {
                    let isZoomed = false;
                    
                    img.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        if (!isZoomed) {
                            isZoomed = true;
                            img.style.cursor = 'zoom-out';
                            
                            const rect = img.getBoundingClientRect();
                            const pctX = (e.clientX - rect.left) / rect.width;
                            const pctY = (e.clientY - rect.top) / rect.height;
                            
                            const targetWidth = rect.width * 2.5;
                            const targetHeight = rect.height * 2.5;
                            
                            // Expandir físicamente la imagen
                            img.style.maxWidth = 'none';
                            img.style.maxHeight = 'none';
                            img.style.width = targetWidth + 'px';
                            
                            // Ajustar el scroll del contenedor centrado en el click
                            content.scrollLeft = (pctX * targetWidth) - (content.clientWidth / 2);
                            content.scrollTop = (pctY * targetHeight) - (content.clientHeight / 2);
                            
                        } else {
                            isZoomed = false;
                            img.style.cursor = 'zoom-in';
                            
                            // Restaurar tamaño
                            img.style.width = '';
                            img.style.maxWidth = '100%';
                            img.style.maxHeight = '90vh';
                        }
                    });
                }
            }, 50);
        }
    }
    overlay.style.display = 'flex';
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(overlay, {autoAlpha: 0}, {autoAlpha: 1, duration: 0.3});
        gsap.fromTo(content, {scale: 0.8}, {scale: 1, duration: 0.4, ease: "back.out(1.5)"});
    }
};

window.closeLightbox = function() {
    const overlay = document.getElementById('lightbox-overlay');
    if (typeof gsap !== 'undefined') {
        gsap.to(overlay, {autoAlpha: 0, duration: 0.3, onComplete: () => {
            overlay.style.display = 'none';
            document.getElementById('lightbox-content').innerHTML = '';
        }});
    } else {
        overlay.style.display = 'none';
        document.getElementById('lightbox-content').innerHTML = '';
    }
};
window.changeMainImage = changeMainImage;

async function fetchCatalogFromSupabase() {
    try {
        const { data: lineas, error: errLineas } = await supabase
            .from('lineas')
            .select('*');
        if (errLineas) throw errLineas;
        
        let { data: productos, error: errProductos } = await supabase
            .from('productos')
            .select('*');
        if (errProductos) throw errProductos;

        catalogData = {};
        lineas.forEach(linea => {
            catalogData[linea.id] = {
                id: linea.id,
                titulo: linea.titulo,
                descripcion: linea.descripcion,
                productos: []
            };
        });

        const hardcodedPlanos = {
            // Línea ZEN
            'Arrimo ZEN': 'assets/1. Línea ZEN/1. Arrimo ZEN/Planos arrimo zen.jpg',
            'Repisa ZEN': 'assets/1. Línea ZEN/2. Repisa ZEN/Planos repisa zen.jpg',
            'Mesa Plinto': 'assets/1. Línea ZEN/3. Mesa PLINTO/Planos mesa plinto.jpg',
            'Sillón ZEN 2 cuerpos': 'assets/1. Línea ZEN/4. Sillón ZEN 2 cuerpos/Planos sillón ZEN 2c.jpg',
            'Sillón ZEN 1 cuerpo': 'assets/1. Línea ZEN/5. Sillón ZEN 1 cuerpo/Planos Sillón ZEN 1c.jpg',
            'Mesa OVAL': 'assets/1. Línea ZEN/6. Mesa OVAL/Planos mesa oval.jpg',
            'Mesa ZEN': 'assets/1. Línea ZEN/7. Mesa ZEN/Planos mesa zen.jpg',
            
            // Línea CNC
            'Escritorio Pupitre': 'assets/2. Línea CNC/1. Escritorio Pupitre/Planos escritorio pupitre.jpg',
            'Repisa NET': 'assets/2. Línea CNC/2. Repisa NET/Planos repisa net.jpg',
            'Mesa Triqueta': 'assets/2. Línea CNC/3. Mesa Triqueta/Planos mesa triqueta.jpg',
            'Sitial N': 'assets/2. Línea CNC/4. Sitial N/Planos sitial n.jpg',
            
            // Línea CONTEMPORÁNEO
            'Silla Yakuza': 'assets/3. Línea CONTEMPORÁNEO/1. Silla Yakuza/Planos silla yakuza.jpg',
            'Recibidor Giraffe': 'assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Planos repisa giraffe.jpg',
            'Banqueta V': 'assets/3. Línea CONTEMPORÁNEO/3. Banqueta V/Planos banqueta V.jpg',
            'Repisa T': 'assets/3. Línea CONTEMPORÁNEO/4. Repisa T/Planos repisa t.jpg',
            'Mesa N': 'assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Planos mesa n.jpg',
            'Arrimo RAW': 'assets/3. Línea CONTEMPORÁNEO/6. Arrimo RAW/Planos arrimo raw.jpg',
            'Mesa RAW': 'assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Planos mesa RAW.jpg',
            
            // Decoración
            'Lámpara ZEN': 'assets/4. Iluminación y Decoración/1. Lámpara ZEN/Planos lámpara zen.jpg',
            'Lámpara Origami': 'assets/4. Iluminación y Decoración/2. Lámpara Origami/Planos lámpara origami.png',
            'Lámpara Pluma': 'assets/4. Iluminación y Decoración/3. Lámpara Pluma/Planos lámpara pluma.jpg',
            'Lámpara TRI': 'assets/4. Iluminación y Decoración/4. Lámpara TRI/Planos lámpara tri.jpg',
            'Portavinos X': 'assets/4. Iluminación y Decoración/5. Portavinos X/Planos portavinos x.jpg',
            'Macetero ZEN': 'assets/4. Iluminación y Decoración/6. Macetero ZEN/Planos macetero ZEN.jpg'
        };

        // Map products into catalogData
        productos.forEach(prod => {
            if (catalogData[prod.linea_id]) {
                let precio_2x = null;
                const promoName = 'Promo ' + prod.nombre;
                const promoProd = productos.find(p => p.nombre === promoName);
                if (promoProd) {
                    precio_2x = promoProd.precio;
                }
                
                catalogData[prod.linea_id].productos.push({
                    id: prod.id,
                    nombre: prod.nombre,
                    precio: Number(prod.precio),
                    precio_2x: precio_2x ? Number(precio_2x) : null,
                    medidas: prod.medidas,
                    material: prod.material,
                    uso: prod.uso,
                    descripcion: prod.descripcion,
                    imagenes: prod.imagenes || [],
                    planos: prod.planos || hardcodedPlanos[prod.nombre] || null
                });
            }
        });

        const orderedKeys = [
            // Línea ZEN
            'Arrimo ZEN', 'Repisa ZEN', 'Mesa Plinto', 'Sillón ZEN 2 cuerpos', 'Sillón ZEN 1 cuerpo', 'Mesa OVAL', 'Mesa ZEN',
            // Línea CNC
            'Escritorio Pupitre', 'Repisa NET', 'Mesa Triqueta', 'Sitial N', 'Promo Sitial N', 'Piso Eslinga',
            // Línea CONTEMPORÁNEO
            'Silla Yakuza', 'Promo Silla Yakuza', 'Recibidor Giraffe', 'Banqueta V', 'Repisa T', 'Mesa N', 'Promo Mesa N', 'Arrimo RAW', 'Mesa RAW',
            // Decoración
            'Lámpara ZEN', 'Lámpara Origami', 'Lámpara TRI', 'Portavinos X', 'Macetero ZEN'
        ];

        // Sort products by id to ensure deterministic rendering
        Object.keys(catalogData).forEach(lineaId => {
            catalogData[lineaId].productos.sort((a, b) => {
                let indexA = orderedKeys.indexOf(a.nombre);
                let indexB = orderedKeys.indexOf(b.nombre);
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                return indexA - indexB;
            });
        });

        window.catalogData = catalogData;
    } catch (error) {
        console.error("Error cargando catálogo de Supabase:", error);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar visitas desde Supabase para mostrar el contador real + 358
    try {
        const { count, error } = await supabase
            .from('analiticas')
            .select('*', { count: 'exact', head: true })
            .eq('tipo_evento', 'visita');
            
        if (!error && count !== null) {
            document.getElementById('visit-counter').innerText = 358 + count;
        } else {
            document.getElementById('visit-counter').innerText = 358;
        }
    } catch(e) {
        document.getElementById('visit-counter').innerText = 358;
    }

    // Cargar carrito desde localstorage
    const carritoGuardado = localStorage.getItem('ikigai_carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarCarritoUI();
    }

    // Cargar catálogo desde base de datos
    await fetchCatalogFromSupabase();

    // Manejar respuesta de Transbank en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const pagoState = urlParams.get('pago');
    if (pagoState) {
        if (pagoState === 'exito') {
            await renderSuccessPage(urlParams.get('orden'));
        } else {
            renderErrorPage(pagoState);
        }
    } else {
        const v = urlParams.get('v') || 'home';
        let p = urlParams.get('p');
        if (p) {
            try { p = JSON.parse(decodeURIComponent(p)); } catch(e) { p = decodeURIComponent(p); }
        }
        
        history.replaceState({ vista: v, param: p }, '', window.location.search || '?v=home');
        navigate(v, p, false);
    }

    // Escuchar botón atrás/adelante del navegador
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.vista) {
            navigate(event.state.vista, event.state.param, false);
        } else {
            navigate('home', null, false);
        }
    });
    // Cambiar color del header al hacer scroll para que no se pierda al bajar
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        const logo = document.querySelector('.logo');
        
        // El threshold define cuándo aparece el header sólido. 
        // En home es casi una pantalla entera, en producto lo hacemos aparecer rápido (ej. 150px)
        let threshold = (vistaActual === 'home') ? window.innerHeight - 100 : 150;
        
        if (window.scrollY > threshold) {
            header.classList.add('solid-bg');
            header.classList.remove('hidden');
            if(logo) logo.src = 'assets/Ik negro 2.png';
        } else {
            if (vistaActual === 'home') {
                header.classList.remove('solid-bg');
                header.classList.remove('hidden');
                if(logo) logo.src = 'assets/Ik blanco 2.png';
            } else if (vistaActual === 'producto') {
                header.classList.remove('solid-bg');
                header.classList.add('hidden');
            }
        }
    });
});

// Menú Móvil
window.toggleMobileMenu = function(forceClose = false) {
    const nav = document.getElementById('nav-links');
    if (forceClose) {
        nav.classList.remove('mobile-open');
    } else {
        nav.classList.toggle('mobile-open');
    }
}

// Inicializar Animaciones GSAP
function initScrollAnimations() {
    // Si GSAP no cargó por algún motivo, salir silenciosamente
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Seleccionar todos los elementos con la clase gsap-reveal
    const elements = document.querySelectorAll('.gsap-reveal');
    
    // Configurar estado inicial
    gsap.set(elements, { autoAlpha: 0, y: 50 });

    // Animar cuando entran en la pantalla
    ScrollTrigger.batch(elements, {
        onEnter: batch => gsap.to(batch, {
            autoAlpha: 1, 
            y: 0, 
            duration: 1, 
            stagger: 0.15, 
            ease: "power3.out",
            overwrite: true
        }),
        start: "top 85%",
        once: true
    });
    
    // Animación especial para el Hero
    const heroTitle = document.querySelector('.hero-title-img');
    if (heroTitle) {
        gsap.fromTo(heroTitle, 
            { autoAlpha: 0, scale: 0.8, y: 30 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 1.5, ease: "power4.out", delay: 0.2 }
        );
    }
}

// Enrutador simple
function navigate(vista, param = null, pushState = true) {
    if (pushState) {
        let url = `?v=${vista}`;
        if (param) {
            url += `&p=${encodeURIComponent(typeof param === 'object' ? JSON.stringify(param) : param)}`;
        }
        if (vista !== vistaActual || JSON.stringify(param) !== window.lastNavParam) {
            history.pushState({ vista, param }, '', url);
            
            // Analytics tracking
            if (vista === 'producto' && param && param.prodId) {
                window.logAnalyticsEvent('click_producto', { producto_id: param.prodId });
            }
            if (vista === 'showroom') {
                window.logAnalyticsEvent('visita_showroom', {});
            }
        }
    }
    window.lastNavParam = JSON.stringify(param);

    const header = document.getElementById('header');
    
    if (['clientes', 'contacto', 'lineas', 'nosotros', 'sustentabilidad'].includes(vista)) {
        if (vistaActual !== 'home') {
            vistaActual = 'home';
            document.getElementById('app-content').innerHTML = renderHome();
            header.classList.remove('solid-bg');
        }
        
        // Scroll y animaciones
        setTimeout(() => {
            initScrollAnimations();
            const sectionId = vista === 'lineas' ? 'linea-zen' : `sec-${vista}`;
            const el = document.getElementById(sectionId);
            if (el) {
                // Scroll con GSAP para mayor suavidad
                if (typeof gsap !== 'undefined') {
                    gsap.to(window, {duration: 1, scrollTo: {y: el, offsetY: 70}, ease: "power2.inOut"});
                } else {
                    el.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }, 100);
        return;
    }

    vistaActual = vista;
    const content = document.getElementById('app-content');
    content.innerHTML = ''; 
    window.scrollTo({ top: 0, behavior: 'instant' });

    const logo = document.querySelector('.logo');
    if (vista !== 'home') {
        if (vista === 'producto') {
            header.classList.add('hidden');
            header.classList.remove('solid-bg');
        } else {
            header.classList.remove('hidden');
            header.classList.add('solid-bg');
            if(logo) logo.src = 'assets/Ik negro 2.png';
        }
    } else {
        header.classList.remove('solid-bg');
        header.classList.remove('hidden');
        if(logo) logo.src = 'assets/Ik blanco 2.png';
    }

    switch(vista) {
        case 'home':
            content.innerHTML = renderHome();
            break;
        case 'showroom':
            content.innerHTML = renderShowroom();
            break;
        case 'catalogo':
            content.innerHTML = renderCatalogo(param);
            break;
        case 'producto':
            content.innerHTML = renderDetalleProducto(param);
            break;
        case 'checkout_form':
            content.innerHTML = renderCheckoutForm();
            window.actualizarTotalCheckout();
            window.calcularFechaEstimadaFrontend().then(result => {
                const etaEl = document.getElementById('checkout-eta');
                if (etaEl) {
                    if (result && result.fechaEstimada) {
                        const d = new Date(result.fechaEstimada);
                        // Add 3 hours offset or use local time correctly to prevent previous day issue
                        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                        
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        let dateString = `${dd}/${mm}`;
                        
                        etaEl.innerText = dateString;
                    } else {
                        etaEl.innerText = 'A coordinar';
                    }
                }
            });
            break;
        default:
            content.innerHTML = renderHome();
    }
    
    setTimeout(() => {
        initScrollAnimations();
        if (vista === 'showroom') {
            initSpline();
        }
    }, 50);
}

// Función auxiliar para renderizar el panel de una línea
function renderLineaPanel(idLinea, invertir = false) {
    const claseInvertida = invertir ? ' panel-invertido' : '';
    const linea = catalogData[idLinea];
    const descFormateada = linea.descripcion.replace(', ', ',<br>');
    
    let imagesHtml = '';
    const visibleProducts = linea.productos.filter(p => !p.nombre.startsWith('Promo'));
    const numImages = Math.min(visibleProducts.length, 4);
    for (let i = 0; i < numImages; i++) {
        const prod = visibleProducts[i];
        imagesHtml += `<img src="${prod.imagenes[0]}" alt="${prod.nombre}" class="collage-img-${i+1}" onclick="navigate('catalogo', '${idLinea}')">`;
    }

    return `
        <section class="linea-panel${claseInvertida}" id="linea-${idLinea}">
            <div class="linea-panel-content">
                <div class="linea-panel-title gsap-reveal">
                    <h2>${linea.titulo}</h2>
                    <p>${descFormateada}</p>
                    <button style="padding: 15px 30px; margin-top: 20px; font-size: 1.1rem; letter-spacing: 1px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); cursor: pointer; transition: 0.3s; font-family: 'ISOCP', var(--font-primary);" onmouseover="this.style.background='var(--accent-color)'; this.style.borderColor='var(--accent-color)'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)';" onclick="navigate('catalogo', '${idLinea}')">Ver Catálogo</button>
                </div>
                <div class="linea-panel-collage">
                    ${imagesHtml}
                </div>
            </div>
        </section>
    `;
}

// Render: Showroom Virtual
function renderShowroom() {
    return `
        <div class="showroom-page">
            <h1 class="linea-title gsap-reveal" style="padding-top: 80px; font-size: 2.2rem; margin-bottom: 0px;">Showroom Virtual</h1>
            <p class="linea-desc gsap-reveal" style="margin-top: 0px; margin-bottom: 30px; font-size: 1rem;">Explora nuestros ejemplares en la sala virtual</p>
            <section class="spline-section" id="sec-spline" style="margin-top: 0px; margin-bottom: 20px;">
                <canvas id="spline-canvas"></canvas>
                <div id="spline-tooltip" class="spline-tooltip" style="opacity: 0; pointer-events: none;">
                    <div class="spline-tooltip-content">
                        <h4 id="spline-tooltip-title">Producto</h4>
                        <p id="spline-tooltip-linea">Línea</p>
                    </div>
                </div>
                <div class="spline-instruction">
                    <ion-icon name="hand-right-outline"></ion-icon>
                    <span>Explora y presiona los muebles interactivos</span>
                </div>
            </section>
            
            <div class="spline-controls-hint gsap-reveal">
                <div class="control-hint">
                    <div class="control-keys-spatial">
                        <div class="key-row">
                            <span class="control-key">W</span>
                        </div>
                        <div class="key-row">
                            <span class="control-key">A</span>
                            <span class="control-key">S</span>
                            <span class="control-key">D</span>
                        </div>
                    </div>
                    <span class="control-text">para moverse</span>
                </div>
                <div class="control-hint">
                    <div class="control-keys-spatial">
                        <div class="key-row">
                            <span class="control-key">↑</span>
                        </div>
                        <div class="key-row">
                            <span class="control-key">←</span>
                            <span class="control-key">↓</span>
                            <span class="control-key">→</span>
                        </div>
                    </div>
                    <div class="css-mouse">
                        <div class="mouse-left-click"></div>
                    </div>
                    <span class="control-text">Flechas o click izq + arrastre para mov. de cámara</span>
                </div>
                <div class="control-hint">
                    <span class="control-text" style="text-align: left; line-height: 1.5;">
                        <strong>Posar mouse:</strong> Ficha informativa de ejemplar<br>
                        <strong>Click sobre mueble:</strong> Página de detalles del producto
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Inicializar la escena interactiva Spline
async function initSpline() {
    const canvas = document.getElementById('spline-canvas');
    if (!canvas) return;

    try {
        // Cargar el runtime de Spline de forma dinámica solo en la página inicial
        const { Application } = await import('https://unpkg.com/@splinetool/runtime@1.9.32/build/runtime.js');
        const app = new Application(canvas);
        
        // Se añade un cache-buster ?v= timestamp para asegurar descargar siempre la última versión de Spline
        await app.load('https://prod.spline.design/9avFNEJdybzpgWyI/scene.splinecode?v=' + Date.now());
        
        // Mapeo manual de objetos Spline a nombres en nuestra Base de Datos / Catálogo
        const splineToDBMap = {
            "Recibidor Jiraffe": "Recibidor Giraffe",
            "Recibidor Giraffe": "Recibidor Giraffe",
            "Silla Yakuza": "Silla Yakuza",
            "Repisa NET": "Repisa NET",
            "Mesa Plinto": "Mesa Plinto",
            "Mesa Triqueta": "Mesa triqueta", // en BD tiene 't' minúscula
            "Escritorio Pupitre": "Escritorio pupitre",
            "Silla N": "Sitial N",
            "Mesa N": "Mesa N",
            "Banqueta V": "Banqueta V",
            "Mesa ZEN": "Mesa ZEN",
            "Repisa ZEN": "Repisa ZEN",
            "Arrimo ZEN": "Arrimo ZEN",
            "Repisa T": "Repisa T",
            "Sillón ZEN 2c": "Sillón ZEN 2 cuerpos",
            "Sillón ZEN 1c": "Sillón ZEN 1 cuerpo",
            "Sillón ZEN 1c 1": "Sillón ZEN 1 cuerpo",
            "Sillón ZEN 1c 2": "Sillón ZEN 1 cuerpo"
        };
        
        // Helper para buscar los datos del producto en catalogData
        function getProductData(splineName) {
            const dbName = splineToDBMap[splineName];
            if (!dbName) return null;
            
            for (let lineaId in catalogData) {
                const linea = catalogData[lineaId];
                const p = linea.productos.find(x => x.nombre === dbName);
                if (p) {
                    return {
                        id: p.id,
                        lineaId: lineaId,
                        nombre: p.nombre,
                        medidas: p.medidas,
                        tituloLinea: linea.titulo
                    };
                }
            }
            return null;
        }

        const tooltip = document.getElementById('spline-tooltip');
        const tooltipTitle = document.getElementById('spline-tooltip-title');
        const tooltipLinea = document.getElementById('spline-tooltip-linea');
        
        let hoveredProduct = null;

        // Escuchar hover
        app.addEventListener('mouseHover', (e) => {
            if (e.target && e.target.name) {
                if (e.target.name === 'Fondo') {
                    // Si pasamos por el objeto de fondo que agregaste, escondemos el tooltip
                    tooltip.style.opacity = '0';
                    hoveredProduct = null;
                } else {
                    const pData = getProductData(e.target.name);
                    if (pData) {
                        hoveredProduct = pData;
                        tooltipTitle.innerText = pData.nombre;
                        tooltipLinea.innerText = pData.tituloLinea;
                        
                        tooltip.style.opacity = '1';
                    }
                }
            }
        });

        // Ocultar tooltip en mouse out
        canvas.addEventListener('mouseout', () => {
             tooltip.style.opacity = '0';
             hoveredProduct = null;
        });

        // Seguir al ratón para mover el tooltip
        window.addEventListener('mousemove', (e) => {
            if (tooltip.style.opacity === '1') {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });

        // Usar la API de Spline para el evento click, es más preciso y aprovecha el 'Mouse Down' que agregaste
        app.addEventListener('mouseDown', (e) => {
            if (e.target && e.target.name) {
                const pData = getProductData(e.target.name);
                if (pData) {
                    navigate('producto', { lineaId: pData.lineaId, prodId: pData.id });
                    tooltip.style.opacity = '0';
                    hoveredProduct = null;
                }
            }
        });

    } catch (err) {
        console.error("Error al cargar escena Spline:", err);
    }
}

// Render: Home Integrado
function renderHome() {
    const isMobile = window.innerWidth <= 992;
    const bgImage = isMobile ? 'assets/1 teléfono.png' : 'assets/1.jpg';

    let html = `
        <section class="hero" style="background-image: url('${bgImage}');" id="hero-section">
            <div class="hero-content">
                <img src="assets/Ikigai portada op2.png?v=2" alt="Ikigai Diseño" class="hero-title-img" style="opacity:0;">
            </div>
        </section>
    `;

    html += renderLineaPanel('zen', false);
    html += renderLineaPanel('cnc', true);
    html += renderLineaPanel('contemporaneo', false);
    html += renderLineaPanel('decoracion', true);

    const clientesFiles = [
        "Banco tronco.png", "IMG_0653.MP4", "IMG_1045.JPEG", "IMG_1197.JPEG", 
        "IMG_20260212_174258.jpg", "IMG_20260327_183704.jpg", "IMG_20260327_183900.jpg", 
        "IMG_20260328_192511.jpg", "IMG_20260409_175404.jpg", "IMG_20260616_141115.jpg", "IMG_2218.png", 
        "IMG_2541.JPEG", "IMG_4121.MP4", "IMG_4123-1.JPEG", "IMG_4360.jpg", "IMG_4572.JPEG", 
        "IMG_5423.JPEG", "IMG_6574.JPEG"
    ];

    let clientesHtml = `
        <section class="info-section gsap-reveal clientes-section" id="sec-clientes">
            <div class="clientes-title-container">
                <h2>3 años entregando diseño</h2>
                <p>Proyectos de distinto tipo y escala, diseños y objetos íntegros entregados satisfactoriamente a cada uno de sus espacios</p>
            </div>
            <div class="clientes-masonry">
    `;

    clientesFiles.forEach((file, index) => {
        const src = `assets/5. Clientes/${file}`;
        if (file.toLowerCase().endsWith('.mp4')) {
            clientesHtml += `<video src="${src}" autoplay loop muted playsinline class="masonry-item" onclick="openLightbox('${src}', true)"></video>\n`;
        } else {
            clientesHtml += `<img src="${src}" alt="Mobiliario Ikigai" loading="lazy" class="masonry-item" onclick="openLightbox('${src}', false)">\n`;
        }
    });

    clientesHtml += `
            </div>
        </section>
    `;

    html += clientesHtml;

    html += `
        <section class="info-section gsap-reveal" id="sec-nosotros">
            <div class="nosotros-grid">
                <div class="info-text-nosotros">
                    <h2>Nosotros</h2>
                    <p>Ikigai Diseño nace hace 3 años como una iniciativa propia en la búsqueda de hacer realidad un interés en el diseño y construcción de mobiliario y artículos de decoración. La revisión y experimentación de distintos tipos de mobiliario lleva a la construcción de prototipos con énfasis en un sello distintivo de mercado y reivindicación del producto de alto nivel de diseño a un amplio público.</p>
                </div>
                <div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
                        <img src="assets/6. Nosotros/1. Taller.JPEG" alt="Taller Ikigai" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                        <img src="assets/6. Nosotros/2. Experiencia.JPEG" alt="Experiencia Ikigai" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                        <img src="assets/6. Nosotros/3. Máquinas.jpg" alt="Máquinas Ikigai" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                        <img src="assets/6. Nosotros/4. Taller 2.JPEG" alt="Taller Ikigai" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                    </div>
                    <div style="text-align: right; color: rgba(0,0,0,0.6); font-style: italic; margin-top: 15px; padding-right: 20px; font-size: 1.1rem;">Gonzalo Matus Castelli, ARQ UC</div>
                </div>
            </div>
        </section>
        
        <section class="info-section gsap-reveal" id="sec-sustentabilidad">
            <div class="nosotros-grid">
                <div class="info-text-sustentabilidad">
                    <h2>Material y Sustentabilidad</h2>
                    <p>Nuestro abanico de materiales consisten en maderas clásicas como el pino y terciado, sin embargo también orgullosamente disponemos en nuestra línea de trabajo la madera de Kiri (Paulownia Tomentosa). El Kiri es un árbol de madera ligera y de atributos altamente sustentables, ya que al ser menos densa tiene una tasa de crecimiento y regeneración muy rápida y mantiene una buena relación peso/resistencia. Tiene alta estabilidad dimensional (no se deforma) y excelente comportamiento térmico o acústico. Siguenos en las RRSS para ver cómo implementamos este noble material y sus ventajas competitivas.</p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0;">
                    <img src="assets/7. Material y Sustentabilidad/1. Economía circular.png" alt="Economía Circular" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                    <img src="assets/7. Material y Sustentabilidad/2. Árbol Kiri.jpg" alt="Árbol Kiri" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                    <img src="assets/7. Material y Sustentabilidad/3. Viruta.jpeg" alt="Viruta" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                    <img src="assets/7. Material y Sustentabilidad/4. Kiri.jpg" alt="Material Kiri" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;">
                </div>
            </div>
        </section>

        <section class="info-section gsap-reveal" id="sec-contacto" style="display:flex; justify-content:center; padding-top:100px;">
            <div class="contacto-container">
                <h2>Contacto</h2>
                <p style="text-align:center; margin-bottom: 30px;">Si tienes preguntas o deseas una cotización personalizada, escríbenos.</p>
                
                <form action="https://formsubmit.co/contacto@ikigaidiseno.cl" method="POST">
                    <!-- Redirección luego de enviar el formulario -->
                    <input type="hidden" name="_next" value="https://ikigaidiseno.cl/?v=home">
                    <!-- Evitar captcha por defecto si lo deseas, o déjalo en true -->
                    <input type="hidden" name="_captcha" value="false">
                    <input type="hidden" name="_subject" value="Nuevo mensaje desde Ikigai Web">

                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Nombre</label>
                        <input type="text" name="nombre" required style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Email</label>
                        <input type="email" name="email" required style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                    </div>
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Número de teléfono</label>
                        <input type="tel" name="telefono" required style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                    </div>
                    <div class="form-group" style="margin-bottom: 30px;">
                        <label style="display:block; margin-bottom:5px; font-weight:500;">Mensaje</label>
                        <textarea rows="5" name="mensaje" required style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'"></textarea>
                    </div>
                    <button type="submit" style="width:100%; padding:15px; font-size:1.2rem; letter-spacing:1px; border:1px solid var(--primary-color); background:transparent; color:var(--primary-color); cursor:pointer; transition:0.3s; font-family:'ISOCP', var(--font-primary);" onmouseover="this.style.background='var(--accent-color)'; this.style.borderColor='var(--accent-color)'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)';">Enviar Mensaje</button>
                </form>
            </div>
        </section>
    `;
    
    // Simple carrusel hero
    setTimeout(() => {
        const hero = document.getElementById('hero-section');
        if (hero) {
            let toggle = false;
            setInterval(() => {
                if (vistaActual === 'home' && window.scrollY < window.innerHeight) {
                    toggle = !toggle;
                    const isMobileNow = window.innerWidth <= 992;
                    const ext = isMobileNow ? ' teléfono.png' : '.jpg';
                    hero.style.backgroundImage = `url('assets/${toggle ? '2' : '1'}${ext}')`;
                }
            }, 5000);
        }
    }, 100);

    return html;
}

// Render: Catálogo Específico
function renderCatalogo(idLinea) {
    const linea = catalogData[idLinea];
    if (!linea) return `<h2>Línea no encontrada</h2>`;

    const descFormateada = linea.descripcion.replace(', ', ',<br>');

    let html = `
        <section class="catalogo-section">
            <h1 class="linea-title gsap-reveal">${linea.titulo}</h1>
            <p class="linea-desc gsap-reveal">${descFormateada}</p>
            
            ${idLinea === 'cnc' ? `
            <div style="width: 100%; display: flex; justify-content: flex-end; margin-top: -35px; margin-bottom: 5px;">
                <div class="gsap-reveal" style="text-align: right; font-size: 0.95rem; color: #777; padding-right: 30px;">
                    Piezas diseñadas en base a ensambles con<br>tecnología CNC que se arman por el usuario.
                </div>
            </div>
            ` : ''}

            <div class="grid-productos">
    `;

    const visibleProducts = linea.productos.filter(p => !p.nombre.startsWith('Promo'));
    visibleProducts.forEach(prod => {
        const img = prod.imagenes[0];
        html += `
            <div class="producto-card" onclick="navigate('producto', { lineaId: '${idLinea}', prodId: '${prod.id}' })">
                <img src="${img}" alt="${prod.nombre}" class="producto-img">
                <h4>${prod.nombre}</h4>
            </div>
        `;
    });

    html += `
            </div>
        </section>
    `;
    return html;
}

// Función para alternar acordeones (añadida globalmente)
window.toggleAccordion = function(element) {
    element.classList.toggle('active');
    const content = element.querySelector('.accordion-content');
    if (element.classList.contains('active')) {
        content.style.maxHeight = content.scrollHeight + "px";
    } else {
        content.style.maxHeight = "0";
    }
}

window.selectTerminacion = function(value) {
    const radio = document.getElementById('term-' + value);
    if (radio) radio.checked = true;
    
    document.querySelectorAll('.terminacion-name').forEach(el => {
        el.style.fontWeight = 'normal';
    });
    
    const selectedName = document.getElementById('term-name-' + value);
    if (selectedName) {
        selectedName.style.fontWeight = 'bold';
    }
    
    const accordion = document.querySelector('.accordion-terminacion.active .accordion-content');
    if (accordion) {
        accordion.style.maxHeight = accordion.scrollHeight + "px";
    }
}

// Render: Detalle de Producto
function renderDetalleProducto({ lineaId, prodId }) {
    const linea = catalogData[lineaId];
    const prod = linea.productos.find(p => p.id === prodId);
    if (!prod) return `<h2>Producto no encontrado</h2>`;

    const lorem = "Este ejemplar de diseño minimalista ha sido creado con una meticulosa atención al detalle, combinando funcionalidad con las proporciones puras de la arquitectura moderna. Su estética limpia está pensada para aportar elegancia, calidez y un toque orgánico a tus espacios, convirtiéndolo en un elemento atemporal para toda la vida.";
    const loremIpsumAccordion = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

    let acabadoText = `
<div class="terminacion-options" style="display: flex; gap: 15px; justify-content: flex-start; margin-top: 10px; flex-wrap: wrap; padding-bottom: 0;" onclick="event.stopPropagation();">
    <div class="terminacion-option" style="text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center;" onclick="selectTerminacion('Transparente')">
        <img src="assets/Terminación/Transparente.png" alt="Transparente" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 8px;" onclick="openLightbox('assets/Terminación/Transparente.png', false, false, '33vh'); event.stopPropagation();">
        <div class="terminacion-name" id="term-name-Transparente" style="font-size: 0.9rem; margin-bottom: 5px; font-weight: bold;">Transparente</div>
        <input type="radio" name="terminacion" value="Transparente" id="term-Transparente" onchange="selectTerminacion('Transparente')" checked>
    </div>
    <div class="terminacion-option" style="text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center;" onclick="selectTerminacion('Avellano')">
        <img src="assets/Terminación/Avellano.png" alt="Avellano" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 8px;" onclick="openLightbox('assets/Terminación/Avellano.png', false, false, '33vh'); event.stopPropagation();">
        <div class="terminacion-name" id="term-name-Avellano" style="font-size: 0.9rem; margin-bottom: 5px;">Avellano</div>
        <input type="radio" name="terminacion" value="Avellano" id="term-Avellano" onchange="selectTerminacion('Avellano')">
    </div>
    <div class="terminacion-option" style="text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center;" onclick="selectTerminacion('Nogal')">
        <img src="assets/Terminación/Nogal.png" alt="Nogal" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 8px;" onclick="openLightbox('assets/Terminación/Nogal.png', false, false, '33vh'); event.stopPropagation();">
        <div class="terminacion-name" id="term-name-Nogal" style="font-size: 0.9rem; margin-bottom: 5px;">Nogal</div>
        <input type="radio" name="terminacion" value="Nogal" id="term-Nogal" onchange="selectTerminacion('Nogal')">
    </div>
</div>
<p style="font-size: 0.8rem; color: #777; margin-top: 0; text-align: left; line-height: 1.2;">Para terminaciones distintas según piezas coordinar por las vías de contacto</p>
`;

    // Layout especial para Iluminación y Decoración (excepto Lámpara ZEN)
    if (lineaId === 'decoracion' && prod.nombre !== 'Lámpara ZEN') {
        let heroImage = prod.imagenes && prod.imagenes.length > 0 ? prod.imagenes[0] : 'assets/1.png';
        let imgPlanos = (prod.imagenes && prod.imagenes.find(img => img.toLowerCase().includes('plano'))) || prod.planos || null;
        // Fix incorrect extension for Origami in DB
        if (imgPlanos && imgPlanos.toLowerCase().includes('origami') && imgPlanos.endsWith('.jpg')) {
            imgPlanos = imgPlanos.substring(0, imgPlanos.length - 4) + '.png';
        }
        let planHtml = imgPlanos ? `<img class="pdg-img-plan" src="${imgPlanos}" alt="Planos de ${prod.nombre}" style="width: 100%; display: block; margin: 0; padding: 0; cursor: pointer; object-fit: cover;" onclick="openLightbox('${imgPlanos}', false, true)">` : '';

        return `
        <div class="producto-detalles-simple" style="display: flex; flex-wrap: wrap; max-width: none; margin: 120px auto 50px; padding: 0 120px; gap: 60px; align-items: flex-start;">
            <!-- Izquierda 2/3 -->
            <div class="producto-left gsap-reveal" style="flex: 2; min-width: 300px; font-size: 0; line-height: 0;">
                <img class="pdg-img-main" src="${heroImage}" alt="${prod.nombre}" style="width: 100%; display: block; margin: 0; padding: 0; cursor: pointer; object-fit: cover;" onclick="openLightbox('${heroImage}', false, true)">
                ${imgPlanos ? `<img class="pdg-img-plan" src="${imgPlanos}" alt="Planos de ${prod.nombre}" style="width: 100%; display: block; margin: 0; padding: 0; cursor: pointer; object-fit: cover;" onclick="openLightbox('${imgPlanos}', false, true)">` : ''}
            </div>
            
            <!-- Derecha 1/3 -->
            <div class="producto-right" style="flex: 1; min-width: 300px; position: sticky; top: 120px;">
                <h1 class="pdg-title" style="font-size: 2.5rem; margin-bottom: 10px; font-family: var(--font-primary); font-weight: 400;">${prod.nombre}</h1>
                <div class="pdg-price" style="font-size: 1.5rem; color: #555; margin-bottom: 20px;">
                    $${prod.precio.toLocaleString('es-CL')}
                    ${prod.precio_2x ? `<br><span style="font-size: 1.15em; font-weight: 500;">2x $${prod.precio_2x.toLocaleString('es-CL')}</span>` : ''}
                </div>
                <div class="pdg-desc" style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px; color: #444;">${prod.descripcion || lorem}</div>
                
                <h3 class="pdg-details-title" style="margin-bottom: 15px; font-weight: 500; font-family: var(--font-primary); font-size: 1.3rem;">Detalles del producto</h3>
                <div class="accordion-container gsap-reveal" style="margin-bottom: 40px;">
                    <div class="accordion-item" onclick="toggleAccordion(this)">
                        <button class="accordion-header">Material<span class="accordion-icon">+</span></button>
                        <div class="accordion-content"><div class="accordion-content-inner">${prod.material || loremIpsumAccordion}</div></div>
                    </div>
                    <div class="accordion-item" onclick="toggleAccordion(this)">
                        <button class="accordion-header">Dimensiones<span class="accordion-icon">+</span></button>
                        <div class="accordion-content"><div class="accordion-content-inner">${prod.medidas || loremIpsumAccordion}</div></div>
                    </div>
                    <div class="accordion-item" onclick="toggleAccordion(this)">
                        <button class="accordion-header">Uso<span class="accordion-icon">+</span></button>
                        <div class="accordion-content"><div class="accordion-content-inner">${prod.uso || loremIpsumAccordion}</div></div>
                    </div>
                    <div class="accordion-item" onclick="toggleAccordion(this)">
                        <button class="accordion-header">Notas<span class="accordion-icon">+</span></button>
                        <div class="accordion-content"><div class="accordion-content-inner">Plazo de entrega según calendarización automática en el check-out</div></div>
                    </div>
                    ${['Lámpara Origami', 'Lámpara TRI', 'Portavelas ZEN', 'Marcapáginas Van Gogh'].includes(prod.nombre) ? '' : `
                    <div class="accordion-item accordion-terminacion active" onclick="toggleAccordion(this)">
                        <button class="accordion-header">Terminación / acabado<span class="accordion-icon">+</span></button>
                        <div class="accordion-content" style="max-height: 500px;"><div class="accordion-content-inner">${acabadoText}</div></div>
                    </div>
                    `}
                </div>

                ${prod.precio_2x ? `
                <div class="promo-selector" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 500;">Seleccionar opción:</label>
                    <div style="display: flex; gap: 10px;">
                        <label class="promo-radio active">
                            <input type="radio" name="promo_opcion" value="1x" checked onchange="document.querySelectorAll('.promo-radio').forEach(el=>el.classList.remove('active')); this.parentElement.classList.add('active');" style="display:none;">
                            1 Unidad
                        </label>
                        <label class="promo-radio">
                            <input type="radio" name="promo_opcion" value="2x" onchange="document.querySelectorAll('.promo-radio').forEach(el=>el.classList.remove('active')); this.parentElement.classList.add('active');" style="display:none;">
                            2x
                        </label>
                    </div>
                </div>
                ` : ''}
                <button class="btn-primary" style="width: 100%; padding: 15px 40px; font-size: 1.1rem; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); cursor: pointer; transition: 0.3s; font-family: 'ISOCP', var(--font-primary);" onmouseover="this.style.background='var(--accent-color)'; this.style.borderColor='var(--accent-color)'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)';" onclick="agregarAlCarrito('${lineaId}', '${prod.id}')">
                    AÑADIR AL CARRITO
                </button>
            </div>
        </div>
        `;
    }

    // 1. Hero Section
    let heroImage = prod.imagenes && prod.imagenes.length > 0 ? prod.imagenes[0] : 'assets/1.png';
    
    // 2. Imágenes inferiores (sin lightbox según petición del usuario)
    let bottomImagesHtml = '';
    let imgPlanos = (prod.imagenes && prod.imagenes.find(img => img.toLowerCase().includes('plano'))) || prod.planos || null;
    // Fix incorrect extension for Origami in DB
    if (imgPlanos && imgPlanos.toLowerCase().includes('origami') && imgPlanos.endsWith('.jpg')) {
        imgPlanos = imgPlanos.substring(0, imgPlanos.length - 4) + '.png';
    }
    let imgSecundaria = null;
    if (prod.imagenes && prod.imagenes.length > 1) {
        let img2 = prod.imagenes[1];
        if (!img2.toLowerCase().includes('plano')) imgSecundaria = img2;
    }
    
    if (imgSecundaria || imgPlanos) {
        let leftHtml = imgSecundaria ? `<div class="producto-img-secundaria"><img src="${imgSecundaria}" alt="Vista secundaria de ${prod.nombre}"></div>` : '<div class="producto-img-secundaria" style="background:#eee;"></div>';
        let rightHtml = imgPlanos ? `<div class="producto-img-planos"><img src="${imgPlanos}" alt="Planos de ${prod.nombre}" style="cursor: pointer;" onclick="openLightbox('${imgPlanos}', false, true)"></div>` : '';
        
        bottomImagesHtml = `
            <div class="producto-bottom-images">
                ${leftHtml}
                ${rightHtml}
            </div>
        `;
    }

        let materialText = prod.material || loremIpsumAccordion;
        let notasText = 'Plazo de entrega según calendarización automática en el check-out';
        
        if (lineaId === 'cnc') {
            notasText = 'Pieza diseñada en base a ensambles con tecnología CNC que se arman por el usuario<br>' + notasText;
        }

        return `
        <!-- Hero Section -->
        <div class="producto-hero gsap-reveal">
            <img src="${heroImage}" alt="${prod.nombre}" class="producto-hero-bg">
            <div class="producto-hero-overlay"></div>
            <div class="producto-hero-info">
                <h1>${prod.nombre}</h1>
                <div class="producto-hero-precio">
                    $${prod.precio.toLocaleString('es-CL')}
                    ${prod.precio_2x ? `<br><span style="font-size: 1.15em; font-weight: 500;">2x $${prod.precio_2x.toLocaleString('es-CL')}</span>` : ''}
                </div>
                <div class="producto-hero-desc">${prod.descripcion || lorem}</div>
            </div>
        </div>

        ${bottomImagesHtml}

        <!-- Detalles y Acordeones -->
        <div class="producto-detalles-section gsap-reveal">
            <h2>Detalles del producto</h2>
            
            <div class="accordion-container">
                <!-- Material -->
                <div class="accordion-item" onclick="toggleAccordion(this)">
                    <button class="accordion-header">
                        Material
                        <span class="accordion-icon">+</span>
                    </button>
                    <div class="accordion-content">
                        <div class="accordion-content-inner">${materialText}</div>
                    </div>
                </div>
                
                <!-- Dimensiones -->
                <div class="accordion-item" onclick="toggleAccordion(this)">
                    <button class="accordion-header">
                        Dimensiones
                        <span class="accordion-icon">+</span>
                    </button>
                    <div class="accordion-content">
                        <div class="accordion-content-inner">${prod.medidas || loremIpsumAccordion}</div>
                    </div>
                </div>
                
                <!-- Uso -->
                <div class="accordion-item" onclick="toggleAccordion(this)">
                    <button class="accordion-header">
                        Uso
                        <span class="accordion-icon">+</span>
                    </button>
                    <div class="accordion-content">
                        <div class="accordion-content-inner">${prod.uso || loremIpsumAccordion}</div>
                    </div>
                </div>
                
                <!-- Notas -->
                <div class="accordion-item" onclick="toggleAccordion(this)">
                    <button class="accordion-header">
                        Notas
                        <span class="accordion-icon">+</span>
                    </button>
                    <div class="accordion-content">
                        <div class="accordion-content-inner">${notasText}</div>
                    </div>
                </div>
                
                ${['Lámpara Origami', 'Lámpara TRI', 'Portavelas ZEN', 'Marcapáginas Van Gogh'].includes(prod.nombre) ? '' : `
                <!-- Terminación/acabado -->
                <div class="accordion-item accordion-terminacion active" onclick="toggleAccordion(this)">
                    <button class="accordion-header">
                        Terminación / acabado
                        <span class="accordion-icon">+</span>
                    </button>
                    <div class="accordion-content" style="max-height: 500px;">
                        <div class="accordion-content-inner">${acabadoText}</div>
                    </div>
                </div>
                `}
            </div>

            <div class="producto-add-cart-wrapper" style="display: flex; flex-direction: column; align-items: center; max-width: 400px; margin: 0 auto;">
                ${prod.precio_2x ? `
                <div class="promo-selector" style="margin-bottom: 20px; width: 100%;">
                    <label style="display: block; margin-bottom: 10px; font-weight: 500; text-align: left;">Seleccionar opción:</label>
                    <div style="display: flex; gap: 10px; width: 100%;">
                        <label class="promo-radio active" style="flex:1;">
                            <input type="radio" name="promo_opcion" value="1x" checked onchange="document.querySelectorAll('.promo-radio').forEach(el=>el.classList.remove('active')); this.parentElement.classList.add('active');" style="display:none;">
                            1 Unidad
                        </label>
                        <label class="promo-radio" style="flex:1;">
                            <input type="radio" name="promo_opcion" value="2x" onchange="document.querySelectorAll('.promo-radio').forEach(el=>el.classList.remove('active')); this.parentElement.classList.add('active');" style="display:none;">
                            2x
                        </label>
                    </div>
                </div>
                ` : ''}
                <button class="btn-primary" style="width: 100%; padding: 15px 40px; font-size: 1.1rem; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color);" onmouseover="this.style.background='var(--accent-color)'; this.style.borderColor='var(--accent-color)'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)';" onclick="agregarAlCarrito('${lineaId}', '${prod.id}')">
                    AÑADIR AL CARRITO
                </button>
            </div>
        </div>
    `;
}

function changeMainImage(el, src) {
    document.getElementById('main-product-image').src = src;
    const thumbs = document.querySelectorAll('#thumbs-container img');
    thumbs.forEach(t => {
        t.style.opacity = '0.6';
        t.style.border = '2px solid transparent';
    });
    el.style.opacity = '1';
    el.style.border = '2px solid var(--primary-color)';
}

// Lógica del Carrito
window.toggleCart = function() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
}

window.agregarAlCarrito = function(lineaId, prodId) {
    const linea = catalogData[lineaId];
    let prod = linea.productos.find(p => p.id === prodId);
    
    // Obtener la terminación seleccionada
    const radioSelected = document.querySelector('input[name="terminacion"]:checked');
    const isNoTerminacion = ['Lámpara Origami', 'Lámpara TRI', 'Portavelas ZEN', 'Marcapáginas Van Gogh'].includes(prod.nombre);
    const terminacion = radioSelected ? radioSelected.value : (isNoTerminacion ? null : 'Transparente');
    const barniz = terminacion;
    
    // Verificar si hay promoción 2x seleccionada
    const promoOpcion = document.querySelector('input[name="promo_opcion"]:checked');
    if (promoOpcion && promoOpcion.value === '2x' && prod.precio_2x) {
        const promoName = 'Promo ' + prod.nombre;
        const promoProd = linea.productos.find(p => p.nombre === promoName);
        if (promoProd) {
            prod = promoProd;
        } else {
            prod = {
                ...prod,
                id: prod.id + '-2x',
                nombre: prod.nombre + ' (2x)',
                precio: prod.precio_2x
            };
        }
    }
    
    carrito.push({
        ...prod,
        barniz,
        terminacion: barniz,
        cantidad: 1,
        cartId: Date.now().toString()
    });
    
    guardarCarrito();
    actualizarCarritoUI();
    toggleCart(); 
}

window.removerDelCarrito = function(cartId) {
    carrito = carrito.filter(item => item.cartId !== cartId);
    guardarCarrito();
    actualizarCarritoUI();
}

function guardarCarrito() {
    localStorage.setItem('ikigai_carrito', JSON.stringify(carrito));
}

function actualizarCarritoUI() {
    document.getElementById('cart-count').innerText = carrito.length;
    
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    
    let total = 0;
    
    carrito.forEach(item => {
        total += item.precio;
        container.innerHTML += `
            <div class="cart-item">
                <img src="${item.imagenes[0]}" alt="${item.nombre}">
                <div class="cart-item-details">
                    <h4 style="font-size: 1.3rem; margin: 0 0 5px 0; font-weight: 500;">${item.nombre}</h4>
                    ${item.barniz ? `<p style="font-size: 0.85rem; color: #555; margin: 0 0 5px 0;">Terminación ${item.barniz}</p>` : ''}
                    <p style="font-size: 1.05rem; color: #555; margin: 0 0 10px 0;">$${item.precio.toLocaleString('es-CL')}</p>
                    <span class="cart-item-remove" onclick="removerDelCarrito('${item.cartId}')">Eliminar</span>
                </div>
            </div>
        `;
    });
    
    if (carrito.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top: 50px;">El carrito está vacío</p>';
    }
    
    document.getElementById('cart-total-price').innerText = total.toLocaleString('es-CL');
}

window.checkout = function() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }
    toggleCart(); 
    navigate('checkout_form');
}

function renderCheckoutForm() {
    let total = 0;
    let itemsHtml = '';
    carrito.forEach(item => {
        total += item.precio;
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #ddd; padding-bottom:5px;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size: 0.95rem;">${item.nombre}</span>
                    ${item.barniz ? `<span style="font-size: 0.8rem; color: #555;">Terminación ${item.barniz}</span>` : ''}
                </div>
                <strong>$${item.precio.toLocaleString('es-CL')}</strong>
            </div>
        `;
    });

    return `
        <style>
            .checkout-wrapper {
                position: relative;
                width: 100%;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                min-height: 500px;
                padding-bottom: 50px;
            }
            .checkout-form-col {
                width: 100%;
                max-width: 550px;
                z-index: 1;
            }
            #checkout-form {
                width: 100%;
            }
            .checkout-summary-col {
                position: absolute;
                right: 0;
                top: 0;
                padding-right: 5%;
                width: 100%;
                max-width: 420px;
                z-index: 2;
            }
            .checkout-summary-box {
                width: 100%;
                background: #fff;
                padding: 30px 25px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                position: sticky;
                top: 100px;
            }
            @media (max-width: 1200px) {
                .checkout-wrapper {
                    flex-direction: column;
                    align-items: center;
                    gap: 40px;
                    padding-left: 20px;
                    padding-right: 20px;
                    box-sizing: border-box;
                }
                .checkout-form-col {
                    order: 2;
                    padding: 0 10px;
                    box-sizing: border-box;
                }
                .checkout-summary-col {
                    order: 1;
                    position: static;
                    padding-right: 0;
                    max-width: 550px;
                    padding: 0 10px;
                    box-sizing: border-box;
                }
            }
            @media (max-width: 768px) {
                .checkout-title {
                    font-size: 1.8rem !important;
                }
            }
        </style>
        <section class="info-section gsap-reveal" style="display:flex; flex-direction:column; align-items:center; padding-top:120px; overflow-x:hidden;">
            <h2 class="checkout-title" style="text-align:center; margin-bottom: 40px; font-size: 2rem; padding: 0 20px;">Detalles de<br>facturación y envío</h2>
            
            <div class="checkout-wrapper">
                
                <!-- Formulario (Centro) -->
                <div class="checkout-form-col">
                    <form id="checkout-form" onsubmit="window.submitCheckout(event)">
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500; font-size:0.9rem;">Nombre completo</label>
                            <input type="text" id="cust-nombre" required style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                        </div>
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500; font-size:0.9rem;">Email</label>
                            <input type="email" id="cust-email" required style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                        </div>
                        <div class="form-group" id="group-direccion" style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500; font-size:0.9rem;">Dirección</label>
                            <input type="text" id="cust-direccion" required placeholder="Ej: Los Pelícanos 818" style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                        </div>
                        <div class="form-group" id="group-comuna" style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500; font-size:0.9rem;">Comuna</label>
                            <input type="text" id="cust-comuna" required placeholder="Ej: La Florida" style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                        </div>
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500; font-size:0.9rem;">Teléfono</label>
                            <input type="tel" id="cust-telefono" required placeholder="+56 9 ..." style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'">
                        </div>
                        <div class="form-group" style="margin-bottom: 30px;">
                            <label style="display:block; margin-bottom:5px; font-weight:500; font-size:0.9rem;">Notas adicionales</label>
                            <textarea id="order-notas" rows="4" style="width:100%; padding:15px; border:1px solid var(--primary-color); border-radius:0; background:transparent; font-family:inherit; transition:0.3s;" onfocus="this.style.background='rgba(0,0,0,0.05)'" onblur="this.style.background='transparent'"></textarea>
                        </div>
                        <button type="submit" style="width:100%; padding:15px; font-size:1rem; letter-spacing:1px; border:1px solid var(--primary-color); background:transparent; color:var(--primary-color); cursor:pointer; transition:0.3s; font-family:'ISOCP', var(--font-primary);" onmouseover="this.style.background='var(--accent-color)'; this.style.borderColor='var(--accent-color)'; this.style.color='white';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--primary-color)'; this.style.color='var(--primary-color)';" id="btn-submit-order">Confirmar compra</button>
                    </form>
                </div>

                <!-- Resumen (Derecha) -->
                <div class="checkout-summary-col">
                    <div class="checkout-summary-box">
                        <h3 style="margin-bottom:15px; font-size:1rem; font-family:var(--font-primary);">Resumen del pedido</h3>
                        <div id="checkout-items-list">
                            ${itemsHtml}
                        </div>
                        <div id="checkout-despacho-row" style="display:none; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #ddd; padding-bottom:5px;">
                            <span style="font-size: 0.95rem;">Despacho a domicilio</span>
                            <strong>$10.000</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:15px; font-size:1.3rem; border-top:2px solid #333; padding-top:10px;">
                            <span>Total:</span>
                            <strong id="checkout-total">$${total.toLocaleString('es-CL')}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:15px; margin-bottom:30px; font-size:0.95rem; border-top:1px solid #eee; padding-top:15px;">
                            <div style="display:flex; flex-direction:column;">
                                <span>Fecha estimada de realización:</span>
                                <span style="font-size: 0.8rem; color: #777; margin-top: 5px;">Se te contactará antes para ver opciones de días de despacho</span>
                            </div>
                            <strong id="checkout-eta" style="color:var(--accent); font-size:0.95rem;">Calculando...</strong>
                        </div>

                        <h3 style="margin-bottom:15px; font-size:1rem; font-family:var(--font-primary);">Método de entrega</h3>
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                                <input type="radio" name="checkout_despacho" value="retiro" onchange="window.actualizarTotalCheckout()" style="margin-top: 4px;">
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.95rem;">Retiro en taller</span>
                                    <span style="font-size: 0.8rem; color: #777;">Nueva San Martin 1010, Maipú</span>
                                </div>
                            </label>
                            <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                                <input type="radio" name="checkout_despacho" value="despacho" onchange="window.actualizarTotalCheckout()" style="margin-top: 4px;">
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 0.95rem;">Despacho a domicilio</span>
                                    <span style="font-size: 0.8rem; color: #777;">Despacho RM, para regiones coordinar por vías de contacto</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    `;
}

window.renderSuccessPage = async function(orden) {
    const isMobile = window.innerWidth <= 992;
    const bgImage = isMobile ? 'assets/1 teléfono.png' : 'assets/1.jpg';
    
    // Mostramos la tarjeta de éxito
    const appContent = document.getElementById('app-content');
    
    // Estilos y estructura
    appContent.innerHTML = `
        <style>
            .success-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 80vh;
                padding-top: 80px;
                background-color: var(--bg-color);
            }
            .success-container {
                background: #fff;
                padding: 60px 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.05);
                text-align: center;
                max-width: 420px;
                width: 90%;
                border-top: 5px solid var(--accent-color);
            }
            .icon-container {
                width: 80px;
                height: 80px;
                background-color: rgba(199, 156, 110, 0.1);
                color: var(--accent-color);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                margin: 0 auto 30px auto;
            }
            .success-title {
                font-family: var(--font-primary);
                font-size: 2.2rem;
                margin: 0 0 15px 0;
                font-weight: 500;
            }
            .success-text {
                font-size: 1.1rem;
                line-height: 1.6;
                color: #555;
                margin: 0 auto 30px auto;
                max-width: 360px;
            }
            .order-number {
                font-weight: 600;
                color: var(--primary-color);
                background: #f4f4f4;
                padding: 4px 10px;
                border-radius: 4px;
                letter-spacing: 1px;
            }
            .btn-home {
                display: inline-block;
                padding: 15px 40px;
                font-size: 1.1rem;
                letter-spacing: 1px;
                border: 1px solid var(--primary-color);
                background: transparent;
                color: var(--primary-color);
                cursor: pointer;
                transition: 0.3s;
                font-family: var(--font-primary);
                text-decoration: none;
            }
            .btn-home:hover {
                background: var(--accent-color);
                border-color: var(--accent-color);
                color: white;
            }
        </style>
        <div class="success-wrapper gsap-reveal">
            <div class="success-container">
                <div class="icon-container">
                    <ion-icon name="checkmark-outline"></ion-icon>
                </div>
                <h1 class="success-title">¡Pago Exitoso!</h1>
                <p class="success-text">Hemos recibido tu pedido <span class="order-number">#${orden ? orden.replace('O-', '') : 'Desconocido'}</span>.<br>Nuestro equipo ya está en proceso de ingreso y gestión, te notificaremos para coordinar la entrega.</p>
                <a href="/?v=home" class="btn-home">Volver a la página principal</a>
            </div>
        </div>
    `;

    // Limpiar el carrito
    carrito = [];
    localStorage.removeItem('ikigai_carrito');
    actualizarCarritoUI();

    setTimeout(() => initScrollAnimations(), 50);
}

window.renderErrorPage = function(pagoState) {
    const appContent = document.getElementById('app-content');
    
    let titulo = "Ocurrió un error";
    let mensaje = "No pudimos procesar tu pago. Por favor intenta nuevamente.";
    let icon = "alert-circle-outline";
    let color = "#e74c3c";
    
    if (pagoState === 'cancelado') {
        titulo = "Pago cancelado";
        mensaje = "Has cancelado el proceso de pago. Puedes volver a intentarlo cuando gustes.";
        icon = "close-circle-outline";
        color = "#e67e22";
    } else if (pagoState === 'rechazado') {
        titulo = "Pago rechazado";
        mensaje = "Tu pago fue rechazado por el banco o emisor de tu tarjeta. Por favor verifica tus datos e intenta nuevamente.";
    }

    appContent.innerHTML = `
        <style>
            .error-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 80vh;
                padding-top: 80px;
                background-color: var(--bg-color);
            }
            .success-container {
                background: #fff;
                padding: 60px 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.05);
                text-align: center;
                max-width: 420px;
                width: 90%;
                border-top: 5px solid ${color};
            }
            .icon-container-err {
                width: 80px;
                height: 80px;
                background-color: transparent;
                color: ${color};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 60px;
                margin: 0 auto 20px auto;
            }
            .btn-home {
                display: inline-block;
                padding: 15px 40px;
                font-size: 1.1rem;
                letter-spacing: 1px;
                border: 1px solid var(--primary-color);
                background: transparent;
                color: var(--primary-color);
                cursor: pointer;
                transition: 0.3s;
                font-family: var(--font-primary);
                text-decoration: none;
            }
            .btn-home:hover {
                background: var(--accent-color);
                border-color: var(--accent-color);
                color: white;
            }
        </style>
        <div class="error-wrapper gsap-reveal">
            <div class="success-container">
                <div class="icon-container-err">
                    <ion-icon name="${icon}"></ion-icon>
                </div>
                <h1 style="font-family: var(--font-primary); font-size: 2.2rem; margin: 0 0 15px 0; font-weight: 500;">${titulo}</h1>
                <p style="font-size: 1.1rem; line-height: 1.6; color: #555; margin: 0 auto 30px auto; max-width: 360px;">${mensaje}</p>
                <a href="/?v=checkout_form" class="btn-home">Volver al carrito</a>
            </div>
        </div>
    `;

    setTimeout(() => initScrollAnimations(), 50);
}

window.calcularCostoDespacho = function() {
    let costoDespacho = 0;
    const items5k = ['Lámpara Pluma'];
    const items4k = ['Lámpara Origami', 'Lámpara TRI', 'Portavinos X', 'Macetero ZEN'];
    const items2k = ['Portavelas ZEN', 'Marcapáginas Van Gogh'];
    
    carrito.forEach(item => {
        let nombreBase = item.nombre;
        if (nombreBase.includes(' (2x)')) {
            nombreBase = nombreBase.replace(' (2x)', '');
        }
        
        let itemD = 10000;
        if (items2k.includes(nombreBase)) {
            itemD = 2000;
        } else if (items4k.includes(nombreBase)) {
            itemD = 4000;
        } else if (items5k.includes(nombreBase)) {
            itemD = 5000;
        }
        
        if (itemD > costoDespacho) {
            costoDespacho = itemD;
        }
    });
    
    return costoDespacho;
}

window.actualizarTotalCheckout = function() {
    const radios = document.querySelectorAll('input[name="checkout_despacho"]');
    let total = 0;
    carrito.forEach(item => { total += item.precio; });
    
    const costoDespacho = window.calcularCostoDespacho();
    let isDespacho = false;
    
    radios.forEach(r => {
        if (r.checked) {
            if (r.value === 'despacho') {
                total += costoDespacho;
                isDespacho = true;
            }
        }
    });

    const despachoRow = document.getElementById('checkout-despacho-row');
    if (despachoRow) {
        despachoRow.style.display = isDespacho ? 'flex' : 'none';
        if (isDespacho) {
            despachoRow.querySelector('strong').innerText = '$' + costoDespacho.toLocaleString('es-CL');
        }
    }

    document.getElementById('checkout-total').innerText = '$' + total.toLocaleString('es-CL');

    const custDireccion = document.getElementById('cust-direccion');
    const custComuna = document.getElementById('cust-comuna');
    const groupDireccion = document.getElementById('group-direccion');
    const groupComuna = document.getElementById('group-comuna');
    
    if (custDireccion && custComuna) {
        if (isDespacho) {
            custDireccion.required = true;
            custComuna.required = true;
            if (groupDireccion) groupDireccion.style.display = 'block';
            if (groupComuna) groupComuna.style.display = 'block';
        } else {
            custDireccion.required = false;
            custComuna.required = false;
            if (groupDireccion) groupDireccion.style.display = 'none';
            if (groupComuna) groupComuna.style.display = 'none';
        }
    }
}

setTimeout(async () => {
    if (!localStorage.getItem('finanzas_cleared')) {
        try {
            console.log("Limpiando finanzas de prueba...");
            await window.supabase.from('finanzas').delete().neq('id', 'dummy');
            console.log("Finanzas limpiadas con éxito");
            localStorage.setItem('finanzas_cleared', 'true');
        } catch(e) {}
    }
    if (!localStorage.getItem('imagenes_arregladas_pluma_v4')) {
        try {
            const decProds = [
                { id: 'dec-2', nombre: 'Lámpara Origami', precio: 45000, medidas: 'D25 y a40 cm', material: 'Madera', imagenes: ['assets/4. Iluminación y Decoración/2. Lámpara Origami/Lámpara Origami.jpg', 'assets/4. Iluminación y Decoración/2. Lámpara Origami/Planos lámpara origami.png'] },
                { id: 'dec-4', imagenes: ['assets/4. Iluminación y Decoración/3. Lámpara TRI/Lámpara TRI.jpg', 'assets/4. Iluminación y Decoración/3. Lámpara TRI/Planos lámpara tri.jpg'] },
                { id: 'dec-5', imagenes: ['assets/4. Iluminación y Decoración/4. Portavinos X/Portavinos X.png', 'assets/4. Iluminación y Decoración/4. Portavinos X/Planos portavinos x.jpg'] },
                { id: 'dec-6', imagenes: ['assets/4. Iluminación y Decoración/5. Macetero ZEN/Macetero ZEN.png', 'assets/4. Iluminación y Decoración/5. Macetero ZEN/Planos macetero ZEN.jpg'] },
                { id: 'dec-7', imagenes: ['assets/4. Iluminación y Decoración/6. Portavelas ZEN.jpg'] },
                { id: 'dec-8', imagenes: ['assets/4. Iluminación y Decoración/7. Marcapáginas Van Gogh.jpg'] }
            ];
            for (let p of decProds) {
                await window.supabase.from('productos').update({ imagenes: p.imagenes }).eq('id', p.id);
            }
            await window.supabase.from('productos').delete().eq('id', 'dec-3');
            localStorage.setItem('imagenes_arregladas_pluma_v3', 'true');
            console.log('Imágenes corregidas en BD');
            location.reload();
        } catch(e) {}
    }
}, 3000);

window.calcularFechaEstimadaFrontend = async function() {
    let fechaEstimada = null;
    try {
        // Fetch configuration
        let diasGlobal = 0;
        const { data: conf } = await supabase.from('configuracion').select('*').eq('id', 1).single();
        if (conf && conf.dias_aplazamiento) diasGlobal = conf.dias_aplazamiento;
        
        // Calculate cart duration and check stock
        let sumEtapas = 0;
        let allInStock = true;
        let stockFulfilled = [];
        let hasImported = false;
        let hasRegular = false;
        
        for (const item of carrito) {
            const { data: prod } = await supabase.from('productos').select('*').eq('id', item.id).single();
            if (prod) {
                if (['Portavelas ZEN', 'Marcapáginas Van Gogh'].includes(prod.nombre)) {
                    hasImported = true;
                    allInStock = false; // Imported items always take 5 days, not immediate stock
                    continue; // Skip workshop calculation for this item
                }
                
                hasRegular = true;
                const stockDisponible = prod.stock_base || 0;
                const qtyNeeded = item.cantidad || 1;
                
                if (stockDisponible > 0) {
                    const fulfilled = Math.min(stockDisponible, qtyNeeded);
                    stockFulfilled.push({ id: item.id, qty: fulfilled });
                }
                
                if (stockDisponible >= qtyNeeded) {
                    // En stock completo: no suma días de fabricación
                    sumEtapas += 0;
                } else {
                    // Requiere fabricación (total o parcial)
                    allInStock = false;
                    const gestMat = prod.dias_gestion_material || 0;
                    const corte = prod.dias_corte_cnc || 0;
                    const despTaller = prod.dias_despacho_taller || 0;
                    const moA = prod.dias_mano_obra || prod.dias_mano_obra_a || 0;
                    
                    const qtyToMake = qtyNeeded - stockDisponible;
                    const itemDays = (gestMat + corte + despTaller + moA) * qtyToMake;
                    sumEtapas += itemDays;
                }
            } else {
                allInStock = false;
            }
        }
        
        // Determine if the efficiency factor (0.8) applies based on workshop backlog
        let factorEficiencia = 1.0;
        const largeProducts = [
            'Arrimo ZEN', 'Repisa ZEN', 'Mesa Plinto', 'Sillón ZEN 2 cuerpos', 'Sillón ZEN 1 cuerpo', 'Mesa OVAL', 'Mesa ZEN',
            'Escritorio Pupitre', 'Repisa NET', 'Mesa Triqueta', 'Silla N', 'Piso Eslinga',
            'Silla Yakuza', 'Recibidor Jiraffe', 'Banqueta V', 'Repisa T', 'Mesa N', 'Arrimo RAW', 'Mesa RAW rodela',
            'Lámpara ZEN', 'Macetero ZEN'
        ];
        
        const { data: allProds } = await supabase.from('productos').select('id, nombre');
        const prodMap = {};
        if (allProds) allProds.forEach(p => prodMap[p.id] = p.nombre);
        
        const { data: activePedidos } = await supabase.from('pedidos')
            .select(`id, fecha_estimada_entrega, estado, transbank_status, pedido_items ( cantidad, producto_id )`)
            .neq('estado', 'f) Entregado')
            .not('fecha_estimada_entrega', 'is', null);
            
        let maxDate = new Date();
        let countLarge = 0;
        
        if (activePedidos && activePedidos.length > 0 && !allInStock) {
            activePedidos.forEach(p => {
                if (p.transbank_status === 'INITIALIZED' || p.transbank_status === 'REJECTED' || p.transbank_status === 'FAILED') return;
                
                const status = p.estado || '';
                if (!status.includes('Despacho') && !status.includes('Entregado')) {
                    const pd = new Date(p.fecha_estimada_entrega);
                    if (pd > maxDate) maxDate = pd;
                }
                if (status.includes('Recibido') || status.includes('Materiales')) {
                    if (p.pedido_items) {
                        p.pedido_items.forEach(pi => {
                            const pName = prodMap[pi.producto_id];
                            if (pName && largeProducts.includes(pName)) countLarge += pi.cantidad;
                        });
                    }
                }
            });
        }
        
        // Habilitamos el factor de eficiencia según solicitud del usuario (solo si hay fabricación)
        if (!allInStock && countLarge >= 5) {
            factorEficiencia = 0.8;
            sumEtapas = Math.ceil(sumEtapas * factorEficiencia);
        }
        
        let totalDaysToAdd = 0;
        if (!hasRegular && hasImported) {
            totalDaysToAdd = 5;
            maxDate = new Date(); // Ignora el taller
        } else if (allInStock && !hasImported) {
            // Si TODO el carrito está en stock, el taller se ignora y despachamos en 3 días hábiles
            totalDaysToAdd = 3;
            maxDate = new Date(); // Inicia a contar desde hoy
        } else {
            // Si hay que fabricar, se suma a la cola del taller
            totalDaysToAdd = sumEtapas + diasGlobal;
        }
        let deliveryDate = new Date(maxDate);
        let daysAdded = 0;
        let feriadosStr = new Set();
        
        try {
            const year1 = deliveryDate.getFullYear();
            const year2 = year1 + 1;
            const [res1, res2] = await Promise.all([
                fetch(`https://date.nager.at/api/v3/PublicHolidays/${year1}/CL`).catch(() => null),
                fetch(`https://date.nager.at/api/v3/PublicHolidays/${year2}/CL`).catch(() => null)
            ]);
            if (res1 && res1.ok) {
                const data1 = await res1.json();
                data1.forEach(h => { if (h.global) feriadosStr.add(h.date); });
            }
            if (res2 && res2.ok) {
                const data2 = await res2.json();
                data2.forEach(h => { if (h.global) feriadosStr.add(h.date); });
            }
        } catch(e) {
            console.warn("No se pudieron cargar los feriados", e);
        }

        while(daysAdded < totalDaysToAdd) {
            deliveryDate.setDate(deliveryDate.getDate() + 1);
            const yyyy = deliveryDate.getFullYear();
            const mm = String(deliveryDate.getMonth() + 1).padStart(2, '0');
            const dd = String(deliveryDate.getDate()).padStart(2, '0');
            const dateString = `${yyyy}-${mm}-${dd}`;

            if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6 && !feriadosStr.has(dateString)) {
                daysAdded++;
            }
        }
        
        // Enforce 5 business days minimum if imported products are included
        if (typeof hasImported !== 'undefined' && hasImported && hasRegular) {
            let minDeliveryDate = new Date();
            let minDays = 0;
            while(minDays < 5) {
                minDeliveryDate.setDate(minDeliveryDate.getDate() + 1);
                const yyyy = minDeliveryDate.getFullYear();
                const mm = String(minDeliveryDate.getMonth() + 1).padStart(2, '0');
                const dd = String(minDeliveryDate.getDate()).padStart(2, '0');
                if (minDeliveryDate.getDay() !== 0 && minDeliveryDate.getDay() !== 6 && !feriadosStr.has(`${yyyy}-${mm}-${dd}`)) {
                    minDays++;
                }
            }
            if (deliveryDate < minDeliveryDate) {
                deliveryDate = minDeliveryDate;
            }
        }
        
        if (totalDaysToAdd > 0 || (typeof hasImported !== 'undefined' && hasImported)) {
            fechaEstimada = deliveryDate.toISOString();
        }
    } catch(e) {
        console.error("Error calculando fecha estimada:", e);
    }
    return { 
        fechaEstimada, 
        allInStock: typeof allInStock !== 'undefined' ? allInStock : false,
        stockFulfilled: typeof stockFulfilled !== 'undefined' ? stockFulfilled : []
    };
}

window.submitCheckout = async function(event) {
    event.preventDefault();
    
    const despachoRadio = document.querySelector('input[name="checkout_despacho"]:checked');
    if (!despachoRadio) {
        alert("Por favor selecciona un método de entrega antes de continuar.");
        return;
    }
    const metodoDespacho = despachoRadio.value;
    
    const btn = document.getElementById('btn-submit-order');
    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Procesando pedido...';
    }

    const nombre = document.getElementById('cust-nombre').value;
    const email = document.getElementById('cust-email').value;
    const telefono = document.getElementById('cust-telefono').value;
    const direccion = document.getElementById('cust-direccion') ? document.getElementById('cust-direccion').value : '';
    const comuna = document.getElementById('cust-comuna') ? document.getElementById('cust-comuna').value : '';
    let notas = document.getElementById('order-notas').value;
    
    const costoDespacho = window.calcularCostoDespacho();
    const textoDespacho = metodoDespacho === 'despacho' ? `Despacho a domicilio (+$${costoDespacho.toLocaleString('es-CL')})` : 'Retiro en taller';
    
    let notasEstructuradas = `Método de entrega: ${textoDespacho}`;
    if (direccion) {
        notasEstructuradas += `\nDirección de envío: ${direccion}, Comuna: ${comuna}`;
    }
    if (notas) {
        notasEstructuradas += `\n\nNotas adicionales:\n${notas}`;
    }
    notas = notasEstructuradas;

    try {
        // 1. Crear o buscar Cliente
        let { data: cliente, error: errCliFind } = await supabase
            .from('clientes')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (errCliFind) throw errCliFind;

        let clienteId;
        if (cliente) {
            clienteId = cliente.id;
        } else {
            const { data: newCli, error: errCliIns } = await supabase
                .from('clientes')
                .insert({ nombre, email, telefono })
                .select('id')
                .single();
            if (errCliIns) throw errCliIns;
            clienteId = newCli.id;
        }

        // 2. Calcular Total
        let total = 0;
        carrito.forEach(item => { total += item.precio; });
        if (metodoDespacho === 'despacho') {
            total += costoDespacho;
        }

        // 3. Calcular fecha de entrega estimada
        const etaResult = await window.calcularFechaEstimadaFrontend();
        const fechaEstimada = etaResult.fechaEstimada;
        
        if (etaResult.allInStock) {
            notas += '\n\n[STOCK_ENVIADO]: Este pedido fue descontado 100% del inventario de stock disponible. No requiere fabricación.';
        } else if (etaResult.stockFulfilled && etaResult.stockFulfilled.length > 0) {
            const stockItemsStr = etaResult.stockFulfilled.map(f => `${f.id}:${f.qty}`).join(',');
            notas += `\n\n[STOCK_PARCIAL]: ${stockItemsStr}`;
        }


        // 4. Preparar datos para el backend
        const returnUrl = window.location.origin + '//api/confirmar-transaccion';
        const payload = {
            clienteId: clienteId,
            total: total,
            notas: notas,
            items: carrito,
            returnUrl: returnUrl,
            fechaEstimada: fechaEstimada
        };

        // 5. Llamar a nuestro backend seguro (Netlify Function)
        const response = await fetch('//api/crear-transaccion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al conectar con el servidor de pagos');
        }

        // 6. Redirigir a Webpay de Transbank usando un formulario oculto
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.url;
        
        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'token_ws';
        tokenInput.value = data.token;
        
        form.appendChild(tokenInput);
        document.body.appendChild(form);
        
        // Limpiar el carrito localmente antes de ir a Transbank (o dejarlo por si falla)
        // Por seguridad lo vaciamos acá, si falla el pago, luego se puede mejorar.
        carrito = [];
        guardarCarrito();
        
        form.submit();

    } catch (error) {
        console.error("Error al procesar el pedido:", error);
        alert("Ocurrió un error al guardar tu pedido en el sistema: " + error.message);
        if (btn) {
            btn.disabled = false;
        }
    }
}
})();
