// ScrollHandler manages events that occur on scroll, and only fires
// update events when necessary, requesting an animation frame from 
// the browser.

cwm.handlers.ScrollHandler = function(map) {
  var animators = [],
      lastScrollY = -1,
      currentScroll,
      ticking = false,
      scrolling = false,
      scrollStartTime,
      scrollStartY,
      scrollEndY,
      scrollDiff,
      scrollTotalTime;
        
  d3.timer(loop);
        
  function loop () {
    var y = currentScroll || window.scrollY;
    if (y !== lastScrollY) {
      animators.forEach( function(animator) {
        animator(lastScrollY);
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
