// Can display multiple collections of geojson features in the same layer,
// each collection with its own g, class and max zoom.

cwm.layers.FeatureLayer = function (context, id) {
  
  var clip,
      features,
      label,
      mouseoverLabel,
      featureCollectionCount = 0,
      featureData = [];
  
  var svg = context.select("svg");
  
  // Ensure the feature layer is inserted before any marker layer
  // since it would overlay and block the markers and mouse events
  var g = svg.insert('g', ':first-child');
  
  var projectionStream = d3.geo.transform({
      point: function (x, y) {
        var point = featureLayer.map.locationPoint({ lon: x, lat: y });
        // Rounding hack from http://jsperf.com/math-round-vs-hack/3
        // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
        this.stream.point(~~(0.5 + point.x), ~~(0.5 + point.y));
      }});
  
  /* -- Using this would clip the shapes to the map extent, can't see a
  /* -- can't see a performance improvement from this yet.  
  var clipProjection = { stream: function (s) {
    return projectionStream.stream(clip.stream(s));
  }};
  */
  
  function showLabel () {
    var d = this.__data__;
    if (label && label.node().parentNode) return;
    label = cwm.render.Label(d, context);
    label._feature = this;
    label.on("mouseover", function () { mouseoverLabel = true; })
         .on("mouseout", function () { mouseoverLabel = false; label.remove(); })
         .on("click", function () {
           d3.event.stopPropagation();
           mouseoverLabel = false;
           label.remove();
           d3.select(label._feature).on("click").call(label._feature, d);
         });
    drawLabel();
  }
  
  function drawLabel () {
    if (label) {
      var d = label.datum();
      var point = featureLayer.map.locationPoint(new MM.Location(d.properties._labelXY[1], d.properties._labelXY[0]));
      MM.moveElement(label.node(), point);
    }
  }
  
  function hideLabel () {
    window.setTimeout(function () {
      if (!mouseoverLabel)
      label.remove();
    }, 10);
  }
  
  var pathGenerator = d3.geo.path().projection(projectionStream);
    
  var featureLayer = {
    
    // parent is used by Modest Maps I think to attach to the map
    parent: context.node(),
    name: id,
    bounds: {},
    
    draw: function () {
      // don't do anything if we haven't been attached to a map yet
      // (Modest Maps attaches the map to the layer when it is added to the map)
      if (!featureLayer.map || !features) return;
      
      var zoom = featureLayer.map.getZoom();
      var extent = featureLayer.map.getExtent();
      var data = featureData.filter(function (d) {
        return extent.coversBounds(d.properties._bounds);
      });

      // update the features to their new positions
      // If beyond their max zoom, fade them out
      // Do not display features outside the map
      features.data(data, function (d) { return d.properties.cartodb_id; })
          .attr("d", pathGenerator)
          .style("fill-opacity", function (d) {
            return Math.min(Math.max(d.properties._maxZoom + 1 - zoom, 0), 1) * 0.6;
          })
          .style("display", "")
          .classed("outline", function (d) { return zoom > d.properties._maxZoom; })
          .on("mouseover", showLabel)
          .on("mouseout", hideLabel)
          .exit().style("display", "none");

      drawLabel();
      return featureLayer;
    },
    
    add: function (geojson, options, callback) {
      // Currently supports adding an id to each feature added
      // and a max zoom level at which that group of features is displayed
      options = options || {};
      var maxZoom = options.maxZoom || 999;
      var id = options.id || featureCollectionCount++;
      
      // inject maxZoom and id into the feature geojson
      geojson.features.forEach(function (d) { 
        d.properties._maxZoom = maxZoom;
        d.properties._id = id;
        d.properties._bounds = d3.geo.bounds(d);
        d.properties._labelXY = d3.geo.centroid(d);
        d.properties._scrollTo = options.scrollTo(d);
      });

      // add these features to the features already in the layer
      featureData = featureData.concat(geojson.features);
  
      // store the bounds of this collection of features
      featureLayer.bounds[id] = d3.geo.bounds(geojson);
  
      // now add paths for each feature and set class to id
      features = g.selectAll("path")
          .data(featureData);
      
      // select the "null nodes" for new data, and create a path element
      // for each one.
      features.enter()
          .append("path")
          .attr("class", id)
          .on("click", function (d) {
            var endY = featureLayer.map.s.scrollTo(d.properties._scrollTo);
            if (endY === cwm.scrollHandler.currentScroll())
            featureLayer.map.s.scrollTo(d.properties._scrollTo + "-overview");
          });
    
      // clip = d3.geo.clipExtent()
      //     .extent([[0, 0], [featureLayer.map.dimensions.x, featureLayer.map.dimensions.y]]);

    
      if (callback) callback();
      return featureLayer;
    },
    
    // This will load geojson from `url` and add it to the layer
    load: function (url, options, callback) {
      d3.json(url, function (e, data) {
        if (e) throw e.response + ": Could not load " + url;
        else featureLayer.add(data, options, callback);
      });
      return featureLayer;
    },
    
    getLocations: function (field) {
      var locations = [];
      features.each(function (d) {
        locations.push({ 
          id: cwm.util.sanitize(d.properties[field]),
          bounds: d3.geo.bounds(d)
        });
      });
      return locations;
    }
  };
  
  return featureLayer;
};