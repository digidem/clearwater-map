cwm.Map = function (mapId, options) {
  
  var lastResize = 0,
      stories,
      paddingLeft = options.padding || 0;

  var layerDiv = cwm.render.LayerContainer("layers");

  var markerLayer = cwm.layers.MarkerLayer(layerDiv, "markers");
  var featureLayer = cwm.layers.FeatureLayer(layerDiv, "features");
      
  var map = new MM.Map(
    mapId,
    [
      cwm.layers.BingLayer({ apiKey: options.bingApiKey }),
      mapbox.layer().id(options.mapboxId),
      featureLayer,
      markerLayer
    ],
    null,
    [ cwm.handlers.DragHandler() ]
  ).setExtent(options.startBounds, false, paddingLeft).setZoomRange(3,18);
  
  featureLayer.add(cwm.data.ecuador, { id: "ecuador", maxZoom: 7 })
      .load(options.communityUrl, { id: "communities", maxZoom: 13 }, onLoad);
      
  markerLayer.load(options.installationUrl, { minZoom: 13 },onLoad);
  
  map.ease = mapbox.ease().map(map);
  
  // The easeHandler is what moves the map according to the scroll position
  map.easeHandler = cwm.handlers.EaseHandler().map(map);
  
  map.stories = function (s) {
    stories = s;
    return map;
  };
  
  map.addCallback("panned", function(map, panOffset) {
    map.easeHandler.setOverride();
  });
  
  window.onresize = function () {
    $('html,body').stop(true);
    if (Date.now() - lastResize > 1000/30) {
      refresh();
    }
    lastResize = Date.now();
  };

  // Check all the layers have loaded and set the locations
  // of any places that the map should navigate to
  function onLoad () {
    if (featureLayer.bounds.communities && markerLayer.bounds) {
      setLocations();
      setupScrolling();
      refresh();
    }
  }

  /*
   * Create an array of locations that have a story or information:
   * (1) The starting extent of the map (`ecuador`)
   * (2) The extent of all communities on the map (`overview`)
   * (3) The extent of each community in the communities layer
   * (4) The location of each story in the installations layer
   */
  var locations = [{ id: 'ecuador', bounds: cwm.util.d3Bounds(options.startBounds) }];
  function setLocations () {
    var storyLocations = markerLayer.getLocations(
      function (d) { return cwm.util.sanitize(d.properties.featured_url); },
      function (d) { return d.properties.featured && true; }
    );
    
    locations = locations.concat([{ id: "overview", bounds: featureLayer.bounds.communities }])
        .concat(featureLayer.getLocations("community"))
        .concat(storyLocations);
  }
  
  function setupScrolling () {
    
    d3.selectAll('#' + mapId + ' a').on('click', function (d, i) {
      if (typeof stories === 'undefined') return;
      stories.scrollTo(this.getAttribute("href").split("#")[1]);
    });
    
    d3.selectAll('.markers circle').on('click', function (d, i) {
      if (d3.event.defaultPrevented) return;
      var link = this.getAttribute("data-link");
      
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
          map.easeHandler.setOverride();
        });
      }
    });
  }
  
  function refresh () {
    // padding accounts for space taken up by the stories
    map.paddingLeft = paddingLeft;
    map.easeHandler.locations(locations).enable();
  }
  
  return map;
};