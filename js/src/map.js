cwm.Map = function(container) {

    var lastResize = 0,
        to,
        from,
        current = {},
        extentCache = {},
        event = d3.dispatch("click");

    d3.select(window).on("resize.map", function() {
        extentCache = {};
    });

    container.on("click", function() {
        var d = d3.select(d3.event.target || d3.event.srcElement).datum();
        event.click(d);
    });

    var map = new MM.Map(
        container.node(),
        null,
        null, [cwm.handlers.DragHandler()]
    ).setZoomRange(3, 18);

    map.addLayer = function(layer) {
        map.layers.push(layer);
        if (map.coordinate) {
            MM.getFrame(map.getRedraw());
        }
        return map;
    };

    var ease = map.ease = mapbox.ease().map(map);

    map.to = function(d) {
        if (!arguments.length) return to;
        to = d;
        if (d instanceof cwm.Place) d = map.placeExtentCoordinate(d);
        if (!ease.from()) ease.from(map.coordinate);
        ease.to(d);
        var fromLoc = map.coordinateLocation(ease.from());
        var toLoc = map.coordinateLocation(d);
        var distance = cwm.util.distance([fromLoc.lat, fromLoc.lon], [toLoc.lat, toLoc.lon]);
        if (distance > 0.0007) {
            ease.setOptimalPath();
        } else {
            ease.path("screen");
        }
        return map;
    };

    map.from = function(d) {
        if (!arguments.length) return from;
        from = d;
        if (d instanceof cwm.Place) d = map.placeExtentCoordinate(d);
        ease.from(d);
        if (ease.to()) ease.setOptimalPath();
        return map;
    };

    map.t = function(t) {
        if (!ease.to()) return map;
        // little hack, to avoid strange jumping when t == 0
        if (t === 0) t += 0.00001;
        ease.t(t);
        return map;
    };

    map.getOptimalTime = ease.getOptimalTime;

    map.stop = ease.stop;

    map.paddingLeft = function(_) {
        if (!arguments.length) return map._paddingLeft;
        map._paddingLeft = _;
        return map;
    };

    map.current = function(x) {
        if (!arguments.length) return current;
        current = x;
    };

    map.showPopup = function(d) {
        map.layers.forEach(function(layer) {
            if (layer.showPopup && ~layer.data().indexOf(d)) layer.showPopup(d);
        });
        return map;
    };

    map.placeExtentCoordinate = function(d) {
        if (extentCache[d.id()]) return extentCache[d.id()];
        var extent;
        if (d.children.length && (!d.geometry.coordinates || d.collection.extentFromChildren())) {
            extent = d.children.extent() || d.children[0].children[0].collection.extent();
        } else {
            extent = d.extent();
        }
        extentCache[d.id()] = map.extentCoordinate(extent, true).zoomBy(d.collection.zoomOffset());
        return extentCache[d.id()];
    };

    map.pointProject = function() {
        return function(x, y, z) {
            // We used topojson to presimplify the feature, which adds the z value, the effective area of each point
            // This formula was from http://wiki.openstreetmap.org/wiki/Zoom_levels and tweaked until it looked right.
            if (z < 63.728 / Math.pow(2, map.coordinate.zoom + 12)) return;
            var point = map.locationPoint({
                lon: x,
                lat: y
            });
            if (this.stream) {
                // Rounding hack from http://jsperf.com/math-round-vs-hack/3
                // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
                this.stream.point(~~(0.5 + point.x), ~~ (0.5 + point.y));
            } else {
                return [point.x, point.y];
            }
        };
    };

    map.pathGenerator = function() {
        return d3.geo.path()
            .projection(d3.geo.transform({
                point: map.pointProject()
            }));
    };

    return d3.rebind(map, event, "on");
};
