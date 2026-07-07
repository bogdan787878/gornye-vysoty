(function () {
  document.querySelectorAll('.gv-routes-arrow[data-track]').forEach(function (btn) {
    var track = document.getElementById(btn.dataset.track);
    if (!track) return;
    btn.addEventListener('click', function () {
      var card = track.firstElementChild;
      var step = card ? card.getBoundingClientRect().width + 16 : 400;
      track.scrollBy({ left: step * Number(btn.dataset.dir), behavior: 'smooth' });
    });
  });
})();
