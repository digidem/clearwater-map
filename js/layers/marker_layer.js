cwm.layers.MarkerLayer = function (context, id) {
  
  var minZoom,
      prevZoom,
      markerSize,
      markerData,
      isBouncing,
      popup,
      activePopup,
      markersHidden = false;

  var svg = context.select("svg");

  var g = svg.append('g').attr("class", "markers");
  
  var addInteraction = cwm.handlers.MarkerInteraction();
  
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
  
  function showMarkers () {
    g.selectAll("circle")
      .sort(sortFromCenter)
      .attr("r", 0)
      .transition()
      .duration(1000)
      .delay(function (d, i) { return i * 20; })
      .ease("elastic", 2)
      .attr("r", getMarkerSize );
    markersHidden = false;
  }
  
  function hideMarkers () {
    g.selectAll("circle")
      .transition()
      .attr("r", 0).each("end", function () {
        d3.select(this).attr("display", "none");
        markersHidden = true;
      });
  }
  
  function bounceMarkers (el) {
    el = (el instanceof Element) ? el : this;
    if (isBouncing) window.clearTimeout(isBouncing);
    d3.select(el).transition()
      .delay(2000)
      .duration(180)
      .attr("r", function (d) { return getMarkerSize(d, 2); } )
      .style("stroke-width", getMarkerSize)
      .each("end", function () { 
        d3.select(this)
          .transition()
          .duration(1800)
          .ease("elastic", 1, 0.2)
          .attr("r", getMarkerSize)
          .style("stroke-width", 3);      
        isBouncing = window.setTimeout(bounceMarkers, 3000, this); 
      });
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
      .attr("r", getMarkerSize)
      .call(addInteraction)

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
      
      var zoom = markerLayer.map.getZoom();
      
      if (zoom < minZoom && prevZoom >= minZoom) {
        hideMarkers()
      } else if (zoom >= minZoom && prevZoom < minZoom) {
        drawMarkers();
        showMarkers();
      } else if (zoom >= minZoom && prevZoom >= minZoom) {
        drawMarkers();
      } else if (zoom < minZoom && !markersHidden) {
        drawMarkers();
      }
      
           
      if (activePopup) {
       var d = activePopup.datum();
       var point = new MM.Point(project(d)[0], project(d)[1]);
       MM.moveElement(activePopup.node(), point);
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
      markers = g.selectAll("circle");
  
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
          .delay(function (d, i) { return i * 20; })
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