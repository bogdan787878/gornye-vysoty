(function () {
  var legalToggle = document.getElementById('legalToggle');
  var legalBox = document.getElementById('legalConditions');
  if (legalToggle && legalBox) {
    legalToggle.addEventListener('click', function () {
      var isHidden = legalBox.hasAttribute('hidden');
      if (isHidden) {
        legalBox.removeAttribute('hidden');
        legalBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        legalBox.setAttribute('hidden', '');
      }
      legalToggle.setAttribute('aria-expanded', String(isHidden));
    });
  }

  // На данный момент дан текст только одной политики — используется для обеих ссылок,
  // пока клиент не пришлёт отдельный текст "Политики о персональных данных".
  var POLICY_TEMPLATES = {
    'privacy': 'policy-privacy',
    'personal-data': 'policy-privacy'
  };

  var modal = document.getElementById('policyModal');
  var modalBody = document.getElementById('policyModalBody');
  var modalClose = document.getElementById('policyModalClose');

  function openPolicy(key) {
    var templateId = POLICY_TEMPLATES[key];
    var template = templateId && document.getElementById(templateId);
    if (!template || !modal || !modalBody) return;
    modalBody.innerHTML = '';
    modalBody.appendChild(template.content.cloneNode(true));
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closePolicy() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-policy-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { openPolicy(btn.dataset.policyOpen); });
  });
  if (modalClose) modalClose.addEventListener('click', closePolicy);
  if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) closePolicy(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePolicy(); });
})();
