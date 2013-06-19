// Detect css filter for svg
// https://github.com/Modernizr/Modernizr/issues/615
var cssFilter = (function(){
  var prefixes = '-webkit- -moz- -o- -ms-'.split(' ')
    , el = document.createElement('div');
  el.style.cssText = prefixes.join('filter:blur(2px); ');
  return !!el.style.length 
         && ((document.documentMode === undefined || document.documentMode > 9))
         ? el.style.cssText.split(":")[0] : undefined;
})();


var d3layer = function(id) {
  if (!(this instanceof d3layer)) {
    console.log('newing');
      return new d3layer(id);
  }
  this.bounds = null;
  this.geojson = null;
  this.collection = null;
  this.feature = null;
  this.enabled = true;
  this.first = true;
  this.url = 'http://clearwater.cartodb.com/api/v2/sql';

  var div = d3.select(document.body)
      .append("div")
      .style('position', 'absolute')
      .attr('id', id);

  this.parent = div.node();
  this.svg = div.append('svg');
  this.g = this.svg.append('g');
  var defs = this.svg.append('defs');
};

d3layer.prototype.project = function (d) {
  var point = this.map.locationPoint({ lat: d[1], lon: d[0] });
  // Rounding hack from http://jsperf.com/math-round-vs-hack/3
  // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
  return [~~(0.5 + point.x), ~~(0.5 + point.y)];
}

d3layer.prototype.draw = function () {
  if (!this.enabled || !this.map || !this.feature) return;
  var i = 0, classString = "", path;
  // *TODO* at the moment the SVG container does not resize on window.resize
  this.first && this.svg.attr("width", this.map.dimensions.x)
      .attr("height", this.map.dimensions.y)
      .style("margin-left", "0px")
      .style("margin-top", "0px") && (this.first = false);
  while (i < this.map.getZoom()) {
    classString += " zoom" + i;
    i++;
  }
  this.parent.className = classString;
  path = d3.geo.path().projection(_.bind(this.project,this));
  this.feature.attr("d", path);
  return this;
}

d3layer.prototype.data = function (geojson) {
  this.geojson = geojson;
  var fs = this.geojson.features;
  this.bounds = d3.geo.bounds(this.geojson);
  this.feature = this.g.selectAll("polygon")
      .data(fs)
      .enter().append("a")
      .attr("xlink:href", function(d){ return "#" + _sanitize(d.properties.community); })
      .append("path");
  return this;
}

d3layer.prototype.getLocations = function () {
  // Add the bounds of each feature to the storyLocations array
  var locations = []
  for (i=0; i < this.geojson.features.length; i++) {
    locations.push({ 
      id: _sanitize(this.geojson.features[i].properties.community),
      bounds: d3.geo.bounds(this.geojson.features[i])
    });
  }
  return locations;
}

d3layer.prototype.addFilters = function() {
  
  if (cssFilter) {
    this.g.classed("filtered", true);
  } else {
    this.feature.style("filter", "url(#blur)")
      .on("mouseover", function () {this.style.cssText = "filter: url(#blur-hover);"})
      .on("mouseout", function () {this.style.cssText = "filter: url(#blur);"});
  }
  
  // Blur effect for project area
  var blur = this.svg.select("defs").append("filter")
      .attr("id", "blur")
  blur.append("feColorMatrix")
      .attr("in", "SourceAlpha")
      .attr("color-interpolation-filters", "sRGB")
      .attr("type", "matrix")
      .attr("values", "0 0 0 0.9450980392 0  "
                    + "0 0 0 0.7607843137 0  "
                    + "0 0 0 0.1098039216 0  "
                    + "0 0 0 1 0");
  blur.append("feGaussianBlur")
      .attr("stdDeviation", 10)
      .attr("result", "coloredBlur");
  blur.append("feMerge")
      .append("feMergeNode")
      .attr("in", "coloredBlur")

  // Hover effect for project area
  var blurHover = this.svg.select("defs").append("filter")
      .attr("id", "blur-hover")
  blurHover.append("feColorMatrix")
      .attr("in", "SourceAlpha")
      .attr("color-interpolation-filters", "sRGB")
      .attr("type", "matrix")
      .attr("values", "0 0 0 0.6705882353 0  "
                    + "0 0 0 0.5450980392 0  "
                    + "0 0 0 0.1176470588 0  "
                    + "0 0 0 1 0");
  blurHover.append("feGaussianBlur")
      .attr("stdDeviation", 10)
      .attr("result", "coloredBlur");
  blurHover.append("feMerge")
      .append("feMergeNode")
      .attr("in", "coloredBlur");
  return this;
}

d3layer.prototype.enable = function() {
  this.enabled = true;
  this.parent.cssText = "position: absolute;";
  return this;
}

d3layer.prototype.disable = function() {
  enabled = false;
  this.parent.cssText = "display: none;"
  return this;
}

// Helper to _sanitize a string, replacing spaces with "-" and lowercasing
function _sanitize(string) {
  if (typeof string != "undefined" && string !== null)
  return string.toLowerCase()
        .replace('http://www.giveclearwater.org/','a-')
        .split(" ").join("-").split("/").join("-");
}
