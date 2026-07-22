(function () {
  var FUNCTION_URL = 'https://functions.yandexcloud.net/d4eepo0vtao39g02lvlg';
  var STORAGE_KEY = 'gv_exit_modal_shown';

  var modal = document.getElementById('exitModal');
  var closeBtn = document.getElementById('exitModalClose');
  var phoneEl = document.getElementById('exit-phone');
  var agreeEl = document.getElementById('exit-agree');
  var submitBtn = modal ? modal.querySelector('.gv-exit-modal-submit') : null;
  if (!modal) return;

  function alreadyShown() {
    try { return sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }
  function markShown() {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }

  function openModal() {
    if (alreadyShown()) return;
    // Не показываем поверх уже открытой модалки (заявка, политика и т.п.) —
    // иначе клик по «Политике конфиденциальности» (курсор проходит рядом
    // с верхом окна к крестику) заодно триггерит exit-intent.
    if (document.querySelector('.is-open')) return;
    markShown();
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Десктоп: курсор уходит за верхнюю границу окна (в сторону вкладок/адресной строки)
  document.addEventListener('mouseout', function (e) {
    if (e.clientY > 0) return;
    if (!e.relatedTarget && !e.toElement) openModal();
  });

  // Мобильные устройства: указатель на уход отсутствует, поэтому показываем
  // через паузу — если человек провёл на странице достаточно времени, но ещё не оставил заявку
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    setTimeout(openModal, 45000);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function setState(text, isError) {
    submitBtn.textContent = text;
    submitBtn.style.opacity = isError ? '0.7' : '';
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      if (!phoneEl.value || phoneEl.value.replace(/\D/g, '').length < 10) {
        phoneEl.focus();
        setState('Укажите телефон', true);
        setTimeout(function () { setState('Жду звонка', false); }, 2000);
        return;
      }
      if (agreeEl && !agreeEl.checked) {
        setState('Примите условия', true);
        setTimeout(function () { setState('Жду звонка', false); }, 2000);
        return;
      }

      var payload = {
        phone: phoneEl.value,
        source: 'Exit-intent попап',
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
            if (typeof ym === 'function') ym(105215023, 'reachGoal', 'exit_intent_submit');
            setTimeout(closeModal, 1200);
          } else {
            setState('Ошибка, попробуйте ещё раз', true);
            setTimeout(function () { setState('Жду звонка', false); }, 2500);
          }
        })
        .catch(function () {
          setState('Ошибка, попробуйте ещё раз', true);
          setTimeout(function () { setState('Жду звонка', false); }, 2500);
        });
    });
  }
})();
