(function () {
  var grid = document.getElementById('plans-grid');
  if (!grid) return;

  var countEl = document.getElementById('plans-count');
  var emptyEl = document.getElementById('plans-empty');
  var roomsWrap = document.getElementById('filter-rooms');

  var allPlans = [];
  var activeRooms = 'all';

  function formatRub(n) {
    return Math.round(n).toLocaleString('ru-RU') + ' ₽';
  }

  function matchesRooms(plan) {
    if (activeRooms === 'all') return true;
    return plan.rooms === Number(activeRooms);
  }

  function cardHTML(plan) {
    var img = plan.image
      ? '<img class="gv-plan-card-img" src="' + plan.image + '" alt="' + plan.title + '">'
      : '<div class="gv-plan-card-img gv-ph">планировка</div>';
    return (
      '<article class="gv-plan-card">' +
        img +
        '<div class="gv-plan-card-body">' +
          '<div class="gv-plan-card-title">' + plan.title + '</div>' +
          '<div class="gv-plan-card-meta">' + plan.area + ' м²</div>' +
          '<div class="gv-plan-card-price">' + formatRub(plan.price) + '</div>' +
          '<div class="gv-plan-card-actions">' +
            '<a href="#calculator" class="gv-btn gv-btn--outline gv-btn--s">Рассчитать ипотеку</a>' +
            '<a href="#" class="gv-btn gv-btn--s">Получить скидку</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function render() {
    var filtered = allPlans.filter(matchesRooms);

    countEl.textContent = 'Найдено планировок: ' + filtered.length;
    grid.innerHTML = filtered.map(cardHTML).join('');
    grid.style.display = filtered.length ? '' : 'none';
    emptyEl.style.display = filtered.length ? 'none' : '';
  }

  roomsWrap.addEventListener('click', function (e) {
    var btn = e.target.closest('.gv-chip');
    if (!btn) return;
    activeRooms = btn.dataset.rooms;
    roomsWrap.querySelectorAll('.gv-chip').forEach(function (c) { c.classList.remove('is-active'); });
    btn.classList.add('is-active');
    render();
  });

  fetch('data/planirovki.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      allPlans = data;
      render();
    })
    .catch(function () {
      countEl.textContent = 'Не удалось загрузить планировки';
    });
})();
