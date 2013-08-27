;(function () {
  var window = this;

	// The top-level namespace. All public classes and modules will
	// be attached to this.
	var MapStory = this.MapStory = {};
  
  //--- Some feature detection ---//
  
  var retina = false; //window.devicePixelRatio >= 2;
  
  // Detect css transform
  var cssTransform = (function(){
    var prefixes = 'transform webkitTransform mozTransform oTransform msTransform'.split(' ')
      , el = document.createElement('div')
      , cssTransform
      , i = 0;
    while ( cssTransform === undefined ) { 
      cssTransform = document.createElement('div')
                      .style[prefixes[i]] != undefined ? prefixes[i] : undefined;
      i++;
   }
   return cssTransform;
  })();


  // Detect request animation frame
  var _requestAnimation = window.requestAnimationFrame 
                        || window.webkitRequestAnimationFrame
                        || window.mozRequestAnimationFrame
                        || window.msRequestAnimationFrame 
                        || window.oRequestAnimationFrame 
                        || function (callback) { window.setTimeout(callback, 1000/60) };
  
  //-- *************** --//
  //-- Customize below --//
  //-- *************** --//
    
  // Bing Maps API key for satellite layer
  // Register for key at http://...
  // NEEDS CHANGED: is currently only a trial key for 90 days
  var BING_API_KEY = "AqVWiJ79W7khoQS3cEZn9Uuh3czvwSUr3bD2GTCCciGCasSEIaTVba37EAGBjwR6";
  
  // Bounds for the initial view of the map (Ecuador)
  var startBounds = [{ lat: -5.2, lon: -81.2 }, { lat: 1.8, lon: -74.9 }]; 
  var PROJECT_BOUNDS = [ [-1.1, -77.7], [0.5, -75.2]];
  
  // Array of locations for each story on the map
  // The first location is for the initial map view
  // it should be attached to the #map element which has offset().top = 0
  // bounds as [[ lonSouth, latWest], [lonNorth, latEast]] - blame d3 for this order.
  // TODO change this - not very obvious.
  var storyLocations = [
    { id: 'body', bounds: [ [-81.2, -5.2], [-74.9, 1.8] ] }
  ];
  
  // Data sources for overlay and markers (loaded with JSONP)
  var communitiesSql = 'SELECT ST_Simplify(the_geom, 0.0001) AS the_geom, c.community, c.nationality, systems, users FROM communities AS c LEFT JOIN (SELECT COUNT(*) AS systems, SUM(users) AS users, community FROM clearwater_well_installations GROUP BY community) AS cwi ON c.community = cwi.community WHERE active';
  var projectAreaSql = 'SELECT ST_Simplify(the_geom, 0.001)' +
                  'AS the_geom, name AS community ' + 
                  'FROM project_area';
  var markerSql = 'SELECT * FROM clearwater_well_installations';

  //-- ***************************** --//
  //-- End of customizable variables --//
  //-- ***************************** --//
  
  var satLayer,
      labelLayer,
      projectLayer,
      communityLayer,
      markerLayer,
      map,
      storyScrollPoints = [],
      layerScrollPoints = [],
      easings = [],
      easeHandler,
      reveals = [],
      lastPositionR = -1,
      wHeight = $(window).height(),
      mapPadding = {},
      markerBounds = [],
      projectLayerIsLoaded = false,
      communitiesLayerIsLoaded = false;;

  // Overwrite ModestMaps getMousePoint function - it does not like
  // the map in position: fixed and gets confused.
  // *WARNING* this will need modified if the map div has padding/margins
  // This only works when filling the browser window.
  MM.getMousePoint = function(e, map) {
      var point = new MM.Point(e.clientX, e.clientY);
      return point;
  };
  
  //--- Start of public functions of MapStory ---//

  MapStory.init = function (storyContainerId, mapContainerId, baseLayerId) {

    //--- Set up map layer objects ---//
    // composite false is necessary to stop mapbox trying to composite server-side
    satLayer = mapbox.layer().composite(false);
    labelLayer = mapbox.layer();
    communityLayer = d3layer("communities");
    projectLayer = d3layer("project-area");
    markerLayer = mapbox.markers.layer();
    
    // Set up the map, with no layers and no handlers.
    map = mapbox.map('map',null,null, []).setExtent(startBounds).setZoomRange(5,18);
    window.map = map; // export the map variable for debugging
    
    // Override the default MM.extentCoordinate function to add padding
    // so that zooms and eases are centered slightly to the right.
    map.extentCoordinate = _paddedExtentCoordinate;
    
    // Add all the map layers to the map, in order (they are empty at this point)
    map.addLayer(satLayer);
    map.addLayer(labelLayer);
    map.addLayer(projectLayer);
    map.addLayer(communityLayer);
    map.addLayer(markerLayer);

    // Set small tilesize if retina display. Set tilesource according to retina.
    if (retina) {
      map.tileSize = { x: 128, y: 128 };
      labelLayer.id('gmaclennan.map-lb73ione');
    } else {
      labelLayer.id('gmaclennan.clearwater,gmaclennan.map-y7pgvo15');
    }
    
    // Load GeoJSON for polygons and markers from CartoDB
    _loadData(communitiesSql, _onCommunitiesLoad);
    _loadData(markerSql, _onMarkerLoad);
    _loadData(projectAreaSql, _onProjectAreaLoad);
    
    // Load sat tiles from Bing
    // *TODO* Remove need for async function in MM.BingProvider
    var bingProvider = new MM.BingProvider(BING_API_KEY, 'Aerial', function() {
      satLayer.setProvider(bingProvider);
    });
    
    $('#stories').css('height',$('#stories').height());
    window.meter = new FPSMeter($("#pane")[0], {left: 'auto', right: '5px', graph: true, smoothing: 30});
    easeHandler = easeHandler();
    var lastResize = 0;
    $(window).resize(function () {
      $('html,body').stop(true);
      if (Date.now() - lastResize > 1000/60) {
        var y = $(window).scrollTop()
        mapPadding.left = $("#stories").outerWidth(true)
        _initReveals("#stories img:not(.nocollapse)");
        easeHandler.locations(storyLocations).map(map);
        window.eh = easeHandler;
        _initScrollTos("");
        _reveal(y);
      }
    })
    $(window).resize();

    _loopReveal()
    
  };

  //--- End of public functions of MapStory ---//
  

  
  //--- Private helper functions ---//

  var _paddedExtentCoordinate = function (locations, precise) {
    // coerce locations to an array if it's a Extent instance
    if (locations instanceof MM.Extent) {
        locations = locations.toArray();
    }

    var TL, BR;
    for (var i = 0; i < locations.length; i++) {
        var coordinate = this.projection.locationCoordinate(locations[i]);
        if (TL) {
            TL.row = Math.min(TL.row, coordinate.row);
            TL.column = Math.min(TL.column, coordinate.column);
            TL.zoom = Math.min(TL.zoom, coordinate.zoom);
            BR.row = Math.max(BR.row, coordinate.row);
            BR.column = Math.max(BR.column, coordinate.column);
            BR.zoom = Math.max(BR.zoom, coordinate.zoom);
        }
        else {
            TL = coordinate.copy();
            BR = coordinate.copy();
        }
    }

    var width = this.dimensions.x + 1 - mapPadding.left;
    var height = this.dimensions.y + 1;

    // multiplication factor between horizontal span and map width
    var hFactor = (BR.column - TL.column) / (width / this.tileSize.x);

    // multiplication factor expressed as base-2 logarithm, for zoom difference
    var hZoomDiff = Math.log(hFactor) / Math.log(2);

    // possible horizontal zoom to fit geographical extent in map width
    var hPossibleZoom = TL.zoom - (precise ? hZoomDiff : Math.ceil(hZoomDiff));

    // multiplication factor between vertical span and map height
    var vFactor = (BR.row - TL.row) / (height / this.tileSize.y);

    // multiplication factor expressed as base-2 logarithm, for zoom difference
    var vZoomDiff = Math.log(vFactor) / Math.log(2);

    // possible vertical zoom to fit geographical extent in map height
    var vPossibleZoom = TL.zoom - (precise ? vZoomDiff : Math.ceil(vZoomDiff));

    // initial zoom to fit extent vertically and horizontally
    var initZoom = Math.min(hPossibleZoom, vPossibleZoom);

    // additionally, make sure it's not outside the boundaries set by map limits
    initZoom = Math.min(initZoom, this.coordLimits[1].zoom);
    initZoom = Math.max(initZoom, this.coordLimits[0].zoom);

    // coordinate of extent center
    var centerRow = (TL.row + BR.row) / 2;
    var centerColumn = (TL.column + BR.column) / 2;
    var centerZoom = TL.zoom;
    return new MM.Coordinate(centerRow, centerColumn, centerZoom).zoomTo(initZoom - 0.2).left(mapPadding.left / this.tileSize.x / 2);
  }

  // Set up onClick events to scroll the document between anchors
  var _initScrollTos = function () {
    wHeight = $(window).height();
    $("a[href*=#]").each(function () {
      var targetScroll
        , hash = $(this).attr("href").split("#")[1]
        , $target = $("#" + hash);
      if ($target.length == 0) {
        $target = $(this).parents("section").next();
        if ($target.length == 0) $target = $(this).parents("article").next().children().first();
      }
      
      if ($target.length > 0) {
        targetScroll = $target.offset().top - wHeight + $target.height();
      }
      $(this).data("target-scroll", targetScroll).click(_scrollTo);
    });
    $('img.featured').each(function () { // Modified from above for now, should be combined
      var targetScroll
        , hash = $(this).attr("data-link")
        , $target = $("#" + hash);
      if ($target.length == 0) {
        $target = $(this).parents("section").next();
        if ($target.length == 0) $target = $(this).parents("article").next().children().first();
      }
      
      if ($target.length > 0) {
        targetScroll = $target.offset().top - wHeight + $target.height();
      }
      $(this).data("target-scroll", targetScroll).click(_scrollTo);
    });
  }
  
  // Set up collapsing and revealing images as you scroll
  var _initReveals = function (selector) {
    wHeight = $(window).height();
    reveals = [];
    
    $(selector).each(function (i) {
      var $this = $(this)
      var $next = $this.next();
      var $parent = $this.parent();
      if (!$next.hasClass('background')) {
        $next = $this.nextAll().wrapAll('<div class="background" />').parent();
      }
      var $prev = $parent.prev();
      if ($prev.length == 0) $prev = $this.parent().parent().prev()
      var width = $this.width();

      $parent.removeClass('offscreen');
      $this.removeClass('collapsed');
      $next.removeClass('affixed').css('width', width);
      $this.parent().css('min-height', '');

      var offsetTop = $this.offset().top;
      var height = $this.height();
      var nextHeight = $next.height();

      $this.parent().css('min-height', height + nextHeight);

      reveals[i] = { 
        $el: $this,
        $next: $next,
        $prev: $prev,
        $parent: $this.parent(),
        offscreen: offsetTop - wHeight,
        start: offsetTop - wHeight + nextHeight,
        stop: offsetTop - wHeight + nextHeight + height
      }
    })
  }
  
  // Load data from external dataSrc via JSONP
  var _loadData = function (sql, callback) {
    $.ajax({
      url: 'http://clearwater.cartodb.com/api/v2/sql',
      data: { q: sql, format: 'geojson' },
      dataType: 'jsonp',
      success: callback
    });
  }
  
  // _onCommunitiesLoad adds geojson returned from the JSONP call to the map
  // and caches the bounds of each nationality in bounds[]
  var _onCommunitiesLoad = function(geojson) {
    communityLayer.data(geojson);
    storyLocations = storyLocations.concat(communityLayer.getLocations());
    communityLayer.draw();
    _.forEach(geojson.features, function (v) {
      var systemsSel = "#" + _sanitize(v.properties.community) + " .systems";
      var usersSel = "#" + _sanitize(v.properties.community) + " .users";
      // console.log(systemsSel, usersSel);
      $(systemsSel).text(v.properties.systems);
      $(usersSel).text(v.properties.users);
    });
    $(window).resize();
    $('#communities a').hover(_enterCommunity,_leaveCommunity);

    if (projectLayerIsLoaded) easeHandler.enable();
    communitiesLayerIsLoaded = true
  }
  
  // _onProjectAreaLoad adds geojson returned from the JSONP call to the map
  var _onProjectAreaLoad = function(geojson) {
    projectLayer.data(geojson).draw().addFilters();
    storyLocations = storyLocations.concat(projectLayer.getLocations());
    $(window).resize();
    if (communitiesLayerIsLoaded) easeHandler.enable();
    projectLayerIsLoaded = true
  }

  // _onMarkerLoad processes the Google JSON returned from the spreadsheet
  // and adds it to the marker layer.
  var _onMarkerLoad = function(geojson) {
    markerLayer.features(geojson.features);
    var interaction = mapbox.markers.interaction(markerLayer);
    // Set a custom formatter for tooltips
    // Provide a function that returns html to be used in tooltip
    interaction.formatter(function(feature) {
        var o = '<img src="' + feature.properties.photo + '">' +
                '<p>' + feature.properties.name + '</p>';
        return o;
    });
    markerLayer.factory(function(f) {
    // Define a new factory function. This takes a GeoJSON object
    // as its input and returns an element - in this case an image -
    // that represents the point.
        var img = document.createElement('img');
        img.className = (f.properties.featured) ? 'featured marker' : 'marker';
        var src = (f.properties.featured) ? "images/cw-story.png" : "images/cw-system.png"
        img.setAttribute('src', src);
        $.data(img,'id',_sanitize(f.properties.community));
        if (f.properties.featured) { img.setAttribute('data-link',_sanitize(f.properties.featured_url)); }
        return img;
    })
    //preloadImages(geojson);
    storyLocations = storyLocations.concat(getMarkerLocations(geojson));
    markerBounds = _calculateMarkerBounds(geojson);
    $(window).resize();
    //Set up click events on the layer and parent
    $(markerLayer.parent).on("click","img",_clickMarkers);
    $(map.parent).on("click",_clickMarkers);
  }
  
  function getMarkerLocations (geojson) {
    locations = []
    _.forEach(geojson.features, function (v) {
      if (v.properties.featured) {
        var bounds = [[],[]];
        var id = _sanitize(v.properties.featured_url);
        bounds[0][0] = bounds[1][0] = v.geometry.coordinates[0];
        bounds[0][1] = bounds[1][1] = v.geometry.coordinates[1];
        locations.push({id: id, bounds: bounds});
      }
    })
    return locations;
  }
  
  var _calculateMarkerBounds = function (geojson) {
    var b = {};
    for (var i=0; i < geojson.features.length; i++) {
      var f = geojson.features[i];
      var id = _sanitize(f.properties.community);
      var x = f.geometry.coordinates[0];
      var y = f.geometry.coordinates[1];
      b[id] = b[id] || {};
      b[id].bounds = b[id].bounds || [[],[]];
      b[id].bounds[0][0] = (b[id].bounds[0][0] < x) ? b[id].bounds[0][0] : x;
      b[id].bounds[0][1] = (b[id].bounds[0][1] < y) ? b[id].bounds[0][1] : y;
      b[id].bounds[1][0] = (b[id].bounds[1][0] > x) ? b[id].bounds[1][0] : x;
      b[id].bounds[1][1] = (b[id].bounds[1][1] > y) ? b[id].bounds[1][1] : y;
      b[id].loc = _centerFromBounds(b[id].bounds);
    }
    return b;
  }
  
  var easeBack;
  var _clickMarkers = function (e) {
    var id = $.data(this,'id');
    var maxZoom = 18;
    var z = map.getZoom()
    var position = $(this).position();
    var markerClicked = this.nodeName == 'IMG';
    
    e.stopPropagation();
    var point = new MM.Point(position.left, position.top);
    // If the click is not on a marker, then we only want to continue
    // if we are already zoomed in to max, and we want to return.
    if (z < maxZoom && !markerClicked) return MM.cancelEvent(e);

    var to = map.pointCoordinate(point).zoomTo(maxZoom)
             .left(mapPadding.left / map.tileSize.x / 2);
    var backTo = (!!markerBounds[id]) ? markerBounds[id].loc : map.coordinate.copy()
    if (z < maxZoom) {
      if (!easeBack) easeBack = mapbox.ease().map(map).to(backTo).from(to);
      map.ease.to(to).optimal(0.9);
      easeHandler.setOverride(to);
    } else if (markerClicked) {
      easeBack.from(to);
      map.ease.to(to).optimal(0.9);
      easeHandler.setOverride(to);
    } else {
      easeBack.optimal(0.9, 1.42, function() { easeBack = undefined; });
      easeHandler.setOverride(easeBack.to());
    }
    return MM.cancelEvent(e);
  }

  var _enterCommunity = function (e) {
    var label = $(this).data('label');
    var pos = $(this).position();
    $('#label').text(label).css('top',pos.top - 40).css('left',pos.left).fadeIn(100);
  }
  var _leaveCommunity = function (e) {
    $('#label').fadeOut(100);
  }
  
  // Get the map center point for a given bounds
  function _centerFromBounds (b) {
    var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
    return map.extentCoordinate(extent, true);
  }
  
  // Continually loop and check for page scroll, calling animations that
  // need to fire when the page scrolls.
  function _loopReveal(){
    var y = $(window).scrollTop();
    
    // Avoid calculations if not needed and just loop again
    if (lastPositionR == y) {
        _requestAnimation(_loopReveal);
        return false;
    } else lastPositionR = y
    _reveal(y);
    _requestAnimation(_loopReveal);
  }

  // Checks scroll position and reveals images as you scroll
  var _reveal = function (scrollTop) {
    var i;
    for (i=0; i<reveals.length; i++) {
      pos = (scrollTop <= reveals[i].offscreen) ? 'offscreen' :
            (scrollTop < reveals[i].start) ? 'before' :
            (scrollTop >= reveals[i].start && scrollTop < reveals[i].stop) ? 'affix' :
            'after';
      var opacity = 1;

        if (scrollTop <=  reveals[i].start) {
          reveals[i].$prev.removeClass('faded');
        } else {
          reveals[i].$prev.addClass('faded');
        }

      if (reveals[i].lastpos !== pos) {
        if (pos == 'offscreen') {
          reveals[i].$parent.addClass('offscreen');
        } else {
          reveals[i].$parent.removeClass('offscreen');
          if (pos == 'affix') {
            reveals[i].$el.addClass('collapsed');
            reveals[i].$next.addClass('affixed');
          } else if (pos == 'before') {
            reveals[i].$el.addClass('collapsed');
            reveals[i].$next.removeClass('affixed');
          } else if (pos == 'after') {
            reveals[i].$el.removeClass('collapsed');
            reveals[i].$next.removeClass('affixed');
          }
        }
        reveals[i].lastpos = pos;
      }
    }
    
  }
  
  // Smooth scroll to an element on the page when clicking a link
  function _scrollTo (e) {
    var t;
    event.preventDefault();
    if (map.getZoom() > 12 && this.parentNode.nodeName == 'g') return;
    $('html,body').stop(true);
    var scrollSrc = $(window).scrollTop();
    var targetScroll = $(this).data("target-scroll");
    
    if (Math.abs(targetScroll - scrollSrc) > 1500) {
      easeHandler.setOverride(null, null, Math.min(targetScroll, scrollSrc), Math.max(targetScroll, scrollSrc));
      t = easeHandler.getOverrideTime();
    } else {
      t = Math.round(Math.abs(targetScroll - scrollSrc))* 4;
    }
    $('html,body').animate({scrollTop:targetScroll}, t);
  }
  
  // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
  function _sanitize(string) {
    if (typeof string != "undefined" && string !== null)
    return string.toLowerCase()
          .replace('http://www.giveclearwater.org/','a-')
          .split(" ").join("-").split("/").join("-");
  }
  
  function preloadImages(geojson) {
    _.forEach(geojson.features, function (v) {
      var img = new Image();
      img.src = v.properties.photo;
    });
  }

  function easeHandler() {
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
    }

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
    }

    eh.getCoord = function (scrollTop) {
      scrollTop = Math.max(scrollTop, 0);
      return easings[scrollTop] || _.last(easings);
    }

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
    }
    
    eh.getOverrideTime = function () {
      return Math.floor(override.time);
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
                      ? Math.floor($el.offset().top - wHeight + $el.height()) : -1;
                      return v;
                    })
                  .reject(function (v) { return v.scrollPoint < 0; })
                  .sortBy('scrollPoint').value();
    }
  
    function setEasings () {
      var easing, coord, coords, prevCoord, prevScrollPoint;
      // Padding is the space (in pixels) above and below a location
      // when scrolling will pause.
      var padding = 75;
      easings = [];
    
      _.forEach(locations, function (v, i) {
        coord = centerFromBounds(v.bounds);
        if (!!prevCoord) {
          easing = mapbox.ease().map(map).from(prevCoord).to(coord)
                    .easing('linear').setOptimalPath();
          // for some reason the first easing is funky, so we drop it...
          coords = _.tail(easing.future(v.scrollPoint - prevScrollPoint + 1 - padding * 2))
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
      meter.tick()
      if (!enabled) return false;
      // Avoid calculations if not needed and just loop again
      if (lastScroll == y) {
          _requestAnimation(loop);
          return false;
      } else lastScroll = y
      eh.easeTo(y);
      _requestAnimation(loop);
    }

    // Fill an array of n length
    function fillArray(val, len) {
      a = [];
      for (var i=0; i<len; i++) {
        a.push(val)
      }
      return a;
    }
    
    // Get the map center point for a given bounds
    function centerFromBounds (b) {
      var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
      return map.extentCoordinate(extent, true);
    }
    
    return eh;
  }

}).call(this);