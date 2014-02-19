cwm.MissionControl = function() {
    var missionControl,
        _stories,
        _places,
        _map,
        _maxTime,
        timeline = 0,
        start,
        end,
        timelineStart,
        timelineEnd,
        speed = 1,
        pendingRedraw,
        scrolling,
        adjusting,
        easeOverride,
        ease = d3.ease("linear"),
        event = d3.dispatch("scroll");

    d3.select(window).on("resize.mc", setEasings);

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

    d3.select("body")
        .call(d3.keybinding()
            .on("arrow-down", onArrowKey("down"))
            .on("arrow-up", onArrowKey("up")))
        .on(d3_behavior_zoom_wheel, onMouseWheel)
        .on('keyup', scrollToNearest);

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
        time(timeline - d3_behavior_zoom_delta());
        // If we stop scrolling for 500ms, move to the next place if it is close.
        adjusting = window.setTimeout(scrollToNearest, 200);
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
        if (!arguments.length) return _places;
        _stories = x;
        _places = _stories.data();
        setEasings();
        _stories.on("click", go);
        return missionControl;
    }

    function map(x) {
        if (!arguments.length) return map;
        _map = x;
        setEasings();
        return missionControl;
    }

    function setEasings() {
        if (!_places || !_map) return;

        _places[0]._time = 0;

        _places.forEach(function(place, i) {
            var ease = place.ease || (place.ease = mapbox.ease().map(_map));
            ease.from(place._extentCoordinate);

            var nextPlace = _places[i + 1];

            if (nextPlace) {
                ease.to(nextPlace._extentCoordinate).setOptimalPath();
                nextPlace._time = place._time + Math.max(ease.getOptimalTime(), 2000);
            } else {
                ease.to(place._extentCoordinate).setOptimalPath();
                _maxTime = place._time;
            }
        });
    }

    function go(place, override) {
        if (typeof place === "string") place = _places.get(place);
        if (scrolling) window.cancelAnimationFrame(scrolling);
        var destination;

        ease = d3.ease("quad-in-out");
        start = Date.now();
        timelineStart = timeline;
        timelineEnd = (typeof place._time !== "undefined") ? place._time : timeline;

        if (override === false) {
            end = start + Math.max(Math.abs(timelineEnd - timelineStart), 500);
        } else {
            destination = place._extentCoordinate;
            easeOverride = _map.ease.from(_map.coordinate.copy()).to(destination).setOptimalPath();
            end = start + Math.max(easeOverride.getOptimalTime(), 2000);
        }

        scrolling = window.requestAnimationFrame(scroll);
    }

    function next() {
        var i = 0;
        while (_places[i] && _places[i]._time < timeline) i++;
        go(_places[i]);
    }

    function scroll() {
        var now = Date.now();
        if (now > end) {
            stopOtherThingsHappening(); 
            time(timelineEnd);
        } else {
            var t = (now - start) / (end - start);
            var delta = ease(t) * (timelineEnd - timelineStart);

            if (easeOverride) easeOverride.t(t);
            time(timelineStart + delta);
            scrolling = window.requestAnimationFrame(scroll);
        }
    }

    function time(x) {
        if (!arguments.length) return _;
        timeline = Math.min(_maxTime, Math.max(0, x));
        if (!pendingRedraw) {
            draw();
            pendingRedraw = false;
        }
        return missionControl;
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
        var place;
        
        distance = (arguments.length) ? distance : Infinity;

        for (var i = 0; i < _places.length; i++) {
            if (Math.abs(_places[i]._time - timeline) < distance) {
                place = _places[i];
                distance = Math.abs(_places[i]._time - timeline);
            }
        }

        return place;
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
        stories: stories,
        map: map,
        draw: draw,
        go: go,
        time: time,
        setEasings: setEasings,
        current: current
    };

    return d3.rebind(missionControl, event, "on");

};
