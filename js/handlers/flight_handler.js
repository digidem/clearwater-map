/*
 * This handler manages the relationship between scroll positions and
 * map locations - center point and zoom. It sets up a smooth 3 dimensional
 * flight between an array of locations, and animates the map smoothly
 * between these locations on scroll. If the user moves or zooms the map 
 * manually you can call setOverride() to ensure a smooth path back to 
 * the original path.
 * 
 * Requires ModestMaps.js and mapbox easey.js library.
 * 
 */

cwm.handlers.FlightHandler = function () {
  
  var flightHandler = {},
      override,
      map,
      easings,
      ease,
      paused,
      locations,
      lastScroll,
      enabled = false;

  if (!mapbox.ease) throw 'Mapbox easey library not found';

  // Expects a mapbox v.0.6.x map object (ModestMaps)
  flightHandler.map = function (m) {
    map = m;
    ease = mapbox.ease().map(map);
    return flightHandler;
  };

  // Locations is an array of objects with an id referring to an element id
  // and bounds, an array of two LatLon arrays, south-west, north-east
  // e.g. { id: 'elementid', bounds: [ [0, 0], [100, 100] ] }
  flightHandler.locations = function (l) {
    if (!arguments.length) return locations; 
    locations = l;
    setScrollPoints();
    if (!!map) setEasings();
    return flightHandler;
  };

  flightHandler.enable = function () {
    lastScroll = -1;
    if (enabled) return flightHandler;
    if (!locations || !map) throw "Map and locations need to be set";
    if (!easings) setEasings();
    enabled = true;
    cwm.scrollHandler.add(flightHandler.easeTo);
    return flightHandler;
  };

  // Moves the map to the location corresponding to the current scroll position.
  // Returns false if there is no easing for this location.
  flightHandler.easeTo = function (scrollTop) {
    if (paused) return flightHandler;
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
    return flightHandler;
  };

  flightHandler.getCoord = function (scrollTop) {
    scrollTop = Math.max(scrollTop, 0);
    return easings[scrollTop] || _.last(easings);
  };

  // Sets an override easing function if the user has moved the map from the
  // pre-defined easing path, or if we need to move quickly between two 
  // points far apart on the page without moving through the intermediary steps 
  flightHandler.setOverride = function (from,start,top,bottom) {
    from = from || map.coordinate.copy(),
    start = start || cwm.scrollHandler.currentScroll(),
    top = Math.max(top || start - 200, 0);
    bottom = bottom || start + 200;

    flightHandler.clearOverride();
    
    var ease1, ease2, topCoord, bottomCoord;

    override = {top: top, bottom: bottom };
    topCoord = easings[Math.floor(top)] || _.last(easings);
    bottomCoord = easings[Math.floor(bottom)] || _.last(easings);
    ease1 = ease.from(topCoord).to(from).setOptimalPath();
    override.easings = ease1.future(start - top);
    override.time = ease1.getOptimalTime();
    ease2 = ease.from(from).to(bottomCoord).setOptimalPath();
    override.easings = override.easings.concat(ease2.future(bottom - start));
    override.time += ease2.getOptimalTime();
    return flightHandler;
  };
  
  flightHandler.pause = function () {
    paused = true;
    return flightHandler;
  };
  
  flightHandler.resume = function () {
    paused = false;
    return flightHandler;
  }
  
  flightHandler.clearOverride = function () {
    override = undefined;
    return flightHandler;
  };
  
  flightHandler.getOverrideTime = function () {
    return Math.floor(override.time);
  };

  // Iterate through the locations array, look up the elements on the page,
  // calculate their scroll position, and store the result in the array.
  function setScrollPoints () {
  
    locations = _.chain(locations)
                .map(function (v) {
                  var el = document.getElementById(v.id);
                  if (el) {
                    var offset = $x(el).nextSiblingOrCousin()[0] ? $x(el).nextSiblingOrCousin()[0].children[1].children[0].offsetHeight : 0;
                    v.scrollPoint = Math.max(el.offsetTop + el.offsetHeight + offset, 0);
                  } else {
                    v.scrollPoint = -1;
                  }
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
  
    _.forEach(locations, function (v) {
      coord = map.centerFromBounds(v.bounds);
      if (!!prevCoord) {
        easing = ease.from(prevCoord).to(coord)
                  .easing('linear').setOptimalPath();
        // for some reason the first easing is funky, so we drop it...
        coords = _.tail(easing.future(v.scrollPoint - prevScrollPoint + 1));
        easings = easings.concat(coords);
      }
      prevCoord = coord;
      prevScrollPoint = v.scrollPoint;
    });
  }
  
  return flightHandler;
};
