(function () {
  // TODO: подставить публичный URL функции после деплоя в Yandex Cloud
  // (Yandex Cloud Console → Serverless Functions → ваша функция → «HTTP-адрес»)
  var FUNCTION_URL = 'https://functions.yandexcloud.net/ВАШ_ID_ФУНКЦИИ';

  var submitBtn = document.querySelector('.gv-mortgage-submit');
  if (!submitBtn) return;

  var priceEl = document.getElementById('calc-price');
  var downEl = document.getElementById('calc-down');
  var termEl = document.getElementById('calc-term');
  var phoneEl = document.getElementById('calc-phone');
  var agreeEl = document.getElementById('calc-agree');
  var tabsWrap = document.getElementById('mortgage-tabs');

  function activeProgram() {
    var active = tabsWrap && tabsWrap.querySelector('.gv-chip.is-active');
    return active ? active.textContent.trim() : 'Ипотека';
  }

  function setState(text, isError) {
    submitBtn.textContent = text;
    submitBtn.style.opacity = isError ? '0.7' : '';
  }

  submitBtn.addEventListener('click', function () {
    if (!phoneEl.value || phoneEl.value.replace(/\D/g, '').length < 10) {
      phoneEl.focus();
      setState('Укажите телефон', true);
      setTimeout(function () { setState('Оставить заявку', false); }, 2000);
      return;
    }
    if (agreeEl && !agreeEl.checked) {
      setState('Примите условия', true);
      setTimeout(function () { setState('Оставить заявку', false); }, 2000);
      return;
    }

    var payload = {
      phone: phoneEl.value,
      program: activeProgram(),
      price: priceEl ? priceEl.value : '',
      downPayment: downEl ? downEl.value : '',
      term: termEl ? termEl.value : '',
      page: window.location.href,
      utm: window.location.search,
    };

    setState('Отправляем…', false);

    fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok) {
          setState('Заявка отправлена ✓', false);
          if (typeof ym === 'function') ym(105215023, 'reachGoal', 'lead_submit');
        } else {
          setState('Ошибка, попробуйте ещё раз', true);
          setTimeout(function () { setState('Оставить заявку', false); }, 2500);
        }
      })
      .catch(function () {
        setState('Ошибка, попробуйте ещё раз', true);
        setTimeout(function () { setState('Оставить заявку', false); }, 2500);
      });
  });
})();
