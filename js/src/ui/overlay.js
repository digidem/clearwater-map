cwm.views.Overlay = function(container) {
    var overlayDiv = container.select("#overlay");
    var shown = {};
    var count = 0;

    shown["overlay-installations"] = true;

    overlayDiv.on("click", function() {
        hide();
    });

    function hide() {
        overlayDiv.selectAll(".overlay")
                .transition()
                .style("opacity", 0)
                .each("end", function() {
                    d3.select(this).style("display", "none");
                });
            container.selectAll("svg, button.nav").style("z-index", 0);
    }

    return {
        show: function(d) {
            var id = cwm.util.sanitize(d.collection.id()).replace(/^id-/, "overlay-");
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
            if (id === "overlay-installations") count += 1;
            if (count % 5 === 3 && count <= 15) shown["overlay-installations"] = false;
        },

        hide: hide
    };
};
