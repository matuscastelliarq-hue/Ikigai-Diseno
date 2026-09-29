const url = "https://uweuupdtxzkwiugaackz.supabase.co/rest/v1/productos?select=id,nombre";
const key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E";

fetch(url, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
})
.then(res => res.json())
.then(data => {
    console.log(JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
