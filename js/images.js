(function () {
  // Удаляет только текстовые узлы (плейсхолдер вроде "фото"/"лого"),
  // не трогая дочерние элементы (например, .gv-logo-tint внутри лого).
  function clearPlaceholderText(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) el.removeChild(node);
    });
  }

  function paint(el, path) {
    var url = 'url(' + path + ')';
    el.style.backgroundImage = url;
    el.style.backgroundSize = el.dataset.fit === 'contain' ? 'contain' : 'cover';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    clearPlaceholderText(el);
    el.classList.remove('gv-ph');
    // для лого — та же картинка используется как маска на оверлее (перекраска на белом хедере)
    if (el.dataset.slot === 'logo') {
      var tint = el.querySelector('.gv-logo-tint');
      if (tint) {
        tint.style.maskImage = url;
        tint.style.webkitMaskImage = url;
      }
    }
  }

  // Не откладываем только герой (LCP-элемент, всегда виден при заходе на
  // страницу) — остальные 50+ картинок ставим по IntersectionObserver,
  // чтобы не грузить всё разом на мобильном при заходе.
  var EAGER_SLOTS = ['hero'];
  var lazyObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          lazyObserver.unobserve(entry.target);
          paint(entry.target, entry.target.dataset.gvPath);
        });
      }, { rootMargin: '600px 0px' })
    : null;

  fetch('data/images.json')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (map) {
      Object.keys(map).forEach(function (slot) {
        var path = map[slot];
        if (!path) return;
        var els = document.querySelectorAll('[data-slot="' + slot + '"]');
        els.forEach(function (el) {
          // Отмечаем сразу (независимо от того, отложена покраска или нет) —
          // на этот флаг ниже опирается логика скрытия пустых слайдов/аватарок.
          el.dataset.gvHasImage = '1';
          if (EAGER_SLOTS.indexOf(slot) !== -1 || !lazyObserver) {
            paint(el, path);
          } else {
            el.dataset.gvPath = path;
            lazyObserver.observe(el);
          }
        });
      });

      // На публичном сайте (не в режиме редактирования) прячем пустые кружки-аватарки
      // и пустые слайды/точки в слайдере каталога — видно только то, что реально загружено.
      // В самой админке (когда доступен /api/ping) оставляем всё — чтобы было что загрузить.
      fetch('/api/ping').then(function (r) { return r.ok; }).catch(function () { return false; })
        .then(function (isEditMode) {
          if (isEditMode) return;

          document.querySelectorAll('.gv-mortgage-avatars [data-slot]').forEach(function (el) {
            if (!el.dataset.gvHasImage) el.style.display = 'none';
          });

          document.querySelectorAll('.gv-catalog-card').forEach(function (card) {
            var slides = card.querySelectorAll('.gv-catalog-slide');
            var dots = card.querySelectorAll('.gv-catalog-dot');
            var visibleCount = 0;
            slides.forEach(function (slide, i) {
              if (slide.dataset.gvHasImage) {
                visibleCount++;
              } else {
                slide.style.display = 'none';
                if (dots[i]) dots[i].style.display = 'none';
              }
            });
            // если активный слайд оказался скрыт — активируем первый видимый
            var activeSlide = card.querySelector('.gv-catalog-slide.is-active');
            if (activeSlide && activeSlide.style.display === 'none') {
              for (var i = 0; i < slides.length; i++) {
                if (slides[i].style.display !== 'none') {
                  slides.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
                  dots.forEach(function (d, j) { d.classList.toggle('is-active', j === i); });
                  break;
                }
              }
            }
            var dotsWrap = card.querySelector('.gv-catalog-dots');
            if (dotsWrap && visibleCount <= 1) dotsWrap.style.display = 'none';
          });
        });
    })
    .catch(function () {});
})();
