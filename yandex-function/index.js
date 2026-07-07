/**
 * Yandex Cloud Function — принимает заявку с сайта gornye-vysoty.ru
 * и передаёт её в CRM клиента (СК Кубань) через их приёмный хук sinobi/hook.php.
 *
 * Деплой (Yandex Cloud CLI):
 *   yc serverless function create --name gv-lead-to-crm
 *   yc serverless function version create \
 *     --function-name gv-lead-to-crm \
 *     --runtime nodejs18 \
 *     --entrypoint index.handler \
 *     --memory 128m \
 *     --execution-timeout 5s \
 *     --source-path . \
 *     --environment CRM_HOOK_URL=https://bx.sskuban.ru/appssk/sinobi/hook.php \
 *     --environment CRM_AUTH_TOKEN=ТОКЕН_ОТ_КЛИЕНТА \
 *     --environment CRM_HOUSING_ID=11926 \
 *     --environment CRM_SOURCE_ID=35 \
 *     --environment ALLOWED_ORIGIN=https://gornye-vysoty.ru
 *
 * После создания версии Yandex Cloud даёт публичный HTTP-эндпоинт вида:
 *   https://functions.yandexcloud.net/<function-id>
 * Этот URL нужно подставить в js/lead-form.js и js/lead-modal.js на сайте (FUNCTION_URL).
 *
 * ВАЖНО: CRM_AUTH_TOKEN хранится только в переменной окружения функции —
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

  const phone = (data.phone || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'phone required' }) };
  }

  const hookUrl = process.env.CRM_HOOK_URL;
  const authToken = process.env.CRM_AUTH_TOKEN;
  const housingId = process.env.CRM_HOUSING_ID;
  const sourceId = process.env.CRM_SOURCE_ID;
  if (!hookUrl || !authToken) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'crm hook not configured' }) };
  }

  const comments = [
    data.program ? 'Программа: ' + data.program : '',
    data.price ? 'Стоимость квартиры: ' + data.price + ' ₽' : '',
    data.downPayment ? 'Первый взнос: ' + data.downPayment + ' ₽' : '',
    data.term ? 'Срок кредита: ' + data.term + ' лет' : '',
    data.source ? 'Источник заявки на странице: ' + data.source : '',
    data.page ? 'Страница: ' + data.page : '',
    data.utm ? 'UTM: ' + data.utm : '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams();
  params.append('fields[TITLE]', 'Заявка с сайта Горные высоты' + (data.program ? ' (' + data.program + ')' : ''));
  params.append('fields[NAME]', data.name || 'Клиент с сайта');
  params.append('fields[PHONE][0][VALUE]', phone);
  params.append('fields[PHONE][0][VALUE_TYPE]', 'WORK');
  params.append('fields[COMMENTS]', comments);
  if (housingId) params.append('housing_id', housingId);
  if (sourceId) params.append('source_id', sourceId);

  try {
    const res = await fetch(hookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Auth-Token': authToken,
      },
      body: params.toString(),
    });
    const text = await res.text();

    if (!res.ok) {
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ ok: false, error: text || 'crm request failed' }) };
    }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'crm request failed' }) };
  }
};
