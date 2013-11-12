if (typeof cwm === 'undefined') cwm = {};

cwm.d3Layer = function(id) {
  if (!(this instanceof cwm.d3Layer)) {
      return new cwm.d3Layer(id);
  }
  this.bounds = null;
  this.geojson = null;
  this.feature = null;
  this.enabled = true;
  this.map = null;
  this.parent = null;
  this.g = null;
  this.defs = null;
  
  this.init(id);
};

cwm.d3Layer.prototype.init = function (id) {
  var div = d3.select(document.body)
      .append("div")
      .style('position', 'absolute')
      .style('width', '100%')
      .style('height', '100%')
      .attr('id', id);

  this.parent = div.node();
  var svg = div.append('svg');
  this.g = svg.append('g');
  this.defs = svg.append('defs');
}

cwm.d3Layer.prototype.project = function (d) {
  var point = this.map.locationPoint({ lat: d[1], lon: d[0] });
  // Rounding hack from http://jsperf.com/math-round-vs-hack/3
  // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
  return [~~(0.5 + point.x), ~~(0.5 + point.y)];
}

cwm.d3Layer.prototype.draw = function () {
  if (!this.enabled || !this.map || !this.feature) return;
  var i = 0, classString = "", path;
  // *TODO* at the moment the SVG container does not resize on window.resize
  while (i < this.map.getZoom()) {
    classString += " zoom" + i;
    i++;
  }
  d3.select(document.body).node().className = classString;
  path = d3.geo.path().projection(_.bind(this.project,this));
  this.feature.select("path").attr("d", path);

  return this;
}

cwm.d3Layer.prototype.addData = function (geojson) {
  this.geojson = geojson;
  var fs = this.geojson.features;
  this.bounds = d3.geo.bounds(this.geojson);
  this.feature = this.g.selectAll("polygon")
      .data(fs)
      .enter().append("a")
      .attr("xlink:href", function(d){ return "#" + cwm.util.sanitize(d.properties.community); })
      .attr("data-label",function(d){ return (d.properties.nationality) ? "Meet the " + d.properties.nationality : ""; });

  this.feature.append("path").attr("class", function(d){ return cwm.util.sanitize(d.properties.description); });
  this.onLoadData(this);
  return this;
}

cwm.d3Layer.prototype.loadData = function (url) {
  var that = this;
  $.ajax({
    url: url,
    dataType: 'jsonp',
    success: function (data) {
      that.addData(data);
    }
  });
  return this;
}

cwm.d3Layer.prototype.onLoadData = function () {
  return;
}

cwm.d3Layer.prototype.getLocations = function () {
  // Add the bounds of each feature to the storyLocations array
  var locations = []
  for (i=0; i < this.geojson.features.length; i++) {
    if (this.geojson.features[i].properties.description !== "Ecuador Border") {
      locations.push({ 
        id: cwm.util.sanitize(this.geojson.features[i].properties.community),
        bounds: d3.geo.bounds(this.geojson.features[i])
      });
    }
  }
  return locations;
}

cwm.d3Layer.prototype.addFilters = function() {
  
  if (cwm.util.cssFilter) {
    this.g.classed("filtered", true);
  } else {
    this.feature.style("filter", "url(#blur)")
      .on("mouseover", function () {this.style.cssText = "filter: url(#blur-hover);"})
      .on("mouseout", function () {this.style.cssText = "filter: url(#blur);"});
  }
  
  // Blur effect for project area
  var blur = this.defs.append("filter")
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
  var blurHover = this.defs.append("filter")
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

cwm.d3Layer.prototype.enable = function() {
  this.enabled = true;
  this.parent.cssText = "position: absolute;";
  return this;
}

cwm.d3Layer.prototype.disable = function() {
  enabled = false;
  this.parent.cssText = "display: none;"
  return this;
}

