(function () {
  document.querySelectorAll('.gv-catalog-card').forEach(function (card) {
    var slides = card.querySelectorAll('.gv-catalog-slide');
    var dots = card.querySelectorAll('.gv-catalog-dot');
    if (!slides.length) return;

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var index = Number(dot.dataset.index);
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
      });
    });
  });
})();
