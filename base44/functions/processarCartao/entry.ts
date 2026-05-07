import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MP_SECRET_KEY = Deno.env.get('MP_SECRET_KEY');

// ─── Logger ──────────────────────────────────────────────────────────────────
function log(level, tag, msg, data) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${tag}]`;
  if (data !== undefined) {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}`, typeof data === 'object' ? JSON.stringify(data) : data);
  } else {
    console[level === 'error' ? 'error' : 'log'](`${prefix} ${msg}`);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const startTs = Date.now();
  log('info', 'INIT', 'Requisição recebida');

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      log('error', 'AUTH', 'Usuário não autenticado');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log('info', 'AUTH', `Usuário autenticado: ${user.email} | igreja: ${user.igreja_id || 'n/a'}`);

    const body = await req.json();
    const {
      transaction_amount,
      token,
      description,
      installments,
      payment_method_id,
      issuer_id,
      email,
      doc_type,
      doc_number,
      device_id,
      payer_first_name,
      payer_last_name,
      external_reference,
    } = body;

    // ── Validações
    if (!transaction_amount || transaction_amount <= 0) {
      log('error', 'VALIDATE', 'Valor inválido', { transaction_amount });
      return Response.json({ error: 'Valor inválido ou não informado.' }, { status: 400 });
    }
    if (!token) {
      log('error', 'VALIDATE', 'Token do cartão não informado');
      return Response.json({ error: 'Token do cartão não informado.' }, { status: 400 });
    }
    if (!payment_method_id) {
      log('error', 'VALIDATE', 'payment_method_id não informado');
      return Response.json({ error: 'Método de pagamento não informado.' }, { status: 400 });
    }
    if (!email) {
      log('error', 'VALIDATE', 'Email do pagador não informado');
      return Response.json({ error: 'E-mail do pagador não informado.' }, { status: 400 });
    }

    const cleanDoc = (doc_number || '').replace(/\D/g, '');
    const idempotencyKey = `${user.id}-${transaction_amount}-${token.slice(-8)}-${Date.now()}`;

    log('info', 'PAYLOAD', 'Construindo payload para MP', {
      amount: transaction_amount,
      method: payment_method_id,
      issuer: issuer_id || 'N/A',
      installments: installments || 1,
      tokenSuffix: token.slice(-8),
      hasDoc: !!cleanDoc,
      hasDeviceId: !!device_id,
    });

    const itemTitle = description || 'Contribuição via Cartão';
    const payload = {
      transaction_amount: Number(transaction_amount),
      token: String(token).trim(),
      description: itemTitle,
      installments: parseInt(installments, 10) || 1,
      payment_method_id: String(payment_method_id).trim(),
      statement_descriptor: 'CONTRIBUICAO',
      three_d_secure_mode: 'optional',
      notification_url: `https://app.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/webhookMercadoPago`,
      external_reference: external_reference || `contrib-${user.id}-${Date.now()}`,
      payer: {
        email,
        first_name: payer_first_name || '',
        last_name: payer_last_name || '',
        identification: {
          type: doc_type || 'CPF',
          number: cleanDoc,
        },
      },
      additional_info: {
        items: [{
          id: 'contribuicao-igreja',
          title: itemTitle,
          description: 'Contribuição/dízimo para a igreja',
          category_id: 'services',
          quantity: 1,
          unit_price: Number(transaction_amount),
        }],
        payer: {
          first_name: payer_first_name || '',
          last_name: payer_last_name || '',
          registration_date: new Date().toISOString(),
        },
      },
    };

    // issuer_id é crítico para reduzir rejeições antifraude
    if (issuer_id) {
      payload.issuer_id = Number(issuer_id);
      log('info', 'PAYLOAD', 'issuer_id incluído:', issuer_id);
    } else {
      log('warn', 'PAYLOAD', 'issuer_id não fornecido — pode aumentar rejeições antifraude');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MP_SECRET_KEY}`,
      'X-Idempotency-Key': idempotencyKey,
    };

    if (device_id) {
      headers['X-meli-session-id'] = device_id;
      log('info', 'HEADER', 'X-meli-session-id definido (fingerprint antifraude OK)');
    } else {
      log('warn', 'HEADER', 'X-meli-session-id ausente — fingerprint não disponível');
    }

    log('info', 'MP_REQUEST', `POST /v1/payments | idempotencyKey: ${idempotencyKey}`);

    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const elapsed = Date.now() - startTs;

    log('info', 'MP_RESPONSE', `HTTP ${res.status} em ${elapsed}ms`, {
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      method: data.payment_method_id,
      installments: data.installments,
      amount: data.transaction_amount,
    });

    if (!res.ok) {
      if (data.cause?.length) {
        data.cause.forEach(c => log('error', 'MP_CAUSE', `[${c.code}] ${c.description}`));
      }
      log('error', 'MP_RESPONSE', 'Pagamento rejeitado pelo MP', {
        message: data.message,
        error: data.error,
        status: res.status,
      });
      return Response.json(
        { error: data.message || 'Erro ao processar pagamento', causes: data.cause || [], detail: data },
        { status: res.status }
      );
    }

    // 3DS
    const threeDsUrl = data.three_ds_info?.external_resource_url;
    if (threeDsUrl && data.status === 'pending') {
      log('info', '3DS', `Autenticação 3DS requerida. URL: ${threeDsUrl}`);
      return Response.json({
        success: false,
        requires_3ds: true,
        three_ds_url: threeDsUrl,
        payment_id: data.id,
        payment: data,
      });
    }

    log('info', 'SUCCESS', `Pagamento finalizado. Status: ${data.status} | Detail: ${data.status_detail} | ID: ${data.id} | Total: ${elapsed}ms`);

    return Response.json({ success: true, payment: data });

  } catch (error) {
    const elapsed = Date.now() - startTs;
    log('error', 'EXCEPTION', `Erro interno após ${elapsed}ms: ${error.message}`);
    return Response.json({ error: 'Erro interno no servidor', detail: error.message }, { status: 500 });
  }
});