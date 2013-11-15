if (typeof cwm === 'undefined') cwm = {};

cwm.util = {
  
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
  
  // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
  sanitize: function (string) {
    if (typeof string != "undefined" && string !== null)
    return string.toLowerCase()
          .replace('http://www.giveclearwater.org/','a-')
          .replace('http://beta.giveclearwater.org/','b-')
          .split(" ").join("-").split("/").join("-");
  },
  
  preloadImages: function (geojson, community) {
    _.forEach(geojson.features, function (v) {
      if (community === v.properties.community) {
        var img = new Image();
        img.src = v.properties.photo;
      }
    });
  },
  
  // Fill an array of n length
  fillArray: function (val, len) {
    a = [];
    for (var i=0; i<len; i++) {
      a.push(val);
    }
    return a;
  },
  
  // Detect css filter for svg
  // https://github.com/Modernizr/Modernizr/issues/615
  cssFilter: (function(){
    var prefixes = '-webkit- -moz- -o- -ms-'.split(' ')
      , el = document.createElement('div');
    el.style.cssText = prefixes.join('filter:blur(2px); ');
    return !!el.style.length 
           && ((document.documentMode === undefined || document.documentMode > 9))
           ? el.style.cssText.split(":")[0] : undefined;
  })(),
  
  // detect CSS transform
  cssTransform: (function(){
    var prefixes = 'transform webkitTransform mozTransform oTransform msTransform'.split(' ')
      , el = document.createElement('div')
      , cssTransform
      , i = 0;
    while ( cssTransform === undefined ) {
      cssTransform = document.createElement('div')
                      .style[prefixes[i]] != undefined ? prefixes[i] : undefined;
      i++;
   }
   return cssTransform;
  })()
  
  
};