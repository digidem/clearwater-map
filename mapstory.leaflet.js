// Layer and marker initialization for Leaflet

// Bounds for the initial view of the map
var startBounds = new L.LatLngBounds([ [-5.2, -81.2], [1.8, -74.9] ]); // Ecuador

// Map options
var mapOptions = {
        dragging: false,        // Disable dragging map with mouse (slippy map)
        touchZoom: false,       // Disable zoom on touch/tap
        scrollWheelZoom: false, // Disable zoom with scroll wheel / two-finger scroll
        doubleClickZoom: false, // Disable zoom on double-click
        boxZoom: false,         // Disable shift-drag to zoom into an area
        keyboard: false,        // Disable keyboard navigation
        zoomControl: false      // Do not display zoom controls on the map
      };

// Styling for communities layer
var areaDefaultStyle = {
        weight: 2,
        opacity: 0.1,
        color: 'black',
        fillOpacity: 0.7,
        fillColor: '#cc4c02'
      },
    // Style for highlighted communities from each nationality as you scroll through
    areaHighlightStyle = {
        weight: 2,
        opacity: 0.1,
        color: 'black',
        fillColor: '#ffdf17'
      },
    // Style for when mouse hovers over a community area
    areaHoverStyle = {
        weight: 1,
        opacity: 0.9,
        color: '#ffdf17'
      },
    // Style for communitity area when "zoomed-in" to just look at one community
    areaZoomStyle = {
        weight: 1,
        opacity: 0.9,
        color: '#ffdf17',
        fillOpacity: 0.3,
        fillColor: '#ffdf17'
      };
      
// Icon styles
// Default icon for a rainwater system
var defaultIcon = new L.Icon({
          iconUrl: "http://a.tiles.mapbox.com/v3/marker/pin-s+17aae4.png",
          iconSize: [20, 50],
          iconAnchor: [10, 25],
          popupAnchor: [0, -25]
        }),
    // Icon for featured story
    storyIcon = new L.Icon({
          iconUrl: "http://a.tiles.mapbox.com/v3/marker/pin-s+17aae4.png",
          iconSize: [20, 50],
          iconAnchor: [10, 25],
          popupAnchor: [0, -25]
        }),
    // Icon for active featured story (shows when story text is highlighted)
    activeStoryIcon = new L.Icon({
          iconUrl: "http://a.tiles.mapbox.com/v3/marker/pin-m+3887be.png",
          iconSize: [30, 70],
          iconAnchor: [15, 35],
          popupAnchor: [0, -35]
        });

// Popup style
var popup = new L.Popup({ autoPan: false });

// *TODO* add correct function for baseLayer (don't load data at this stage)
var baseLayer = new L.mapbox.tileLayer('gmaclennan.map-y7pgvo15');
var satLayer = new L.BingLayer(BING_API_KEY);

// Initialize communities layer (polygons for each community), initially empty.
var communityLayer = new L.GeoJSON(null,  {
  
      // set style of each feature according to context and active secion
      style: function (feature) {
                var nation = _sanitize(feature.properties.nacion),
                    community = _sanitize(feature.properties.nombre);
                    
                if (activeStory.id == "overview") {
                  if (nation == activeSection.id) return areaHighlightStyle;
                  else return areaDefaultStyle;
                }
                else if (activeStory.id == community) return areaZoomStyle;
                else return areaDefaultStyle;
              },
              
      // Set up interaction for communities layer (fires for each feature when added)
      onEachFeature: function (feature, layer) {
                        layer.on({
                          mousemove: mousemoveArea,
                          mouseout: mouseout,
                          click: zoomToFeature
                        });
                      }
    });
  
// Initialize installations layer (markers for each rainwater system), initially empty
var markerLayer = new L.GeoJSON(null, {
      // Create a marker for each feature (point) in the layer
      // *TODO* return different icon for featured stories
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {icon: defaultIcon});
      },
      // Register each feature with the spiderifier layer
      onEachFeature: function (feature, layer) {
        spiderifier.addMarker(layer);
      },
      // Only add markers when the active context is
      // a zoomed in view of an individual community,
      // and only add markers from that community.
      filter: function (feature, layer) {
        var community = _sanitize(feature.properties.location);
        return (community == activeContext);
      }
    });
    
// extend the bounds by a percentage horizontally
L.LatLngBounds.prototype.padXY = function (bufferRatioX, bufferRatioY) { // (Number) -> LatLngBounds
    var sw = this._southWest,
        ne = this._northEast,
        heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatioY,
        widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatioX;

    return new L.LatLngBounds(
            new L.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
      	    new L.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
    }

    // _onOverlayLoad adds geojson returned from the JSONP call to the map
    // and caches the bounds of each nationality in bounds[]
    var _onOverlayLoad = function(geojson) {
      console.log("hello");
      console.log(geojson);
      communityLayer.addData(geojson);
      communityLayer.eachLayer( function(layer) {
        var nacion = _sanitize(layer.feature.properties.nacion);
        bounds[nacion] = !bounds[nacion] ? layer.getBounds() : bounds[nacion].extend(layer.getBounds());
      })
    }

    // _onMarkerLoad processes the Google JSON returned from the spreadsheet
    // and adds it to the marker layer.
    var _onMarkerLoad = function(googlejson) {
      markerGeoJson = googledocs2geojson(googlejson);
      markerLayer.addData(markerGeoJson);
    }
