(function () {
  var tracks = {};
  document.querySelectorAll('.gv-routes-arrow[data-track]').forEach(function (btn) {
    var trackId = btn.dataset.track;
    var track = document.getElementById(trackId);
    if (!track) return;
    tracks[trackId] = tracks[trackId] || { track: track, nav: btn.closest('.gv-routes-nav') };
    btn.addEventListener('click', function () {
      var card = track.firstElementChild;
      var step = card ? card.getBoundingClientRect().width + 16 : 400;
      track.scrollBy({ left: step * Number(btn.dataset.dir), behavior: 'smooth' });
    });
  });

  // Стрелки листают трек только когда карточки реально не помещаются —
  // иначе на широких экранах кнопки ничего не делают и выглядят сломанными.
  function updateVisibility() {
    Object.keys(tracks).forEach(function (id) {
      var entry = tracks[id];
      if (!entry.nav) return;
      var scrollable = entry.track.scrollWidth > entry.track.clientWidth + 1;
      entry.nav.style.display = scrollable ? '' : 'none';
    });
  }

  window.addEventListener('load', updateVisibility);
  window.addEventListener('resize', updateVisibility);
  updateVisibility();
})();
