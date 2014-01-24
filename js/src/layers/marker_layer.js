cwm.layers.MarkerLayer = function (context, id) {
  
  var minZoom,
      prevZoom = 0,
      markerSize,
      markerData,
      markersHiding,
      mapContainer;

  var svg = context.select("svg");

  var g = svg.append('g').attr("class", "markers");
  
  var markerInteraction = cwm.handlers.MarkerInteraction(context);
  
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
  function sortFromLocation (location) {
    var loc = location || new MM.Location(0,0);
    return function (a, b) {
      var ac = a.geometry.coordinates;
      var bc = b.geometry.coordinates;
      var ad = Math.pow(ac[0] - loc.lon, 2) + Math.pow(ac[1] - loc.lat, 2);
      var bd = Math.pow(bc[0] - loc.lon, 2) + Math.pow(bc[1] - loc.lat, 2);
      return d3.ascending(ad, bd);
    };
  }
  
  // A function that always returns true (used for default arguments)
  function trueFn () {
    return true;
  }
  
  function showMarkers () {
    g.selectAll("circle")
      .sort(sortFromLocation(markerLayer.map.getCenter()))
      .attr("r", 0)
      .transition()
      .duration(1000)
      .delay(function (d, i) { return i * 20; })
      .ease("elastic", 2)
      .attr("r", getMarkerSize );
      
    g.selectAll("circle").sort(sortFeaturedLast);
  }
  
  function hideMarkers () {
    markersHiding = g.selectAll("circle");
    markersHiding.transition()
      .attr("r", 0).each("end", function () {
        d3.select(this).attr("display", "none");
        markersHiding = null;
      });
  }
  
  function zoomToMarker () {
    var z = 18;
    var map = markerLayer.map;
    var x = this.getAttribute("cx");
    var y = this.getAttribute("cy");
    if (d3.event.defaultPrevented) return;
    if (map.getZoom() >= z) return;
    
    var point = new MM.Point(x, y);
    var to = map.pointCoordinate(point).zoomTo(z);
    map.ease.to(to).path('about').run(1000, function () {
      map.flightHandler.setOverride();
    });
    d3.select(map.parent).classed("zoomed-in", true);
  }
  
  function sortFeaturedLast (a, b) {
    return (a.properties.featured === true) ? 1 : 0;
  }
  
  function drawMarkers() {
    var extent = markerLayer.map.getExtent();
    
    // filter markers that are within the current extent of the map
    var data = markerData.filter(function (d) {
      return extent.containsCoordinates(d.geometry.coordinates);
    });
    
    // Join the filtered data for markers in the current map extent
    var update = g.selectAll("circle").data(data, function (d) { return d.properties.cartodb_id; });
    
    // For any new markers appearing in the extent, append a circle
    // and add the interaction.
    update.enter()
      .append("circle")
      .attr("r", getMarkerSize);

    update.call(markerInteraction.add)
      .on("click.zoom", zoomToMarker);

    // For markers leaving the current extent, remove them from the DOM.
    update.exit().attr("display", "none");
    
    // After appending the circles to the enter() selection,
    // it is merged with the update selection.
    // Move all displayed markers to the correct location on the map
    update.attr("cx", function (d) { return project(d)[0]; })
      .attr("cy", function (d) { return project(d)[1]; })
      .attr("display", "");
  }
  
  function getMarkerSize (d, i, scale) {
    scale = scale || 1;
    return d.properties._markerSize * scale;
  }
  
  var markerLayer = {
    
    // parent is used by Modest Maps I think to attach to the map
    parent: context.node(),
    name: id,
    
    draw: function () {
      // don't do anything if we haven't been attached to a map yet
      // (Modest Maps attaches the map to the layer when it is added to the map)
      if (!markerLayer.map || !markerData) return;
      var mapContainer = mapContainer || d3.select(markerLayer.map.parent);
      var zoom = markerLayer.map.getZoom();
      mapContainer.classed("markers-shown", (zoom >= minZoom));
      
      if (zoom < minZoom && prevZoom >= minZoom) {
        // If we just zoomed out, animate hide the markers
        hideMarkers();
        markerInteraction.removePopup();
      } else if (zoom >= minZoom && prevZoom < minZoom) {
        // If we just zoomed in, draw the markers in the correct locations
        // and animate their appearance ("raindrop" effect)
        drawMarkers();
        markerInteraction.drawPopup(project);
        showMarkers();
      } else if (zoom >= minZoom && prevZoom >= minZoom) {
        // If we are already zoomed with the markers showing, just move them
        drawMarkers();
        markerInteraction.drawPopup(project);
      } else if (zoom < minZoom && markersHiding) {
        // If we have zoomed out and marker hide animation is still running
        // Move the hiding markers as the map moves
        markersHiding.attr("cx", function (d) { return project(d)[0]; })
          .attr("cy", function (d) { return project(d)[1]; });
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
  
      markerData = geojson.features;
  
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
  
      markerData.filter(filter).forEach(function (d) {
        var bounds = [[],[]];
        bounds[0][0] = bounds[1][0] = d.geometry.coordinates[0];
        bounds[0][1] = bounds[1][1] = d.geometry.coordinates[1];
        locations.push({id: id(d), bounds: bounds});
      });
      return locations;
    },
    
    // returns an array of bounds for each group of markers
    // used by the map to locate overviews
    getOverviewLocations: function (id, key) {
      var locations = [];
      var groupedMarkers = d3.nest().key(key).entries(markerData);
      
      groupedMarkers.forEach(function (d) {
        locations.push({ 
          id: id(d.key),
          bounds: d3.geo.bounds({
  "type": "FeatureCollection",
  "features": d.values })
        });
      });
      return locations;
    },
    
    // Gets the bounds of the nearest group of markers for a community
    getBounds: function (filter) {
      filter = filter || trueFn;
      var filtered = markerData.filter(filter);
      return d3.geo.bounds({
  "type": "FeatureCollection",
  "features": filtered });
    },
    
    closest: function (location) {
      return markerData.sort(sortFromLocation(location))[0];
    }
  };
  
  return markerLayer;
};