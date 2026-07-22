(function () {
  // Единая маска телефона +7 (XXX) XXX-XX-XX для всех полей "Телефон" на
  // сайте — вместо точечной нормализации на submit (которая пропускала
  // буквы, если пользователь уже начал ввод с "+7").
  function formatPhone(raw) {
    var digits = raw.replace(/\D/g, '');
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    if (digits[0] !== '7') digits = '7' + digits;
    digits = digits.slice(0, 11);
    var rest = digits.slice(1);
    var out = '+7';
    if (rest.length > 0) out += ' (' + rest.slice(0, 3);
    if (rest.length >= 3) out += ')';
    if (rest.length > 3) out += ' ' + rest.slice(3, 6);
    if (rest.length > 6) out += '-' + rest.slice(6, 8);
    if (rest.length > 8) out += '-' + rest.slice(8, 10);
    return out;
  }

  function attach(input) {
    input.setAttribute('inputmode', 'tel');
    input.setAttribute('maxlength', '18');
    input.addEventListener('input', function () {
      input.value = formatPhone(input.value);
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 (';
    });
  }

  ['calc-phone', 'lead-phone', 'exit-phone'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) attach(el);
  });
})();
