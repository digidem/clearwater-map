// Handles the display of elements as the scroll on and off the screen
// Provides curtain effect & fades elements in and out.
function revealHandler () {
  var rh = {},
      dHeight = $(document).height();
      wHeight = cwm.util.windowHeight();
      scrollPoints = cwm.util.fillArray(null, wHeight),
      enabled = false,
      selection = [];

  //
  
  
  
  rh.fixTop = function (selector, cl) {
    selection = d3.selectAll(selector).each(function (d, i) {
      d3.select(this)
        .datum([
          [ 0, "absolute", "auto" ],
          [ this.offsetParent.offsetParent.offsetTop + this.offsetParent.offsetTop, "fixed", 0 ]
        ]);
    });
    return rh;
  }
  
  rh.test = function () {
    var scrollTop = cwm.util.scrollTop();
    selection.style("position", function (d, i) { return scrollTop < d[1][0] ? d[0][1] : d[1][1]; });
    requestAnimationFrame(rh.test);
    return rh;
  }
  
  // Expects an array of elements to fix to the bottom of the screen.
  rh.fix = function (selector, collapseSelector) {
    var elements = []
    
    $(parent).find(selector).each(function (i) {
      var $this = $(this);
      var $img = $this.find(collapseSelector);
      var el = {};
      
      if ($img.length > 0) {
        el.$img = $img
        el.$next = $img.next();
        if (!el.$next.hasClass('background')) {
          el.$next = $img.nextAll().wrapAll('<div class="background" />').parent();
        }
        el.$prev = $this.prev();
        if (el.$prev.length == 0) el.$prev = $this.parent().prev();
        
      }
      elements[i] = { el: $this };
      elements[i].img = $this.find("img:not(.nocollapse)")
      
    })
    return rh;
  }
  
  // Set up onClick events to scroll the document between anchors
  var initScrollTos = function () {
    wHeight = $(window).height();
    $("a[href*=#]").each(function () {
      var targetScroll
        , hash = $(this).attr("href").split("#")[1]
        , $target = $("#" + hash);
      if ($target.length == 0) {
        $target = $(this).parents("section").next();
        if ($target.length == 0) $target = $(this).parents("article").next().children().first();
      }
    
      if ($target.length > 0) {
        targetScroll = $target.offset().top - wHeight + $target.height();
      }
      $(this).data("target-scroll", targetScroll).click(_scrollTo);
    });
  }
  
  return rh;
}
