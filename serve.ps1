# Локальный веб-сервер для проверки сайта.
# Запуск:  powershell -ExecutionPolicy Bypass -File serve.ps1
# Остановка: Ctrl+C в этом окне.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080

$mime = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".js"="application/javascript; charset=utf-8"; ".json"="application/json";
  ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg";
  ".svg"="image/svg+xml"; ".ico"="image/x-icon"; ".webp"="image/webp"
}

$listener = New-Object System.Net.HttpListener
# Сначала пробуем открыть доступ по локальной сети (для телефона),
# если прав не хватает — работаем только на этом компьютере.
$lan = $true
try {
  $listener.Prefixes.Add("http://+:$port/")
  $listener.Start()
} catch {
  $lan = $false
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$port/")
  $listener.Start()
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
       Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  Сайт запущен." -ForegroundColor Green
Write-Host "  На этом компьютере:  http://localhost:$port/"
if ($lan -and $ip) {
  Write-Host "  С телефона (та же Wi-Fi): http://${ip}:$port/" -ForegroundColor Cyan
} else {
  Write-Host "  Для доступа с телефона запустите этот файл от имени администратора." -ForegroundColor Yellow
}
Write-Host "  Остановить: Ctrl+C"
Write-Host ""

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
    if ($rel -eq "") { $rel = "index.html" }
    $path = Join-Path $root $rel

    # dev-помощник: страница присылает кадр из видео, сохраняем его как постер
    if ($ctx.Request.HttpMethod -eq "POST" -and $rel -eq "__poster") {
      $name = $ctx.Request.QueryString["name"]
      if ($name -match '^[a-z0-9_-]+\.jpg$') {
        $ms = New-Object System.IO.MemoryStream
        $ctx.Request.InputStream.CopyTo($ms)
        $dir = Join-Path $root "assets\img\poster"
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
        [System.IO.File]::WriteAllBytes((Join-Path $dir $name), $ms.ToArray())
        $ctx.Response.StatusCode = 200
      } else { $ctx.Response.StatusCode = 400 }
      $ctx.Response.OutputStream.Close()
      continue
    }

    if (Test-Path $path -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $ctx.Response.Headers["Accept-Ranges"] = "bytes"

      $fs = [System.IO.File]::OpenRead($path)
      $total = $fs.Length
      $from = 0; $to = $total - 1

      # Браузер запрашивает видео кусками — без этого ролики не играют
      $range = $ctx.Request.Headers["Range"]
      if ($range -and $range -match "bytes=(\d*)-(\d*)") {
        if ($matches[1] -ne "") { $from = [int64]$matches[1] }
        if ($matches[2] -ne "") { $to = [int64]$matches[2] }
        if ($to -ge $total) { $to = $total - 1 }
        $ctx.Response.StatusCode = 206
        $ctx.Response.Headers["Content-Range"] = "bytes $from-$to/$total"
      }

      $len = $to - $from + 1
      $ctx.Response.ContentLength64 = $len
      if ($ctx.Request.HttpMethod -ne "HEAD") {
        $fs.Seek($from, [System.IO.SeekOrigin]::Begin) | Out-Null
        $buf = New-Object byte[] 65536
        $left = $len
        while ($left -gt 0) {
          $n = $fs.Read($buf, 0, [math]::Min($buf.Length, $left))
          if ($n -le 0) { break }
          $ctx.Response.OutputStream.Write($buf, 0, $n)
          $left -= $n
        }
      }
      $fs.Close()
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404: $rel")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.OutputStream.Close()
  } catch {}
}
