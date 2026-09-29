$url = "https://uweuupdtxzkwiugaackz.supabase.co"
$key = "sb_publishable_0TuBGwD_SSK4cJVn5G_Hyg_3cubQx1E"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

# 1. Find product
$response = Invoke-RestMethod -Uri "$url/rest/v1/productos?select=*&nombre=ilike.*ugandan*" -Headers $headers
if ($null -eq $response -or $response.Count -eq 0) {
    Write-Host "No se encontró ugandan knuckles"
    exit
}

foreach ($prod in $response) {
    $prodId = $prod.id
    Write-Host "Found product: $prodId"
    
    # 2. Find order items
    $items = Invoke-RestMethod -Uri "$url/rest/v1/pedido_items?select=*&producto_id=eq.$prodId" -Headers $headers
    foreach ($item in $items) {
        $itemId = $item.id
        $pedidoId = $item.pedido_id
        
        # Delete item
        Invoke-RestMethod -Uri "$url/rest/v1/pedido_items?id=eq.$itemId" -Method DELETE -Headers $headers
        Write-Host "Deleted item $itemId"
        
        # Delete order
        Invoke-RestMethod -Uri "$url/rest/v1/pedidos?id=eq.$pedidoId" -Method DELETE -Headers $headers
        Write-Host "Deleted order $pedidoId"
    }
    
    # Delete product
    Invoke-RestMethod -Uri "$url/rest/v1/productos?id=eq.$prodId" -Method DELETE -Headers $headers
    Write-Host "Deleted product $prodId"
}
Write-Host "Done!"
