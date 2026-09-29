const url = "https://uweuupdtxzkwiugaackz.supabase.co/rest/v1/productos?id=eq.cont-6";
const key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E";

const newImages = [
    "assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Recibidor Giraffe 1.jpg",
    "assets/3. Línea CONTEMPORÁNEO/2. Recibidor GIRAFFE/Recibidor Giraffe 2.png"
];

const body = {
    imagenes: newImages
};

fetch(url, {
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(body)
})
.then(res => {
    if (!res.ok) throw new Error("Status: " + res.status);
    console.log("Updated correctly");
})
.catch(err => console.error(err));
