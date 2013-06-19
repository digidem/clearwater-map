// Ease handler
;(function() {
  var easeHandler = function () {
    var eh = {},
        override,
        map,
        scrollPoints = [],
        easing,
        easings,
        locations,
        lastScroll,
        enabled = false;

    // Detect request animation frame
    var requestAnimation = window.requestAnimationFrame 
                          || window.webkitRequestAnimationFrame
                          || window.mozRequestAnimationFrame
                          || window.msRequestAnimationFrame 
                          || window.oRequestAnimationFrame 
                          || function (callback) { window.setTimeout(callback, 1000/60) };

    if (!mapbox.ease) throw 'Mapbox easey library not found';

    // Expects a mapbox v.0.6.x map object (ModestMaps)
    eh.map = function (m) {
      map = m;
      return eh;
    }
    eh.getEase = function () {return easing;}
    // Locations is an array of objects with an id referring to an element id
    // and bounds, an array of two LatLon arrays, south-west, north-east
    // e.g. { id: 'elementid', bounds: [ [0, 0], [100, 100] ] }
    eh.locations = function (l) {
      if (!arguments.length) return locations;      
      locations = l;
      setScrollPoints();
      if (!!map) setEasings()
      return eh;
    }
  
    eh.enable = function () {
      if (enabled) return eh;
      if (!locations || !map) throw "Map and locations need to be set";
      if (!easings) setEasings();
      enabled = true;
      loop(this);
      return eh;
    }
  
    // Moves the map to the location corresponding to the current scroll position.
    // Returns false if there is no easing for this location.
    eh.easeTo = function (scrollTop) {
      var i, t;

      // On a Mac "bouncy scrolling" you can get -ve scrollTop, not good
      scrollTop = Math.max(scrollTop,0);

      // Check if there is an override easingHandler for this location
      if (!!override) override = override.easeTo(scrollTop);
      if (!!override) return eh;
    
      t = calculateT(scrollTop);
      if (typeof t == 'undefined') return undefined;
      console.log(t);
      // Move the map to the position on the easing path according to t
      easing.t(t);
      return eh;
    }
  
    // Sets an override easing function if the user has moved the map from the
    // pre-defined easing path, or if we need to move quickly between two 
    // points far apart on the page without moving through the intermediary steps 
    eh.setOverride = function (from,start,top,bottom) {
      var t, ease1, ease2,
          from = from || map.coordinate.copy(),
          start = start || $(window).scrollTop(),
          top = Math.max(top || start - 200, 0);
          bottom = bottom || start + 200,
          buffer = 100;
  
      // If there are scroll points within the buffer, use them as top and bottom
      top = _.find(scrollPoints, withinBuffer, { buf: buffer, val: top }) || top;
      bottom = _.find(scrollPoints, withinBuffer, { buf: buffer, val: top }) || bottom;
    
      t = calculateT(top);
      topLoc = easing.getCoordinate(t);
      t = calculateT(bottom);
      bottomLoc = easing.getCoordinate(t);
      ease1 = mapbox.ease().map(map).from(topLoc).to(from).setOptimalPath();
      ease2 = mapbox.ease().map(map).from(from).to(bottomLoc).setOptimalPath();
      override = easeHandler().setScrollPoints([top, start, bottom]).setEasings([ ease1, ease2 ]);
      return eh;
    }
  
    eh.setScrollPoints = function (x) {
      scrollPoints = x;
      return eh;
    }
  
    eh.setEasings = function (x) {
      easings = x;
      return eh;
    }
  
    function setScrollPoints () {
      var wHeight = $(window).height();
    
      // Add the scroll point of each element with an id in location
      // remove items that are not found on the page
      // and sort locations by the scroll point on the page.
      locations = _.chain(locations)
                  .map(function (v) {
                    var $el = $("#" + v.id);
                    v.scrollPoint = ($el.length > 0) 
                      ? $el.offset().top - wHeight + $el.height() : -1;
                      return v;
                    })
                  .reject(function (v) { return v.scrollPoint < 0; })
                  .sortBy('scrollPoint').value();
    
      // Get sorted list of scroll points
      scrollPoints = _(locations).pluck('scrollPoint');
    }
  
    function setEasings () {
      easings = [];
    
      _.forEach(locations, function (v, i) {
        var loc = centerFromBounds(v.bounds);
      
        // Setup easings between each story location
        // By default an easing just goes to itself
        easings[i] = mapbox.ease().map(map).from(loc).to(loc).easing('linear');
      
        // One easing's start position is the previous easing's end position
        if (typeof easings[i-1] === 'object') easings[i-1].to(loc).setOptimalPath();
      });
    }

    // This loop uses requestAnimationFrame to check the scroll position and update the map.
    function loop() {
      var y = $(window).scrollTop();
      meter.tick()
      if (!enabled) return false;
      // Avoid calculations if not needed and just loop again
      if (lastScroll == y) {
          requestAnimation(loop);
          return false;
      } else lastScroll = y
      eh.easeTo(y);
      requestAnimation(loop);
    }

    // calculate the value of t (position in easing) at a given scroll and index.
    function calculateT (scrollTop) {
      var i, previousScrollPoint, nextScrollPoint;

      // Get the index of the next scroll point after current scroll location
      i = _.sortedIndex(scrollPoints, scrollTop);
      easing = easings[i-1];
    
      // If we are outside the range of scroll points, return undefined
      if (i == 0 || i > scrollPoints.length) return undefined
    
      previousScrollPoint = scrollPoints[i-1];
      nextScrollPoint = scrollPoints[i];

      // 0 < t < 1 represents where we are between two storyScrollPoints    
      return (scrollTop - previousScrollPoint) / 
              (nextScrollPoint - previousScrollPoint);
    }
  
    // Get the map center point for a given bounds
    function centerFromBounds (b) {
      var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
      return map.extentCoordinate(extent, true);
    }

    // Search function to check whether a value (v) is within a buffer distance
    // (buf) of value (val). Used for find over the scrollPoints array
    function withinBuffer (v) {
      return (Math.abs(this.val - v) < this.buf);
    }
    
    return eh;
  }
  
  if (typeof this.MapStory == 'undefined') this.MapStory = {};
  this.MapStory.easeHandler = easeHandler;

})(this);