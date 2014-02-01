cwm.Stories = function(container) {

    var stories,
        storyData,
        height = d3.select(container.node().parentNode).dimensions()[1];

    var templates = cwm.Templates();

    d3.select(window).on("resize.stories", function() { height = d3.select(container.node().parentNode).dimensions()[1]; });

    function render(time) {
var data = storyData.filter(function(d) { 
                console.log(d._time, time); 
                return Math.abs(d._time - time) < 3000; 
            });
        console.log(data);

        var articles = container.selectAll("article")
            .data(data,
                function(d) {
            return d.id();
        });
        
        articles.enter()
            .append("article")
            .attr("id", function(d) {
                return d.id();
            })
            .attr("class", function(d) {
                return d.collection.id();
            })
            .style("position", "absolute")
            .style("bottom", "100%")
            .html(templates);

        articles.style(cwm.util.transformProperty, function(d) { 
            var offset = parseInt(d._time - time);
            //console.log(offset, height);
            offset = Math.min(Math.max(offset + height, 0), 3000);
            return MM._browser.webkit3d ?
                "translate3d(0," + offset + "px, 0)" :
                "translate(0," + offset + "px)"; 
        });
    }

    function data(_) {
        if (!arguments.length) return storyData;
        storyData = _;
        return stories;
    }

    stories = {
        render: render,
        data: data
    };

    return stories;
};
