cwm.handlers.DragHandler = function() {
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
};