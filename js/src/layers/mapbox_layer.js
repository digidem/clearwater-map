// From https://github.com/mapbox/mapbox.js/blob/v0.6.7/src/layer.js

if (typeof mapbox === 'undefined') mapbox = {};

mapbox.MAPBOX_URL = 'http://a.tiles.mapbox.com/v3/';

cwm.layers.MapboxLayer = function(parent) {
    if (!(this instanceof cwm.layers.MapboxLayer)) {
        return new cwm.layers.MapboxLayer(parent);
    }
    // instance variables
    this._tilejson = {};
    this._url = '';
    this._id = '';
    this._composite = false;

    this.name = '';
    this.parent = parent || document.createElement('div');
    this.parent.style.cssText = 'position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; margin: 0; padding: 0; z-index: 0';
    this.levels = {};
    this.requestManager = new MM.RequestManager();
    this.requestManager.addCallback('requestcomplete', this.getTileComplete());
    this.requestManager.addCallback('requesterror', this.getTileError());
    this.setProvider(new wax.mm._provider({
        tiles: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7']
    }));
};

cwm.layers.MapboxLayer.prototype.refresh = function(callback) {
    var that = this;
    // When the async request for a TileJSON blob comes back,
    // this resets its own tilejson and calls setProvider on itself.
    wax.tilejson(this._url, function(o) {
        that.tilejson(o);
        if (callback) callback(that);
    });
    return this;
};

cwm.layers.MapboxLayer.prototype.url = function(x, callback) {
    if (!arguments.length) return this._url;
    this._mapboxhosting = x.indexOf(mapbox.MAPBOX_URL) === 0;
    this._url = x;
    return this.refresh(callback);
};

cwm.layers.MapboxLayer.prototype.id = function(x, callback) {
    if (!arguments.length) return this._id;
    this.named(x);
    this._id = x;
    return this.url(mapbox.MAPBOX_URL + x + '.jsonp', callback);
};

cwm.layers.MapboxLayer.prototype.named = function(x) {
    if (!arguments.length) return this.name;
    this.name = x;
    return this;
};

cwm.layers.MapboxLayer.prototype.tilejson = function(x) {
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

cwm.layers.MapboxLayer.prototype.draw = function() {
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
    var that = this;
    d3.timer(function () { 
      MM.Layer.prototype.draw.call(that);
      return true;
    });
    //return MM.Layer.prototype.draw.call(this);
};

cwm.layers.MapboxLayer.prototype.positionTile = function(tile) {
    // position this tile (avoids a full draw() call):
    var theCoord = this.map.coordinate.zoomTo(tile.coord.zoom);

    // Start tile positioning and prevent drag for modern browsers
    tile.style.cssText = 'position:absolute;-webkit-user-select:none;' +
        '-webkit-user-drag:none;-moz-user-drag:none;-webkit-transform-origin:0 0;' +
        '-moz-transform-origin:0 0;-o-transform-origin:0 0;-ms-transform-origin:0 0;' +
        'width:' + this.map.tileSize.x + 'px; height: ' + this.map.tileSize.y + 'px;' +
        'z-index: 1;';

    // Prevent drag for IE
    tile.ondragstart = function() { return false; };

    var scale = Math.pow(2, this.map.coordinate.zoom - tile.coord.zoom);

    MM.moveElement(tile, {
        x: (this.map.dimensions.x* 0.5) +
            (tile.coord.column - theCoord.column) * this.map.tileSize.x * scale,
        y: (this.map.dimensions.y* 0.5) +
            (tile.coord.row - theCoord.row) * this.map.tileSize.y * scale,
        scale: scale,
        // TODO: pass only scale or only w/h
        width: this.map.tileSize.x,
        height: this.map.tileSize.y
    });

    // add tile to its level
    var theLevel = this.levels[tile.coord.zoom];
    if (!tile.__composited__) theLevel.appendChild(tile);


    // ensure the level is visible if it's still the current level
    if (Math.round(this.map.coordinate.zoom) == tile.coord.zoom) {
        theLevel.style.display = 'block';
    }

    // request a lazy redraw of all levels
    // this will remove tiles that were only visible
    // to cover this tile while it loaded:
    this.requestRedraw();
}

// This avoids recreating divs for each zoom level, since we are sharing them with the satellite layer to improve compositing performance
cwm.layers.MapboxLayer.prototype.createOrGetLevel = function(zoom) {
    if (zoom in this.levels) {
        return this.levels[zoom];
    }
    var id = this.parent.id + '-zoom-' + zoom;
    var level = document.getElementById(id);
    if (level) {
        this.levels[zoom] = level;
        return level;
    }

    level = document.createElement('div');
    level.id = id;
    level.style.cssText = 'position: absolute; margin: 0; padding: 0;';
    level.style.zIndex = zoom;

    this.parent.appendChild(level);
    this.levels[zoom] = level;

    return level;
};

cwm.layers.MapboxLayer.prototype.composite = function(x) {
    if (!arguments.length) return this._composite;
    if (x) this._composite = true;
    else this._composite = false;
    return this;
};

// we need to redraw map due to compositing
cwm.layers.MapboxLayer.prototype.enable = function(x) {
    MM.Layer.prototype.enable.call(this, x);
    if (this.map) this.map.draw();
    return this;
};

// we need to redraw map due to compositing
cwm.layers.MapboxLayer.prototype.disable = function(x) {
    MM.Layer.prototype.disable.call(this, x);
    if (this.map) this.map.draw();
    return this;
};

MM.extend(cwm.layers.MapboxLayer, MM.Layer);
