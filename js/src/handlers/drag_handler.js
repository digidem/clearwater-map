/**
 * ModestMaps handler to add D3 drag functionality to the map
 */
cwm.handlers.DragHandler = function() {
    var handler = {},
        map,
        parent;

    var drag = d3.behavior.drag()
        .on("drag", pan)
        .on("dragstart", function() {
          parent.classed("dragging", true);
          d3.event.sourceEvent.stopPropagation(); // silence other listeners
        })
        .on("dragend", function () {
          parent.classed("dragging", false);
          //map.flightHandler.setOverride();
        });

    function pan () {
      map.panBy(d3.event.dx, d3.event.dy);
    }

    handler.init = function(m) {
        map = m;
        parent = d3.select(map.parent).call(drag);
    };

    handler.remove = function() {
        parent.on('mousedown.drag', null);
    };

    return handler;
};