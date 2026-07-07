(function () {
  var header = document.getElementById('mainHeader');
  var hero = document.getElementById('hero');
  if (!header || !hero) return;

  var observer = new IntersectionObserver(function (entries) {
    header.classList.toggle('gv-header--scrolled', !entries[0].isIntersecting);
  }, { threshold: 0 });
  observer.observe(hero);
})();
