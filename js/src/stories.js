cwm.Stories = function(container) {

    var PIXELS_PER_MS = 1,
        stories,
        start,
        running,
        abort,
        abortCallback,
        direction,
        places = {},
        _missionControl,
        ease = d3.ease("quad-in-out"),
        containerHeight = d3.select(container.node().parentNode).dimensions()[1],
        dimensionsCache = {},
        _duration = containerHeight * 2,
        event = d3.dispatch('click', 'moved');

    var templates = cwm.Templates();

    var topDiv = container.append("div").attr("class", "top-headings").on("click", onClick);
    var nextDiv = container.append("div").attr("class", "next-headings");

    d3.select(window).on("resize.stories", function onResize() {
        containerHeight = d3.select(container.node().parentNode).dimensions()[1];
        dimensionsCache = {};
    });

    function go() {
        if (!to()) return stories;
        start = Date.now();

        if (!_duration) duration(getOptimalTime());

        if (running) {
            stop(function() {
                go();
            });
        } else {
            d3.timer(loop);
        }

        return stories;
    }

    function stop(callback) {
        abort = true;
        abortCallback = callback;
    }

    function from(x) {
        if (!arguments.length) return places.from;
        places.from = x;
        setDirection();
        return stories;
    }

    function to(x) {
        if (!arguments.length) return places.to;
        places.to = x;
        setDirection();
        return stories;
    }

    function duration(x) {
        if (!arguments.length) return _duration;
        _duration = Math.max(containerHeight + 200, x);
        return stories;
    }

    function getOptimalTime() {
        return 2 * containerHeight / PIXELS_PER_MS;
    }

    function setDirection() {
        if (places.from instanceof cwm.Place && places.to instanceof cwm.Place) {
            direction = places.from._index <= places.to._index ? 1 : -1;
        }
    }

    function loop() {
        var now = Date.now();
        if (abort) {
            abort = false;
            if (abortCallback) abortCallback();
            abortCallback = undefined;
            return true;
        } else {
            var t = ease(Math.min(1, (now - start) / _duration));
            render(t);
            return t >= 1;
        }
    }

    function render(t) {
        if (!places.to) return;
        if (!places.from) from(places.to);

        places.from._offset = -t * direction * _duration + containerHeight;
        places.to._offset = (1 - t) * direction * _duration + containerHeight;

        renderNextHeading();
        renderArticles();
        renderTopHeading();
        //



        return stories;
    }

    function renderArticle(selection) {
        selection.attr("id", function(d) {
                return d.id();
            })
            .attr("class", function(d) {
                return d.collection.id();
            })
            .style("position", "absolute")
            .style("bottom", "100%")
            .html(templates);
    }

    function renderArticles() {
        var articles = container.selectAll("article")
            .data([places.from, places.to], function(d) {
                return d.id();
            });
        
        articles.enter()
            .append("article")
            .call(renderArticle);

        articles.style(cwm.util.transformProperty, function(d) { 
            return translate(0, d._offset);
        });

        articles.exit().remove();
    }

    function renderTopHeading() {
        var heading, offset;

        // Identify which story will be rendered above the other
        var upperStory = direction === 1 ? places.from : places.to;
        var lowerStory = direction === 1 ? places.to : places.from;

        var storyOffsetTop = upperStory._offset - height(upperStory);

        // If the lowerStory is not a child of upperStory...
        if (!upperStory.children || !~upperStory.children.indexOf(lowerStory)) {
            // the top heading is the upperStory's parent
            heading = upperStory.parent;
            // Except if lower story has a different parent, and topStory is scrolled up
            if (upperStory.parent !== lowerStory.parent && upperStory._offset <= 0) {
                heading = lowerStory.parent;
            }
        } else {
            // Whilst topStory is on the screen, topHeading is always from upperStory.parent.
            if (upperStory._offset > height(upperStory) - height(upperStory, "div.image-wrapper")) {
                heading = upperStory.parent;
            } else {
                heading = upperStory;
            }
        }

        // This gets funky. It moves the top header in and out depending on the destination
        // Would be great to simplify this, but this is the best I can do for now.
        if (upperStory.parent !== lowerStory.parent || upperStory.children && ~upperStory.children.indexOf(lowerStory)) {
            offset = function() {
                var height = this.__height__ || (this.__height__ = d3.select(this).dimensions()[1]);
                return Math.min(0,  storyOffsetTop - height);
            };
            if ((!upperStory.children || !~upperStory.children.indexOf(lowerStory)) && upperStory.parent !== lowerStory.parent && upperStory._offset <= 0) {
                offset = function() {
                    var height = this.__height__ || (this.__height__ = d3.select(this).dimensions()[1]);
                    return Math.min(0, - upperStory._offset - height);
                };
            } else if (upperStory.children && ~upperStory.children.indexOf(lowerStory) && upperStory._offset <= height(upperStory) - height(upperStory, "div.image-wrapper")) {
                offset = d3.functor(0);
            }
        } else {
            offset = d3.functor(0);
        }

        var data = (heading) ? [heading] : [];

        // This part actually deals with rendering the top heading once 
        // we have decided what it should be and calculated its offset on the screen

        var topHeadings = topDiv.selectAll("div")
            .data(data, function(d) {
                return d.id();
            });

        topHeadings.enter()
            .append("div")
            .html(function(d) {
                return templates(d).match(/<h\d.*<\/h\d>/)[0];
            })
            .classed("active", true)
            .append("button");

        topHeadings.style(cwm.util.transformProperty, function(d) {
                return translate(0, offset.call(this));
            });

        topHeadings.exit().remove();
    }

    function renderNextHeading(time) {
        var heading, offset = 0;

        // Identify which story will be rendered above the other
        var upperStory = direction === 1 ? places.from : places.to;
        var lowerStory = direction === 1 ? places.to : places.from;

        var storyOffsetBottom = upperStory._offset + containerHeight;

        if (lowerStory._offset > containerHeight + height(lowerStory)) {
            heading = upperStory._next;
        } else if (lowerStory._offset > containerHeight + height(lowerStory, "div.image-wrapper") - height(lowerStory._next, "h1,h2") * 2 && upperStory._next === lowerStory) {
            heading = upperStory._next;
        } else {
            heading = lowerStory._next;
            offset = lowerStory._offset - containerHeight;
        }

        var data = (heading) ? [heading] : [];

        var nextHeadings = nextDiv.selectAll("div")
            .data(data,function(d) {
                return d.id();
            });

        nextHeadings.enter()
            .append("div")
            .on("click", onClick)
            .html(function(d) {
                return templates(d).match(/<h\d.*<\/h\d>/)[0];
            });

        nextHeadings.style(cwm.util.transformProperty, function(d) {
                return translate(0, offset);
            });

        nextHeadings.exit().remove();

        if (heading) {
            var h = height(heading, "h1, h2");
            lowerStory._offset -= h;
            if (upperStory !== lowerStory) {
                upperStory._offset -= h;
            }
        }
    }

    function height(d, selector) {
        var h,
            created,
            cacheId = selector ? d.id() + "~" + selector : d.id();

        if (dimensionsCache[cacheId]) return dimensionsCache[cacheId];
        
        renderedArticle = d3.select("#" + d.id());

        if (!renderedArticle.node()) {
            renderedArticle = container.append("article")
                .datum(d)
                .call(renderArticle);
            created = true;
        }

        if (typeof selector === "string") {
            h = renderedArticle.select(selector).dimensions()[1];
        } else {
            h = renderedArticle.dimensions()[1];
        }

        dimensionsCache[cacheId] = h;

        if (created) {
            renderedArticle.remove();
        }

        return h;
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

    stories = {
        t: render,
        go: go,
        stop: stop,
        from: from,
        to: to,
        duration: duration,
        getOptimalTime: getOptimalTime
    };

    return d3.rebind(stories, event, "on");
};
