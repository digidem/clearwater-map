cwm.util = {

  // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
  sanitize: function(string) {
    if (typeof string != "undefined" && string !== null)
      return string.toLowerCase()
        .replace('http://www.giveclearwater.org/', 'a-')
        .replace('http://beta.giveclearwater.org/', 'b-')
        .split(" ").join("-").split("/").join("-");
  },

  preloadImages: function(geojson, community) {
    _.forEach(geojson.features, function(v) {
      if (community === v.properties.community) {
        var img = new Image();
        img.src = v.properties.photo;
      }
    });
  },

  // Fill an array of n length
  fillArray: function(val, len) {
    var a = [];
    var v;
    var isArray = (val instanceof Array);

    for (var i = 0; i < len; i++) {
      v = (isArray) ? val.slice(0) : val;
      a.push(v);
    }
    return a;
  },

  // Converts a Modest Maps bound object to something D3 understands
  d3Bounds: function(MMbounds) {
    return [[MMbounds[0].lon, MMbounds[0].lat], [MMbounds[1].lon, MMbounds[1].lat]];
  },
  
  transformCSS: (function(props, prefix) {
    props = props.split(" ");
    prefix = prefix.split(" ");
    if (!this.document) return; // node.js safety
    var style = document.documentElement.style;
    for (var i = 0; i < props.length; i++) {
      if (props[i] in style) {
        return prefix[i];
      }
    }
    return false;
  })('transform WebkitTransform OTransform MozTransform msTransform', 'transform -webkit-transform -o-transform -moz-transform -ms-transform')
  
};