/**
 * Yandex Cloud Function — принимает заявку с формы ипотеки на gornye-vysoty.ru
 * и создаёт лид в Bitrix24 через входящий вебхук.
 *
 * Деплой (Yandex Cloud CLI):
 *   yc serverless function create --name gv-lead-to-bitrix
 *   yc serverless function version create \
 *     --function-name gv-lead-to-bitrix \
 *     --runtime nodejs18 \
 *     --entrypoint index.handler \
 *     --memory 128m \
 *     --execution-timeout 5s \
 *     --source-path . \
 *     --environment BITRIX_WEBHOOK_URL=https://ВАШПОРТАЛ.bitrix24.ru/rest/1/ВАШТОКЕН/ \
 *     --environment ALLOWED_ORIGIN=https://gornye-vysoty.ru
 *
 * После создания версии Yandex Cloud даёт публичный HTTP-эндпоинт вида:
 *   https://functions.yandexcloud.net/<function-id>
 * Этот URL нужно подставить в js/lead-form.js на сайте (FUNCTION_URL).
 *
 * ВАЖНО: BITRIX_WEBHOOK_URL хранится только в переменной окружения функции —
 * никогда не должен попадать в код фронтенда.
 */

exports.handler = async function (event) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'method not allowed' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'bad json' }) };
  }

  const phone = (data.phone || '').trim();
  if (!phone || phone.length < 5) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'phone required' }) };
  }

  const webhookUrl = process.env.BITRIX_WEBHOOK_URL;
  if (!webhookUrl) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'webhook not configured' }) };
  }

  const comments = [
    'Заявка с сайта gornye-vysoty.ru',
    data.program ? 'Программа: ' + data.program : '',
    data.price ? 'Стоимость квартиры: ' + data.price + ' ₽' : '',
    data.downPayment ? 'Первый взнос: ' + data.downPayment + ' ₽' : '',
    data.term ? 'Срок кредита: ' + data.term + ' лет' : '',
    data.page ? 'Страница: ' + data.page : '',
    data.utm ? 'UTM: ' + data.utm : '',
  ].filter(Boolean).join('\n');

  const leadFields = {
    TITLE: 'Заявка — Горные высоты (' + (data.program || 'Ипотека') + ')',
    NAME: data.name || 'Клиент с сайта',
    PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
    COMMENTS: comments,
    SOURCE_ID: 'WEB',
    SOURCE_DESCRIPTION: 'gornye-vysoty.ru',
  };

  try {
    const res = await fetch(webhookUrl.replace(/\/$/, '') + '/crm.lead.add.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: leadFields }),
    });
    const json = await res.json();

    if (json.error) {
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ ok: false, error: json.error_description || json.error }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, leadId: json.result }) };
  } catch (e) {
    return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'bitrix request failed' }) };
  }
};
