// Override some core ModestMaps methods


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

MM.Extent.prototype.coversBounds = function (bounds) {
  return !(bounds[0][0] > this.east ||
           bounds[0][1] > this.north ||
           bounds[1][0] < this.west ||
           bounds[1][1] < this.south);
};

MM.Extent.prototype.containsBounds = function (bounds) {
  return (bounds[0][0] > this.west &&
           bounds[0][1] > this.south &&
           bounds[1][0] < this.east &&
           bounds[1][1] < this.north);
};

MM.Extent.prototype.containsCoordinates = function (coords) {
  return this.containsLocation(new MM.Location(coords[1], coords[0]));
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
    //tile.ondragstart = function() { return false; };

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
