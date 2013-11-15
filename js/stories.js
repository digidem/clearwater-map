if (typeof cwm === 'undefined') cwm = {};

cwm.stories = function (storiesId) {
  
  var s = {},
      map,
      currentScroll;
  
  setupScrolling();
  
  s.map = function (m) {
    map = m.stories(s);
    return s;
  };
  
  // Scroll the map to an element by id
  s.scrollTo = function (id) {
    var el = document.getElementById(id);
    var startY = cwm.util.scrollTop();
    var endY = el ? el.offsetTop + el.offsetHeight : startY;
    var scrollDiff = Math.round(endY - startY);
    var startTime = Date.now();
    var t;
    
    if (scrollDiff == 0) return;
    if (currentScroll) cancelAnimationFrame(currentScroll);

    if (map) {
      map.easeHandler.clearOverride();
      map.easeHandler.setOverride(null, null, Math.min(endY, startY), Math.max(endY, startY));
      t = map.easeHandler.getOverrideTime();
    } else {
      t = Math.abs(scrollDiff) * 4;
    }
    
    loop();

    // ease-in-out
    function ease(t) {
      return 0.5 * (1 - Math.cos(Math.PI * t));
    }
  
    function loop () {
      var now = Date.now();

      if (now - startTime > t) {
        window.scroll(0, endY);
        currentScroll = null;
      } else {
        window.scroll(0, startY + scrollDiff * ease((now - startTime) / t));
        currentScroll = requestAnimationFrame(loop);
      }
    }
  };
  
  function setupScrolling () {
    d3.selectAll('a[href*="#"]').on('click', function (d, i) {
      s.scrollTo(this.getAttribute("href").split("#")[1]);
    });
  }
  
  return s;
}