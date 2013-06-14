(function () {

	var window = this;

	// The top-level namespace. All public classes and modules will
	// be attached to this.
	var MapStory = window.MapStory = {};
  
  var retina = false; //window.devicePixelRatio >= 2;
  
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
  
  // Data sources for overlay and markers (loaded with JSONP)
  var overlaySQL = 'SELECT ST_Simplify(the_geom, 0.001)' +
                   'AS the_geom, nombre, nacion ' + 
                   'FROM nationalities';
  var markerSQL = 'SELECT * FROM clearwater_well_installations';

  //-- ***************************** --//
  //-- End of customizable variables --//
  //-- ***************************** --//
  
  var communityLayer,
      labelLayer,
      satLayer,
      markerLayer,
      markerGeoJson,
      closeTooltip,
      map,
      stories,
      activeMarker,
      activeSection,
      activeStory;

  //--- Start of public functions of MapStory ---//

  MapStory.init = function (storyContainerId, mapContainerId, baseLayerId) {

    //--- Set up map layer objects ---//
    // composite false is necessary to stop mapbox trying to composite server-side
    satLayer = mapbox.layer().composite(false);
    labelLayer = mapbox.layer();
    communityLayer = d3layer();
    markerLayer = mapbox.markers.layer();
    
    // Set up the map, with no layers and no handlers.
    map = mapbox.map('map',null,null,[]).setExtent(startBounds);
    
    // Add all the map layers to the map, in order (they are empty at this point)
    map.addLayer(satLayer);
    map.addLayer(labelLayer);
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
    _loadData(overlaySQL, _onOverlayLoad);
    _loadData(markerSQL, _onMarkerLoad);
    
    // Load sat tiles from Bing
    // *TODO* Remove need for async function in MM.BingProvider
    var bingProvider = new MM.BingProvider(BING_API_KEY, 'Aerial', function() {
      satLayer.setProvider(bingProvider);
    });
    
    var from = map.locationCoordinate({lat: -0.9348, lon: -78.1392}).zoomTo(7);
    MapStory.ease = map.ease.location({ lat: 0.009, lon: -76.717 }).zoom(13);
    MapStory.ease.from(from);

    window.onscroll = $.throttle(_ease,40);
    
  };
  
  // TODO: remove. Temporary public reference to map object.
  MapStory.map = map;

  //--- End of public functions of MapStory ---//
  
  
  //--- Private helper functions ---//

  // Loads data from external dataSrc via JSONP
  var _loadData = function (sql, callback) {
    $.ajax({
      url: 'http://clearwater.cartodb.com/api/v2/sql',
      data: { q: sql, format: 'geojson' },
      dataType: 'jsonp',
      success: callback
    });
  }
  
  // _onOverlayLoad adds geojson returned from the JSONP call to the map
  // and caches the bounds of each nationality in bounds[]
  var _onOverlayLoad = function(geojson) {
    communityLayer = d3layer().data(geojson);
    map.addLayer(communityLayer);
  }

  // _onMarkerLoad processes the Google JSON returned from the spreadsheet
  // and adds it to the marker layer.
  var _onMarkerLoad = function(geojson) {
    markerLayer.features(geojson.features);
    map.addLayer(markerLayer);
  }

  var _ease = function () {
    // IE 8
    if (window.pageYOffset === undefined) {
      var y = document.documentElement.scrollTop;
      var h = document.documentElement.clientHeight;
    } else {
      var y = window.pageYOffset;
      var h = window.innerHeight;
    }
    t = y%1000/1000;
    MapStory.ease.t(t);
  }

  // Check window position and set active section.
  // *TODO* check if jQuery can replace IE8 specific code.
  var _checkActiveSection = function () {
    // IE 8
    if (window.pageYOffset === undefined) {
      var y = document.documentElement.scrollTop;
      var h = document.documentElement.clientHeight;
    } else {
      var y = window.pageYOffset;
      var h = window.innerHeight;
    }

    // If scrolled to the very top of the page set the first section active.
    if (y === 0) return setActiveSection(0, true);

    // Otherwise, conditionally determine the extent to which page must be
    // scrolled for each section. The first section that matches the current
    // scroll position wins and exits the loop early.
    var memo = 0;
    var buffer = (h * 0.3333);
    var active = _(sections).any(function(el, index) {
      memo += el.offsetHeight;
      return y < (memo-buffer) ? setActiveSection(index, true) : false;
    });

    // If no section was set active the user has scrolled past the last section.
    // Set the last section active.
    if (!active) setActiveSection(sections.length - 1, true);
  }


//  var map = L.mapbox.map('map', 'gmaclennan.map-y7pgvo15', mapOptions).fitBounds(ECUADOR_BOUNDS.padXY(0.33, 0));

//  var bingLayer = new L.BingLayer(BING_API_KEY).addTo(map).bringToBack();




  function mousemoveArea(e) {
    var layer = e.target,
        community = _sanitize(layer.feature.properties.nombre),
        areaIsZoomed = (community == activeArticle);

    popup.setLatLng(e.latlng);
    popup.setContent('<h2>' + layer.feature.properties.nombre + '</h2><p>' +
        layer.feature.properties.nacion + ' nationality<br>' +
        'XXX Clearwater systems installed<br>' +
        'Click to explore this community</p>');

    if (!popup._map && !areaIsZoomed) popup.openOn(map);
    window.clearTimeout(closeTooltip);

    // highlight feature
    layer.setStyle(areaHoverStyle);

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
  }

  function mouseoverMarker(e) {
    var layer = e.target,
        community = _sanitize(layer.feature.properties.nombre),
        areaIsZoomed = (community == activeArticle);

    popup.setLatLng(e.latlng);
    popup.setContent('<h2>' + layer.feature.properties.name + '</h2>' +
        '<img src="' + layer.feature.properties.photo + '"><br>' +
        'Location: ' + layer.feature.properties.location + '</p>');

    if (!popup._map) popup.openOn(map);
    window.clearTimeout(closeTooltip);

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
  }


  function mouseout(e) {
    communityLayer.resetStyle(e.target);
    closeTooltip = window.setTimeout(function() {
        map.closePopup();
    }, 100);
  }

  function zoomToFeature(e) {
    var community = _sanitize(e.target.feature.properties.nombre);
    // If we are already looking at this community, do nothing.
    if (community == activeArticle) return true;
    e.target.off('mousemove', mousemoveArea);
    mouseout(e);
    activeArticle = community;
  
    _(articles).each(function(s) { s.className = s.className.replace(' active', '') });
    articles[1].className += ' active';
    sections = articles[1].getElementsByTagName('section');
    setActiveSection(0);
    window.scrollTo(0,0);
    communityLayer.resetStyle(e.target);
    oms.clearMarkers();
    markerLayer.clearLayers().addData(installationGeoJson);
    map.fitBounds(e.target.getBounds());
  }

  // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
  function _sanitize(string) {
    if (typeof(string) != "undefined")
    return string.toLowerCase()
          .replace('http://www.giveclearwater.org/','a-')
          .split(" ").join("-").split("/").join("-");
  }
  
  function d3layer() {
      var f = {}, bounds, feature, collection;
      var div = d3.select(document.body)
          .append("div")
          .attr('class', 'd3-vec'),
          svg = div.append('svg'),
          g = svg.append("g");
          
      var click = function (d) {
          window.location = "http://amazonwatch.org/work/" + d.properties.name;
      }

      f.parent = div.node();

      f.project = function(x) {
        var point = f.map.locationPoint({ lat: x[1], lon: x[0] });
        return [point.x, point.y];
      };

      var first = true;
      f.draw = function() {
        first && svg.attr("width", f.map.dimensions.x)
            .attr("height", f.map.dimensions.y)
            .style("margin-left", "0px")
            .style("margin-top", "0px") && (first = false);

        path = d3.geo.path().projection(f.project);
        feature.attr("d", path);
      };

      f.data = function(x) {
          collection = x;
          bounds = d3.geo.bounds(collection);
          feature = g.selectAll("path")
              .data(collection.features)
              .enter().append("path")
              .on("click", click);
          return f;
      };

      f.extent = function() {
          return new MM.Extent(
              new MM.Location(bounds[0][1], bounds[0][0]),
              new MM.Location(bounds[1][1], bounds[1][0]));
      };
      return f;
  };


}).call(this);