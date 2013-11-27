cwm.handlers.MarkerInteraction = function (context) {
  var popup,
      popupDisplayed,
      isBouncing;

  function mouseoverMarker () {
    if (d3.event.defaultPrevented) return;
    if (popupDisplayed === "large") return;
    var d = this.__data__;
    if (d.properties.featured === true) window.clearTimeout(isBouncing);
    d3.select(this)
      .transition()
      .duration(500)
      .ease("elastic", 1.5)
      .attr("r", function (d) { return getMarkerSize(d, 2); });
    displayPopup.call(this);
  }
      
  function mouseoutMarker () {
    if (d3.event.defaultPrevented) return;
    if (popupDisplayed) return;
    if (popup) {
      popup.remove();
      popup = null;
    }
    d3.select(this)
      .transition()
      .attr("r", getMarkerSize);
  }

  function displayPopup () {
    if (d3.event.defaultPrevented) return;
    
    var point = new MM.Point(this.getAttribute("cx"), this.getAttribute("cy"));
    var marker = this;
    var d = this.__data__;
    var dim = cwm.map.dimensions;
    
    if (popup) {
      d3.select(popup._marker)
        .transition()
        .attr("r", getMarkerSize);
      popup.remove();
      popup = null;
    }
    
    popup = cwm.render.Popup(d, context);
    
    var wrapper = popup.select(".marker-popup");
    
    if (d3.event.type === "click") {
      d3.event.stopPropagation();
      popupDisplayed = "large";
      popup._marker = marker;
      cwm.render.PopupLarge(d, wrapper.classed("large", true));
      popup.on("click.popup", function () {
          popupDisplayed = false;
          mouseoutMarker.call(marker);
        });
      context.on("click.popup", function () {
        d3.event.stopPropagation();
        popupDisplayed = false;
        mouseoutMarker.call(marker);
      });
    } else {
      cwm.render.PopupSmall(d, wrapper);
      popup.on("click.popup", function () { displayPopup.call(marker); })
        .on("mouseleave.popup", function () {
          if (d3.event.defaultPrevented) return;
          popupDisplayed = false;
          mouseoutMarker.call(marker);
        })
        .on("mouseenter.popup", function () {
                popupDisplayed = true;
              });
    }
  
    var w = wrapper.node().offsetWidth;
    var h = wrapper.node().offsetHeight;
    
    wrapper.style("left", function () { return (dim.x - point.x < w) ? "auto" : 0; })
        .style("right", function () { return (dim.x - point.x < w) ? 0 : "auto"; })
        .style("bottom", function () { return (point.y < h) ? "auto" : 0; });

    MM.moveElement(popup.node(), point);
  }
  
  function bounceMarkers (marker) {
    marker = (marker instanceof Element) ? this : marker;
    if (isBouncing) window.clearTimeout(isBouncing);
    marker.transition()
      .delay(2000)
      .duration(180)
      .attr("r", function (d) { return getMarkerSize(d, 2); } )
      .style("stroke-width", getMarkerSize)
      .each("end", function () { 
        d3.select(this)
          .transition()
          .duration(1800)
          .ease("elastic", 1, 0.2)
          .attr("r", getMarkerSize)
          .style("stroke-width", 3);      
      });
    isBouncing = window.setTimeout(bounceMarkers, 5000, marker); 
  }
  
  function getMarkerSize (d, scale) {
    scale = scale || 1;
    return d.properties._markerSize * scale;
  }
  
  return {
    add: function (context) {
      if (!context[0][0]) return;
      context.on("mouseout.mi", mouseoutMarker)
          .on("mouseover.mi", mouseoverMarker)
          .on("click.mi", mouseoverMarker)
          .filter(function (d) {return d.properties.featured === true; })
          .attr("class", "featured")
          .call(bounceMarkers);
    },
  
    drawPopup: function (project) {
      if (popup) {
        var d = popup.datum();
        var point = new MM.Point(project(d)[0], project(d)[1]);
        MM.moveElement(popup.node(), point);      
      }
    },
    
    removePopup: function () {
      popupDisplayed = false;
      if (popup) {
        popup.remove();
        popup = null;
      }
    }
  };
};