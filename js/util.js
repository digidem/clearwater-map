if (typeof cwm === 'undefined') cwm = {};

cwm.util = {
  
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
    var a = [];
    var v;
    var isArray = (val instanceof Array);
    
    for (var i=0; i<len; i++) {
      v = (isArray) ? val.slice(0) : val
      a.push(v);
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