// Retorno do Stripe Checkout: mostra uma página simples e redireciona para o app via deep link
// divideai://pro/success ou divideai://pro/cancel

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'success';
  const deepLink = `divideai://pro/${status}`;

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>DivideAI – Checkout</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #2F2F2F; }
      a { color: #FF6B6B; }
      .card { max-width: 600px; margin: 0 auto; background: #FAFAFA; padding: 20px; border-radius: 12px; }
      .btn { display: inline-block; margin-top: 12px; background: #FF6B6B; color: #FFF; padding: 10px 16px; border-radius: 8px; text-decoration: none; }
    </style>
    <script>
      // Tenta redirecionar automaticamente para o app
      setTimeout(function() { window.location.href = "${deepLink}"; }, 300);
    </script>
  </head>
  <body>
    <div class="card">
      <h1>Checkout ${status === 'success' ? 'concluído' : 'cancelado'}</h1>
      <p>${status === 'success'
        ? 'Obrigado! Vamos te levar de volta ao app.'
        : 'Você cancelou o checkout. Volte ao app para tentar novamente.'}</p>
      <a class="btn" href="${deepLink}">Voltar para o app</a>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});