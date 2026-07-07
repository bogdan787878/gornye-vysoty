(function () {
  var priceEl = document.getElementById('calc-price');
  var downEl = document.getElementById('calc-down');
  var termEl = document.getElementById('calc-term');
  if (!priceEl) return;

  var priceOut = document.getElementById('calc-price-out');
  var downOut = document.getElementById('calc-down-out');
  var termOut = document.getElementById('calc-term-out');
  var downPercentOut = document.getElementById('calc-down-percent');

  function formatNum(n) {
    return Math.round(n).toLocaleString('ru-RU');
  }

  function yearsLabel(n) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    var word = 'лет';
    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) word = 'год';
      else if (mod10 >= 2 && mod10 <= 4) word = 'года';
    }
    return n + ' ' + word;
  }

  function recalc() {
    priceOut.textContent = formatNum(priceEl.value) + ' ₽';
    downOut.textContent = formatNum(downEl.value) + ' ₽';
    termOut.textContent = yearsLabel(Number(termEl.value));
    if (downPercentOut) {
      var percent = Number(priceEl.value) > 0 ? Math.round(Number(downEl.value) / Number(priceEl.value) * 100) : 0;
      downPercentOut.textContent = percent + '%';
    }
  }

  [priceEl, downEl, termEl].forEach(function (el) {
    el.addEventListener('input', recalc);
  });

  recalc();
})();

(function () {
  var phone = document.getElementById('calc-phone');
  if (!phone) return;
  phone.addEventListener('input', function () {
    if (phone.value && phone.value.indexOf('+7') !== 0) {
      var digits = phone.value.replace(/\D/g, '').replace(/^7/, '');
      phone.value = '+7' + digits;
    }
  });
  phone.addEventListener('focus', function () {
    if (!phone.value) phone.value = '+7';
  });
})();

(function () {
  var tabs = document.getElementById('mortgage-tabs');
  var calcFields = document.getElementById('mortgage-calc-fields');
  var info = document.getElementById('mortgage-info');
  if (!tabs) return;

  var TAB_INFO = {
    military:
      '<p class="gv-body-l">Военная ипотека — особая льготная программа кредитования для военных.</p>' +
      '<ol class="gv-mortgage-info-list">' +
      '<li>Состоять на контрактной службе в армии России или подразделениях Минобороны</li>' +
      '<li>Быть участником накопительной ипотечной системы (НИС), не менее 36 месяцев</li>' +
      '</ol>',
    matcap:
      '<p class="gv-body-l">Материнский капитал представляет собой уникальную возможность для семей с детьми улучшить свои жилищные условия. Его можно использовать для частичной оплаты квартиры после бронирования, внести как первоначальный взнос при оформлении ипотечного кредита или направить на досрочное погашение существующей ипотеки.</p>',
    cash:
      '<p class="gv-body-l">Оплата наличными — это простой и быстрый способ приобретения недвижимости. Компания ССК предлагает получить скидку за наличный расчёт. От 5 до 10 тыс. ₽ для клиентов, приобретающих квартиры за наличный расчёт при единовременной оплате.</p>'
  };

  tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('.gv-chip');
    if (!btn) return;
    tabs.querySelectorAll('.gv-chip').forEach(function (c) {
      c.classList.remove('is-active', 'gv-chip--dark');
    });
    btn.classList.add('is-active', 'gv-chip--dark');

    var tab = btn.dataset.tab;
    if (tab === 'default' || !TAB_INFO[tab]) {
      if (calcFields) calcFields.hidden = false;
      if (info) { info.hidden = true; info.innerHTML = ''; }
    } else {
      if (calcFields) calcFields.hidden = true;
      if (info) { info.hidden = false; info.innerHTML = TAB_INFO[tab]; }
    }
  });
})();
