(function () {
'use strict';
window.cwm = {

  init: function (mapId, storiesId) {
    
    var baseUrl = 'http://clearwater.cartodb.com/api/v2/sql?format=geojson&q=';
    
    var options = {
      
      // Bing Maps API key for satellite layer
      // Register for key at http://www.bingmapsportal.com
      // Currently a basic non-profit key. Need to check limits.
      bingApiKey: "Ajt-JIuGs7jVKkk4yeC5HWByvuHQ4OEISvzK2-77yRcz_EOCAGfooD4eDeZ-aY4l",
      
      // Mapbox ID for overlay map
      mapboxId: 'gmaclennan.map-y7pgvo15',
      
      // Bounds for the initial view of the map (South America)
      startBounds: [ { lat: -55, lon: -90 }, { lat: 14, lon: -33 } ],
      
      // Data sources for overlay and markers (currently CartoDB)
      communityUrl: baseUrl + 'SELECT ST_Simplify(the_geom, 0.0002) AS the_geom, c.community, c.nationality, systems, users ' +
                                 'FROM communities AS c LEFT JOIN (SELECT COUNT(*) AS systems, SUM(users) AS users, community ' +
                                 'FROM clearwater_well_installations GROUP BY community) AS cwi ON c.community = cwi.community WHERE active',
                                 
      installationUrl: baseUrl + 'SELECT * FROM clearwater_well_installations WHERE photo IS NOT NULL',
      
      padding: 580 
           
    };
  
    var map = cwm.Map('map', options);

    var stories = cwm.Stories('stories').map(map);

  }
  
};cwm.Map = function (mapId, options) {
  
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
};cwm.Stories = function () {
  
  var s = {},
      sa,
      map,
      currentScroll;
  
  setupScrolling();
  
  s.map = function (m) {
    map = m.stories(s);
    return s;
  };
  
  var h1Height = document.getElementsByTagName("h1")[0].offsetHeight;
  var h2Height = document.getElementsByTagName("h2")[0].offsetHeight;

  sa = cwm.handlers.RevealHandler()
    .affixTop(
      "#stories h1", 
      function () { return $x(this).parent("article").next().offsetTop() - this.offsetHeight; }
    )
    .affixBottom(
      "#stories h2, #stories h1", 
      function () { return $x(this).parent("section").previousSiblingOrCousin().offsetBottom() - window.innerHeight  + this.offsetHeight; }
    )
    .fadeIn(
      ".image", 
      function () { return $x(this).offsetTop() - window.innerHeight; }, 
      function () { return $x(this).offsetTop() - window.innerHeight + this.offsetHeight; }
    )
    .fadeOut(
      "#stories article > section:not(:first-child)", 
      function () { return $x(this).offsetTop() + this.offsetHeight - window.innerHeight; }, 
      function () { return $x(this).offsetTop() + Math.max(window.innerHeight - h1Height - this.offsetHeight, 100); }
    )
    .enable();
  
  // Scroll the map to an element by id
  s.scrollTo = function (id) {
    var el = document.getElementById(id);
    var offset = $x(el).nextSiblingOrCousin()[0].children[1].children[0].offsetHeight;
    var startY = window.pageYOffset;
    var endY = el ? el.offsetTop + el.offsetHeight + offset : startY;
    var scrollDiff = Math.round(endY - startY);
    var startTime = Date.now();
    var t;
    
    if (scrollDiff === 0) return;
    if (currentScroll) cancelAnimationFrame(currentScroll);

    if (map) {
      map.easeHandler.clearOverride();
      map.easeHandler.setOverride(null, null, Math.min(endY, startY), Math.max(endY, startY));
      t = map.easeHandler.getOverrideTime();
    } else {
      t = Math.abs(scrollDiff) * 4;
    }
    
    loop();

    // ease-in-out
    function ease(t) {
      return 0.5 * (1 - Math.cos(Math.PI * t));
    }
  
    function loop () {
      var now = Date.now();

      if (now - startTime > t) {
        window.scroll(0, endY);
        currentScroll = null;
      } else {
        window.scroll(0, startY + scrollDiff * ease((now - startTime) / t));
        currentScroll = requestAnimationFrame(loop);
      }
    }
  };
  
  function setupScrolling () {
    d3.selectAll('a[href*="#"]').on('click', function () {
      s.scrollTo(this.getAttribute("href").split("#")[1]);
    });
    d3.selectAll('#stories h1, #stories h2').on('click', function () {
      s.scrollTo($x(this).parent("section")[0].getAttribute("id"));
    });
  }
  
  return s;
};cwm.render = {
  
  // Container for the interactive layer
  LayerContainer: function (id) {
    var div = d3.select(document.body)
      .append("div")
      .style('position', 'absolute')
      .style('width', '100%')
      .style('height', '100%')
      .attr('id', id);
    div.append('svg').style("position", "absolute");
    return div;
  },
  
  Markers: function (data, context) {
    return context.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", 0);
  },
  
  PopupWrapper: function (d, context) {
    var popupWrapper = context.append("div")
        .attr("class", "marker-tooltip")
        .style("width", "100%")
        .datum(d);
      
    popupWrapper.append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .append("div")
        .attr("class", "marker-popup")
        .style("pointer-events", "auto");
        
    return popupWrapper;
  },
  
  PopupSmall: function (d, context) {
    context.append("div")
        .attr("class", "wrapper")
        .append("img")
        .attr("src", d.properties.photo);
      
    context.append("p")
        .text(d.properties.name.split(" and")[0]);
        
    return context;
  }
};cwm.util = {
  
  // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
  sanitize: function (string) {
    if (typeof string != "undefined" && string !== null)
    return string.toLowerCase()
          .replace('http://www.giveclearwater.org/','a-')
          .replace('http://beta.giveclearwater.org/','b-')
          .split(" ").join("-").split("/").join("-");
  },
  
  preloadImages: function (geojson, community) {
    _.forEach(geojson.features, function (v) {
      if (community === v.properties.community) {
        var img = new Image();
        img.src = v.properties.photo;
      }
    });
  },
  
  // Fill an array of n length
  fillArray: function (val, len) {
    var a = [];
    var v;
    var isArray = (val instanceof Array);
    
    for (var i=0; i<len; i++) {
      v = (isArray) ? val.slice(0) : val;
      a.push(v);
    }
    return a;
  },
  
  // Converts a Modest Maps bound object to something D3 understands
  d3Bounds: function (MMbounds) {
    return [ [ MMbounds[0].lon, MMbounds[0].lat],
             [ MMbounds[1].lon, MMbounds[1].lat] ];
  }
  
};// Override some core ModestMaps methods


// Overwrite ModestMaps getMousePoint function - it does not like
// the map in position: fixed and gets confused.
// *WARNING* this will need modified if the map div has padding/margins
// This only works when filling the browser window.
MM.getMousePoint = function(e, map) {
    var point = new MM.Point(e.clientX, e.clientY);
    return point;
};

// Get the map center point for a given bounds
MM.Map.prototype.centerFromBounds = function (b) {
  var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
  return this.extentCoordinate(extent, true);
};

// Returns the map zoom and center for an extent, but accounting for the 
// space taken by the column of stories to the left.
MM.Map.prototype.extentCoordinate = function (locations, precise, paddingLeft) {
    var paddingLeft = this.paddingLeft || paddingLeft || 0;
    
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

    var width = this.dimensions.x + 1 - paddingLeft;
    var height = this.dimensions.y + 1;

    // multiplication factor between horizontal span and map width
    var hFactor = (BR.column - TL.column) / (width / this.tileSize.x);

    // multiplication factor expressed as base-2 logarithm, for zoom difference
    var hZoomDiff = Math.log(hFactor) / Math.log(2);

    // possible horizontal zoom to fit geographical extent in map width
    var hPossibleZoom = TL.zoom - (precise ? hZoomDiff + 0.1 : Math.ceil(hZoomDiff));

    // multiplication factor between vertical span and map height
    var vFactor = (BR.row - TL.row) / (height / this.tileSize.y);

    // multiplication factor expressed as base-2 logarithm, for zoom difference
    var vZoomDiff = Math.log(vFactor) / Math.log(2);

    // possible vertical zoom to fit geographical extent in map height
    var vPossibleZoom = TL.zoom - (precise ? vZoomDiff + 0.1 : Math.ceil(vZoomDiff));

    // initial zoom to fit extent vertically and horizontally
    var initZoom = Math.min(hPossibleZoom, vPossibleZoom);

    // additionally, make sure it's not outside the boundaries set by map limits
    initZoom = Math.min(initZoom, this.coordLimits[1].zoom);
    initZoom = Math.max(initZoom, this.coordLimits[0].zoom);

    // coordinate of extent center
    var centerRow = (TL.row + BR.row) / 2;
    var centerColumn = (TL.column + BR.column) / 2;
    var centerZoom = TL.zoom;
    return new MM.Coordinate(centerRow, centerColumn, centerZoom).zoomTo(initZoom).left(paddingLeft / this.tileSize.x / 2);
};
  
MM.Map.prototype.setExtent = function(locations, precise, paddingLeft) {

    this.coordinate = this.extentCoordinate(locations, precise, paddingLeft);
    this.draw(); // draw calls enforceLimits
    // (if you switch to getFrame, call enforceLimits first)

    this.dispatchCallback('extentset', locations);
    return this;
};

// There is a bug in ModestMaps where the MM.moveElement call below does not
// include the scale when calculating tile position, this causes a "jump" as
// the map loads.
MM.Layer.prototype.positionTile = function(tile) {
    // position this tile (avoids a full draw() call):
    var theCoord = this.map.coordinate.zoomTo(tile.coord.zoom);

    // Start tile positioning and prevent drag for modern browsers
    tile.style.cssText = 'position:absolute;-webkit-user-select:none;' +
        '-webkit-user-drag:none;-moz-user-drag:none;-webkit-transform-origin:0 0;' +
        '-moz-transform-origin:0 0;-o-transform-origin:0 0;-ms-transform-origin:0 0;' +
        'width:' + this.map.tileSize.x + 'px; height: ' + this.map.tileSize.y + 'px;';

    // Prevent drag for IE
    tile.ondragstart = function() { return false; };

    var scale = Math.pow(2, this.map.coordinate.zoom - tile.coord.zoom);

    MM.moveElement(tile, {
        x: Math.round((this.map.dimensions.x/2) +
            (tile.coord.column - theCoord.column) * this.map.tileSize.x * scale),
        y: Math.round((this.map.dimensions.y/2) +
            (tile.coord.row - theCoord.row) * this.map.tileSize.y * scale),
        scale: scale,
        // TODO: pass only scale or only w/h
        width: this.map.tileSize.x,
        height: this.map.tileSize.y
    });

    // add tile to its level
    var theLevel = this.levels[tile.coord.zoom];
    theLevel.appendChild(tile);

    // Support style transition if available.
    tile.className = 'map-tile-loaded';

    // ensure the level is visible if it's still the current level
    if (Math.round(this.map.coordinate.zoom) == tile.coord.zoom) {
        theLevel.style.display = 'block';
    }

    // request a lazy redraw of all levels
    // this will remove tiles that were only visible
    // to cover this tile while it loaded:
    this.requestRedraw();
};
(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
})('$x', this, function() {

  function offsetTop (el) {
    if (!el) return 0;
    return el.offsetTop + offsetTop(el.offsetParent);
  }
  
  function parent (el, tag) {
    if (el.tagName == "HTML" || el.tagName == tag.toUpperCase()) return dh(el);
    return parent(el.parentNode, tag);
  }
  
  var dh = function (el) {
    if (!(this instanceof dh)) {
      return new dh(el);
    }
    this[0] = el;
  };

  dh.prototype = {
    
    get: function () {
      return this[0] || null
    },
    
    next: function () {
      return dh(this[0].nextElementSibling);
    },
    
    offsetTop: function () {
      return offsetTop(this[0]);
    },

    offsetBottom: function () {
      return this[0] && this[0].offsetHeight + offsetTop(this[0]);
    },

    parent: function (tag) {
      return parent(this[0], tag);
    },
  
    previousSiblingOrCousin: function () {
      var parentPrevSibling = this[0].parentNode.previousElementSibling;
      return dh(this[0].previousElementSibling || (parentPrevSibling && parentPrevSibling.lastElementChild));
    },
    
    nextSiblingOrCousin: function () {
      var parentPrevSibling = this[0].parentNode.nextElementSibling;
      return dh(this[0].nextElementSibling || (parentPrevSibling && parentPrevSibling.firstElementChild));
    }
    
  };
  
  return dh;
  
});cwm.layers = {};cwm.layers.BingLayer = function(options) {
    if (!(this instanceof cwm.layers.BingLayer)) {
        return new cwm.layers.BingLayer(options);
    }
    
    this._subdomains = [0, 1, 2, 3];
    this._key = options.apiKey;
    this._style = options.style || 'Aerial';
    this._url = '';
    this.meta = '';
    
    this.parent = document.createElement('div');
    this.parent.style.cssText = 'position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; margin: 0; padding: 0; z-index: 0';
    this.levels = {};
    this.requestManager = new MM.RequestManager();
    this.requestManager.addCallback('requestcomplete', this.getTileComplete());
    this.requestManager.addCallback('requesterror', this.getTileError());
    this.setProvider(new wax.mm._provider({
        tiles: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7']
    }));
    this.loadMetadata();
};

cwm.layers.BingLayer.prototype.initMetadata = function () {
  var r = this.meta.resourceSets[0].resources[0];
  
  this._subdomains = r.imageUrlSubdomains;
  this._url = r.imageUrl.replace('{subdomain}', '{S}')
                        .replace('{quadkey}', '{Q}')
                        .replace('http:', document.location.protocol)
                        .replace('{culture}', '');
  this.setProvider(new MM.Template(this._url, this._subdomains));
};

cwm.layers.BingLayer.prototype.loadMetadata = function () {
  var url = document.location.protocol + "//dev.virtualearth.net/REST/v1/Imagery/Metadata/" + this._style;
  var that = this;
  $.ajax({
    url: url,
    data: { key: this._key },
    jsonp: 'jsonp',
    dataType: 'jsonp',
    success: function(data) {
      that.meta = data;
      that.initMetadata();
    }
  });
};

MM.extend(cwm.layers.BingLayer, MM.Layer);
// From https://github.com/mapbox/mapbox.js/blob/v0.6.7/src/layer.js

cwm.layers.MapboxLayer = function() {
    if (!(this instanceof cwm.layers.MapboxLayer)) {
        return new cwm.layers.MapboxLayer;
    }
    // instance variables
    this._tilejson = {};
    this._url = '';
    this._id = '';
    this._composite = true;

    this.name = '';
    this.parent = document.createElement('div');
    this.parent.style.cssText = 'position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; margin: 0; padding: 0; z-index: 0';
    this.levels = {};
    this.requestManager = new MM.RequestManager();
    this.requestManager.addCallback('requestcomplete', this.getTileComplete());
    this.requestManager.addCallback('requesterror', this.getTileError());
    this.setProvider(new wax.mm._provider({
        tiles: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7']
    }));
};

mapbox.layer.prototype.refresh = function(callback) {
    var that = this;
    // When the async request for a TileJSON blob comes back,
    // this resets its own tilejson and calls setProvider on itself.
    wax.tilejson(this._url, function(o) {
        that.tilejson(o);
        if (callback) callback(that);
    });
    return this;
};

mapbox.layer.prototype.url = function(x, callback) {
    if (!arguments.length) return this._url;
    this._mapboxhosting = x.indexOf(mapbox.MAPBOX_URL) == 0;
    this._url = x;
    return this.refresh(callback);
};

mapbox.layer.prototype.id = function(x, callback) {
    if (!arguments.length) return this._id;
    this.named(x);
    this._id = x;
    return this.url(mapbox.MAPBOX_URL + x + '.jsonp', callback);
};

mapbox.layer.prototype.named = function(x) {
    if (!arguments.length) return this.name;
    this.name = x;
    return this;
};

mapbox.layer.prototype.tilejson = function(x) {
    if (!arguments.length) return this._tilejson;

    if (!this._composite || !this._mapboxhosting) this.setProvider(new wax.mm._provider(x));

    this._tilejson = x;

    this.name = this.name || x.id;
    this._id = this._id || x.id;

    if (x.bounds) {
        var proj = new MM.MercatorProjection(0,
            MM.deriveTransformation(
                -Math.PI,  Math.PI, 0, 0,
                Math.PI,  Math.PI, 1, 0,
                -Math.PI, -Math.PI, 0, 1));

        this.provider.tileLimits = [
            proj.locationCoordinate(new MM.Location(x.bounds[3], x.bounds[0]))
                .zoomTo(x.minzoom ? x.minzoom : 0),
            proj.locationCoordinate(new MM.Location(x.bounds[1], x.bounds[2]))
                .zoomTo(x.maxzoom ? x.maxzoom : 18)
        ];
    }

    return this;
};

mapbox.layer.prototype.draw = function() {
    if (!this.enabled || !this.map) return;

    if (this._composite && this._mapboxhosting) {

        // Get index of current layer
        var i = 0;
        for (i; i < this.map.layers.length; i++) {
            if (this.map.layers[i] == this) break;
        }

        // If layer is composited by layer below it, don't draw
        for (var j = i - 1; j >= 0; j--) {
            if (this.map.getLayerAt(j).enabled) {
                if (this.map.getLayerAt(j)._composite) {
                    this.parent.style.display = 'none';
                    this.compositeLayer = false;
                    return this;
                }
                else break;
            }
        }

        // Get map IDs for all consecutive composited layers
        var ids = [];
        for (var k = i; k < this.map.layers.length; k++) {
            var l = this.map.getLayerAt(k);
            if (l.enabled) {
                if (l._composite && l._mapboxhosting) ids.push(l.id());
                else break;
            }
        }
        ids = ids.join(',');

        if (this.compositeLayer !== ids) {
            this.compositeLayer = ids;
            var that = this;
            wax.tilejson(mapbox.MAPBOX_URL + ids + '.jsonp', function(tiledata) {
                that.setProvider(new wax.mm._provider(tiledata));
                // setProvider calls .draw()
            });
            this.parent.style.display = '';
            return this;
        }

    } else {
        this.parent.style.display = '';
        // Set back to regular provider
        if (this.compositeLayer) {
            this.compositeLayer = false;
            this.setProvider(new wax.mm._provider(this.tilejson()));
            // .draw() called by .tilejson()
        }
    }

    return MM.Layer.prototype.draw.call(this);
};

mapbox.layer.prototype.composite = function(x) {
    if (!arguments.length) return this._composite;
    if (x) this._composite = true;
    else this._composite = false;
    return this;
};

// we need to redraw map due to compositing
mapbox.layer.prototype.enable = function(x) {
    MM.Layer.prototype.enable.call(this, x);
    if (this.map) this.map.draw();
    return this;
};

// we need to redraw map due to compositing
mapbox.layer.prototype.disable = function(x) {
    MM.Layer.prototype.disable.call(this, x);
    if (this.map) this.map.draw();
    return this;
};

MM.extend(mapbox.layer, MM.Layer);
// Can display multiple collections of geojson features in the same layer,
// each collection with its own g, class and max zoom.

cwm.layers.FeatureLayer = function (context, id) {
  
  var features,
      featureCollectionCount = 0,
      featureData = [];
  
  var svg = context.select("svg");
  
  var g = svg.append('g');
  
  var projectionStream = d3.geo.transform({
      point: function (x, y) {
        var point = featureLayer.map.locationPoint({ lon: x, lat: y });
        // Rounding hack from http://jsperf.com/math-round-vs-hack/3
        // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
        this.stream.point(~~(0.5 + point.x), ~~(0.5 + point.y));
      }});
    
  var pathGenerator = d3.geo.path().projection(projectionStream);
    
  var featureLayer = {
    
    // parent is used by Modest Maps I think to attach to the map
    parent: context.node(),
    name: id,
    bounds: {},
    
    draw: function () {
      // don't do anything if we haven't been attached to a map yet
      // (Modest Maps attaches the map to the layer when it is added to the map)
      if (!featureLayer.map || !features) return;
      
      var zoom = featureLayer.map.getZoom();
      
      // update the features to their new positions
      // If beyond their max zoom, fade them out
      features.attr("d", pathGenerator)
          .style("fill-opacity", function (d) {
            return Math.min(Math.max(d.properties._maxZoom - zoom, 0), 1) * 0.6;
          })
          .classed("outline", function (d) { return zoom > d.properties._maxZoom; });
      return featureLayer;
    },
    
    add: function (geojson, options, callback) {
      // Currently supports adding an id to each feature added
      // and a max zoom level at which that group of features is displayed
      options = options || {};
      var maxZoom = options.maxZoom || 999;
      var id = options.id || featureCollectionCount++;
      
      // inject maxZoom and id into the feature geojson
      geojson.features.forEach(function (d) { d.properties._maxZoom = maxZoom; });
      geojson.features.forEach(function (d) { d.properties._id = id; });

      // add these features to the features already in the layer
      featureData = featureData.concat(geojson.features);
  
      // store the bounds of this collection of features
      featureLayer.bounds[id] = d3.geo.bounds(geojson);
  
      // now add paths for each feature and set class to id
      features = g.selectAll("path")
          .data(featureData);
      
      // select the "null nodes" for new data, and create a path element
      // for each one.
      features.enter()
          .append("path")
          .attr("class", id);
    
      if (callback) callback();
      return featureLayer;
    },
    
    // This will load geojson from `url` and add it to the layer
    load: function (url, options, callback) {
      d3.json(url, function (e, data) {
        if (e) throw e.response + ": Could not load " + url;
        else featureLayer.add(data, options, callback);
      });
      return featureLayer;
    },
    
    getLocations: function (field) {
      var locations = [];
      features.each(function (d) {
        locations.push({ 
          id: cwm.util.sanitize(d.properties[field]),
          bounds: d3.geo.bounds(d)
        });
      });
      return locations;
    }
  };
  
  return featureLayer;
};cwm.layers.MarkerLayer = function (context, id) {
  
  var markers,
      minZoom,
      prevZoom,
      markerSize,
      interaction,
      popup,
      activePopup;

  var svg = context.select("svg");

  var g = svg.append('g');
  
  // Project markers from map coordinates to screen coordinates
  function project (d) {
    var point = markerLayer.map.locationPoint({ 
          lon: d.geometry.coordinates[0], 
          lat: d.geometry.coordinates[1] 
        });
    return [~~(0.5 + point.x), ~~(0.5 + point.y)];
  }
  
  // Sorts points according to distance from center point of map
  // used for animating `show` making markers appear from center
  function sortFromCenter (a, b) {
    var c = markerLayer.map.getCenter();
    var ac = a.geometry.coordinates;
    var bc = b.geometry.coordinates;
    var ad = Math.pow(ac[0] - c.lon, 2) + Math.pow(ac[1] - c.lat, 2);
    var bd = Math.pow(bc[0] - c.lon, 2) + Math.pow(bc[1] - c.lat, 2);
    return d3.ascending(ad, bd);
  }
  
  // A function that always returns true (used for default arguments)
  function trueFn () {
    return true;
  }
  
  var markerLayer = {
    
    // parent is used by Modest Maps I think to attach to the map
    parent: context.node(),
    name: id,
    
    draw: function () {
      // don't do anything if we haven't been attached to a map yet
      // (Modest Maps attaches the map to the layer when it is added to the map)
      if (!markerLayer.map || !markers) return;
      
      var zoom = markerLayer.map.getZoom();
    
      markers.attr("cx", function (d) { return project(d)[0]; })
             .attr("cy", function (d) { return project(d)[1]; });
           
      if (activePopup) {
       var d = activePopup.datum();
       var point = new MM.Point(project(d)[0], project(d)[1]);
       MM.moveElement(activePopup.node(), point);
      }
    
      if (prevZoom < minZoom && zoom > minZoom ) {
        markerLayer.show();
      } else if (prevZoom > minZoom && zoom < minZoom ) {
        markerLayer.hide();
      }
      prevZoom = zoom;
    
      return markerLayer;
    },
    
    add: function (geojson, options, callback) {
      // Currently supports adding an marker size to each feature
      // for now only supports constants, not functions
      options = options || {};
      markerSize = options.markerSize || 8;
      minZoom = options.minZoom || 0;
      
      // inject markerSize into the feature geojson
      geojson.features.forEach(function (d) { d.properties._markerSize = markerSize; });
      
      // store the bounds of this collection of markers
      markerLayer.bounds = d3.geo.bounds(geojson);
  
      // now render markers for each feature
      markers = cwm.render.Markers(geojson.features, g);
  
      interaction = cwm.handlers.MarkerInteraction(markers);
  
      if (callback) callback();
      return markerLayer;
    },
    
    load: function (url, options, callback) {
      d3.json(url, function (e, data) {
        if (e) throw e.response + ": Could not load " + url;
        else markerLayer.add(data, options, callback);
      });
      return markerLayer;
    },
    
    // returns an array of bounds for each marker
    // used by the map to locate featured stories
    getLocations: function (id, filter) {
      filter = filter || trueFn;
      var locations = [];
  
      markers.data().filter(filter).forEach(function (d) {
        var bounds = [[],[]];
        bounds[0][0] = bounds[1][0] = d.geometry.coordinates[0];
        bounds[0][1] = bounds[1][1] = d.geometry.coordinates[1];
        locations.push({id: id(d), bounds: bounds});
      });
      return locations;
    },
    
    // Shows the markers in the layer with animation.
    // Pass a filter function to only show a subset.
    show: function (filter) {
      if (!filter) {
        filter = trueFn;
      } else {
        markers.transition().attr("r", 0);
      }
      markers.filter(filter || true)
          .sort(sortFromCenter)
          .transition()
          .duration(1000)
          .delay(function (d, i) { return i * 10; })
          .ease("elastic", 2)
          .attr("r", function (d) { return d.properties._markerSize; } );
      return markerLayer;
    },
    
    hide: function () {
      markerLayer.show(function () { return false; });
      return markerLayer;
    }
  };
  
  return markerLayer;
};cwm.handlers = {};cwm.handlers.DragHandler = function() {
    var handler = {},
        map;

    var drag = d3.behavior.drag()
        .on("drag", pan)
        .on("dragstart", function() {
          d3.event.sourceEvent.stopPropagation(); // silence other listeners
        })
        .on("dragend", function () {
          map.parent.style.cursor = 'auto';
        });

    function pan () {
      map.parent.style.cursor = 'move';
      map.panBy(d3.event.dx, d3.event.dy);
    }

    handler.init = function(m) {
        map = m;
        d3.select(map.parent).call(drag);
    };

    handler.remove = function() {
        d3.select(map.parent).on('mousedown.drag', null);
    };

    return handler;
};/*
 * This handler manages the relationship between scroll positions and
 * map locations - center point and zoom. It sets up a smooth 3 dimensional
 * path between an array of locations, and animates the map smoothly
 * between these locations on scroll. If the user moves or zooms the map 
 * manually you can call setOverride() to ensure a smooth path back to 
 * the original path.
 * 
 * Requires ModestMaps.js and mapbox easey.js library.
 * 
 */

cwm.handlers.EaseHandler = function () {
  
  var eh = {},
      override,
      map,
      easings,
      locations,
      lastScroll,
      enabled = false;

  if (!mapbox.ease) throw 'Mapbox easey library not found';

  // Expects a mapbox v.0.6.x map object (ModestMaps)
  eh.map = function (m) {
    map = m;
    return eh;
  };

  // Locations is an array of objects with an id referring to an element id
  // and bounds, an array of two LatLon arrays, south-west, north-east
  // e.g. { id: 'elementid', bounds: [ [0, 0], [100, 100] ] }
  eh.locations = function (l) {
    if (!arguments.length) return locations; 
    locations = l;
    setScrollPoints();
    if (!!map) setEasings();
    return eh;
  };

  eh.enable = function () {
    lastScroll = 0;
    if (enabled) return eh;
    if (!locations || !map) throw "Map and locations need to be set";
    if (!easings) setEasings();
    enabled = true;
    loop(this);
    return eh;
  };

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
  };

  eh.getCoord = function (scrollTop) {
    scrollTop = Math.max(scrollTop, 0);
    return easings[scrollTop] || _.last(easings);
  };

  // Sets an override easing function if the user has moved the map from the
  // pre-defined easing path, or if we need to move quickly between two 
  // points far apart on the page without moving through the intermediary steps 
  eh.setOverride = function (from,start,top,bottom) {
    from = from || map.coordinate.copy(),
    start = start || window.pageYOffset,
    top = Math.max(top || start - 200, 0);
    bottom = bottom || start + 200;

    var ease1, ease2, topCoord, bottomCoord;

    override = {top: top, bottom: bottom};
    topCoord = easings[Math.floor(top)] || _.last(easings);
    bottomCoord = easings[Math.floor(bottom)] || _.last(easings);
    ease1 = mapbox.ease().map(map).from(topCoord).to(from).setOptimalPath();
    ease2 = mapbox.ease().map(map).from(from).to(bottomCoord).setOptimalPath();
    override.easings = ease1.future(start - top).concat(ease2.future(bottom-start));
    override.time = ease1.getOptimalTime() + ease2.getOptimalTime();
    return eh;
  };
  
  eh.clearOverride = function () {
    override = undefined;
    return eh;
  };
  
  eh.getOverrideTime = function () {
    return Math.floor(override.time);
  };

  // Iterate through the locations array, look up the elements on the page,
  // calculate their scroll position, and store the result in the array.
  function setScrollPoints () {
  
    locations = _.chain(locations)
                .map(function (v) {
                  var el = document.getElementById(v.id);
                  v.scrollPoint = el ? el.offsetTop + el.offsetHeight : -1;
                  return v;
                })
                .reject(function (v) { return v.scrollPoint < 0; })
                .sortBy('scrollPoint').value();
  }

  // Creates an array `easings` of `MM.Coordinate` objects that specify
  // the map zoom and center point for each pixel on the page.
  function setEasings () {
    var easing, coord, coords, prevCoord, prevScrollPoint;
    easings = [];
  
    _.forEach(locations, function (v) {
      coord = map.centerFromBounds(v.bounds);
      if (!!prevCoord) {
        easing = mapbox.ease().map(map).from(prevCoord).to(coord)
                  .easing('linear').setOptimalPath();
        // for some reason the first easing is funky, so we drop it...
        coords = _.tail(easing.future(v.scrollPoint - prevScrollPoint + 1));
        easings = easings.concat(coords);
      }
      prevCoord = coord;
      prevScrollPoint = v.scrollPoint;
    });
  }

  // This loop uses requestAnimationFrame to check the scroll position 
  // and update the map.
  function loop() {
    var y = window.pageYOffset;
    // meter.tick()
    if (!enabled) return false;
    // Avoid calculations if not needed and just loop again
    if (lastScroll == y) {
        requestAnimationFrame(loop);
        return false;
    } else lastScroll = y;
    eh.easeTo(y);
    requestAnimationFrame(loop);
  }
  
  return eh;
};
// Handles the display of elements as the scroll on and off the screen
// Provides curtain effect & fades elements in and out.
cwm.handlers.RevealHandler = function() {
  var sa = {},
      wHeight = window.innerHeight,
      dHeight = document.body.scrollHeight,
      scrollStyles = new Array(dHeight),
      rangeStyles = [],
      enabled = false,
      animFrame = null,
      lastScroll;
      
  var query = function(s) { return document.querySelectorAll(s); };

  // Prefer Sizzle, if available.
  if (typeof Sizzle === "function") {
    query = function(s) { return Sizzle(s) ; };
  }
  
  var subclass = {}.__proto__?

    // Until ECMAScript supports array subclassing, prototype injection works well. 
    // See http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
    function(object, prototype) {
      object.__proto__ = prototype;
    }:

    // And if your browser doesn't support __proto__, we'll use direct extension.
    function(object, prototype) {
      for (var property in prototype) object[property] = prototype[property];
    };
  
  function Cache () {
    var arr = [ ];
    arr.push.apply(arr, arguments);
    subclass(arr, Cache.prototype);
    return arr;
  }
  
  Cache.prototype = Object.create(Array.prototype);
  Cache.prototype.add = function (value) {
    for (var i=0; i<this.length; i++) {
      if (equal(this[i], value)) return i;
    }
    return this.push(value) - 1;
    
    function equal (x, y) {
      if (!x || !y) return false;
      if (x == y) return true;
      if (x instanceof Array && y instanceof Array) {
        if (x.length != y.length) return false;
        for (var i = 0; i < x.length; i++) {
          // Check if we have nested arrays
          if (x[i] instanceof Array && y[i] instanceof Array) {
              // recurse into the nested arrays
              if (!equal(x[i], y[i])) return false;
          }
          // Warning - two different object instances will never be equal: {x:20} != {x:20}
          else if (x[i] != y[i]) return false;
        }
        return true;
      }
      return false;
    }
  };
  
  function ElementCache () {
    this.origStyles = {};
    this.length = 0;
    this.wrapped = {};
  }
  
  ElementCache.prototype.add = function (el) {
    for (var i=0; i<this.length; i++) {
      if (this[i] == el) return i;
    }
    this[i] = el;
    this.origStyles[i] = el.getAttribute("style");
    this.length += 1;
    return i;
  };
  
  var elements = new ElementCache(),
      styles = new Cache();

  // will apply class `classname` to elements selected by `selector` between
  // scroll points `start` and `end`, which can be numbers or functions
  // `this` will be passed to the function as the current element.
  sa.addClass = function (selector, className, start, end) {
    var i,
        elementId,
        range,
        els = query(selector);
    
    for (i = 0; i < els.length; i++) {
      elementId = elements.add(els[i]);
      range = getStartEnd.call(els[i], start, end);
      if (range[1] >= 0) {
        rangeStyles.push([range, elementId, className + " "]);
      }
    }
    return sa;
  };
  
  sa.affixTop = function (selector, end, offset) {
    offset = offset || 0;
    var e,
        endOffset,
        start = function () { return scrollTop(this) - offset; };
        
    wrapElements(selector);
    if (end) {
      if (typeof end === "function") {
        e = function () { return end.call(this) - offset; };
        endOffset = function () { return end.call(this) - scrollTop(this); };
      } else {
        e = function () { return end - offset; };
        endOffset = function () { return end - scrollTop(this); };
      }
      sa.addStyle(selector, { position: "relative", top: endOffset }, e, 999999);
    }
    sa.addStyle(selector, { position: "fixed", top: offset, bottom: "auto" }, start, e || 999999);
    return sa;
  };
  
  sa.affixBottom = function (selector, start, offset) {
    offset = offset || 0;
    var s,
        startOffset,
        end = function () { return scrollTop(this) - wHeight + this.offsetHeight + offset; };
    
    wrapElements(selector);
    if (start) {
      if (typeof start === "function") {
        s = function () { return start.call(this) - offset; };
        startOffset = function () { return start.call(this) - scrollTop(this) + wHeight - this.offsetHeight; };
      } else {
        s = function () { return start - offset; };
        startOffset = function () { return start - scrollTop(this); };
      }
      sa.addStyle(selector, { position: "relative", top: startOffset }, 0, s);
    }
    sa.addStyle(selector, { position: "fixed", bottom: offset, top: "auto" }, s || 0, end);
    return sa;
  };
  
  sa.fadeIn = function (selector, start, end) {
    fade(selector, end, start);
    sa.addStyle(selector, { opacity: 0 }, 0, start);
    return sa;
  };
  
  sa.fadeOut = function (selector, start, end) {
    fade(selector, start, end);
    sa.addStyle(selector, { opacity: 0 }, end, 999999);
    return sa;
  };
  
  function fade (selector, start, end) {
    var i, 
        elementId,
        range,
        s,
        e,
        fadeFunc,
        els = query(selector);
    
    for (i = 0; i < els.length; i++) {
      elementId = elements.add(els[i]);
      range = getStartEnd.call(els[i], start, end);
      s = range[0];
      e = range[1];
      if (s < e && e > 0) {
        // Fade out
        fadeFunc = (function (s,e) { return function (y) {
          return "opacity:" + easeOut(Math.max(e - y, 0) / (e - s)).toFixed(2) + ";";
        }; })(s,e);
        rangeStyles.push([[s,e], elementId, fadeFunc]);
      } else if (e < s && s > 0) {
        // Fade in
        fadeFunc = (function (s,e) { return function (y) {
          return "opacity:" + easeIn(Math.min(y - e, s - e) / (s - e)).toFixed(2) + ";";
        }; })(s,e);
        rangeStyles.push([[e,s], elementId, fadeFunc]);
      }
    }
  }
  
  // will apply `style` with `value` (function or string) 
  // to elements selected by `selector` between
  // scroll points `start` and `end`, which can be numbers or functions
  // `this` will be passed to the function as the current element.
  sa.addStyle = function (selector, styles, start, end) {
    var i,
        elementId,
        range,
        key,
        value,
        styleString,
        els = query(selector);  
    
    for (i = 0; i < els.length; i++) {
      elementId = elements.add(els[i]);
      range = getStartEnd.call(els[i], start, end);
      styleString = "";
      
      if (range[1] >= 0) {
        for (key in styles) {
          value = (typeof styles[key] === "function") ? styles[key].call(els[i]) : styles[key];
          value += (typeof value === "number" && key.match(/top|bottom/)) ? "px" : "";
          styleString += key + ":" + value + ";";
        }
        rangeStyles.push([range, elementId, styleString]);
      }
    }
    
    return sa;
  };
  
  sa.enable = function () {
    var t0 = performance.now();
    cacheScrollPointStyles();
    var t1 = performance.now();
    console.log("caching took " + (t1 - t0) + "ms");
    enabled = true;
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
    return sa;
  };
  
  function cacheScrollPointStyles () {
    var pixel,
        updated,
        styleId,
        i,
        start,
        end,
        elementId,
        style,
        elementStyles;
    
    styles.length = 0;
    styleId = styles.add(cwm.util.fillArray([""], elements.length));
    
    for (pixel = 0; pixel < dHeight; pixel++) {
      elementStyles = cwm.util.fillArray([""], elements.length);
      updated = false;
      
      for (i = 0; i < rangeStyles.length; i++) {
        start = rangeStyles[i][0][0];
        end = rangeStyles[i][0][1];
        elementId = rangeStyles[i][1];
        style = rangeStyles[i][2];
        
        if (pixel >= start && pixel < end) {
          if (typeof style === "function") {
            // For now only handle one function style per element
            // using push here doubles the time for caching
            elementStyles[elementId][1] = style;
          } else {
            elementStyles[elementId][0] += style;
          }
          updated = true;
        }
      }
      
      if (updated) styleId = styles.add(elementStyles);
      
      scrollStyles[pixel] = styleId;
    }
  }

  function getStartEnd (start, end) {
    return [
      (typeof start === "function") ? start.call(this) : start,
      (typeof end === "function") ? end.call(this) : end
    ];  
  }
  
  function update (y) {
    var styleId = scrollStyles[Math.max(y,0)];
    var elementStyles = styles[styleId];
    var i, 
        el,
        styleString,
        j;
    
    for (i = 0; i < elementStyles.length; i++) {
      el = elements[i];
      styleString = elementStyles[i][0];
      for (j = 1; j < elementStyles[i].length; j++) {
        styleString += elementStyles[i][j].call(el,y);
      }
      if (el.getAttribute("style") !== styleString) {
        el.setAttribute("style", styleString);
      }
    }
  }
  
  function loop () {
    var y = window.pageYOffset;

    if (!enabled) return false;
    
    // Avoid calculations if not needed and just loop again
    if (lastScroll == y) {
        animFrame = requestAnimationFrame(loop);
    } else {
      lastScroll = y;
      update(y);
      animFrame = requestAnimationFrame(loop);
    }
  }
  
  function scrollTop (el) {
    if (!el) return 0;
    return el.offsetTop + scrollTop(el.offsetParent);
  }
  
  function easeIn (t) {
    return t*t;
  }
  
  function easeOut (t) {
    return 1 - easeIn(1-t);
  }
  
  function wrapElements(selector) {
    var height,
        els = query(selector);
    for (var i = 0; i < els.length; i++) {
      if (els[i].parentNode.getAttribute("data-wrap") !== "") {
        height = els[i].offsetHeight + "px";
        $(els[i]).wrapAll('<div data-wrap style="position: relative; height: ' + height + '" />');
      }
    }
  }
  
  return sa;
};
cwm.handlers.MarkerInteraction = function (context) {
  var mouseOverPopup;

  context.on("mouseout.mi", mouseoutMarker)
      .on("mouseover.mi", mouseoverMarker);
      // .on("click.mi", popupListener)
      // .on("mouseover.mi", popupListener)
      // .on("mouseout.mi", popupListener);



  function mouseoverMarker () {
    d3.select(this)
      .transition()
      .duration(500)
      .ease("elastic", 1.5)
      .attr("r", function (d) { return getMarkerSize(d, 2); });
  }
      
  function mouseoutMarker () {
    if (mouseOverPopup) return;
    d3.select(this)
      .transition()
      .attr("r", getMarkerSize);
  }

  function getMarkerSize (d, scale) {
    scale = scale || 1;
    return d.properties._markerSize * scale;
  }
/*
  function popupListener (d, i) {
    
    if (d3.event.type == "click") {
      if (d3.event.defaultPrevented) return;
      zoomPopup();
      return;
    }
    
    if (activePopup && !mouseOverPopup) {
      activePopup.transition()
          .duration(100)
          .delay(100)
          .style("opacity", 0)
          .remove();
      activePopup = null;
    }
    
    if (d3.event.type == "mouseover") {
      activePopup = drawPopup.call(this, d);
    }
  }
  
  function zoomPopup () {
    activePopup.select(".marker-popup").transition()
        .style("width", function () { return this.offsetWidth * 2 + "px"; });
    activePopup.on("mouseleave", null);
  }
  

    function drawPopup (d) {
    var point = new MM.Point(this.getAttribute("cx"), this.getAttribute("cy"));
    var marker = this;
    var dim = d3l.map.dimensions;
    
    var w = context.node().offsetWidth;
    var h = context.node().offsetHeight;
    wrapper.style("left", function () { return (dim.x - point.x < w) ? "auto" : 0; })
        .style("right", function () { return (dim.x - point.x < w) ? 0 : "auto"; })
        .style("bottom", function () { return (point.y < h) ? "auto" : 0; });
  
    
    .on("mouseenter", function () {
      mouseOverPopup = true;
    })
    .on("mouseleave", function () {
      mouseOverPopup = false;
      popup();
      mouseoutMarker.call(marker)
    })
    .on("click", zoomPopup);
      

    MM.moveElement(p.node(), point);
    
    return p;
  }
  return mi;
  */
};})();
