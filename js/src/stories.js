cwm.Stories = function () {
  
  var stories = {},
      map;
  
  var wHeight = $("#stories").parent().innerHeight();

  setupScrolling();
  
  stories.map = function (m) {
    map = m.stories(stories);
    map.s = stories;
    return stories;
  };
  
  var h1Height = document.getElementsByTagName("h1")[0].offsetHeight;
  var h2Height = document.getElementsByTagName("h2")[0].offsetHeight;

  var storyHandler = cwm.handlers.StoryHandler("#stories")
    .affixTop(
      "#stories h1", 
      function () { return $x(this).parent("article").next().offsetTop() - this.offsetHeight; }
    )
    .affixBottom(
      "#stories h2, #stories h1", 
      function () { return $x(this).parent("section").previousSiblingOrCousin().offsetBottom() - wHeight  + this.offsetHeight; }
    )
    .fadeIn(
      ".image", 
      function () { return $x(this).offsetTop() - wHeight; }, 
      function () { return $x(this).offsetTop() - wHeight + this.offsetHeight; }
    )
    .fadeOut(
      "#stories article > section:not(:first-child)", 
      function () { return $x(this).offsetTop() + this.offsetHeight - wHeight + h1Height; }, 
      function () { return (wHeight - this.offsetHeight > 200) ?
                            $x(this).offsetTop() :
                            $x(this).offsetTop() + this.offsetHeight - wHeight + 200; }
    )
    .enable();
  
  d3.selectAll("#stories article > section").call(cwm.scrollHandler.spy);

  // Scroll the map to an element by id
  stories.scrollTo = function (id, callback) {
    var y;
    var el = document.getElementById(id);
    var offset = $x(el).nextSiblingOrCousin()[0] ? $x(el).nextSiblingOrCousin()[0].children[1].children[0].offsetHeight : 0;
    
    if (el) {
      y = el.offsetTop + el.offsetHeight + offset;
      cwm.scrollHandler.scrollTo(y, callback);
    }
    return y;
  };
  
  function setupScrolling () {
    d3.selectAll('a[href*="#"]').on('click', function () {
      stories.scrollTo(this.getAttribute("href").split("#")[1]);
    });
    d3.selectAll('#stories h1, #stories h2').on('click', function () {
      stories.scrollTo($x(this).parent("section")[0].getAttribute("id"));
    });
  }
  
  return stories;
};