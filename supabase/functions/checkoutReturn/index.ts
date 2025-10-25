Deno.serve((req) => {
  const url = new URL(req.url);
  const redirect = url.searchParams.get('redirect');
  
  if (!redirect) {
    return new Response('Missing redirect parameter', { status: 400 });
  }

  const decodedRedirect = decodeURIComponent(redirect);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecionando...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui; text-align: center; padding: 20px; }
    .btn { display: inline-block; background: #FF6B6B; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-top: 20px; }
  </style>
  <script>
    function openApp() {
      window.location.href = "${decodedRedirect}";
      setTimeout(function() {
        // Se não abriu o app em 2 segundos, mostra o botão
        document.getElementById('manual').style.display = 'block';
      }, 2000);
    }
  </script>
</head>
<body onload="openApp()">
  <h2>Redirecionando para o app...</h2>
  <div id="manual" style="display: none">
    <p>Se o app não abrir automaticamente:</p>
    <a class="btn" href="${decodedRedirect}">Abrir App</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});