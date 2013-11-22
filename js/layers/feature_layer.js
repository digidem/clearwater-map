// Can display multiple collections of geojson features in the same layer,
// each collection with its own g, class and max zoom.

cwm.layers.FeatureLayer = function (context, id) {
  
  var features,
      featureCollectionCount = 0,
      featureData = [];
  
  var svg = context.select("svg");
  
  var g = svg.append('g');
  
  var projectionStream = d3.geo.transform({
      point: function (x, y) {
        var point = featureLayer.map.locationPoint({ lon: x, lat: y });
        // Rounding hack from http://jsperf.com/math-round-vs-hack/3
        // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
        this.stream.point(~~(0.5 + point.x), ~~(0.5 + point.y));
      }});
    
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
      
      // update the features to their new positions
      // If beyond their max zoom, fade them out
      features.attr("d", pathGenerator)
          .style("fill-opacity", function (d) {
            return Math.min(Math.max(d.properties._maxZoom - zoom, 0), 1) * 0.6;
          })
          .classed("outline", function (d) { return zoom > d.properties._maxZoom; });
      return featureLayer;
    },
    
    add: function (geojson, options, callback) {
      // Currently supports adding an id to each feature added
      // and a max zoom level at which that group of features is displayed
      options = options || {};
      var maxZoom = options.maxZoom || 999;
      var id = options.id || featureCollectionCount++;
      
      // inject maxZoom and id into the feature geojson
      geojson.features.forEach(function (d) { d.properties._maxZoom = maxZoom; });
      geojson.features.forEach(function (d) { d.properties._id = id; });

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
          .attr("class", id);
    
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