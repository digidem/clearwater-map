(function () {

	var window = this;

	// The top-level namespace. All public classes and modules will
	// be attached to this.
	var MapStory = window.MapStory = {};
  
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

  // Detect css filter for svg
  // https://github.com/Modernizr/Modernizr/issues/615
  var cssFilter = (function(){
    var prefixes = '-webkit- -moz- -o- -ms-'.split(' ')
      , el = document.createElement('div');
    el.style.cssText = prefixes.join('filter:blur(2px); ');
    return !!el.style.length 
           && ((document.documentMode === undefined || document.documentMode > 9))
           ? el.style.cssText.split(":")[0] : undefined;
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
  var BING_API_KEY = "AnadQ9NziZo9MYVo8394fMtJjPrkZMasNfSqpt5wz4vUMSaATniZnKxvDgxrsrGB";
  
  // Bounds for the initial view of the map (Ecuador)
  var startBounds = [{ lat: -5.2, lon: -81.2 }, { lat: 1.8, lon: -74.9 }]; 
  var PROJECT_BOUNDS = [ [-1.1, -77.7], [0.5, -75.2]];
  
  // Array of locations for each story on the map
  // The first location is for the initial map view
  // it should be attached to the body element which has offset().top = 0
  // TODO change this - not very obvious.
  var storyLocations = [
    { id: 'body', lat: -1.369, lon : -79.717, zoom : 7.8 },
    { id: '#nor-oriente', lat : -0.141, lon : -77.416, zoom : 10 },
    { id: '#cofan-cover', lat : 0.012, lon : -76.763, zoom : 13 }
  ];
  
  // Data sources for overlay and markers (loaded with JSONP)
  var communitiesSql = 'SELECT ST_Simplify(the_geom, 0.0001)' +
                   'AS the_geom, name, nationality ' + 
                   'FROM nationalities';
  var projectAreaSql = 'SELECT ST_Simplify(the_geom, 0.001)' +
                  'AS the_geom, name ' + 
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
      reveals = [],
      lastPosition = -1,
      wHeight = $(window).height(),
      easingOffset,
      meter;

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
    map = mapbox.map('map',null,null,[]).setExtent(startBounds);
    MapStory.map = map;
    
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
      labelLayer.id('gmaclennan.map-y7pgvo15');
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

    var lastResize = 0;
    $(window).resize(function () {
      $('html,body').stop(true);
      if (Date.now() - lastResize > 1000/60) {
        var y = $(window).scrollTop()
        _initReveals("#stories img:not(.nocollapse)");
        _initEasing(map);
        _initLayerDisplay(map);
        _initScrollTos("");
        _reveal(y);
        _ease(y);
        _layerDisplay(y);
      }
    })
    $(window).resize();
    meter = new FPSMeter($("#pane")[0], {left: 'auto', right: '5px', graph: true, smoothing: 1});
    _loop()
    
  };

  //--- End of public functions of MapStory ---//
  
  //--- Private helper functions ---//

  // Sets up easings between each story location on the map
  var _initEasing = function (map) {
    wHeight = $(window).height();
    
    // We actually want easing to pause whilst the images are
    // scrolling into view. The images are 3:2, so height will be
    // the width / 1.5. We need this to be dynamic for responsive design.
    easingOffset = $("#stories").width() / 1.5;
    
    // Loop through each of the locations in our array
    for (var i = 0; i < storyLocations.length; i++) {
      var $el = $(storyLocations[i].id);
      // Populate scroll points of each story in the #stories column
      storyScrollPoints[i] = $el.offset().top - wHeight + $el.height();
      
      var lat = storyLocations[i].lat;
      var lon = storyLocations[i].lon;
      var zoom = storyLocations[i].zoom
      var loc = map.locationCoordinate({ lat: lat, lon: lon }).zoomTo(zoom);
      
      // Setup easings between each story location
      // By default an easing just goes to itself
      easings[i] = mapbox.ease().map(map).from(loc).to(loc).easing('linear');
      
      // One easing's start position is the previous easing's end position
      if (typeof easings[i-1] === 'object') {
        easings[i-1].to(loc);
      }
    }
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
  
  // Set up display and hiding of map layers on scroll
  var _initLayerDisplay = function (map) {
    layerScrollPoints[0] = { 
      start: 0,
      show: 0,
      stop: storyScrollPoints[1] / 2 
    };
    layerScrollPoints[1] = {
      start: storyScrollPoints[1] / 2,
      show: storyScrollPoints[1],
      stop: storyScrollPoints[2] - (storyScrollPoints[2] - storyScrollPoints[1]) / 2
    };
    layerScrollPoints[2] = {
      start: storyScrollPoints[2] - (storyScrollPoints[2] - storyScrollPoints[1]) / 2,
      show: storyScrollPoints[2],
      stop: undefined
    }
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
    communityLayer.draw();
    $(window).resize();
  }
  
  // _onProjectAreaLoad adds geojson returned from the JSONP call to the map
  var _onProjectAreaLoad = function(geojson) {
    projectLayer.data(geojson).draw().addFilters();
    $(window).resize();
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
        img.className = 'marker';
        img.setAttribute('src', 'images/cw-system.png');
        return img;
    })
    $(markerLayer.parent).on("click","img",false,_clickMarkers);
    $(map.parent).on("click",true,_clickMarkers);
  }
  
  var _clickMarkers = function (e) {
    //if (map.getZoom() <= 13 && e.data) return;
    // Ensure that this handler is attached once.
    // Get the point on the map that was double-clicked
    var point = MM.getMousePoint(e, map);
    e.stopPropagation();
    z = (map.getZoom() <= 13) ? 16 : 13;
    if (e.data && z != 13) return;
    mapbox.ease().map(map)
      .to(map.pointCoordinate(MM.getMousePoint(e, map)).zoomTo(z))
      .path("about").run(300, function() {
      map.dispatchCallback('zoomed');
    });
    return MM.cancelEvent(e);
  }
  
  // Continually loop and check for page scroll, calling animations that
  // need to fire when the page scrolls.
  function _loop(){
    var y = $(window).scrollTop();
    
    // Avoid calculations if not needed and just loop again
    if (lastPosition == y) {
      meter.pause();
        _requestAnimation(_loop);
        return false;
    } else lastPosition = y
    meter.resume();
    _ease(y);
    _reveal(y);
    _layerDisplay(y);
    _requestAnimation(_loop);
    meter.tick()
  }

  // Moves the map from one location to the next based on scroll position.
  var _ease = function (scrollTop) {
    
    // On a Mac "bouncy scrolling" you can get -ve scrollTop, not good
    scrollTop = scrollTop >= 0 ? scrollTop : 0;
    
    // Iterate over storyScrollPoints to find the index of the easing we want
    var i = _find(scrollTop, storyScrollPoints);
    
    // Don't do anything if we are beyond the last storyScrollPoint
    if (!i) return;
    
    // 0 < t < 1 represents where we are between two storyScrollPoints    
    var t = (scrollTop - storyScrollPoints[i-1]) / 
            (storyScrollPoints[i] - storyScrollPoints[i-1]);
    
    // Easing function for cubic in and out
    t = t > 1 ? 1 : t<.5 ? 2*t*t : -1+(4-2*t)*t;
    
    // Move the map to the position on the easing path according to t
    easings[i-1].t(t);

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
      if (pos == 'affix') {
        opacity = 1 - (scrollTop - reveals[i].start) / (reveals[i].stop - reveals[i].start);
        reveals[i].$prev.css('opacity', opacity * opacity);
      }
            
      if (reveals[i].lastpos !== pos) {
        if (pos == 'offscreen') {
          reveals[i].$parent.addClass('offscreen');
          reveals[i].$prev.css('opacity', 1);
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
            reveals[i].$prev.css('opacity', 0);
          }
        }
        reveals[i].lastpos = pos;
      }
    }
    
  }
  
  // Smooth scroll to an element on the page when clicking a link
  var _scrollTo = function () {
    event.preventDefault();
    $('html,body').stop(true);
    var scrollSrc = $(window).scrollTop();
    var targetScroll = $(this).data("target-scroll");
    $('htmll,body').animate({scrollTop:targetScroll}
      , Math.round(Math.abs(targetScroll - scrollSrc))* 5);
  }
  
  // Hide or show layers according to scroll position / zoom
  var _layerDisplay = function (scrollTop) {
    var i;
    for (i=0; i<layerScrollPoints.length; i++) {
      var start = layerScrollPoints[i].start
      var show = layerScrollPoints[i].show
      var stop = layerScrollPoints[i].stop
      opacity = (scrollTop < start || scrollTop > stop) && scrollTop >= 0 ? 0
                : (scrollTop <= show ) ? (scrollTop - start) / (show - start)
                : (scrollTop > show) ? 1 - (scrollTop - show) / (stop - show) : 0
      if (layerScrollPoints[i].lastOpacity != opacity && i<3) {
        var layer = map.getLayerAt(i+2);
        if (opacity == 0) layer.disable();
        else {
          layer.enable();
          $(layer.parent).css("opacity", opacity);
        }
        layerScrollPoints[i].lastOpacity = opacity;
      }
    }
  }
  
  // Simple function to iterate over an ascending ordered array and
  // return the index of the first value greater than the search value
  // Returns null if value is outside range in the array.
  var _find = function (val, array) {
    for (var i = 0; i < array.length; i++) {
      if (val < array[i]) return i;
    }
    return null;
  }
  
  // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
  function _sanitize(string) {
    if (typeof(string) != "undefined")
    return string.toLowerCase()
          .replace('http://www.giveclearwater.org/','a-')
          .split(" ").join("-").split("/").join("-");
  }
  
  function d3layer(c) {
      var f = {}, bounds, feature, collection, enabled = true;
      var div = d3.select(document.body)
          .append("div")
          .attr('class', c + " d3-vec"),
          svg = div.append('svg'),
          g = svg.append("g");
      var defs = svg.append("defs");

      // This adds filters to blur the polygons on the layer
      // Can only be added to one layer, otherwise things get strange
      f.addFilters = function () {
        // Blur effect for project area
        var blur = defs.append("filter")
            .attr("id", "blur")
        blur.append("feColorMatrix")
            .attr("in", "SourceAlpha")
            .attr("color-interpolation-filters", "sRGB")
            .attr("type", "matrix")
            .attr("values", "0 0 0 0.9450980392 0  "
                          + "0 0 0 0.7607843137 0  "
                          + "0 0 0 0.1098039216 0  "
                          + "0 0 0 1 0");
        blur.append("feGaussianBlur")
            .attr("stdDeviation", 10)
            .attr("result", "coloredBlur");
        blur.append("feMerge")
            .append("feMergeNode")
            .attr("in", "coloredBlur")

        // Hover effect for project area
        var blurHover = defs.append("filter")
            .attr("id", "blur-hover")
        blurHover.append("feColorMatrix")
            .attr("in", "SourceAlpha")
            .attr("color-interpolation-filters", "sRGB")
            .attr("type", "matrix")
            .attr("values", "0 0 0 0.6705882353 0  "
                          + "0 0 0 0.5450980392 0  "
                          + "0 0 0 0.1176470588 0  "
                          + "0 0 0 1 0");
        blurHover.append("feGaussianBlur")
            .attr("stdDeviation", 10)
            .attr("result", "coloredBlur");
        blurHover.append("feMerge")
            .append("feMergeNode")
            .attr("in", "coloredBlur");
        return f;
      }

      f.parent = div.node();

      f.project = function(x) {
        var point = f.map.locationPoint({ lat: x[1], lon: x[0] });
        return [point.x, point.y];
      };

      var first = true;
      f.draw = function() {
        if (!enabled) return;
        first && svg.attr("width", f.map.dimensions.x)
            .attr("height", f.map.dimensions.y)
            .style("margin-left", "0px")
            .style("margin-top", "0px") && (first = false);

        path = d3.geo.path().projection(f.project);
        if (!!feature) feature.attr("d", path);
        return f;
      };

      f.data = function(x) {
          collection = x;
          bounds = d3.geo.bounds(collection);
          feature = g.selectAll("polygon")
              .data(collection.features)
              .enter().append("a")
              .attr("xlink:href", function(d){ return "#" + _sanitize(d.properties.name); })
              .append("path");
              
          // If we can't control filter and hover events from css, then add javascript event
          // and attach the filter directly to the svg element
          // Currently only WebKit (Safari & Chrome) support SVG filters from CSS
          if (!cssFilter) {
            feature.style("filter", "url(#blur)")
              .on("mouseover", function () {this.style.cssText = "filter: url(#blur-hover);"})
              .on("mouseout", function () {this.style.cssText = "filter: url(#blur);"});
          }
          return f;
      };
      
      f.enable = function() {
        enabled = true;
        div.style("display", "");
        return f;
      }
      
      f.disable = function() {
        enabled = false;
        div.style("display", "none");
        return f;
      }

      f.extent = function() {
          return new MM.Extent(
              new MM.Location(bounds[0][1], bounds[0][0]),
              new MM.Location(bounds[1][1], bounds[1][0]));
      };
      return f;
  };

}).call(this);