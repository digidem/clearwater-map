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
        offpiste = {},
        direction = 1,
        pendingRedraw,
        storyOverride,
        scrolling,
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
            .on(d3_behavior_zoom_wheel, onMouseWheel);

        d3.select(document)
            .call(d3.keybinding()
                .on("arrow-down", onArrowKey("down"))
                .on("arrow-up", onArrowKey("up"))
                .on("space", go))
            .on('keyup', function() {
                if (adjusting) window.clearTimeout(adjusting);
                adjusting = window.setTimeout(go2Nearest, 200);
            });
    }

    function onArrowKey(direction) {
        return function() {
            if (adjusting) window.clearTimeout(adjusting);
            if (!scrolling) {
                move(direction === "down" ? 50 : -50);
            }
        };
    }

    function onMouseWheel() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        if (adjusting) window.clearTimeout(adjusting);
        move(-d3_behavior_zoom_delta());
        // If we stop scrolling for 200ms, move to the next place if it is close.
        adjusting = window.setTimeout(go2Nearest, 400);
    }

    function stop() {

    }

    // Moves the map / scroll to the nearest story

    function go2Nearest(offset) {
        if (scrolling || offpiste.duration) return;
        var adjusted;
        offset = offset || 200;

        var current = _stories.getCurrent(time/duration);

        if (current.distance < offset ) {
            go(current.place, function() {
                adjusting = scrolling = void 0;
            });
        }

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
        _map.on("click", function(d) {
            if (scrolling) return;
            if (d) {
                if (d.parent && !d.parent.geometry.coordinates && _map.current().place !== d.parent) {
                    go(d.parent);
                } else {
                    go(d);
                }
            } else {
                if (!d3.event.defaultPrevented) mapZoom(d3.mouse(container.node()));
            }
        });

        _map.addCallback("panned", function() {
            if (scrolling) return;
            direction = 1;
            goOffpiste(to);
        });
        _map.addCallback("zoomed", function() {
            if (scrolling) return;
            direction = 1;
            goOffpiste(to);
        });
        return missionControl;
    }

    function goOffpiste(dest) {
        if (adjusting) window.clearTimeout(adjusting);
        scrolling = adjusting = null;
        _map.ease.reset();
        _map.to(dest);
        offpiste.time = 0;
        var storyDuration = direction === 1 ? duration - time : time;
        offpiste.duration = Math.max(_map.getOptimalTime(), storyDuration);
    }

    function mapZoom(point) {
        var installations = _map.getLayer("installations").data();

        var nearest = installations.nearest(_map.coordinateLocation(_map.coordinate));

        var maxZoom = _map.coordLimits[1].zoom;
        var zoom = _map.coordinate.zoom;

        if (zoom > _map.placeExtentCoordinate(nearest.parent).zoom) {
            go(nearest.parent);
        }
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

        if (time < 0 && (!offpiste.duration || offpiste.time === 0)) {
            if (_places[_places.indexOf(from) - 1]) {
                direction = -1;
                if (offpiste.duration) goOffpiste(from._prev);
                setTo(from);
                setFrom(from._prev);
                time = time + duration;
            } else {
                time = 0;
            }
        } else if (time >= duration && (!offpiste.duration || offpiste.time === 0)) {
            if (_places[_places.indexOf(to) + 1]) {
                direction = 1;
                if (offpiste.duration) goOffpiste(to._next);
                time = time - duration;
                setFrom(to);
                setTo(to._next);
            } else {
                time = duration;
            }
        } else if (offpiste.duration) {
            var directionChange = (delta > 0 && direction === -1) || (delta < 0 && direction === 1);
            if (!directionChange) {
                offpiste.time += Math.abs(delta);
            } else if (delta > 0) {
                direction = 1;
                goOffpiste(to);
            } else if (delta < 0) {
                direction = -1;
                goOffpiste(from);
            }
            if (time < 0) time = 0;
            if (time >= duration) time = duration;
        } 

        lastDelta = delta;

        requestRedraw();

        return missionControl;
    }

    function requestRedraw(cb) {
        if (!pendingRedraw) pendingRedraw = window.requestAnimationFrame(redraw);

        function redraw() {
            var t = Math.max(0, Math.min(1, time / duration));
            if (!offpiste.duration) {
                _map.t(t);
            } else {
                var mt = Math.max(0, Math.min(1, offpiste.time / offpiste.duration));
                _map.t(mt);
                if (offpiste.time < 0 || offpiste.time > offpiste.duration) {
                    offpiste = {};
                    _map.from(from);
                    _map.to(to);
                }
            }
            _stories.t(t);
            _map.current(_stories.getCurrent(t));
            pendingRedraw = false;
            if (cb) cb();
            cb = void 0;
        }
    }

    function setFrom(d) {
        from = d;
        _stories.from(d);
        if (!offpiste.duration) _map.from(d);
        setDuration();
        return missionControl;
    }

    function setTo(d) {
        to = d;
        _stories.to(d);
        if (!offpiste.duration) _map.to(d);
        setDuration();
        return missionControl;
    }

    function setDuration() {
        if (to) duration = Math.max(_map.getOptimalTime(), _stories.getOptimalTime());
        _stories.duration(duration);
    }

    function go(d, callback) {
        if (!arguments.length) d = to;
        if (typeof callback !== "function") callback = null;
        var start = +new Date();
        var offset = time;
        scrolling = true;

        if (d === from) {
            direction = -1;
            if (offpiste.duration) goOffpiste(d);
            scroll();
        } else if (d === to) {
            direction = 1;
            if (offpiste.duration) goOffpiste(d);
            scroll();
        } else {
            var i = _places.indexOf(d);
            // If the place is not a featured story...
            if (i === -1) {
                // and we are not just heading to the same point
                if (_map.coordinate.toKey() !== _map.placeExtentCoordinate(d).toKey()) {
                    _map.to(d).ease
                        .setOptimalPath()
                        .run(Math.max(1000, _map.getOptimalTime()), function() {
                            direction = 1;
                            goOffpiste(_stories.to());
                        });
                }
            } else if (i < _places.indexOf(from)) {
                direction = -1;
                if (offpiste.duration) goOffpiste(d);
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
                direction = 1;
                if (offpiste.duration) goOffpiste(d);
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
            if (offpiste.duration) offpiste.time = delta;
            time = offset + (delta * direction);
            if ((time >= 0 && time <= duration) || (offpiste.duration && offpiste.time <= offpiste.duration)) {
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
