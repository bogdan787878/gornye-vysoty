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
 *     --environment ALLOWED_ORIGIN=https://gornye-vysoty.ru
 *
 * source_id берётся из справочника SOURCE_ID_MAP (получен от клиента,
 * файл "Источники Б24 ССК.xlsx") — это строгий enum Bitrix, текст туда
 * передавать нельзя.
 *
 * После создания версии Yandex Cloud даёт публичный HTTP-эндпоинт вида:
 *   https://functions.yandexcloud.net/<function-id>
 * Этот URL нужно подставить в js/lead-form.js и js/lead-modal.js на сайте (FUNCTION_URL).
 *
 * ВАЖНО: CRM_AUTH_TOKEN хранится только в переменной окружения функции —
 * никогда не должен попадать в код фронтенда.
 */

// Справочник клиента (файл "Источники Б24 ССК.xlsx"): utm_source → ID источника в Bitrix.
const SOURCE_ID_MAP = {
  yandex_product: 'UC_A1NB8J',   // Яндекс Директ Товарная
  yandex_all: 'UC_YXHVSL',       // Яндекс Директ ЕПК (поиск+сети)
  yandex_mkb: 'UC_J7ZOVL',       // Яндекс Директ МКБ
  yandex_master: 'UC_PBSE4Z',    // Яндекс Директ Мастер
  yandex_rsya: 62,               // Яндекс Директ РСЯ
  yandex_telegram: 35,           // Яндекс Директ Телеграм
  yandex: 61,                    // Яндекс Директ Поиск
  yandex_max: 'UC_B0DHEM',       // Яндекс Директ MAX
  vk_ads: 'UC_0E283Z',           // ВК таргет
  avito: 'UC_ZO4J0M',            // Авито
  telegram_ads: 40,              // Телеграм ads
  max_ads: 'UC_6XKCXA',          // МАХ ads
  telegram_in: 'UC_L3MFJ8',      // Telega In
  urban_ads: 'UC_B84BOR',        // Яндекс Urban Ads
  yandex_mediynaya: 'UC_SLN0XQ', // Яндекс медийная
  yandex_rtb: 'UC_JVEQXJ',       // РТБ108
};
// Без UTM (прямой заход на сайт, органика) — «Органика (сайт заявка)».
const SOURCE_ID_ORGANIC = 16;

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
  if (!hookUrl || !authToken) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok: false, error: 'crm hook not configured' }) };
  }

  // UTM-параметры разбираются на отдельные поля, чтобы CRM клиента (Bitrix)
  // получала их структурированно, а не сырой query-строкой.
  const utmParams = new URLSearchParams(data.utm || '');
  const utmSource = utmParams.get('utm_source') || '';
  const sourceId = utmSource ? (SOURCE_ID_MAP[utmSource] || '') : SOURCE_ID_ORGANIC;

  const comments = [
    data.program ? 'Программа: ' + data.program : '',
    data.price ? 'Стоимость квартиры: ' + data.price + ' ₽' : '',
    data.downPayment ? 'Первый взнос: ' + data.downPayment + ' ₽' : '',
    data.term ? 'Срок кредита: ' + data.term + ' лет' : '',
    data.source ? 'Источник заявки на странице: ' + data.source : '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams();
  params.append('fields[TITLE]', 'Заявка с сайта Горные высоты' + (data.program ? ' (' + data.program + ')' : ''));
  params.append('fields[NAME]', data.name || 'Клиент с сайта');
  params.append('fields[PHONE][0][VALUE]', phone);
  params.append('fields[PHONE][0][VALUE_TYPE]', 'WORK');
  params.append('fields[COMMENTS]', comments);
  if (data.page) params.append('fields[SOURCE_DESCRIPTION]', data.page);
  if (sourceId) params.append('source_id', sourceId);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
    var value = utmParams.get(key);
    if (value) params.append('fields[' + key.toUpperCase() + ']', value);
  });
  if (housingId) params.append('housing_id', housingId);

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
