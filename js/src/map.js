cwm.Map = function(container) {

    var lastResize = 0,
        _duration,
        _current = {},
        extentCache = {},
        event = d3.dispatch("click");

    d3.select(window).on("resize.map", function() { extentCache = {}; });

    var map = new MM.Map(
        container.node(),
        null,
        null, [cwm.handlers.DragHandler()]
    ).setZoomRange(3, 18);

    map.addLayer = function(layer) {
        map.layers.push(layer);
        // pass through layer events
        layer.on("click", event.click);
        if (map.coordinate) {
            MM.getFrame(map.getRedraw());
        }
        return map;
    };

    var ease = map.ease = mapbox.ease().map(map);

    map.from = function(d) {
        if (!arguments.length) return ease.from();
        var from;
        if (d instanceof MM.Coordinate) from = d;
        if (d instanceof cwm.Place) from = map.placeExtentCoordinate(d);
        ease.from(from).setOptimalPath();
        return map;
    };

    map.to = function(d) {
        if (!arguments.length) return ease.to();
        var to;
        if (d instanceof MM.Coordinate) to = d;
        if (d instanceof cwm.Place) to = map.placeExtentCoordinate(d);
        ease.to(to).setOptimalPath();
        return map;
    };

    map.t = function(t) {
        // little hack, to avoid strange jumping when t == 0
        if (t === 0) t += 0.00001;
        ease.t(t);
        return map;
    };

    map.go = function(callback) {
        if (ease.to()) {
            if (ease.running()) {
                ease.stop(map.go);
            } else {
                ease.from(map.coordinate).setOptimalPath();
                var duration = _duration || ease.getOptimalTime();
                if (ease.getOptimalTime()) {
                    ease.run(duration, callback);
                } else {
                    ease.t(1);
                    if (callback) callback();
                }
            }
        }
        return map;
    };

    map.duration = function(x) {
        if (!arguments.length) return _duration;
        _duration = x;
        return map;
    };

    map.getOptimalTime = ease.getOptimalTime;

    map.stop = ease.stop;

    map.paddingLeft = function(_) {
        if (!arguments.length) return map._paddingLeft;
        map._paddingLeft = _;
        return map;
    };

    map.current = function current(x) {
        if (!arguments.length) return _current;
        _current = x;
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

    // The flightHandler is what moves the map according to the scroll position
    //map.flightHandler = cwm.handlers.FlightHandler().map(map);

    // window.onresize = function () {
    //   $('html,body').stop(true);
    //   if (Date.now() - lastResize > 1000/30) {
    //     refresh();
    //   }
    //   lastResize = Date.now();
    // };

    // Check all the layers have loaded and set the locations
    // of any places that the map should navigate to

    // function onLoad() {
    //     if (featureLayer.bounds.communities && markerLayer.bounds) {
    //         setLocations();
    //         setupScrolling();
    //         refresh();
    //     }
    //     d3.select(map.parent).on("click", function() {
    //         var z = 18;
    //         if (d3.event.defaultPrevented) return;
    //         if (container.classed("markers-shown")) {
    //             var location = map.pointLocation(new MM.Point(d3.event.x, d3.event.y));
    //             var d = markerLayer.closest(location);
    //             var b = markerLayer.getBounds(function(e) {
    //                 return e.properties.community === d.properties.community;
    //             });
    //             var extent = new MM.Extent(b[1][1], b[0][0], b[0][1], b[1][0]);
    //             var coord = map.extentCoordinate(extent, true);
    //             // Do not zoom in quite all the way
    //             if (coord.zoom > z - 2) coord = coord.zoomTo(z - 2);

    //             map.flightHandler.pause();
    //             var endY = map.s.scrollTo(cwm.util.sanitize(d.properties.community) + "-overview", function() {
    //                 map.flightHandler.resume();
    //             });
    //             if (endY !== cwm.scrollHandler.currentScroll() || map.getZoom() >= z) {
    //                 map.ease.to(coord).path("screen").setOptimalPath().run(1500, function() {
    //                     map.flightHandler.setOverride();
    //                 });
    //                 container.classed("zoomed-in", false);
    //             } else {
    //                 var point = new MM.Point(d3.event.x, d3.event.y);
    //                 var to = map.pointCoordinate(point).zoomTo(z);
    //                 map.ease.to(to).path('about').run(500, function() {
    //                     map.flightHandler.setOverride();
    //                 });
    //                 container.classed("zoomed-in", true);
    //             }
    //         }
    //     });
    // }


    // function setupScrolling() {

    //     d3.selectAll('#' + mapId + ' a').on('click', function() {
    //         if (typeof stories === 'undefined') return;
    //         stories.scrollTo(this.getAttribute("href").split("#")[1]);
    //     });

    //     d3.selectAll('.markers circle').on('click', function(d) {
    //         if (d3.event.defaultPrevented) return;
    //         var link = cwm.util.sanitize(d.properties.featured_url);

    //         if (link) {
    //             stories.scrollTo(link);
    //         } else {
    //             zoomToPoint();
    //         }

    //         function zoomToPoint() {
    //             var z = 18;
    //             var point = new MM.Point(d3.event.clientX, d3.event.clientY);
    //             var to = map.pointCoordinate(point).zoomTo(z);
    //             map.ease.to(to).path('about').run(500, function() {
    //                 map.flightHandler.setOverride();
    //             });
    //         }
    //     });
    // }

    return d3.rebind(map, event, "on");
};
