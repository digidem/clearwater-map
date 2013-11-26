// ScrollHandler manages events that occur on scroll, and only fires
// update events when necessary, requesting an animation frame from 
// the browser.

cwm.handlers.ScrollHandler = function(map) {
  var animators = [],
      lastScrollY = -1,
      currentScroll = 0,
      ticking = false,
      scrolling = false,
      scrollStartTime,
      scrollStartY,
      scrollEndY,
      scrollDiff,
      scrollTotalTime;

  // from https://github.com/mbostock/d3/pull/1050/files
  if ('onwheel' in document) {
      var d3_behavior_zoom_wheel = 'wheel';
      var d3_behavior_zoom_delta = function () {
          return -d3.event.deltaY * (d3.event.deltaMode ? 40 : 1);
      };
  } else if ('onmousewheel' in document) {
      var d3_behavior_zoom_wheel = 'mousewheel';
      var d3_behavior_zoom_delta = function () {
          return d3.event.wheelDelta;
      };
  } else {
      var d3_behavior_zoom_wheel = 'MozMousePixelScroll';
      var d3_behavior_zoom_delta = function () {
          return -d3.event.detail;
      };
  }
  
  d3.select(map.parent.parentNode).on(d3_behavior_zoom_wheel, onMouseWheel);
  
  var stories = d3.select("#stories");
  
  function onMouseWheel () {
    d3.event.preventDefault();
    currentScroll -= d3_behavior_zoom_delta();
    currentScroll = Math.max(0, currentScroll);
    d3.timer(tick);
  }
  
  function tick () {
    var y = ~~(0.5 + currentScroll);
    if (y !== lastScrollY) {
      stories.style(cwm.util.transformCSS, "translate3d(0px,-"+y+"px, 0px)");
      animators.forEach( function(animator) {
        animator(y);
      });
      lastScrollY = y;
    }
  }
  
  // ease-in-out
  function ease(t) {
    return 0.5 * (1 - Math.cos(Math.PI * t));
  }
  
  function scroll () {
    var now = Date.now();

    if (now - scrollStartTime > scrollTotalTime) {
      window.scrollTo(0, scrollEndY);
      currentScroll = null;
      return true;
    } else {
      currentScroll = scrollStartY + scrollDiff * ease((now - scrollStartTime) / scrollTotalTime);
      currentScroll = Math.round(currentScroll);
      window.scrollTo(0, currentScroll);
    }
  }
  
  var scrollHandler = {
    
    add: function (animator) {
      animators.push(animator);
    },
    
    scrollTo: function (y) {
      scrollStartY = window.scrollY;
      scrollEndY = y;
      scrollDiff = Math.abs(scrollStartY - scrollEndY);
      scrollStartTime = Date.now();
      
      if (map) {
        map.flightHandler.clearOverride();
        map.flightHandler.setOverride(null, null, Math.min(scrollEndY, scrollStartY), Math.max(scrollEndY,scrollStartY));
        scrollTotalTime = map.flightHandler.getOverrideTime();
      } else {
        scrollTotalTime = scrollDiff;
      }
      d3.timer(scroll);
    }
  };
  

  
  return scrollHandler;
};
