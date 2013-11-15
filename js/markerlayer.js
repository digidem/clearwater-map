if (typeof cwm === 'undefined') cwm = {};

cwm.markerLayer = function (id) {
  var b = {};
  var m = mapbox.markers.layer();
  var interaction = mapbox.markers.interaction(m);
  
  m.named(id || "markers")
  
  m.loadData = function (url, callback) {
    return m.url(url, callback);
  };
  
  // Define a new factory function. This takes a GeoJSON object
  // as its input and returns an element - in this case an image -
  // that represents the point.
  m.factory(function (f) {
    var img = document.createElement('img');
    var src = (f.properties.featured) ? "http://digidem.github.io/clearwater-map/images/cw-story.png" : "http://digidem.github.io/clearwater-map/images/cw-system.png"
    
    img.className = (f.properties.featured) ? 'featured marker' : 'marker';
    img.setAttribute('src', src);
    img.setAttribute('data-community', cwm.util.sanitize(f.properties.community));
    if (f.properties.featured) { img.setAttribute('data-link',cwm.util.sanitize(f.properties.featured_url)); }
    return img;
  });
  
  // Set a custom formatter for tooltips
  // Provide a function that returns html to be used in tooltip
  interaction.formatter(function (f) {
    return '<div class="wrapper"><img src="' + f.properties.photo + '"></div>' +
           '<p>' + f.properties.name.split(" and")[0] + '</p>';
  });
  
  // Returns an array of locations of each featured story in the marker geojson
  m.getStoryLocations = function (p) {
    var locations = [];
    _.forEach(m.features(), function (f) {
      if (f.properties[p]) {
        var bounds = [[],[]];
        var id = cwm.util.sanitize(f.properties.featured_url);
        bounds[0][0] = bounds[1][0] = f.geometry.coordinates[0];
        bounds[0][1] = bounds[1][1] = f.geometry.coordinates[1];
        locations.push({id: id, bounds: bounds});
      }
    });
    return locations;
  };
  
  // Return bounds of all markers where `field == value`
  m.getBounds = function (field, value) {
    if (b[value]) return b[value];
    _.forEach(m.features(), function (f) {
      var id = cwm.util.sanitize(f.properties[field]);
      var x = f.geometry.coordinates[0];
      var y = f.geometry.coordinates[1];
      b[id] = b[id] || {};
      b[id].bounds = b[id].bounds || [[],[]];
      b[id].bounds[0][0] = (b[id].bounds[0][0] < x) ? b[id].bounds[0][0] : x;
      b[id].bounds[0][1] = (b[id].bounds[0][1] < y) ? b[id].bounds[0][1] : y;
      b[id].bounds[1][0] = (b[id].bounds[1][0] > x) ? b[id].bounds[1][0] : x;
      b[id].bounds[1][1] = (b[id].bounds[1][1] > y) ? b[id].bounds[1][1] : y;
      b[id].loc = m.map.centerFromBounds(b[id].bounds);
    });
    return b[value];
  };
  
  return m;
}





var easeBack;
var _clickMarkers = function (e) {
  var id = $.data(this,'id');
  var maxZoom = 18;
  var z = map.getZoom();
  var position = $(this).position();
  var markerClicked = this.nodeName == 'IMG';
  
  e.stopPropagation();
  var point = new MM.Point(position.left, position.top);
  // If the click is not on a marker, then we only want to continue
  // if we are already zoomed in to max, and we want to return.
  if (z < maxZoom && !markerClicked) return MM.cancelEvent(e);

  var to = map.pointCoordinate(point).zoomTo(maxZoom)
           .left(mapPadding.left / map.tileSize.x / 2);
  var backTo = (!!markerBounds[id]) ? markerBounds[id].loc : map.coordinate.copy();
  if (z < maxZoom) {
    if (!easeBack) easeBack = mapbox.ease().map(map).to(backTo).from(to);
    map.ease.to(to).optimal(0.9);
    easeHandler.setOverride(to);
  } else if (markerClicked) {
    easeBack.from(to);
    map.ease.to(to).optimal(0.9);
    easeHandler.setOverride(to);
  } else {
    // **TODO** We should only do this if this is not a drag event
    // easeBack.optimal(0.9, 1.42, function() { easeBack = undefined; });
    // easeHandler.setOverride(easeBack.to());
  }
  return MM.cancelEvent(e);
};

