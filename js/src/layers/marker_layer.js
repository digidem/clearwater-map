cwm.layers.MarkerLayer = function() {

    var map,
        g,
        markerData,
        markerLayer,
        markerInteraction;

    var markers = cwm.views.Markers();

    function draw() {
        // don't do anything if we haven't been attached to a map yet
        // (Modest Maps attaches the map to the layer when it is added to the map)
        if (!map || !markerData) return;

        var current = map.current();

        // filter markers that are within the current extent of the map
        var data = markerData.filter(function(d) {
            for (var key in current) {
                if (current[key] === d.parent) return true;
            }
        });

        // Join the filtered data for markers in the current map extent
        var update = g.selectAll(markers.tagName()).data(data, function(d) {
            return d.id();
        });

        // For any new markers appearing in the extent, append a circle
        // and add the interaction.
        update.enter()
            .append(markers.tagName())
            .call(markers.show)
            .call(markers.addInteraction);

        // After appending the circles to the enter() selection,
        // it is merged with the update selection.
        // Move all displayed markers to the correct location on the map
        update.call(markers.move);

        // For markers leaving the current extent, remove them from the DOM.
        update.exit()
            .call(markers.move)
            .call(markers.hide);

        return markerLayer;
    }

    function data(collection) {
        if (!arguments.length) return markerData;
        markerData = collection;
        markerLayer.name = collection.id();
        g.classed(markerLayer.name, true);
        draw();
        return markerLayer;
    }

    function addTo(x) {
        map = x;
        map.addLayer(markerLayer);
        markers.map(map);
        var mapContainer = d3.select(map.parent);
        g = cwm.render.SvgContainer(mapContainer)
            .append('g')
            .attr("class", markerLayer.name);

        return markerLayer;
    }

    markerLayer = {
        draw: draw,

        data: data,

        addTo: addTo,

        showPopup: markers.showPopup
    };

    return markerLayer;
};
