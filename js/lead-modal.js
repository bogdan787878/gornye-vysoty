(function () {
  var FUNCTION_URL = 'https://functions.yandexcloud.net/d4eepo0vtao39g02lvlg';

  var modal = document.getElementById('leadModal');
  var closeBtn = document.getElementById('leadModalClose');
  var phoneEl = document.getElementById('lead-phone');
  var agreeEl = document.getElementById('lead-agree');
  var submitBtn = modal ? modal.querySelector('.gv-lead-modal-submit') : null;
  if (!modal) return;

  var lastTrigger = null;

  function openModal(trigger) {
    lastTrigger = trigger;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (phoneEl) phoneEl.focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-lead-open]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openModal(el);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  if (phoneEl) {
    phoneEl.addEventListener('input', function () {
      if (phoneEl.value && phoneEl.value.indexOf('+7') !== 0) {
        var digits = phoneEl.value.replace(/\D/g, '').replace(/^7/, '');
        phoneEl.value = '+7' + digits;
      }
    });
    phoneEl.addEventListener('focus', function () {
      if (!phoneEl.value) phoneEl.value = '+7';
    });
  }

  function setState(text, isError) {
    submitBtn.textContent = text;
    submitBtn.style.opacity = isError ? '0.7' : '';
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      if (!phoneEl.value || phoneEl.value.replace(/\D/g, '').length < 10) {
        phoneEl.focus();
        setState('Укажите телефон', true);
        setTimeout(function () { setState('Получить предложение', false); }, 2000);
        return;
      }
      if (agreeEl && !agreeEl.checked) {
        setState('Примите условия', true);
        setTimeout(function () { setState('Получить предложение', false); }, 2000);
        return;
      }

      var payload = {
        phone: phoneEl.value,
        source: lastTrigger ? lastTrigger.textContent.trim() : 'Быстрая заявка',
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
            if (typeof ym === 'function') ym(105215023, 'reachGoal', 'lead_modal_submit');
            setTimeout(closeModal, 1200);
          } else {
            setState('Ошибка, попробуйте ещё раз', true);
            setTimeout(function () { setState('Получить предложение', false); }, 2500);
          }
        })
        .catch(function () {
          setState('Ошибка, попробуйте ещё раз', true);
          setTimeout(function () { setState('Получить предложение', false); }, 2500);
        });
    });
  }
})();
