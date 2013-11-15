if (typeof cwm === 'undefined') cwm = {};

cwm.map = function (mapId, startBounds, options) {
  
  var projectLayer = cwm.d3Layer("project-area").loadData(options.projectUrl, onLoad).addFilters(),
      communityLayer = cwm.d3Layer("communities").loadData(options.communityUrl, onLoad),
      installationLayer = cwm.markerLayer().loadData(options.installationUrl, onLoad),
      lastResize = 0,
      stories,
      paddingLeft = options.padding || 0;
      
  var map = new MM.Map(
    mapId,
    [
      cwm.bingLayer({ apiKey: options.bingApiKey }),
      mapbox.layer().id(options.mapboxId),
      projectLayer,
      communityLayer,
      installationLayer
    ],
    null,
    [ easey_handlers.DragHandler() ]
  ).setExtent(startBounds, false, paddingLeft).setZoomRange(3,18);
  
  map.ease = mapbox.ease().map(map);
  
  // The easeHandler is what moves the map according to the scroll position
  map.easeHandler = cwm.easeHandler().map(map);
  
  map.stories = function (s) {
    stories = s;
    return map;
  }
  
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
    if (projectLayer.geojson &&
        communityLayer.geojson &&
        installationLayer.features().length > 0) {
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
  var locations = [{ id: 'ecuador', bounds: [ [ startBounds[0].lon, startBounds[0].lat],
                                              [ startBounds[1].lon, startBounds[1].lat] ] }];
  function setLocations () {
    locations = locations.concat([{ id: "overview", bounds: communityLayer.bounds }])
                         .concat(communityLayer.getLocations("community"))
                         .concat(installationLayer.getStoryLocations("featured"));
  }
  
  function setupScrolling () {
    
    d3.selectAll('#' + mapId + ' a').on('click', function (d, i) {
      if (typeof stories === 'undefined') return;
      stories.scrollTo(this.getAttribute("href").split("#")[1]);
    });
    d3.selectAll('#markers img').on('click', function (d, i) {
      var link = this.getAttribute("data-link");
      
      if (link) {
        stories.scrollTo(link);
      } else {
        zoomToPoint();
      }
      
      function zoomToPoint () {
        var z = 18
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