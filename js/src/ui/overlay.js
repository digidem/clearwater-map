cwm.views.Overlay = function(container) {
    var overlayDiv = container.select("#overlay");
    var shown = {};

    return {
        show: function(id) {
            if (!shown[id]) {
                overlayDiv.selectAll(".overlay")
                    .filter(function() {
                        return d3.select(this).attr("id") === id.toLowerCase();
                    })
                    .style("display", "block")
                    .transition()
                    .style("opacity", 1);
                container.selectAll("svg, button.nav").style("z-index", 2);
                shown[id] = true;
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
