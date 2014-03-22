cwm.views.Markers = function() {
    var map,
        pointProject,
        isBouncing,
        tagName = "circle",
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
        if (d.attr("featured") === true) window.clearTimeout(isBouncing);
        d3.select(this)
            .classed("grown", true)
            .transition()
            .duration(500)
            .ease("elastic", 1.5)
            .attr("r", markerSize * 1.8);
    }

    function shrink(data) {
        d3.select(".grown")
            .classed("grown", function(d) {
                return data === d;
            })
            .transition()
            .attr("r", markerSize);
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
            .attr("r", markerSize * 2)
            .style("stroke-width", 6)
            .each("end", function() {
                d3.select(this)
                    .transition()
                    .duration(1800)
                    .ease("elastic", 1, 0.2)
                    .attr("r", markerSize)
                    .style("stroke-width", 3);
                bounceFeatured(selection);
            });
        
    }

    return {
        tagName: function(x) {
            if (!arguments.length) return tagName;
            tagName = x;
        },

        show: function(selection) {
            selection
                .classed("featured", function(d) {
                    return d.attr("featured");
                })
                .sort(sortFromLocation(map.getCenter()))
                .attr("r", 0)
                .transition()
                .duration(1000)
                .delay(function(d, i) {
                    return i * 20;
                })
                .ease("elastic", 2)
                .attr("r", markerSize);

            selection
                .sort(sortFeaturedLast);
        },

        addInteraction: function(selection) {
            selection
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
            selection.transition()
                .attr("r", 0)
                .each("end", function() {
                    d3.select(this).remove();
                });
        },

        map: function(x) {
            map = x;
            popup.map(map);
            pointProject = map.pointProject();
        }
    };
};
