import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MP_SECRET_KEY = Deno.env.get('MP_SECRET_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const keyPrefix = MP_SECRET_KEY ? MP_SECRET_KEY.slice(0, 15) + '...' : 'NÃO CONFIGURADA';
    const isTeste = MP_SECRET_KEY?.startsWith('TEST-');
    const isProd = MP_SECRET_KEY?.startsWith('APP_USR-');
    const ambiente = isTeste ? 'TESTE' : isProd ? 'PRODUÇÃO' : 'DESCONHECIDO';

    // Consulta credenciais no MP para confirmar a qual conta pertence
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { 'Authorization': `Bearer ${MP_SECRET_KEY}` }
    });
    const mpUser = await res.json();

    return Response.json({
      secret_key_prefix: keyPrefix,
      secret_key_ambiente: ambiente,
      mp_user_id: mpUser.id,
      mp_user_email: mpUser.email,
      mp_user_site: mpUser.site_id,
      mp_status: res.status,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});