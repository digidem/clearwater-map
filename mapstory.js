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
    var overlaySrc = {
        url: 'http://clearwater.cartodb.com/api/v2/sql',
        params: {
          q: 'SELECT ST_Simplify(the_geom, 0.001) AS the_geom, nombre, nacion ' + 
              'FROM nationalities',
          format: 'geoJSON'
        }};

    var markerSrc = {
        url: 'https://spreadsheets.google.com/feeds/list/' + 
                '0AtH_pDdto56YdGwzVU5Mb0F0QjY1WklqYzhtRjJ2d3c' + // Workbook key
                '/od6/' +                                        // Sheet key in spreadsheet
                'public/values',
        params: {
          alt: 'json-in-script'
        }};

    var StorySteps = {
        '#ecuador' : {
            latitude : -1.703,
            longitude : -78.050,
            zoom : 7
        },
        '#nor-oriente' : {
            latitude : -0.109,
            longitude : -76.833,
            zoom : 10
        },
        '#cofan-cover' : {
            latitude : 0.009,
            longitude : -76.717,
            zoom : 13
        }
    },
    scrollMarkers = {},
    currentHeader = '';
    
  //-- ***************************** --//
  //-- End of customizable variables --//
  //-- ***************************** --//
  
  var communityLayer,
      labelLayer,
      satLayer,
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
    labelLayer = mapbox.layer().id('gmaclennan.map-y7pgvo15');
    MapStory.map = map = mapbox.map('map',null,null,[]).setExtent(startBounds);
    
    if (retina) {
      map.tileSize = { x: 128, y: 128 };
      labelLayer = mapbox.layer().id('gmaclennan.map-lb73ione');
    }
    
    map.addLayer(labelLayer);
    
    var bingProvider = new MM.BingProvider(BING_API_KEY, 'Aerial', function() {
        
        // Initialize map, base layer (from Mapbox), and satellite layer (from Bing)
        satLayer = new MM.Layer(bingProvider);
        map.insertLayerAt(0,satLayer);
        _loadData(overlaySrc, _onOverlayLoad);
        
        // Make a initial location
        var to, from, stepCount = 0;
        for (var header in StorySteps) {
            if (StorySteps.hasOwnProperty(header)) {
                stepCount += 1;
                StorySteps[header].location = map.locationCoordinate({lat: StorySteps[header].latitude, lon: StorySteps[header].longitude}).zoomTo(StorySteps[header].zoom);
                if (stepCount === 1) {
                    currentHeader = header;
                    from = StorySteps[header].location;
                } else if (stepCount === 2) {
                    to = StorySteps[header].location;
                }
                scrollMarkers[parseInt($(header).offset().top)] = header;
                console.log(scrollMarkers);
            }
        }
        console.log(scrollMarkers);
        MapStory.ease = map.ease.to(to);
        MapStory.ease.from(from);
    });
      
    
//    map.fitBounds(startBounds);
    
    // add all the layers to the map...
    
    // Array of story article elements (overview, and one for each community).
    stories = $('article');
//    MapStory.setActiveStory('overview');
    
    // Load data into community and installations layer...
    
//    _loadData(markerSrc, _onMarkerLoad);
        
    // Check active section whenever the window scrolls
    window.onscroll = $.throttle(_ease,40);
    
  };
  
  MapStory.setActiveStory = function (storyId) {
    stories.removeClass('active');
    activeStory = stories.find('#' + storyId).addClass('active');
  }
  
  MapStory.setActiveSection = function (sectionId) {
    // set the class of the active section to 'active'
    activeStory.children().removeClass('active');
    activeSection = activeStory.find('#' + sectionId)
    activeSection.id = sectionId;
    activeSection.addClass('active');

    // Set a body class for the active section.
    document.body.className = activeArticle + '-section-' + sectionId;
    
    // Different behaviours depending on whether we are in 'overview' view
    // or zoomed into a particular community looking at featured stories.
    if (activeStory.id == 'overview') {
      // Reset the style on each layer according to the active section
      communityLayer.eachLayer( function (layer) {
        communityLayer.resetStyle(layer);
      })
      // Zoom map to the bounds of all communities in current section.
      map.options.maxZoom = 11;
      map.fitBounds(getBounds(sectionId));
      map.options.maxZoom = undefined;
    } else {
      // Reset the style of the previous active marker
      activeMarker.setZIndexOffset(0);
      activeMarker.setIcon(defaultIcon);
      markerLayer.eachLayer( function (layer) {
        var storyId = _sanitize(layer.feature.properties.storylink);
        // Search for the marker which has an id matching the active section
        if (storyId == activeSection.id && activeSection.id != "") {
          activeMarker = layer;
          // Zoom to active marker and change the icon to indicate it is active
          map.setView(activeMarker.getLatLng(), 15);
          activeMarker.setZIndexOffset(250);
          activeMarker.setIcon(activeIcon);
        }
      });
    }
  };
  
  //--- End of public functions of MapStory ---//
  
  
  
  //--- Private helper functions ---//

  // Loads data from external dataSrc via JSONP
  var _loadData = function (dataSrc, callback) {
    $.ajax({
      url: dataSrc.url,
      data: dataSrc.params,
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
  var _onMarkerLoad = function(googlejson) {
    markerGeoJson = googledocs2geojson(googlejson);
    markerLayer.addData(markerGeoJson);
  }

    var _ease = function () {
        var location, 
            belowme = 100000, // something ridiculously high
            aboveme = 0,
            y = $(window).scrollTop();
        console.log("My current location is " + y);
        // find the closest locations above and below me
        for (location in scrollMarkers) {
            if (scrollMarkers.hasOwnProperty(location)) {
                // is it further down the page than me?
                if (location > y) {
                    // is it closer to me than the last one?
                    if (location - y < belowme - y) {
                        belowme = location;
                    }
                }
                // is it higher up the page than me?
                if (location < y) {
                    // is it closer to me than the last one?
                    if (location - y > aboveme - y) {
                        aboveme = location;
                    }
                }
            }
        }
        
        if (scrollMarkers[aboveme] !== currentHeader) {
            console.log('Setting A New Header - ' + scrollMarkers[aboveme]);
            currentHeader = scrollMarkers[aboveme];
            MapStory.ease = map.ease.to(StorySteps[scrollMarkers[belowme]].location);
            MapStory.ease.from(StorySteps[scrollMarkers[aboveme]].location);
        }
        console.log(y + " is between " + aboveme + " and " + belowme);
        console.log("I am at " + scrollMarkers[aboveme]);
        t = (y-aboveme)/(belowme - aboveme);
        MapStory.ease.t(t);
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