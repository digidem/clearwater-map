if (typeof cwm === 'undefined') cwm = {};

cwm.easeHandler = function () {
  
  var eh = {},
      override,
      map,
      easings = [],
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
        start = start || $(window).scrollTop(),
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
  
  eh.getOverrideTime = function () {
    return Math.floor(override.time);
  };

  function setScrollPoints () {
    var wHeight = $(window).height();
  
    // Add the scroll point of each element with an id in location
    // remove items that are not found on the page
    // and sort locations by the scroll point on the page.
    locations = _.chain(locations)
                .map(function (v) {
                  var $el = $("#" + v.id);
                  v.scrollPoint = ($el.length > 0)
                    ? Math.floor($el.offset().top - wHeight + $el.height()) : -1; 
                  // This is terrible but it will do for now.
                  if (v.id === "mapstory") v.scrollPoint = 0;
                  return v;
                })
                .reject(function (v) { return v.scrollPoint < 0; })
                .sortBy('scrollPoint').value();
  }

  function setEasings () {
    var easing, coord, coords, prevCoord, prevScrollPoint;
    // Padding is the space (in pixels) above and below a location
    // when scrolling will pause.
    var padding = 0;
    easings = [];
  
    _.forEach(locations, function (v, i) {
      coord = map.centerFromBounds(v.bounds);
      if (!!prevCoord) {
        easing = mapbox.ease().map(map).from(prevCoord).to(coord)
                  .easing('linear').setOptimalPath();
        // for some reason the first easing is funky, so we drop it...
        coords = _.tail(easing.future(v.scrollPoint - prevScrollPoint + 1 - padding * 2));
        coords = fillArray(_.first(coords),padding).concat(coords);
        coords = coords.concat(fillArray(_.last(coords), padding));
        easings = easings.concat(coords);
      }
      prevCoord = coord;
      prevScrollPoint = v.scrollPoint;
    });
  }

  // This loop uses requestAnimationFrame to check the scroll position and update the map.
  function loop() {
    var y = $(window).scrollTop();
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

  // Fill an array of n length
  function fillArray(val, len) {
    a = [];
    for (var i=0; i<len; i++) {
      a.push(val);
    }
    return a;
  }
  
  return eh;
}
