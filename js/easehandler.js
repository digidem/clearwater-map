/*
 * This handler manages the relationship between scroll positions and
 * map locations - center point and zoom. It sets up a smooth 3 dimensional
 * path between an array of locations, and animates the map smoothly
 * between these locations on scroll. If the user moves or zooms the map 
 * manually you can call setOverride() to ensure a smooth path back to 
 * the original path.
 * 
 * Requires ModestMaps.js and mapbox easey.js library.
 * 
 */

if (typeof cwm === 'undefined') cwm = {};

cwm.easeHandler = function () {
  
  var eh = {},
      override,
      map,
      easings,
      locations,
      lastScroll,
      enabled = false;

  if (!mapbox.ease) throw 'Mapbox easey library not found';

  // Expects a mapbox v.0.6.x map object (ModestMaps)
  eh.map = function (m) {
    map = m;
    return eh;
  };

  // Locations is an array of objects with an id referring to an element id
  // and bounds, an array of two LatLon arrays, south-west, north-east
  // e.g. { id: 'elementid', bounds: [ [0, 0], [100, 100] ] }
  eh.locations = function (l) {
    if (!arguments.length) return locations; 
    locations = l;
    setScrollPoints();
    if (!!map) setEasings();
    return eh;
  };

  eh.enable = function () {
    lastScroll = 0
    if (enabled) return eh;
    if (!locations || !map) throw "Map and locations need to be set";
    if (!easings) setEasings();
    enabled = true;
    loop(this);
    return eh;
  };

  // Moves the map to the location corresponding to the current scroll position.
  // Returns false if there is no easing for this location.
  eh.easeTo = function (scrollTop) {
    scrollTop = Math.max(scrollTop, 0);

    if (!!override) {
      if (scrollTop > override.top && scrollTop < override.bottom) {
        map.coordinate = override.easings[scrollTop - override.top];
      } else {
        override = undefined;
      }
    } else {
      map.coordinate = easings[scrollTop] || _.last(easings);
    }
    map.draw();
    return eh;
  };

  eh.getCoord = function (scrollTop) {
    scrollTop = Math.max(scrollTop, 0);
    return easings[scrollTop] || _.last(easings);
  };

  // Sets an override easing function if the user has moved the map from the
  // pre-defined easing path, or if we need to move quickly between two 
  // points far apart on the page without moving through the intermediary steps 
  eh.setOverride = function (from,start,top,bottom) {
    var t, ease1, ease2,
        from = from || map.coordinate.copy(),
        start = start || cwm.util.scrollTop(),
        top = Math.max(top || start - 200, 0);
        bottom = bottom || start + 200;

    override = {top: top, bottom: bottom};
    topCoord = easings[Math.floor(top)] || _.last(easings);
    bottomCoord = easings[Math.floor(bottom)] || _.last(easings);
    ease1 = mapbox.ease().map(map).from(topCoord).to(from).setOptimalPath();
    ease2 = mapbox.ease().map(map).from(from).to(bottomCoord).setOptimalPath();
    override.easings = ease1.future(start - top).concat(ease2.future(bottom-start));
    override.time = ease1.getOptimalTime() + ease2.getOptimalTime();
    return eh;
  };
  
  eh.clearOverride = function () {
    override = undefined;
    return eh;
  }
  
  eh.getOverrideTime = function () {
    return Math.floor(override.time);
  };

  // Iterate through the locations array, look up the elements on the page,
  // calculate their scroll position, and store the result in the array.
  function setScrollPoints () {
    var wHeight = cwm.util.windowHeight();
  
    locations = _.chain(locations)
                .map(function (v) {
                  var el = document.getElementById(v.id);
                  v.scrollPoint = el ? el.offsetTop + el.offsetHeight : -1;
                  return v;
                })
                .reject(function (v) { return v.scrollPoint < 0; })
                .sortBy('scrollPoint').value();
  }

  // Creates an array `easings` of `MM.Coordinate` objects that specify
  // the map zoom and center point for each pixel on the page.
  function setEasings () {
    var easing, coord, coords, prevCoord, prevScrollPoint;
    easings = [];
  
    _.forEach(locations, function (v, i) {
      coord = map.centerFromBounds(v.bounds);
      if (!!prevCoord) {
        easing = mapbox.ease().map(map).from(prevCoord).to(coord)
                  .easing('linear').setOptimalPath();
        // for some reason the first easing is funky, so we drop it...
        coords = _.tail(easing.future(v.scrollPoint - prevScrollPoint + 1));
        easings = easings.concat(coords);
      }
      prevCoord = coord;
      prevScrollPoint = v.scrollPoint;
    });
  }

  // This loop uses requestAnimationFrame to check the scroll position 
  // and update the map.
  function loop() {
    var y = cwm.util.scrollTop();
    // meter.tick()
    if (!enabled) return false;
    // Avoid calculations if not needed and just loop again
    if (lastScroll == y) {
        requestAnimationFrame(loop);
        return false;
    } else lastScroll = y;
    eh.easeTo(y);
    requestAnimationFrame(loop);
  }
  
  return eh;
}
