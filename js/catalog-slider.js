(function () {
  document.querySelectorAll('.gv-catalog-card').forEach(function (card) {
    var slides = card.querySelectorAll('.gv-catalog-slide');
    var dots = card.querySelectorAll('.gv-catalog-dot');
    var arrows = card.querySelectorAll('.gv-catalog-arrow');
    if (!slides.length) return;

    function goTo(index) {
      index = (index + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        goTo(Number(dot.dataset.index));
      });
    });

    arrows.forEach(function (arrow) {
      arrow.addEventListener('click', function (e) {
        e.stopPropagation();
        var current = 0;
        slides.forEach(function (s, i) { if (s.classList.contains('is-active')) current = i; });
        var dir = Number(arrow.dataset.dir);
        var next = current;
        for (var step = 0; step < slides.length; step++) {
          next = (next + dir + slides.length) % slides.length;
          if (slides[next].style.display !== 'none') break;
        }
        goTo(next);
      });
    });
  });
})();
