cwm.Map = function (mapId, options) {
  
  var lastResize = 0,
      stories,
      paddingLeft = options.padding || 0;
  
  var layerDiv = cwm.render.LayerContainer("layers");

  var markerLayer = cwm.layers.MarkerLayer(layerDiv, "markers");
  var featureLayer = cwm.layers.FeatureLayer(layerDiv, "features");
  var bingLayer = cwm.layers.BingLayer({ apiKey: options.bingApiKey });
  var map = new MM.Map(
    mapId,
    [
      bingLayer,
      cwm.layers.MapboxLayer(bingLayer.parent).id(options.mapboxId),
      markerLayer,
      featureLayer
    ],
    null,
    [ cwm.handlers.DragHandler() ]
  ).setExtent(options.startBounds, false, paddingLeft).setZoomRange(3,18);
  
  var mapContainer = d3.select(map.parent);
  
  featureLayer.add(cwm.data.ecuador, { 
    id: "ecuador", 
    maxZoom: 7,
    scrollTo: function () { return "project-overview"; }
  });
  
  featureLayer.add(cwm.data.communities.asGeoJSON(), { 
    id: "communities", 
    maxZoom: 12.5,
    scrollTo: function (d) { return cwm.util.sanitize(d.properties.community); }
  });
      
  markerLayer.add(cwm.data.installations.asGeoJSON(), { minZoom: 12.5 });

  var locations = [{ id: 'ecuador', bounds: cwm.util.d3Bounds(options.startBounds) }];

  map.ease = mapbox.ease().map(map);
  
  // The flightHandler is what moves the map according to the scroll position
  map.flightHandler = cwm.handlers.FlightHandler().map(map);
  
  map.stories = function (s) {
    stories = s;
    return map;
  };
  
  window.onresize = function () {
    $('html,body').stop(true);
    if (Date.now() - lastResize > 1000/30) {
      refresh();
    }
    lastResize = Date.now();
  };



  // Check all the layers have loaded and set the locations
  // of any places that the map should navigate to
  map.onLoad = function() {
    if (featureLayer.bounds.communities && markerLayer.bounds) {
      setLocations();
      setupScrolling();
      refresh();
    }
    d3.select(map.parent).on("click", function () {
      var z = 18;
      if (d3.event.defaultPrevented) return;
      if (mapContainer.classed("markers-shown")) {
        var location = map.pointLocation(new MM.Point(d3.event.x, d3.event.y));
        var d = markerLayer.closest(location);
        var b = markerLayer.getBounds(function (e) { return e.properties.community === d.properties.community; });
        var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
        var coord = map.extentCoordinate(extent, true);
        // Do not zoom in quite all the way
        if (coord.zoom > z-2) coord = coord.zoomTo(z-2);
        
        map.flightHandler.pause();
        var endY = map.s.scrollTo(cwm.util.sanitize(d.properties.community) + "-overview", function () {
          map.flightHandler.resume();
        });
        if (endY !== cwm.scrollHandler.currentScroll() || map.getZoom() >= z) {
          map.ease.to(coord).path("screen").setOptimalPath().run(1500, function () {
            map.flightHandler.setOverride();
          });
          mapContainer.classed("zoomed-in", false);
        } else {
          var point = new MM.Point(d3.event.x, d3.event.y);
          var to = map.pointCoordinate(point).zoomTo(z);
          map.ease.to(to).path('about').run(500, function () {
            map.flightHandler.setOverride();
          });
          mapContainer.classed("zoomed-in", true);
        }
      }
    });
  }

  /*
   * Create an array of locations that have a story or information:
   * (1) The starting extent of the map (`ecuador`)
   * (2) The extent of all communities on the map (`overview`)
   * (3) The extent of each community in the communities layer
   * (4) The location of each story in the installations layer
   */
  function setLocations () {
    var storyLocations = markerLayer.getLocations(
      function (d) { return cwm.util.sanitize(d.properties.story_url); },
      function (d) { return d.properties.featured && true; }
    );
    var overviewLocations = markerLayer.getOverviewLocations(
      function (d) { return cwm.util.sanitize(d) + "-overview"; },
      function (d) { return d.properties.community; }
    );
    locations = locations.concat([{ id: "project-overview", bounds: featureLayer.bounds.communities }])
        .concat(featureLayer.getLocations("nationality"))
        .concat(overviewLocations)
        .concat(storyLocations);
  }
  
  function setupScrolling () {
    
    d3.selectAll('#' + mapId + ' a').on('click', function () {
      if (typeof stories === 'undefined') return;
      stories.scrollTo(this.getAttribute("href").split("#")[1]);
    });
    
    d3.selectAll('.markers circle').on('click', function (d) {
      if (d3.event.defaultPrevented) return;
      var link = cwm.util.sanitize(d.properties.story_url);
      
      if (link) {
        stories.scrollTo(link);
      } else {
        zoomToPoint();
      }
      
      function zoomToPoint () {
        var z = 18;
        var point = new MM.Point(d3.event.clientX, d3.event.clientY);
        var to = map.pointCoordinate(point).zoomTo(z);
        map.ease.to(to).path('about').run(500, function () {
          map.flightHandler.setOverride();
        });
      }
    });
  }
  
  function refresh () {
    // padding accounts for space taken up by the stories
    map.paddingLeft = paddingLeft;
    map.flightHandler.locations(locations).enable();
  }
  
  return map;
};