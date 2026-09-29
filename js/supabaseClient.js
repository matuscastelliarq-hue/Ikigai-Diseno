// Cliente Supabase Vanilla JS
// Esta librería inicializa Supabase de forma global para usarlo sin type="module" y evitar errores de CORS (file://)

const supabaseUrl = 'https://uweuupdtxzkwiugaackz.supabase.co';
const supabaseKey = 'sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E';

// Se asume que la librería oficial de Supabase se carga en un tag <script> antes que este archivo
window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
