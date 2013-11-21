if (typeof cwm === 'undefined') cwm = {};

cwm.markers = function (map) {
  var markers,
      prevZoom,
      marker_size = 8,
      zoom_break = 13,
      activePopup;
  
  var m = {}
  
  m.draw = function (d, context) {
    markers = context.selectAll("circle")
        .data(d)
        .enter()
        .append("circle")
        .attr("r", 0)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(500)
            .ease("elastic", 1.5)
            .attr("r", marker_size * 2);
        })
    cwm.marker_interaction(map).markers(markers);
    return m;
  };
  
  // Move markers (and popup) to the correct position on the map
  m.move = function () {
    var zoom = map.getZoom();
    
    markers.attr("cx", function (d) { return project(d)[0]; })
           .attr("cy", function (d) { return project(d)[1]; });
           
    if (activePopup) {
     var d = activePopup.datum();
     var point = new MM.Point(project(d)[0], project(d)[1]);
     MM.moveElement(activePopup.node(), point);
    }
    
    if (prevZoom < zoom_break && zoom > zoom_break ) {
      m.show();
    } else if (prevZoom > zoom_break && zoom < zoom_break ) {
      m.hide();
    }
    prevZoom = zoom;
    
    return m;
  };
  
  // Shows the markers in the layer with animation.
  // Pass a filter function to only show a subset.
  m.show = function (filter) {
    if (!filter) {
      filter = trueFn;
    } else {
      markers.transition().attr("r", 0)
    }
    markers.filter(filter || true)
        .sort(sortFromCenter)
        .transition()
        .duration(1000)
        .delay(function (d, i) { return i * 10; })
        .ease("elastic", 2)
        .attr("r", marker_size)
    return m;
  };
  
  m.hide = function () {
    m.show(function () { return false; });
    return m;
  };
  
  m.getLocations = function (id, filter) {
    filter = filter || trueFn
    var locations = [];
    
    markers.data().filter(filter).forEach(function (d) {
      var bounds = [[],[]];
      bounds[0][0] = bounds[1][0] = d.geometry.coordinates[0];
      bounds[0][1] = bounds[1][1] = d.geometry.coordinates[1];
      locations.push({id: id(d), bounds: bounds});
    });
    return locations;
  };
  
  // Project markers from map coordinates to screen coordinates
  function project (d) {
    var point = map.locationPoint({ 
          lon: d.geometry.coordinates[0], 
          lat: d.geometry.coordinates[1] 
        });
    return [~~(0.5 + point.x), ~~(0.5 + point.y)];
  };
  
  // Sorts points according to distance from center point of map
  function sortFromCenter (a, b) {
    var c = map.getCenter();
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
  return m;
}