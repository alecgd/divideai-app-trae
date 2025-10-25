Deno.serve(async () => {
  const success = Deno.env.get('APP_SUCCESS_URL');
  const cancel = Deno.env.get('APP_CANCEL_URL');

  return new Response(
    JSON.stringify({ success, cancel }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});