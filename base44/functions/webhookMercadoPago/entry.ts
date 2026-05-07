import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MP_SECRET_KEY = Deno.env.get('MP_SECRET_KEY');

function log(level, tag, msg, data) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${tag}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data) : data);
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

Deno.serve(async (req) => {
  // MP envia GET para validar o endpoint — responder 200
  if (req.method === 'GET') {
    return new Response('OK', { status: 200 });
  }

  try {
    const body = await req.json();
    log('info', 'WEBHOOK', 'Notificação recebida', { type: body.type, action: body.action, id: body.data?.id });

    // Apenas processar notificações de pagamento
    if (body.type !== 'payment' || !body.data?.id) {
      return Response.json({ received: true });
    }

    const paymentId = body.data.id;

    // Consultar o pagamento na API do MP para obter status atualizado
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_SECRET_KEY}` },
    });

    if (!res.ok) {
      log('error', 'WEBHOOK', `Falha ao consultar pagamento ${paymentId}`, { status: res.status });
      return Response.json({ error: 'Falha ao consultar pagamento' }, { status: 500 });
    }

    const payment = await res.json();
    log('info', 'WEBHOOK', `Pagamento ${paymentId} status: ${payment.status} | detail: ${payment.status_detail} | ref: ${payment.external_reference}`);

    return Response.json({ received: true, payment_id: paymentId, status: payment.status });

  } catch (error) {
    log('error', 'WEBHOOK', `Erro: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});