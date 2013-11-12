if (typeof cwm === 'undefined') cwm = {};

// Overwrite ModestMaps getMousePoint function - it does not like
// the map in position: fixed and gets confused.
// *WARNING* this will need modified if the map div has padding/margins
// This only works when filling the browser window.
MM.getMousePoint = function(e, map) {
    var point = new MM.Point(e.clientX, e.clientY);
    return point;
};

// Get the map center point for a given bounds
MM.Map.prototype.centerFromBounds = function (b) {
  var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
  return this.extentCoordinate(extent, true);
};

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