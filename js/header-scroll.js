(function () {
  var header = document.getElementById('mainHeader');
  var hero = document.getElementById('hero');
  if (!header || !hero) return;

  var observer = new IntersectionObserver(function (entries) {
    header.classList.toggle('gv-header--scrolled', !entries[0].isIntersecting);
  }, { threshold: 0 });
  observer.observe(hero);
})();

(function () {
  var burger = document.getElementById('headerBurger');
  var nav = document.getElementById('headerNav');
  if (!burger || !nav) return;

  function closeNav() {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
})();
