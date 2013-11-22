cwm.layers.MarkerLayer = function (context, id) {
  
  var markers,
      minZoom,
      prevZoom,
      markerSize,
      interaction,
      popup,
      activePopup;

  var svg = context.select("svg");

  var g = svg.append('g');
  
  // Project markers from map coordinates to screen coordinates
  function project (d) {
    var point = markerLayer.map.locationPoint({ 
          lon: d.geometry.coordinates[0], 
          lat: d.geometry.coordinates[1] 
        });
    return [~~(0.5 + point.x), ~~(0.5 + point.y)];
  }
  
  // Sorts points according to distance from center point of map
  // used for animating `show` making markers appear from center
  function sortFromCenter (a, b) {
    var c = markerLayer.map.getCenter();
    var ac = a.geometry.coordinates;
    var bc = b.geometry.coordinates;
    var ad = Math.pow(ac[0] - c.lon, 2) + Math.pow(ac[1] - c.lat, 2);
    var bd = Math.pow(bc[0] - c.lon, 2) + Math.pow(bc[1] - c.lat, 2);
    return d3.ascending(ad, bd);
  }
  
  // A function that always returns true (used for default arguments)
  function trueFn () {
    return true;
  }
  
  var markerLayer = {
    
    // parent is used by Modest Maps I think to attach to the map
    parent: context.node(),
    name: id,
    
    draw: function () {
      // don't do anything if we haven't been attached to a map yet
      // (Modest Maps attaches the map to the layer when it is added to the map)
      if (!markerLayer.map || !markers) return;
      
      var zoom = markerLayer.map.getZoom();
    
      markers.attr("cx", function (d) { return project(d)[0]; })
             .attr("cy", function (d) { return project(d)[1]; });
           
      if (activePopup) {
       var d = activePopup.datum();
       var point = new MM.Point(project(d)[0], project(d)[1]);
       MM.moveElement(activePopup.node(), point);
      }
    
      if (prevZoom < minZoom && zoom > minZoom ) {
        markerLayer.show();
      } else if (prevZoom > minZoom && zoom < minZoom ) {
        markerLayer.hide();
      }
      prevZoom = zoom;
    
      return markerLayer;
    },
    
    add: function (geojson, options, callback) {
      // Currently supports adding an marker size to each feature
      // for now only supports constants, not functions
      options = options || {};
      markerSize = options.markerSize || 8;
      minZoom = options.minZoom || 0;
      
      // inject markerSize into the feature geojson
      geojson.features.forEach(function (d) { d.properties._markerSize = markerSize; });
      
      // store the bounds of this collection of markers
      markerLayer.bounds = d3.geo.bounds(geojson);
  
      // now render markers for each feature
      markers = cwm.render.Markers(geojson.features, g);
  
      interaction = cwm.handlers.MarkerInteraction(markers);
  
      if (callback) callback();
      return markerLayer;
    },
    
    load: function (url, options, callback) {
      d3.json(url, function (e, data) {
        if (e) throw e.response + ": Could not load " + url;
        else markerLayer.add(data, options, callback);
      });
      return markerLayer;
    },
    
    // returns an array of bounds for each marker
    // used by the map to locate featured stories
    getLocations: function (id, filter) {
      filter = filter || trueFn;
      var locations = [];
  
      markers.data().filter(filter).forEach(function (d) {
        var bounds = [[],[]];
        bounds[0][0] = bounds[1][0] = d.geometry.coordinates[0];
        bounds[0][1] = bounds[1][1] = d.geometry.coordinates[1];
        locations.push({id: id(d), bounds: bounds});
      });
      return locations;
    },
    
    // Shows the markers in the layer with animation.
    // Pass a filter function to only show a subset.
    show: function (filter) {
      if (!filter) {
        filter = trueFn;
      } else {
        markers.transition().attr("r", 0);
      }
      markers.filter(filter || true)
          .sort(sortFromCenter)
          .transition()
          .duration(1000)
          .delay(function (d, i) { return i * 10; })
          .ease("elastic", 2)
          .attr("r", function (d) { return d.properties._markerSize; } );
      return markerLayer;
    },
    
    hide: function () {
      markerLayer.show(function () { return false; });
      return markerLayer;
    }
  };
  
  return markerLayer;
};