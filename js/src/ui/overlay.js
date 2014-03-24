cwm.views.Overlay = function(container) {
    var overlayDiv = container.select("#overlay");
    var shown = {};

    return {
        show: function(id) {
            id = cwm.util.sanitize(id).replace(/^id-/, "overlay-");
            if (!shown[id]) {
                overlayDiv.selectAll("#" + id + ".overlay")
                    .style("display", "block")
                    .transition()
                    .style("opacity", 1)
                    .each(function() {
                        container.selectAll("svg, button.nav").style("z-index", 2);
                        shown[id] = true;
                    });
                }
        },

        hide: function() {
            overlayDiv.selectAll(".overlay")
                .transition()
                .style("opacity", 0)
                .each("end", function() {
                    d3.select(this).style("display", "none");
                });
            container.selectAll("svg, button.nav").style("z-index", 0);
        }
    };
};
