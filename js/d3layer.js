if (typeof cwm === 'undefined') cwm = {};

cwm.d3Layer = function(id) {
  var d3l = {}
  d3l.name = id;
  d3l.bounds = {};
  var featureData = [];
  var activePopup;
  var mouseOverPopup;
  var zoom_break = 13;
  var prevZoom = 0;
  var geojson = {
    "type": "FeatureCollection",
		"features": featureData
  };
  var features;
  var markers;

  var div = d3.select(document.body)
      .append("div")
      .style('position', 'absolute')
      .style('width', '100%')
      .style('height', '100%')
      .attr('id', id);
      
  d3l.parent = div.node();
  var svg = div.append('svg').style("position", "absolute");
  var gFeatures = svg.append('g').attr("class", "features");
  var gMarkers = svg.append('g').attr("class", "markers");

  var projectionStream = d3.geo.transform({
      point: function (x, y, z) {
        var point = d3l.map.locationPoint({ lon: x, lat: y });
        // Rounding hack from http://jsperf.com/math-round-vs-hack/3
        // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
        this.stream.point(~~(0.5 + point.x), ~~(0.5 + point.y));
      }});
      
  var path = d3.geo.path().projection(projectionStream);

  // This function is called by ModestMaps every time it redraws the map
  d3l.draw = function () {
    var zoom = d3l.map.getZoom();
    // don't do anything if we haven't been attached to a map yet
    // or we don't yet have any data to draw
    if (!d3l.map || !features) return;

    // update the features to their new positions
    features.attr("d", path)
        .style("fill-opacity", function () {
          return Math.min(Math.max(zoom_break - zoom, 0), 1) * 0.6;
        })
        .classed("outline", function () { return zoom > zoom_break });
        
    if (markers) markers.move();
    
    prevZoom = zoom;
    return d3l;
  }

  d3l.addFeatures = function (json, id, callback) {
    // add an id to each feature in the geojson
    json.features.forEach(function (e) { e.properties._id = id; });
    
    // add these features to the features already in the layer
    featureData = featureData.concat(json.features);
    
    // store the bounds of this collection of features
    d3l.bounds[id] = d3.geo.bounds(json);
    
    // now add paths for each feature and set class to id
    features = gFeatures.selectAll("path")
        .data(featureData);
        
    features.enter()
        .append("path")
        .attr("class", id);
      
    if (callback) callback();
    return d3l;
  }

  d3l.addMarkers = function (json, callback) {
    // store the bounds of this collection of markers
    d3l.bounds["markers"] = d3.geo.bounds(json);
    
    // now add markers for each feature
    markers = cwm.markers(d3l.map).draw(json.features, gMarkers);
    
    if (callback) callback();
    return d3l;
  };
  
  d3l.loadMarkers = function (url, callback) {
    d3.json(url, function (e, data) {
      if (e) throw e.response + ": Could not load " + url;
      else d3l.addMarkers(data, callback);
    });
    return d3l;
  };
  
  d3l.getMarkerBounds = function (filter) {
    return markers.getBounds(filter);
  }
  
  d3l.getMarkerLocations = function (id, filter) {
    return markers.getLocations(id, filter);
  }

  // This will load geojson from `url` and add it to the layer
  d3l.loadFeatures = function (url, id, callback) {
    d3.json(url, function (e, data) {
      if (e) throw e.response + ": Could not load " + url;
      else d3l.addFeatures(data, id, callback);
    });
    return d3l;
  };
  
  // Returns an array of bounds for each feature with id from property `p`
  d3l.getLocations = function (field) {
    var locations = []
    features.each(function (d) {
      locations.push({ 
        id: cwm.util.sanitize(d.properties[field]),
        bounds: d3.geo.bounds(d)
      });
    })
    return locations;
  }
  


/*---------- Not used any more

d3l.blur = function() {
  
  feature.style("filter", "url(#blur)")
      .on("mouseover", function () {this.style.cssText = "filter: url(#blur-hover);"})
      .on("mouseout", function () {this.style.cssText = "filter: url(#blur);"});
  
  // Blur effect for project area
  var blur = defs.append("filter")
      .attr("id", "blur")
  blur.append("feColorMatrix")
      .attr("in", "SourceAlpha")
      // .attr("color-interpolation-filters", "sRGB")
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
  var blurHover = defs.append("filter")
      .attr("id", "blur-hover")
  blurHover.append("feColorMatrix")
      .attr("in", "SourceAlpha")
      // .attr("color-interpolation-filters", "sRGB")
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
  return d3l;
};

--------------------*/

return d3l;
};