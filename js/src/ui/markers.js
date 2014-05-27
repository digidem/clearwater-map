cwm.views.Markers = function() {
    var map,
        pointProject,
        stopBouncing,
        tagName = "g",
        markerSize = 8;

    var popup = cwm.views.Popup()
        .on("hide", shrink)
        .on("changed", shrink);

    // Used to sort featured places so they appear above others on the map
    // if the markers overlap

    function sortFeaturedLast(a, b) {
        return (a.attr("featured") === true) ? 1 : 0;
    }

    // Sorts points according to distance from center point of map
    // used for animating `show` making markers appear from center

    function sortFromLocation(location) {
        var loc = location || new MM.Location(0, 0);
        return function(a, b) {
            var ac = a.geometry.coordinates;
            var bc = b.geometry.coordinates;
            var ad = Math.pow(ac[0] - loc.lon, 2) + Math.pow(ac[1] - loc.lat, 2);
            var bd = Math.pow(bc[0] - loc.lon, 2) + Math.pow(bc[1] - loc.lat, 2);
            return d3.ascending(ad, bd);
        };
    }

    function grow(d) {
        if (d.attr("featured") === true) stopBouncing = true;
        d3.select(this)
            .classed("grown", true)
            .transition()
            .duration(500)
            .ease("elastic", 1.5)
            .attr("transform", "scale(1.8)");
    }

    function shrink() {
        d3.select(".grown")
            .filter(function(d) {
                return d !== popup.active();
            })
            .classed("grown", false)
            .transition()
            .attr("transform", "scale(1)");
    }

    function bounceFeatured(selection) {
        selection
            .filter(function(d) {
                return d.attr("featured") === true;
            })
            .transition()
            .delay(function(d,i) {
                return 3000 + (i * 200);
            })
            .duration(180)
            .attr("transform", "scale(2)")
            .each("end", function() {
                d3.select(this)
                    .transition()
                    .duration(1800)
                    .ease("elastic", 1, 0.2)
                    .attr("transform", "scale(1)");
                if (!stopBouncing) {
                    bounceFeatured(selection);
                } else {
                    stopBouncing = false;
                }
            });
        
    }

    return {
        tagName: function(x) {
            if (!arguments.length) return tagName;
            tagName = x;
        },

        show: function(selection) {
            selection
                .sort(sortFromLocation(map.getCenter()))
                .append("circle")
                .classed("featured", function(d) {
                    return d.attr("featured");
                })
                .attr("r", markerSize)
                .attr("transform", "scale(0)")
                .transition()
                .duration(1000)
                .delay(function(d, i) {
                    return i * 20;
                })
                .ease("elastic", 2)
                .attr("transform", "scale(1)");

            selection
                .sort(sortFeaturedLast);
        },

        addInteraction: function(selection) {
            selection
                .selectAll("circle")
                .on("mouseover.animation", grow)
                .on("mouseout.animation", shrink)
                .on("mouseenter.popup", popup.show)
                .on("mouseleave.popup", popup.hide)
                .on("click.popup", function(d) {
                    d3.event.stopPropagation();
                    popup.show(d);
                    map.on("click").call(this, d);
                })
                .call(bounceFeatured);
        },

        move: function(selection) {
            selection.attr("transform", function(d) {
                var coord = pointProject.apply(this, d.geometry.coordinates);
                return "translate(" + coord[0] + "," + coord[1] + ")";
            });
            if (popup.active()) popup.move();
        },

        hide: function(selection) {
            selection
                .selectAll("circle")
                .transition()
                .attr("transform", "scale(0)")
                .each("end", function() {
                    d3.select(this).remove();
                });
        },

        showPopup: popup.show,

        map: function(x) {
            map = x;
            popup.map(map);
            pointProject = map.pointProject();
        }
    };
};
