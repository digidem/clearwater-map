// Polyfill for window.pageYOffset on IE8 and below.
scrollTop: (function () {
  if (window.pageYOffset !== undefined) return function () { return window.pageYOffset };
  return function () { return (document.documentElement || document.body.parentNode || document.body).scrollTop; };
})(),

// Polyfill for window.innerHeight on IE8 and below.
windowHeight: (function () {
  if (window.innerHeight !== undefined) return function () { return window.innerHeight };
  if (document.documentElement && document.documentElement.clientHeight) return function () { return document.documentElement.clientHeight; };
  return function () { return document.body.clientHeight; };
})(),