// ScrollHandler manages events that occur on scroll, and only fires
// update events when necessary, requesting an animation frame from 
// the browser.

cwm.handlers.ScrollHandler = function(map) {
  var animators = [],
      offsets = [],
      names = [],
      lastScrollY = -1,
      currentScroll = 0,
      ticking,
      scrollStartTime,
      scrollStartY,
      scrollEndY,
      scrollDiff,
      scrollTotalTime,
      callback,
      d3_behavior_zoom_wheel,
      d3_behavior_zoom_delta;

  tick();

  // from https://github.com/mbostock/d3/pull/1050/files
  if ('onwheel' in document) {
      d3_behavior_zoom_wheel = 'wheel';
      d3_behavior_zoom_delta = function () {
          return -d3.event.deltaY * (d3.event.deltaMode ? 40 : 1);
      };
  } else if ('onmousewheel' in document) {
      d3_behavior_zoom_wheel = 'mousewheel';
      d3_behavior_zoom_delta = function () {
          return d3.event.wheelDelta;
      };
  } else {
      d3_behavior_zoom_wheel = 'MozMousePixelScroll';
      d3_behavior_zoom_delta = function () {
          return -d3.event.detail;
      };
  }
  
  d3.select(map.parent.parentNode).on(d3_behavior_zoom_wheel, onMouseWheel);
  
  function onMouseWheel () {
    d3.event.preventDefault();
    currentScroll -= d3_behavior_zoom_delta();
    currentScroll = Math.max(0, currentScroll);
    tick();
  }
  
  function tick () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(animate);
    }
  }

  function animate() {
    var y = ~~(0.5 + currentScroll);
    if (y !== lastScrollY) {
      animators.forEach( function(animator) {
        animator(y);
      });
      lastScrollY = y;
    }
    ticking = false;
  }
  
  // ease-in-out
  function ease(t) {
    return 0.5 * (1 - Math.cos(Math.PI * t));
  }
  
  function scroll () {
    var now = Date.now();

    if (now - scrollStartTime >= scrollTotalTime) {
      currentScroll = scrollEndY;
      tick();
      if (callback) { callback(); callback = null; }
      return true;
    } else {
      currentScroll = Math.round(scrollStartY + (scrollEndY - scrollStartY) * ease((now - scrollStartTime) / scrollTotalTime));
      tick();
    }
  }
  
  var scrollHandler = {
    
    add: function (animator) {
      animators.push(animator);
      lastScrollY = -1;
      tick();
    },
    
    scrollTo: function (y, cb) {
      scrollStartY = Math.round(currentScroll);
      scrollEndY = Math.round(y);
      scrollDiff = Math.abs(scrollStartY - scrollEndY);
      scrollStartTime = Date.now();
      callback = cb;
      
      if (map) {
        map.flightHandler.setOverride(null, null, Math.min(scrollEndY, scrollStartY), Math.max(scrollEndY,scrollStartY));
        scrollTotalTime = map.flightHandler.getOverrideTime();
      } else {
        scrollTotalTime = scrollDiff;
      }
      if (scrollDiff < 5) scrollTotalTime = 100;
      d3.timer(scroll);
    },
    
    currentScroll: function () {
      return Math.round(currentScroll);
    },

    spy: function (selection) {
      selection.each(function () {
        offsets.push({
          scrollPoint: $x(this).offsetTop() + this.offsetHeight - window.innerHeight,
          section: this.getAttribute("id"),
          nationality: this.parentNode.getAttribute("class")
        });
      });
      offsets = _.sortBy(offsets, "scrollPoint").reverse();
    },

    currentSection: function () {
      return _.find(offsets, function (offset) {
        return offsets.scrollPoint < currentScroll;
      }).section;
    },

    currentNationality: function () {
      return _.find(offsets, function (offset) {
        return offsets.scrollPoint < currentScroll;
      }).nationality;
    }
    
  };

  return scrollHandler;
};
