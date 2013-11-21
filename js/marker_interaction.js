if (typeof cwm === 'undefined') cwm = {};

cwm.marker_interaction = function (map) {
  
  var mi = {},
      markers;
  
  mi.markers = function (m) {
    markers = m;
    markers.on("mouseout", mouseoutMarker)
      .on("click.popup", popup)
      .on("mouseover.popup", popup)
      .on("mouseout.popup", popup);
    return mi;
  }
  
  function mouseoutMarker () {
    if (mouseOverPopup) return;
    d3.select(this)
      .transition()
      .attr("r", marker_size);
  }

  function popup (d, i) {
    
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
    
    var p = div.append("div")
        .attr("class", "marker-tooltip")
        .style("width", "100%")
        .datum(d)
        .on("mouseenter", function () {
          mouseOverPopup = true;
        })
        .on("mouseleave", function () {
          mouseOverPopup = false;
          popup();
          mouseoutMarker.call(marker)
        })
        .on("click", zoomPopup);
      
    var wrapper = p.append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .append("div")
        .attr("class", "marker-popup")
        .style("pointer-events", "auto")
      
    var content = wrapper.append("div")
        .attr("class", "wrapper")
        .append("img")
        .attr("src", d.properties.photo)
      
    wrapper.append("p")
        .text(d.properties.name.split(" and")[0])
        
    var w = wrapper.node().offsetWidth;
    var h = wrapper.node().offsetHeight;
    wrapper.style("left", function () { return (dim.x - point.x < w) ? "auto" : 0; })
        .style("right", function () { return (dim.x - point.x < w) ? 0 : "auto"; })
        .style("bottom", function () { return (point.y < h) ? "auto" : 0; });
  
    MM.moveElement(p.node(), point);
    
    return p;
  }
  return mi;
}