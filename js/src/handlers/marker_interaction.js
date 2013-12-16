cwm.handlers.MarkerInteraction = function (context) {
  var popup,
      popupFixed,
      isBouncing;

  function mouseoverMarker () {
    if (d3.event.defaultPrevented) return;
    var d = this.__data__;
    if (d.properties.featured === true) window.clearTimeout(isBouncing);
    d3.select(this)
      .transition()
      .duration(500)
      .ease("elastic", 1.5)
      .attr("r", function (d) { return getMarkerSize(d, 2); });
    if (!popup || popup && this !== popup._marker) displayPopup.call(this);
  }
      
  function mouseoutMarker () {
    if (d3.event.defaultPrevented) return;

    if (popup && !popupFixed) {
      popup.remove();
      popup = null;
    }
    if (popup && (popup._marker === this)) return;
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
      if (popup._marker !== marker) {
        d3.select(popup._marker)
          .transition()
          .attr("r", getMarkerSize);
      }
      popup.remove();
      popup = null;
    }
    
    popup = cwm.render.Popup(d, context);
    popup._marker = marker;
    
    var wrapper = popup.select(".marker-popup");
    
    if (d3.event.type === "click") {
      d3.event.stopPropagation();
      popupFixed = "large";
      cwm.render.PopupLarge(d, wrapper.classed("large", true));
      popup.on("click.popup", function () {
          if (d3.event.defaultPrevented) return;
          d3.event.stopPropagation();
          popupFixed = false;
          mouseoutMarker.call(marker);
        });
      context.on("click", function () {
          if (d3.event.defaultPrevented) return;
          popupFixed = false;
          mouseoutMarker.call(marker);
      });
    } else {
      cwm.render.PopupSmall(d, wrapper);
      popup.on("click.popup", function () {
          if (d3.event.defaultPrevented) return;
          displayPopup.call(marker);
          d3.select(marker).on("click.zoom").call(marker);
          d3.select(marker).on("click.scroll").call(marker);
        })
        .on("mouseleave.popup", function () {
          if (d3.event.defaultPrevented) return;
          popupFixed = false;
          mouseoutMarker.call(marker);
        })
        .on("mouseenter.popup", function () {
                popupFixed = true;
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
    // removes the featured marker and puts it on top
    // if (first) {
    //   marker = marker.remove();
    //   d3.select("g.markers").append(function () { return marker.node(); });
    // }
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
    isBouncing = window.setTimeout(bounceMarkers, 3000, marker); 
  }
  
  function scrollToStory () {
    var d = this.__data__;
    if (d.properties.featured === true) {
      cwm.map.flightHandler.pause();
      cwm.map.s.scrollTo(cwm.util.sanitize(d.properties.featured_url), function () {
        cwm.map.flightHandler.resume();
      });
    }
  }
  
  function getMarkerSize (d, scale) {
    scale = scale || 1;
    return d.properties._markerSize * scale;
  }
  
  return {
    add: function (context) {
      if (!context[0][0]) return;
      context.on("mouseout.popup", mouseoutMarker)
          .on("mouseover.popup", mouseoverMarker)
          .on("click.popup", displayPopup)
          .on("click.scroll", scrollToStory)
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
      popupFixed = false;
      if (popup) {
        popup.remove();
        popup = null;
      }
    }
  };
};