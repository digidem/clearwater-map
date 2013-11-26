cwm.handlers.MarkerInteraction = function () {
  var mouseOverPopup;

  return function (context) {
    if (!context[0][0]) return;
    context.on("mouseout.mi", mouseoutMarker)
        .on("mouseover.mi", mouseoverMarker);
        // .on("click.mi", popupListener)
        // .on("mouseover.mi", popupListener)
        // .on("mouseout.mi", popupListener);
        // .filter(function (d) {return d.properties.featured === true; })
        // .attr("class", "featured")
        // .each("end", bounceMarkers);
  };


  function mouseoverMarker () {
    d3.select(this)
      .transition()
      .duration(500)
      .ease("elastic", 1.5)
      .attr("r", function (d) { return getMarkerSize(d, 2); });
  }
      
  function mouseoutMarker () {
    if (mouseOverPopup) return;
    d3.select(this)
      .transition()
      .attr("r", getMarkerSize);
  }

  function getMarkerSize (d, scale) {
    scale = scale || 1;
    return d.properties._markerSize * scale;
  }
/*
  function popupListener (d, i) {
    
    if (d3.event.type == "click") {
      if (d3.event.defaultPrevented) return;
      zoomPopup();
      return;
    }
    
    if (activePopup && !mouseOverPopup) {
      activePopup.transition()
          .duration(100)
          .delay(100)
          .style("opacity", 0)
          .remove();
      activePopup = null;
    }
    
    if (d3.event.type == "mouseover") {
      activePopup = drawPopup.call(this, d);
    }
  }
  
  function zoomPopup () {
    activePopup.select(".marker-popup").transition()
        .style("width", function () { return this.offsetWidth * 2 + "px"; });
    activePopup.on("mouseleave", null);
  }
  

    function drawPopup (d) {
    var point = new MM.Point(this.getAttribute("cx"), this.getAttribute("cy"));
    var marker = this;
    var dim = d3l.map.dimensions;
    
    var w = context.node().offsetWidth;
    var h = context.node().offsetHeight;
    wrapper.style("left", function () { return (dim.x - point.x < w) ? "auto" : 0; })
        .style("right", function () { return (dim.x - point.x < w) ? 0 : "auto"; })
        .style("bottom", function () { return (point.y < h) ? "auto" : 0; });
  
    
    .on("mouseenter", function () {
      mouseOverPopup = true;
    })
    .on("mouseleave", function () {
      mouseOverPopup = false;
      popup();
      mouseoutMarker.call(marker)
    })
    .on("click", zoomPopup);
      

    MM.moveElement(p.node(), point);
    
    return p;
  }
  return mi;
  */
};