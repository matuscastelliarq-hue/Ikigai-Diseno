// Base de datos simulada - Ikigai Diseño
// Estos datos provienen del Excel "Excel Ikigai". 
// Como no se pudo leer el Excel automáticamente, se dejaron valores de ejemplo.
// Por favor, edita los valores de "medidas", "precio" y "material" según corresponda.

const condicionesGenerales = [
    "Despacho según calendario",
    "La madera puede estar con imperfecciones propias del material",
    "Todos los diseños son ajustables y redimensionables, proceso que puede variar el costo del ejemplar",
    "Garantía 6 meses"
];

const catalogData = {
    zen: {
        id: 'zen',
        titulo: 'Línea ZEN',
        descripcion: 'Minimalismo puro inspirado en la estética japonesa, Espacios limpios y funcionales',
        productos: [
            { id: 'zen-1', nombre: 'Arrimo ZEN', precio: 120000, medidas: '100 x 30 x a80 cm', material: 'Pino', imagenes: ['assets/1. Línea ZEN/1. Arrimo ZEN/Arrimo ZEN 1.png', 'assets/1. Línea ZEN/1. Arrimo ZEN/Arrimo ZEN 2.jpg'] },
            { id: 'zen-2', nombre: 'Repisa ZEN', precio: 90000, medidas: '80 x 25 x a150 cm', material: 'Pino', imagenes: ['assets/1. Línea ZEN/2. Repisa ZEN/Repisa ZEN 1.png', 'assets/1. Línea ZEN/2. Repisa ZEN/Repisa Zen 2.jpg'] },
            { id: 'zen-3', nombre: 'Mesa Plinto', precio: 160000, medidas: 'D90 y a75 cm', material: 'Pino', imagenes: ['assets/1. Línea ZEN/3. Mesa PLINTO/Mesa Plinto 1.png', 'assets/1. Línea ZEN/3. Mesa PLINTO/Mesa Plinto 2.png'] },
            { id: 'zen-4', nombre: 'Sillón ZEN 2 cuerpos', precio: 350000, medidas: '160 x 80 x a70 cm', material: 'Pino / Tela', imagenes: ['assets/1. Línea ZEN/4. Sillón ZEN 2 cuerpos/Sillón 2 cuerpos ZEN 1.png', 'assets/1. Línea ZEN/4. Sillón ZEN 2 cuerpos/Sillón 2 cuerpos ZEN 2.jpg'] },
            { id: 'zen-5', nombre: 'Sillón ZEN 1 cuerpo', precio: 200000, medidas: '80 x 80 x a70 cm', material: 'Pino / Tela', imagenes: ['assets/1. Línea ZEN/5. Sillón ZEN 1 cuerpo/Sillón 1 cuerpo ZEN 1.png', 'assets/1. Línea ZEN/5. Sillón ZEN 1 cuerpo/Sillón 1 cuerpo ZEN 2.jpg'] },
            { id: 'zen-6', nombre: 'Mesa OVAL', precio: 180000, medidas: '140 x 90 x a75 cm', material: 'Pino', imagenes: ['assets/1. Línea ZEN/6. Mesa OVAL/Mesa OVAL 1.png', 'assets/1. Línea ZEN/6. Mesa OVAL/Mesa OVAL 2.jpg'] },
            { id: 'zen-7', nombre: 'Mesa ZEN', precio: 150000, medidas: '120 x 80 x a75 cm', material: 'Pino', imagenes: ['assets/1. Línea ZEN/7. Mesa ZEN/Mesa ZEN 1.png', 'assets/1. Línea ZEN/7. Mesa ZEN/Mesa ZEN 2.png'] }
        ]
    },
    cnc: {
        id: 'cnc',
        titulo: 'Línea CNC',
        descripcion: 'Precisión digital para ensambles perfectos y diseños vanguardistas, Calidad y eficiencia geométrica',
        productos: [
            { id: 'cnc-1', nombre: 'Escritorio pupitre', precio: 140000, medidas: '120 x 60 x a75 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 1.png', 'assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 2.png'] },
            { id: 'cnc-2', nombre: 'Repisa NET', precio: 100000, medidas: '100 x 30 x a180 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/2. Repisa NET/Repisa NET 1.png', 'assets/2. Línea CNC/2. Repisa NET/Repisa NET 2.jpg'] },
            { id: 'cnc-3', nombre: 'Mesa triqueta', precio: 110000, medidas: '120 x 40 x a45 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/3. Mesa Triqueta/Mesa Triqueta 1.png', 'assets/2. Línea CNC/3. Mesa Triqueta/Mesa triqueta 2.png'] },
            { id: 'cnc-4', nombre: 'Sitial N', precio: 60000, medidas: '45 x 45 x a85 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/4. Sitial N/Sitial N 1.png', 'assets/2. Línea CNC/4. Sitial N/Sitial N2.png'] },
            { id: 'cnc-6', nombre: 'Piso Eslinga', precio: 45000, medidas: '40 x 40 x a45 cm', material: 'Terciado Mueblista', imagenes: ['assets/2. Línea CNC/5. Piso Eslinga/Piso Eslinga 1.jpg', 'assets/2. Línea CNC/5. Piso Eslinga/Piso Eslinga 2.jpg'] }
        ]
    },
    contemporaneo: {
        id: 'contemporaneo',
        titulo: 'Línea CONTEMPORÁNEO',
        descripcion: 'Materiales nobles y robustos, Calidad y elegancia para toda la vida',
        productos: [
            { id: 'cont-1', nombre: 'Silla Yakuza', precio: 120000, medidas: '45 x 45 x a85 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/1. Silla Yakuza/Silla Yakuza 1.png', 'assets/3. Línea CONTEMPORÁNEO/1. Silla Yakuza/Silla Yakuza 2.jpg'] },
            { id: 'cont-2', nombre: 'Promo Silla Yakuza', precio: 350000, medidas: '45 x 45 x a85 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/1. Silla Yakuza/Silla Yakuza 1.png', 'assets/3. Línea CONTEMPORÁNEO/1. Silla Yakuza/Silla Yakuza 2.jpg'] },
            { id: 'cont-3', nombre: 'Recibidor Giraffe', precio: 80000, medidas: '90 x 25 x a90 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Recibidor Giraffe 1.png', 'assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Recibidor Giraffe 2.png'] },
            { id: 'cont-4', nombre: 'Banqueta V', precio: 130000, medidas: '110 x 40 x a45 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/3. Banqueta V/Banqueta V 1.png', 'assets/3. Línea CONTEMPORÁNEO/3. Banqueta V/Banqueta V 2.png'] },
            { id: 'cont-5', nombre: 'Repisa T', precio: 180000, medidas: '100 x 30 x a190 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/4. Repisa T/Repisa T 1.png', 'assets/3. Línea CONTEMPORÁNEO/4. Repisa T/Repisa T 2.png'] },
            { id: 'cont-6', nombre: 'Mesa N', precio: 150000, medidas: '120 x 80 x a75 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 1.png', 'assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 2.png'] },
            { id: 'cont-7', nombre: 'Promo Mesa N', precio: 140000, medidas: '120 x 80 x a75 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 1.png', 'assets/3. Línea CONTEMPORÁNEO/5. Mesa N/Mesa N 2.png'] },
            { id: 'cont-8', nombre: 'Arrimo RAW', precio: 160000, medidas: '120 x 30 x a80 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/6. Arrimo RAW/Arrimo RAW 1.png', 'assets/3. Línea CONTEMPORÁNEO/6. Arrimo RAW/Arrimo RAW 2.png'] },
            { id: 'cont-9', nombre: 'Mesa RAW', precio: 220000, medidas: '150 x 85 x a75 cm', material: 'Roble', imagenes: ['assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 1.png', 'assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 2.png'] }
        ]
    },
    decoracion: {
        id: 'decoracion',
        titulo: 'Iluminación y Decoración',
        descripcion: 'Detalles que hacen la diferencia, Ilumina y decora tus espacios',
        productos: [
            { id: 'dec-1', nombre: 'Lámpara ZEN', precio: 45000, medidas: 'D25 y a40 cm', material: 'Madera', imagenes: ['assets/4. Iluminación y Decoración/1. Lámpara ZEN/Lámpara ZEN 1.png', 'assets/4. Iluminación y Decoración/1. Lámpara ZEN/Lámpara ZEN 2.png', 'assets/4. Iluminación y Decoración/1. Lámpara ZEN/Planos lámpara zen.jpg'] },
            { id: 'dec-2', nombre: 'Lámpara Origami', precio: 45000, medidas: 'D25 y a40 cm', material: 'Madera', imagenes: ['assets/4. Iluminación y Decoración/2. Lámpara Origami/Lámpara Origami.png', 'assets/4. Iluminación y Decoración/2. Lámpara Origami/Planos lámpara origami.png'] },
            { id: 'dec-3', nombre: 'Lámpara TRI', precio: 45000, medidas: 'D25 y a40 cm', material: 'Madera', imagenes: ['assets/4. Iluminación y Decoración/3. Lámpara TRI/Lámpara TRI.jpg', 'assets/4. Iluminación y Decoración/3. Lámpara TRI/Planos lámpara tri.jpg'] },
            { id: 'dec-4', nombre: 'Portavinos X', precio: 25000, medidas: '20 x 20 x a30 cm', material: 'Madera', imagenes: ['assets/4. Iluminación y Decoración/4. Portavinos X/Portavinos X.png', 'assets/4. Iluminación y Decoración/4. Portavinos X/Planos portavinos x.jpg'] },
            { id: 'dec-5', nombre: 'Macetero ZEN', precio: 25000, medidas: '20 x 20 x a30 cm', material: 'Madera', imagenes: ['assets/4. Iluminación y Decoración/5. Macetero ZEN/Macetero ZEN.png', 'assets/4. Iluminación y Decoración/5. Macetero ZEN/Planos macetero ZEN.jpg'] }
        ]
    }
};

const categoriasPreview = [
    { id: 'zen', nombre: 'Línea ZEN', imagen: 'assets/1. Línea ZEN/7. Mesa ZEN/Mesa ZEN 1.png' },
    { id: 'cnc', nombre: 'Línea CNC', imagen: 'assets/2. Línea CNC/1. Escritorio Pupitre/Escritorio Pupitre 1.png' },
    { id: 'contemporaneo', nombre: 'Línea CONTEMPORÁNEO', imagen: 'assets/3. Línea CONTEMPORÁNEO/7. Mesa RAW/Mesa RAW 1.png' },
    { id: 'decoracion', nombre: 'Iluminación y Decoración', imagen: 'assets/4. Iluminación y Decoración/1. Lámpara ZEN/Lámpara ZEN 1.png' }
];
