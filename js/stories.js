cwm.Stories = function () {
  
  var s = {},
      sa,
      map,
      currentScroll;
  
  setupScrolling();
  
  s.map = function (m) {
    map = m.stories(s);
    return s;
  };
  
  var h1Height = document.getElementsByTagName("h1")[0].offsetHeight;
  var h2Height = document.getElementsByTagName("h2")[0].offsetHeight;

  sa = cwm.handlers.RevealHandler()
    .affixTop(
      "#stories h1", 
      function () { return $x(this).parent("article").next().offsetTop() - this.offsetHeight; }
    )
    .affixBottom(
      "#stories h2, #stories h1", 
      function () { return $x(this).parent("section").previousSiblingOrCousin().offsetBottom() - window.innerHeight  + this.offsetHeight; }
    )
    .fadeIn(
      ".image", 
      function () { return $x(this).offsetTop() - window.innerHeight; }, 
      function () { return $x(this).offsetTop() - window.innerHeight + this.offsetHeight; }
    )
    .fadeOut(
      "#stories article > section:not(:first-child)", 
      function () { return $x(this).offsetTop() + this.offsetHeight - window.innerHeight; }, 
      function () { return $x(this).offsetTop() + Math.max(window.innerHeight - h1Height - this.offsetHeight, 100); }
    )
    .enable();
  
  // Scroll the map to an element by id
  s.scrollTo = function (id) {
    var el = document.getElementById(id);
    var offset = $x(el).nextSiblingOrCousin()[0].children[1].children[0].offsetHeight;
    var startY = window.pageYOffset;
    var endY = el ? el.offsetTop + el.offsetHeight + offset : startY;
    var scrollDiff = Math.round(endY - startY);
    var startTime = Date.now();
    var t;
    
    if (scrollDiff === 0) return;
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
    d3.selectAll('a[href*="#"]').on('click', function () {
      s.scrollTo(this.getAttribute("href").split("#")[1]);
    });
    d3.selectAll('#stories h1, #stories h2').on('click', function () {
      s.scrollTo($x(this).parent("section")[0].getAttribute("id"));
    });
  }
  
  return s;
};