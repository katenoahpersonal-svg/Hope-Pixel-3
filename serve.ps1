param([int]$Port = 8394)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$mime = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8"
  ".js"="application/javascript; charset=utf-8"; ".json"="application/json"
  ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"
  ".ico"="image/x-icon"; ".woff2"="font/woff2"; ".txt"="text/plain"
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.AbsolutePath
    if ($ctx.Request.HttpMethod -eq "POST" -and $path -eq "/snap") {
      # dev helper: body = RAW base64 jpeg (no data: prefix), saved for headless visual checks
      $reader = New-Object System.IO.StreamReader($ctx.Request.InputStream)
      $b64 = $reader.ReadToEnd()
      $name = $ctx.Request.QueryString["name"]; if (-not $name) { $name = "snap" }
      $name = $name -replace "[^a-zA-Z0-9_-]", ""
      $dir = Join-Path $root "_snaps"
      if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
      [IO.File]::WriteAllBytes((Join-Path $dir "$name.jpg"), [Convert]::FromBase64String($b64))
      $ok = [System.Text.Encoding]::UTF8.GetBytes("ok")
      $ctx.Response.OutputStream.Write($ok, 0, $ok.Length)
      $ctx.Response.Close()
      continue
    }
    if ($path -eq "/") { $path = "/index.html" }
    $file = Join-Path $root ($path -replace "/", "\").TrimStart("\")
    if ((Test-Path $file) -and (Resolve-Path $file).Path.StartsWith($root)) {
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentType = $ct
      $ctx.Response.Headers.Add("Cache-Control", "no-cache")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch { }
}
