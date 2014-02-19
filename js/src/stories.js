cwm.Stories = function(container) {

    var stories,
        storyData,
        containerHeight = d3.select(container.node().parentNode).dimensions()[1],
        event = d3.dispatch('click');

    var templates = cwm.Templates();

    var topDiv = container.append("div").attr("class", "top-headings");
    var nextDiv = container.append("div").attr("class", "next-headings");

    d3.select(window).on("resize.stories", onResize);

    function onResize() {
        containerHeight = d3.select(container.node().parentNode).dimensions()[1];
        container.select("article")
            .each(setupDimensions)
            .each(setupHeadings);
    }

    function render(time) {
        renderArticles(time);
        renderTopHeadings(time);
        renderNextHeadings(time);
    }

    function headingsFilter(d) {
        return d.collection.id() !== "communities" && d.collection.id() !== "installations";
    }

    function setupDimensions(d) {
        var selection = d3.select(this);
        d._height = {
            total: selection.dimensions()[1],
            image: selection.select("div.image-wrapper").dimensions()[1],
            heading: selection.select("h1, h2").dimensions()[1],
            text: selection.dimensions()[1] - selection.select("div.image-wrapper").dimensions()[1]
        };
    }

    function setupHeadings(d) {
        var selection = d3.select(this);

        d._heading = {
            html: selection.select("h1, h2").html(),
            tagName: selection.select("h1, h2").node().tagName.toLowerCase()
        };

        if (headingsFilter(d)) {
            var scrollOut,
                headings = storyData.filter(headingsFilter),
                nextHeading = headings[headings.indexOf(d) + 1],
                featuredFilter = storyData.show();

            // If the children are also headings...
            if (d._next === nextHeading) {
                scrollOut = function(time) {
                    var enter = 0, exit;
                    // Push it up when the child pushes against it...
                    // But reappear when the child's last descendant scrolls out of view
                    for (var i = 0; i < d.children.length; i++) {
                        enter = d.children[i]._lastDescendant._time + containerHeight - d._next._height.heading;
                        exit = d.children[i]._time + containerHeight - d.children[i]._height.total - d._height.heading - d._next._height.heading;
                        if (time >= exit && time < enter) return exit;
                    }
                    return Infinity;
                    // (I know this is a headfuck. Have been trying to think of a simpler way, but this is the best I could do)
                };
            } else if (nextHeading) {
                scrollOut = d._lastDescendant._time + containerHeight - d._next._height.heading;
            } else {
                scrollOut = Infinity;
            }

            d._topHeading = {
                appear: d._time + containerHeight - d._height.text - d._next._height.heading,
                scrollOut: d3.functor(scrollOut)
            };
        }

        d._nextHeading = {
            appear: d._prev._time

        };
    }

    function renderArticles(time) {
        var articles = container.selectAll("article")
            .data(storyData,function(d) {
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
            .html(templates)
            .each(setupDimensions)
            .each(setupHeadings);

        articles.style(cwm.util.transformProperty, function(d) { 
            var offset = parseInt(d._time - time);
            offset = Math.min(Math.max(offset + containerHeight, 0), 3000) - d._next._height.heading;
            return MM._browser.webkit3d ?
                "translate3d(0," + offset + "px, 0)" :
                "translate(0," + offset + "px)"; 
        });
    }

    function renderTopHeadings(time) {
        var data = storyData.filter(headingsFilter);

        var topHeadings = topDiv.selectAll("div")
            .data(data, function(d) {
                return d.id();
            });

        topHeadings.enter()
            .append("div")
            .on("click", onClick)
            .each(appendHeadings);

        topHeadings.style(cwm.util.transformProperty, function(d) {
                var offset = Math.min(0, d._topHeading.scrollOut(time) - time);
                if (d._topHeading.appear > time) offset -= 1000;
                return translate(0, offset);
            });

        topHeadings.exit().remove();
    }

    function renderNextHeadings(time) {
        var nextHeadings = nextDiv.selectAll("div")
            .data(storyData,function(d) {
                return d.id();
            });

        nextHeadings.enter()
            .append("div")
            .on("click", onClick)
            .each(appendHeadings);

        nextHeadings.style(cwm.util.transformProperty, function(d) {
                var offset = Math.max(0, d._prev._time - time);
                if (d._time - d._height.text <= time ) offset += 1000;
                return translate(0, offset);
            });

        nextHeadings.exit().remove();
    }

    function appendHeadings(d) {
        d3.select(this).append(d._heading.tagName)
            .html(d._heading.html);
    }

    function onClick(d) {
        d3.event.preventDefault();
        event.click(d);
    }

    function translate(x, y) {
        return MM._browser.webkit3d ?
                    "translate3d(" + x + "px," + y + "px, 0)" :
                    "translate(" + x + "px," + y + "px)";
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

    return d3.rebind(stories, event, "on");
};
