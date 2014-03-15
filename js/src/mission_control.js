cwm.MissionControl = function(container) {
    var missionControl,
        initialized,
        _stories,
        _places,
        _map,
        time = 0,
        duration = 0,
        from,
        to,
        pendingRedraw,
        storyOverride,
        scrolling,
        direction, 
        adjusting,
        ease = d3.ease("quad-in-out"),
        event = d3.dispatch("scroll");

    d3.select(window).on("resize", requestRedraw);

    var navigation = cwm.Navigation(container).on("click", go);

    container.call(cwm.render.NavButton)
        .on("click", function(d) {
            if (d3.event.target.tagName === "BUTTON") {
                d3.event.stopPropagation();
                navigation.toggle();
            }
        });

    // from https://github.com/mbostock/d3/pull/1050/files
    if ('onwheel' in document) {
        d3_behavior_zoom_wheel = 'wheel';
        d3_behavior_zoom_delta = function() {
            return -d3.event.deltaY * (d3.event.deltaMode ? 20 : 1);
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
        setTo(_places[1]);
        setFrom(_places[0]);
        _map.current(_stories.getCurrent(0));
        move(0);

        navigation.data(_places.filter(function(d) {
            return d.children.length;
        }));

        container.selectAll("#map,#stories")
            .call(d3.keybinding()
                .on("arrow-down", onArrowKey("down"))
                .on("arrow-up", onArrowKey("up")))
            .on(d3_behavior_zoom_wheel, onMouseWheel)
            .on('keyup', function() {
                //adjusting = window.setTimeout(scrollToNearest, 50);
            });
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
        move(-d3_behavior_zoom_delta());
        // If we stop scrolling for 500ms, move to the next place if it is close.
        //adjusting = window.setTimeout(scrollToNearest, 200);
    }

    function stop() {

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
            if (d3.event.target.tagName === "BUTTON") {
                d3.event.stopPropagation();
                navigation.toggle();
            } else {
                if (d) go(d);
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
        return missionControl;
    }

    function move(delta) {
        if (scrolling) return;
        // Limit how much the map moves on each tick
        delta = Math.max(-100, Math.min(100, delta));

        time = time + delta;
        if (time < 0) {
            if (_places[_places.indexOf(from) - 1]) {
                setTo(from);
                setFrom(from._prev);
                time = time + duration;
            } else {
                time = 0;
            }
        } else if (time >= duration) {
            if (_places[_places.indexOf(to) + 1]) {
                time = time - duration;
                setFrom(to);
                setTo(to._next);
            } else {
                time = duration;
            }
        }

        requestRedraw();

        return missionControl;
    }

    function requestRedraw(cb) {
        if (!pendingRedraw) pendingRedraw = window.requestAnimationFrame(redraw);

        function redraw() {
            var t = time / duration;
            if (!storyOverride) _map.t(t);
            _stories.t(t);
            _map.current(_stories.getCurrent(t));
            pendingRedraw = false;
            if (cb) cb();
            cb = void 0;
        }
    }

    function setFrom(d) {
        _stories.from(d);
        _map.from(d);
        from = d;
        setDuration();
        return missionControl;
    }

    function setTo(d) {
        if (!arguments.length) return to;
        to = d;
        _stories.to(d);
        _map.to(d);
        setDuration();
        return missionControl;
    }

    function setDuration() {
        if (to) duration = Math.max(_map.getOptimalTime(), _stories.getOptimalTime());
        _stories.duration(duration);
    }

    function go(d, callback) {
        if (typeof callback !== "function") callback = null;
        var start = +new Date();
        var offset = time;
        scrolling = true;

        if (d === from) {
            direction = -1;
            scroll();
        } else if (d === to) {
            direction = 1;
            scroll();
        } else {
            var i = _places.indexOf(d);
            if (i === -1) {
                _map.to(d).ease.optimal(void 0, void 0, function() {
                    scrolling = false;
                    _map.to(_stories.to());
                });
            } else if (i < _places.indexOf(from)) {
                if (time === 0) {
                    setTo(from);
                    setFrom(d);
                    time = duration;
                    go(d);
                } else if (time === duration) {
                    setFrom(d);
                    time = duration;
                    go(d);
                } else {
                    go(from, function() { 
                        go(d); 
                    });
                }
            } else { // if (_places.indexOf(d) > _places.indexOf(to))
                if (time === duration) {
                    setFrom(to);
                    setTo(d);
                    time = 0;
                    go(d);
                } else if (time === 0) {
                    setTo(d);
                    go(d);
                } else {
                    go(to, function() { 
                        go(d); 
                    });
                }
            }
        }

        function scroll() {
            var delta = (+new Date()) - start;
            time = offset + (delta * direction);
            if (time >= 0 && time <= duration) {
                requestRedraw(scroll);
            } else {
                time = direction === 1 ? duration : 0;
                requestRedraw(function() {
                    setFrom(d);
                    setTo(_places[_places.indexOf(d) + 1] || d);
                    time = 0;
                    scrolling = false;
                    if (callback) callback();
                    callback = void 0;
                });
            }
        }

        return missionControl;
    }

    missionControl = {
        flightplan: flightplan,
        stories: stories,
        map: map,
        go: go,
        initialize: initialize
    };

    return d3.rebind(missionControl, event, "on");

};
