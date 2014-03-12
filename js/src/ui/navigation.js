cwm.Navigation = function(container) {
    var data, navigation = {};

    var navContainer = container.append("nav");

    var navUl = navContainer.append("ul");

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
        container.classed("nav-open", !container.classed("nav-open"));
    };

    return navigation;
};
