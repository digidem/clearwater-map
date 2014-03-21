cwm.layers.MarkerLayer = function() {

    var id = "markers",
        map,
        g,
        markerData,
        markerSize = d3.functor(8),
        markerLayer,
        mapContainer,
        markerInteraction,
        event = d3.dispatch("click");

    markers = cwm.views.Markers();

    // Project markers from map coordinates to screen coordinates
    function project(d) {
        var point = map.locationPoint({
            lon: d.geometry.coordinates[0],
            lat: d.geometry.coordinates[1]
        });
        //return [~~(0.5 + point.x), ~~ (0.5 + point.y)];
        return [point.x, point.y];
    }

    function moveMarkers(selection) {
        selection.attr("cx", function(d) {
                return project(d)[0];
            })
            .attr("cy", function(d) {
                return project(d)[1];
            });
    }

    function draw() {
        // don't do anything if we haven't been attached to a map yet
        // (Modest Maps attaches the map to the layer when it is added to the map)
        if (!map || !markerData) return;

        var extent = map.getExtent();
        var zoom = map.getZoom();
        var current = map.current();

        // filter markers that are within the current extent of the map
        var data = markerData.filter(function(d) {
            for (var key in current) {
                if (current[key] === d.parent) return true;
            }
        });

        // Join the filtered data for markers in the current map extent
        var update = g.selectAll("circle").data(data, function(d) {
            return d.id();
        });

        // For any new markers appearing in the extent, append a circle
        // and add the interaction.
        update.enter()
            .append("circle")
            .attr("r", 0)
            .on("click.marker", event.click)
            .call(markers.show)
            .call(markerInteraction.add);

        // After appending the circles to the enter() selection,
        // it is merged with the update selection.
        // Move all displayed markers to the correct location on the map
        update.call(moveMarkers);

        // For markers leaving the current extent, remove them from the DOM.
        update.exit()
            .call(moveMarkers)
            .call(markers.hide);
        
        markerInteraction.drawPopup(project, zoom);

        return markerLayer;
    }

    function data(collection) {
        markerData = collection;
        markerLayer.name = collection.id();
        g.classed(markerLayer.name, true);
        draw();
        return markerLayer;
    }

    function addTo(_) {
        map = _;
        map.addLayer(markerLayer);
        markers.map(map);
        mapContainer = d3.select(map.parent);
        markerInteraction = cwm.handlers.MarkerInteraction(mapContainer);
        markerInteraction.on("click", event.click);
        g = cwm.render.SvgContainer(mapContainer)
            .append('g')
            .attr("class", id);

        return markerLayer;
    }

    markerLayer = {

        draw: draw,

        data: data,

        addTo: addTo
    };

    return d3.rebind(markerLayer, event, "on");
};
