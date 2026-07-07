(function () {
  var leftSvg = '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var rightSvg = '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var overlay = document.createElement('div');
  overlay.className = 'gv-lightbox';
  overlay.innerHTML =
    '<button class="gv-lightbox-close" aria-label="Закрыть">&times;</button>' +
    '<button class="gv-lightbox-arrow gv-lightbox-prev" aria-label="Назад">' + leftSvg + '</button>' +
    '<img class="gv-lightbox-img" alt="">' +
    '<button class="gv-lightbox-arrow gv-lightbox-next" aria-label="Вперёд">' + rightSvg + '</button>';
  document.body.appendChild(overlay);

  var imgEl = overlay.querySelector('.gv-lightbox-img');
  var urls = [];
  var index = 0;

  function extractUrl(el) {
    var bg = el.style.backgroundImage || getComputedStyle(el).backgroundImage;
    var m = /url\(["']?(.*?)["']?\)/.exec(bg || '');
    return m ? m[1] : '';
  }

  function show(i) {
    if (!urls.length) return;
    index = (i + urls.length) % urls.length;
    imgEl.src = urls[index];
  }

  function open(list, startIndex) {
    urls = list;
    if (!urls.length) return;
    show(startIndex);
    overlay.classList.add('is-open');
  }

  function close() {
    overlay.classList.remove('is-open');
  }

  overlay.querySelector('.gv-lightbox-close').addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.gv-lightbox-prev').addEventListener('click', function () { show(index - 1); });
  overlay.querySelector('.gv-lightbox-next').addEventListener('click', function () { show(index + 1); });

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  document.querySelectorAll('.gv-catalog-card').forEach(function (card) {
    var slides = card.querySelectorAll('.gv-catalog-slide');
    slides.forEach(function (slide, i) {
      slide.addEventListener('click', function (e) {
        if (window.__gvEditMode) return;
        e.preventDefault();
        var list = Array.prototype.map.call(slides, extractUrl).filter(Boolean);
        open(list, i);
      });
    });
  });
})();
