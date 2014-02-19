// Can display multiple collections of geojson features in the same layer,
// each collection with its own g, class and max zoom.

cwm.layers.FeatureLayer = function() {

    var g,
        mapContainer,
        map,
        features,
        label,
        mouseoverLabel,
        featureCollectionCount = 0,
        featureData =[],
        zoom,
        _current = {},
        event = d3.dispatch("click");

    var projectionStream = d3.geo.transform({
        point: function(x, y, z) {
            // We used topojson to presimplify the feature, which adds the z value, the effective area of each point
            // This formula was from http://wiki.openstreetmap.org/wiki/Zoom_levels and tweaked until it looked right.
            if (z < 63.728 / Math.pow(2, zoom + 12)) return;
            var point = cwm.map.locationPoint({
                lon: x,
                lat: y
            });
            // Rounding hack from http://jsperf.com/math-round-vs-hack/3
            // Performance increase: http://www.mapbox.com/osmdev/2012/11/20/getting-serious-about-svg/
            this.stream.point(~~(0.5 + point.x), ~~ (0.5 + point.y));
        }
    });

    var pathGenerator = d3.geo.path().projection(projectionStream);

    /* -- Using this would clip the shapes to the map extent, can't see a
    /* -- can't see a performance improvement from this yet.  
    var clipProjection = { stream: function (s) {
    return projectionStream.stream(clip.stream(s));
    }};
    */

    function showLabel() {
        var d = this.__data__;
        if (label && label.node().parentNode) return;
        label = cwm.render.Label(d, mapContainer);
        label._feature = this;
        label.on("mouseover", function() {
            mouseoverLabel = true;
        })
            .on("mouseout", function() {
                mouseoverLabel = false;
                label.remove();
            })
            .on("click", function() {
                d3.event.stopPropagation();
                mouseoverLabel = false;
                label.remove();
                d3.select(label._feature).on("click").call(label._feature, d);
            });
        drawLabel();
    }

    function drawLabel() {
        if (label) {
            var d = label.datum();
            var point = map.locationPoint(new MM.Location(d.centroid()[1], d.centroid()[0]));
            MM.moveElement(label.node(), point);
        }
    }

    function hideLabel() {
        window.setTimeout(function() {
            if (!mouseoverLabel)
                label.remove();
        }, 10);
    }

    function setMaxZooms() {
        featureData.forEach(function(d) {
            var bounds = d.bounds();
            var extent = new MM.Extent(bounds[1][1], bounds[0][0], bounds[0][1], bounds[1][0]);
            d._maxZoom = map.extentCoordinate(extent, true).zoom;
        });
        return featureLayer;
    }

    function draw() {
        // don't do anything if we haven't been attached to a map yet
        // (Modest Maps attaches the map to the layer when it is added to the map)
        if (!map || !featureData) return;

        zoom = map.getZoom();
        var extent = map.getExtent();

        var data = featureData.filter(function(d) {
            return extent.coversBounds(d.bounds()) && (d.id() !== "Ecuador" || zoom < (d._maxZoom + 1));
        });

        // update the features to their new positions
        // If beyond their max zoom, fade them out
        // Do not display features outside the map
        features = g.selectAll("path")
            .data(featureData, function(d) {
                return d.id();
            });

        features.enter()
            .append("path")
            .on("mouseover", showLabel)
            .on("mouseout", hideLabel)
            .on("click", event.click);

        features.attr("d", pathGenerator)
            .classed("active", function(d) {
                    return _current.place === d;
                })
                .classed("parentActive", function(d) {
                    return d.parent && _current.place === d.parent;
                })
                .classed("inside", function(d) {
                    for (var key in _current) {
                        if (_current[key] === d && key !== "place") return true;
                    }
                });

        features.exit().remove();

        drawLabel();
        return featureLayer;
    }

    function data(collection) {
        featureLayer.name = collection.id().toLowerCase();
        if (!(collection instanceof Array)) collection = [collection];
        // add these features to the features already in the layer
        featureData = collection;
        d3.select(window).on("resize." + featureLayer.name, setMaxZooms);
        g.classed(featureLayer.name, true);
        setMaxZooms();
        draw();
        return featureLayer;
    }

    function addTo(x) {
        map = x;
        map.addLayer(featureLayer);
        mapContainer = d3.select(map.parent);
        g = cwm.render.SvgContainer(mapContainer)
            .append('g')
            .attr("class", featureLayer.name);

        return featureLayer;
    }

    function current(x) {
        if (!arguments.length) return _current;
        _current = x;
    }

    var featureLayer = {

        draw: draw,

        data: data,

        addTo: addTo,

        current: current
    };

    return d3.rebind(featureLayer, event, "on");
};
