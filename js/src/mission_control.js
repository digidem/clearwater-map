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
        pendingRedraw;

    function stories(_) {
        if (!arguments.length) return _places;
        _stories = _;
        _places = _stories.data();
        setEasings();
        return missionControl;
    }

    function map(_) {
        if (!arguments.length) return map;
        _map = _;
        setEasings();
        return missionControl;
    }

    function setEasings() {
        if (!_places || !_map) return;

        _places[0]._time = 0;

        _places.forEach(function(place, i) {
            var ease = place.ease || (place.ease = mapbox.ease().map(_map));
            ease.from(place._extentCoordinate);

            var nextPlace = _places[i+1];

            if (nextPlace) {
                ease.to(nextPlace._extentCoordinate).setOptimalPath();
                nextPlace._time = place._time + Math.max(ease.getOptimalTime(), 2000);
            } else {
                delete place.ease;
                _maxTime = place._time;
            }
        });
    }

    function go(place, smooth) {
        if (typeof place === "string") place = _places.get(place);
        
        if (smooth) {
            start = Date.now();
            timelineStart = timeline;
            timelineEnd = place._time;
            end = start + Math.abs(timelineEnd - timelineStart);
            console.log(start,timelineStart,timelineEnd,end);
            window.requestAnimationFrame(scroll);
        } else {
            time(place._time);
        }
    }

    function scroll() {
        var now = Date.now();
        if (now > end) {
            time(timelineEnd);
            return true;
        } else {
            console.log(timelineStart < timelineEnd ? timelineStart + now - start : timelineStart - now + start);
            time(timelineStart < timelineEnd ? timelineStart + now - start : timelineStart - now + start);
            window.requestAnimationFrame(scroll);
        }
    }

    function time(_) {
        if (!arguments.length) return _;
        timeline = _;
        if (!pendingRedraw) {
            draw();
            pendingRedraw = false;
        }
        return missionControl;
    }

    function draw() {
        var t, i = 0;
        // move things
        while (_places[i] && _places[i]._time < timeline) i++;

        if (_places[i] && _places[i - 1]) {
            t = (timeline - _places[i - 1]._time) / (_places[i]._time - _places[i - 1]._time);
        } else {
            t = 0;
        }

        (_places[i - 1] || _places[i]).ease.t(t);
        _stories.render(timeline);
        
        pendingRedraw = false;

        return missionControl;
    }

    missionControl = {
        stories: stories,
        map: map,
        go: go,
        time: time,
        setEasings: setEasings
    };

    return missionControl;

};