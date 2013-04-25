// Based on the Leaflet example from http://leafletjs.com/examples/choropleth.html

var ECUADOR_BOUNDS = new L.latLngBounds([ [-5.2, -81.2], [1.8, -74.9]]);
var PROJECT_BOUNDS = new L.latLngBounds([ [-1.1, -77.7], [0.5, -75.2]]);
var BING_API_KEY = "AnadQ9NziZo9MYVo8394fMtJjPrkZMasNfSqpt5wz4vUMSaATniZnKxvDgxrsrGB";

var areaDefaultStyle = {
        weight: 2,
        opacity: 0.1,
        color: 'black',
        fillOpacity: 0.7,
        fillColor: '#cc4c02'
      },
    areaHighlightStyle = {
        weight: 2,
        opacity: 0.1,
        color: 'black',
        fillColor: '#ffdf17'
      },
    areaHoverStyle = {
        weight: 1,
        opacity: 0.9,
        color: '#ffdf17'
      },
    areaZoomStyle = {
        weight: 1,
        opacity: 0.9,
        color: '#ffdf17',
        fillOpacity: 0.3,
        fillColor: '#ffdf17'
      },
    bounds = {
      ecuador: ECUADOR_BOUNDS,
      norOriente: PROJECT_BOUNDS
    },
    // Array of story article elements (overview, and one for each community).
    articles = document.getElementsByTagName('article'),
    // Array of story section elements (nation / featured story).
    sections = articles[0].getElementsByTagName('section'),
    installationGeoJson,
    activeSection = 0,
    activeArticle = "overview";

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

var map = L.mapbox.map('map', 'gmaclennan.map-y7pgvo15', {
  dragging: false,
  touchZoom: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false,
  zoomControl: false
}).fitBounds(ECUADOR_BOUNDS.padXY(0.33, 0));

var bingLayer = new L.BingLayer(BING_API_KEY).addTo(map).bringToBack();

var communityLayer = new L.geoJson(null,  {
      style: getStyle,
      onEachFeature: onEachFeature
  }).addTo(map);

var oms = new OverlappingMarkerSpiderfier(map);

var defaultIcon = new L.Icon({
          iconUrl: "http://a.tiles.mapbox.com/v3/marker/pin-s+17aae4.png",
          iconSize: [20, 50],
          iconAnchor: [10, 25],
          popupAnchor: [0, -25]
        })

var activeIcon = new L.Icon({
          iconUrl: "http://a.tiles.mapbox.com/v3/marker/pin-m+3887be.png",
          iconSize: [30, 70],
          iconAnchor: [15, 35],
          popupAnchor: [0, -35]
        })

var installationLayer = new L.GeoJSON(null, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {icon: defaultIcon});
    },
    onEachFeature: function (feature, layer) {
      oms.addMarker(layer);
    },
    filter: function (feature, layer) {
      var community = sanitize(feature.properties.location);
      return (community == activeArticle);
    }
  }).addTo(map);

var popup = new L.Popup({ autoPan: false });

// onOverlayLoad is the callback from the JSONP call to CartoDB,
// in the <script> tag at the bottom of the page.
var onOverlayLoad = function(geojson) {
  communityLayer.addData(geojson);
  communityLayer.eachLayer( function(layer) {
    var nacion = sanitize(layer.feature.properties.nacion);
    bounds[nacion] = !bounds[nacion] ? layer.getBounds() : bounds[nacion].extend(layer.getBounds());
  })
  // Set map to first section.
  setActiveSection(0, false);
}

// onDataLoad is the callback from the JSONP call to Google Spreadsheets
// in the <script> tag at the bottom of the page.
var onDataLoad = function(googlejson) {
  installationGeoJson = googledocs2geojson(googlejson);
  installationLayer.addData(installationGeoJson);
}

function getStyle(feature) {
  var nation = sanitize(feature.properties.nacion),
      community = sanitize(feature.properties.nombre),
      section = sections[activeSection].id,
      areaIsHighlighted = (nation == section && community != activeArticle),
      areaIsZoomed = (community == activeArticle);
  if (areaIsHighlighted) return areaHighlightStyle;
  else if (areaIsZoomed) return areaZoomStyle;
  else return areaDefaultStyle;
}

function onEachFeature(feature, layer) {
    layer.on({
        mousemove: mousemoveArea,
        mouseout: mouseout,
        click: zoomToFeature
    });
}

var closeTooltip;

function mousemoveArea(e) {
  var layer = e.target,
      community = sanitize(layer.feature.properties.nombre),
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
      community = sanitize(layer.feature.properties.nombre),
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
  var community = sanitize(e.target.feature.properties.nombre);
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
  installationLayer.clearLayers().addData(installationGeoJson);
  map.fitBounds(e.target.getBounds());
}

// Helper to sanitize a string, replacing spaces with "-" and lowercasing
function sanitize(string) {
  if (typeof(string) != "undefined")
  return string.toLowerCase()
        .replace('http://www.giveclearwater.org/','a-')
        .split(" ").join("-").split("/").join("-");
}

// Helper to set the active section.
var setActiveSection = function(index, ease) {
  if (index == activeSection) return true;
  var sectionId = sections[index].id;
  activeSection = index;
  
  _(sections).each(function(s) { s.className = s.className.replace(' active', '') });
  sections[index].className += ' active';

  // Set a body class for the active section.
  document.body.className = activeArticle + '-section-' + index;
  if (activeArticle == "overview") {
    communityLayer.eachLayer( function (layer) {
      communityLayer.resetStyle(layer);
    })
  
    // Ease map to active marker.
    var sectionBounds = bounds[sectionId].padXY(0.33, 0);
    map.options.maxZoom = 11;
    map.fitBounds(sectionBounds);
    map.options.maxZoom = undefined;
  } else {
    installationLayer.eachLayer( function (layer) {
      var storyId = sanitize(layer.feature.properties.storylink);
      if (storyId == sectionId && sectionId != "") {
        map.setView(layer.getLatLng(), 15);
        layer.setZIndexOffset(250);
        layer.setIcon(activeIcon);
      } else {
        layer.setZIndexOffset(0);
        layer.setIcon(defaultIcon);
      };
    });
  }
  return true;
};

// Bind to scroll events to find the active section.
window.onscroll = _(function() {
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
}).debounce(10);
