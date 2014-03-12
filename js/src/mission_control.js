cwm.MissionControl = function(container) {
    var missionControl,
        initialized,
        _stories,
        _places,
        _map,
        _maxTime,
        time = 0,
        _from,
        _to,
        start,
        end,
        timelineStart,
        timelineEnd,
        speed = 1,
        pendingRedraw,
        scrolling,
        adjusting,
        easeOverride,
        ease = d3.ease("cubic-in-out"),
        event = d3.dispatch("scroll");

    var navigation = cwm.Navigation(container);

    // from https://github.com/mbostock/d3/pull/1050/files
    if ('onwheel' in document) {
        d3_behavior_zoom_wheel = 'wheel';
        d3_behavior_zoom_delta = function() {
            return -d3.event.deltaY * (d3.event.deltaMode ? 30 : 1);
        };
    } else if ('onmousewheel' in document) {
        d3_behavior_zoom_wheel = 'mousewheel';
        d3_behavior_zoom_delta = function() {
            return d3.event.wheelDelta;
        };
    } else {
        d3_behavior_zoom_wheel = 'MozMousePixelScroll';
        d3_behavior_zoom_delta = function() {
            return -d3.event.detail;
        };
    }

    function initialize() {
        console.log(_places[0], _places[1], _places);
        to(_places[1]);
        from(_places[0]);
        _map.t(0);
        _stories.t(0);
        container.selectAll("#map,#stories")
            .call(d3.keybinding()
                .on("arrow-down", onArrowKey("down"))
                .on("arrow-up", onArrowKey("up")))
            .on(d3_behavior_zoom_wheel, onMouseWheel)
            .on('keyup', function() {
                //adjusting = window.setTimeout(scrollToNearest, 50);
            });
        initialized = true;
    }


    function onArrowKey(direction) {
        return function() {
            if (adjusting) window.clearTimeout(adjusting);
            if (!scrolling) {
                start = Date.now();
                timelineStart = timeline;
                timelineEnd = direction === "up" ? 0 : 99999;
                end = start + Math.abs(timelineEnd - timelineStart);
                scroll();
            }
        };
    }

    function onMouseWheel() {
        d3.event.preventDefault();
        stopOtherThingsHappening();
        move(-d3_behavior_zoom_delta());
        // If we stop scrolling for 500ms, move to the next place if it is close.
        //adjusting = window.setTimeout(scrollToNearest, 200);
    }

    function stop() {
        _stories.stop();
        _map.stop();
    }

    function stopOtherThingsHappening() {
        if (adjusting) window.clearTimeout(adjusting);
        if (scrolling) window.cancelAnimationFrame(scrolling);
        scrolling = adjunsting = easeOverride = null;
        ease = d3.ease("linear");
    }

    // Moves the map / scroll to the nearest story

    function scrollToNearest(offset) {
        var adjusted;
        offset = offset || 100;

        stopOtherThingsHappening();

        _places.forEach(function(place) {
            if (Math.abs(place._time - timeline) < offset) {
                go(place, false);
                adjusted = true;
            }
        });

        // If we haven't adjusted the scroll, try again, this time searching a bit further.
        //if (!adjusted) adjusting = window.setTimeout(scrollToNearest, offset + 100, offset + 100);
    }

    function stories(x) {
        _stories = x;
        _stories.on("click", function(d) {
            if (d3.event.srcElement.tagName === "BUTTON") {
                d3.event.stopPropagation();
                navigation.toggle();
            } else {
                go(d);
            }
        });
        return missionControl;
    }

    function map(x) {
        _map = x;
        _map.on("click", go);
        return missionControl;
    }

    function flightplan(x) {
        if (!arguments.length) return _places;
        _places = x;

        // Initial map set up as the data is loaded
        _places.on("add", function(d) {
            // As soon as the top level place is loaded, set up initial map view.
            if (d.collection.id() === "installations") navigation.data(_places.filter(function(d) {
                return d.collection.id() !== "installations";
            }));
            if (!initialized && _places[0] && _places[1] && _places[1].children.length && _places[1].children[0].children.length) {
                // Check we have enough loaded to identify the second map view
                // and set up map movement and event listeners
                // children.children is a hack for now until I figure out a more generic way of 
                // identifying whether the second place is ready and loaded.
                initialize();
            }
        });
        return missionControl;
    }

    function move(delta) {
        var i;
        time = time + delta;
        if (time < 0) {
            if (_places[_from._index - 1]) {
                to(_from);
                from(_places[_from._index - 1]);
                time = time + duration;
            } else {
                time = 0;
            }
        } else if (time > duration) {
            if (_places[_to._index + 1]) {
                time = time - duration;
                from(_to);
                to(_places[_to._index + 1]);
            } else {
                time = 0;
            }
        }
        if (time < 200 || duration - time < 200) _map.current(current());
        _map.t(ease(time / duration));
        _stories.t(time / duration);

        return missionControl;
    }

    function from(d) {
        if (!arguments.length) return _from;
        if (d === _from) return missionControl;
        _stories.from(d);
        _map.from(d);
        _from = d;
        if (_to) {
            duration = Math.max(_map.getOptimalTime(), _stories.getOptimalTime());
            _stories.duration(duration);
        } 
        return missionControl;
    }

    function to(d) {
        if (!arguments.length) return _to;
        if (d === _to) return missionControl;
        _stories.to(d);
        _map.to(d);
        _to = d;
        duration = Math.max(_map.getOptimalTime(), _stories.getOptimalTime());
        _stories.duration(duration);
        return missionControl;
    }

    function go(d) {
        _map.to(d).from(_map.coordinate);
        _stories.to(d);

        duration = Math.max(_map.getOptimalTime(), _stories.getOptimalTime());

        queue()
            .defer(_map.duration(duration).go)
            .defer(_stories.duration(duration).go)
            .await(function(err) {
                _stories.from(d);
                _map.current(current());
            });

        return missionControl;
    }

    // returns the previous place on the flightplan
    function prev() {
        var i = 0;
        while (_places[i] && _places[i]._time < timeline) i++;
        return _places[i - 1];
    }

        // returns the next place on the flightplan
    function next() {
        var i = 0;
        while (_places[i] && _places[i]._time < timeline) i++;
        return _places[i];
    }

    function draw() {
        var t, i = 0;
        // move things
        if (!easeOverride) {
            while (_places[i] && _places[i]._time < timeline) i++;

            if (_places[i] && _places[i - 1]) {
                t = (timeline - _places[i - 1]._time) / (_places[i]._time - _places[i - 1]._time);
            } else {
                t = 0;
            }

            (_places[i - 1] || _places[i]).ease.t(t + 1e-9);
        }

        _map.layers.forEach(function(layer) {
            if (layer.current) layer.current(current());
        });

        _stories.render(timeline);

        pendingRedraw = false;

        return missionControl;
    }

    // Returns the nearest place 
    function nearest(distance) {
        return time / duration < 0.5 ? _from || _to : _to || _from;
    }

    function current() {
        var section,
            _current = {},
            d = nearest();

        _current.place = d;
        _current.section = d.collection.id();

        while (d) {
            section = d.collection.id();
            _current[section] = d;
            d = d.parent;
        }

        return _current;
    }

    missionControl = {
        flightplan: flightplan,
        stories: stories,
        map: map,
        draw: draw,
        go: go,
        prev: prev,
        next: next,
        time: time,
        current: current
    };

    return d3.rebind(missionControl, event, "on");

};
