cwm.views.Popup = function() {
    var map,
        pointProject,
        popup,
        popupInner,
        popupOuter,
        w,
        h,
        event = d3.dispatch("hide", "changed");

    var templates = cwm.Templates();

    popup = {
        show: function(d) {
            var size = d3.event.type === "click" ? "large" : "small";
            if (d !== popupInner.datum()) event.changed(popupInner.datum());
            if (popupInner.classed("large") && d === popupInner.datum()) size = "large";
            popupInner
                .datum(d)
                .html(templates("popup-" + size))
                .style("display", "block")
                .classed("large", (size === "large"))
                .transition()
                .duration(20)
                .style("opacity", 1);

            w = popupInner.dimensions()[0];
            h = popupInner.dimensions()[1];

            popup.move();
        },

        active: function() {
            return popupInner.style("opacity") > 0 && popupInner.datum();
        },

        move: function() {
            var current = map.current();
            var d = popupInner.datum();

            if (current.section === "installations" || (current.section === "communities" && current.communities === d.parent)) {
                var coord = pointProject.apply(this, popupInner.datum().geometry.coordinates);
                MM.moveElement(popupOuter.node(), new MM.Point(coord[0], coord[1]));

                var mapWidth = map.dimensions.x;

                popupInner
                    .classed("top-right", mapWidth - coord[0] > w && coord[1] > h)
                    .classed("bottom-right", mapWidth - coord[0] > w && coord[1] <= h)
                    .classed("top-left", mapWidth - coord[0] <= w && coord[1] > h)
                    .classed("bottom-left", mapWidth - coord[0] <= w && coord[1] <= h);
            } else {
                popup.hide(d);
            }
        },

        hide: function(d) {
            if (d3.event && d3.event.type === "mouseleave" && popupInner.classed("large")) return;
            popupInner
                .transition()
                .duration(20)
                .style("opacity", 0)
                .each("end", function() {
                    d3.select(this)
                        .classed("large", false)
                        .style("display", "none");
                    event.hide(d);
                });
        },

        map: function(x) {
            map = x;
            pointProject = map.pointProject();
            var container = d3.select(map.parent);
            popupInner = cwm.render.PopupContainer(container)
                .on("mouseenter", popup.show)
                .on("mouseleave", popup.hide)
                .on("click", function(d) {
                    d3.event.stopPropagation();
                    popup.show(d);
                    map.on("click").call(this, d);
                });
            popupOuter = container.select("div.marker-tooltip");
        }
    };

    return d3.rebind(popup, event, "on");
};
