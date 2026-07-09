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
 * source_id не отправляется: поле "Источник" в CRM клиента — строгий enum,
 * текст в него не принимается (падает на "Не выбрано"), а без параметра
 * остаётся на серверном дефолте их hook.php ("Яндекс Директ Телеграм").
 * Нужен от клиента справочник "канал → корректный ID" для этого поля.
 *
 * После создания версии Yandex Cloud даёт публичный HTTP-эндпоинт вида:
 *   https://functions.yandexcloud.net/<function-id>
 * Этот URL нужно подставить в js/lead-form.js и js/lead-modal.js на сайте (FUNCTION_URL).
 *
 * ВАЖНО: CRM_AUTH_TOKEN хранится только в переменной окружения функции —
 * никогда не должен попадать в код фронтенда.
 */

// Справочник клиента: utm_source → человекочитаемое название рекламного канала.
const SOURCE_LABELS = {
  vk_ads: 'ВК таргет',
  yandex_telegram: 'Телеграм через яндекс',
  yandex: 'Яндекс Директ Поиск',
  yandex_mkb: 'Яндекс Директ МКБ',
  yandex_all: 'Яндекс Директ ЕПК (поиск+сети)',
  yandex_product: 'Яндекс Директ Товарная',
  yandex_rsya: 'Яндекс Директ РСЯ',
  yandex_master: 'Яндекс Директ Мастер',
  avito: 'Авито',
  tg_ads: 'Telegram Ads',
  yandex_mediynaya: 'Яндекс медийная',
  max_ads: 'МАХ',
  't-bank': 'Т-банк',
  telegram_in: 'Телега Ин',
  urban_ads: 'Яндекс Urban Ads',
  tg_posev: 'Посевы ТГ',
  ozon: 'Ozon (медийная РК)',
  yandex_max: 'Яндекс Директ MAX',
  wbmedia: 'WB (медийная РК)',
};

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
  const channelLabel = SOURCE_LABELS[utmParams.get('utm_source') || ''] || '';

  // Комментарий — контекст заявки (ипотека / модалка) плюс определённый по
  // utm_source рекламный канал (текстом — поле "Источник" в CRM клиента
  // строгий enum и не принимает текст, поэтому туда его не шлём).
  const comments = [
    data.program ? 'Программа: ' + data.program : '',
    data.price ? 'Стоимость квартиры: ' + data.price + ' ₽' : '',
    data.downPayment ? 'Первый взнос: ' + data.downPayment + ' ₽' : '',
    data.term ? 'Срок кредита: ' + data.term + ' лет' : '',
    data.source ? 'Источник заявки на странице: ' + data.source : '',
    channelLabel ? 'Рекламный канал (по UTM): ' + channelLabel : '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams();
  params.append('fields[TITLE]', 'Заявка с сайта Горные высоты' + (data.program ? ' (' + data.program + ')' : ''));
  params.append('fields[NAME]', data.name || 'Клиент с сайта');
  params.append('fields[PHONE][0][VALUE]', phone);
  params.append('fields[PHONE][0][VALUE_TYPE]', 'WORK');
  params.append('fields[COMMENTS]', comments);
  if (data.page) params.append('fields[SOURCE_DESCRIPTION]', data.page);
  // source_id намеренно не отправляется: их hook.php принимает только валидный
  // enum-ID (не текст) — при неверном значении сбрасывает поле в "Не выбрано".
  // Без источника поле остаётся на их серверном дефолте. Ждём от клиента
  // точный справочник "канал → корректный ID" для их sinobi/hook.php.
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
