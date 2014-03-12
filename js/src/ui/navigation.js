cwm.Navigation = function(container) {
    var data, open, navigation = {};

    var navContainer = container.append("nav")
        .style("display", "none");

    var navUl = navContainer.append("ul").style("opacity", 0);

    var templates = cwm.Templates();

    function render() {
        var menuItems = navUl.selectAll("li")
            .data(data, function(d) {
                return d.id();
            });
        
        menuItems.enter()
            .append("li")
            .html(function(d) {
                return templates(d).match(/<h\d.*<\/h\d>/)[0];
            });

        menuItems.exit().remove();
    }

    navigation.data = function(x) {
        if (!arguments.length) return data;
        data = x;
        render();
        return navigation;
    };

    navigation.toggle = function() {
        if (open) {
            navigation.close();
        } else {
            navigation.open();
        }
    };

    navigation.close = function() {
        container.on("click.nav", null);

        navUl
            .transition()
            .duration(500)
            .style("opacity", 0)
            .each("end", function() {
                navContainer.style("display", "none");
            });

        container.classed("nav-open", false);

        open = false;
    };

    navigation.open = function() {
        container.on("click.nav", navigation.close);

        navContainer
            .style("display", "block");

        navUl
            .transition()
            .duration(500)
            .style("opacity", 1);

        container.classed("nav-open", true);

        open = true;
    };

    return navigation;
};
