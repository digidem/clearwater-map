// Can display multiple collections of geojson features in the same layer,
// each collection with its own g, class and max zoom.

cwm.layers.FeatureLayer = function(id) {

    var g,
        mapContainer,
        map,
        features,
        label,
        mouseoverLabel,
        featureCollectionCount = 0,
        featureData =[];

    var projectionStream = d3.geo.transform({
        point: function(x, y) {
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

    d3.select(window).on("resize." + id, setMaxZooms);

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

        var zoom = map.getZoom();
        var extent = map.getExtent();
        var data = featureData.filter(function(d) {
            // Only draw features that either overlap with the map view, or, if it is
            // Ecuador, do not draw if beyond the max zoom.
            return extent.coversBounds(d.bounds()) && (d.id() !== "Ecuador" || zoom < (d._maxZoom + 1));
        });

        // update the features to their new positions
        // If beyond their max zoom, fade them out
        // Do not display features outside the map
        features = g.selectAll("path")
            .data(data, function(d) {
                return d.id();
            });

        features.enter()
            .append("path")
            .on("mouseover", showLabel)
            .on("mouseout", hideLabel);

        features.attr("d", pathGenerator)
            .style("fill-opacity", function(d) {
                return Math.min(Math.max(d._maxZoom + 1 - zoom, 0), 1) * 0.6;
            })
            .classed("outline", function(d) {
                return zoom > d._maxZoom;
            });

        features.exit().remove();

        drawLabel();
        return featureLayer;
    }

    function data(collection) {
        // add these features to the features already in the layer
        featureData = collection;
        setMaxZooms();
        draw();
        return featureLayer;
    }

    function addTo(_) {
        map = _;
        map.addLayer(featureLayer);
        mapContainer = d3.select(map.parent);
        g = cwm.render.SvgContainer(mapContainer)
            .append('g')
            .attr("class", id);

        return featureLayer;
    }

    var featureLayer = {

        name: id,

        draw: draw,

        data: data,

        addTo: addTo
    };

    return featureLayer;
};
