cwm.render = {
  
  // Container for the interactive layer
  LayerContainer: function (id) {
    var div = d3.select(document.body)
      .append("div")
      .style('position', 'absolute')
      .style('width', '100%')
      .style('height', '100%')
      .attr('id', id);
    div.append('svg').style("position", "absolute");
    return div;
  },
  
  Markers: function (data, context) {
    return context.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", 0);
  },
  
  PopupWrapper: function (d, context) {
    var popupWrapper = context.append("div")
        .attr("class", "marker-tooltip")
        .style("width", "100%")
        .datum(d);
      
    popupWrapper.append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .append("div")
        .attr("class", "marker-popup")
        .style("pointer-events", "auto");
        
    return popupWrapper;
  },
  
  PopupSmall: function (d, context) {
    context.append("div")
        .attr("class", "wrapper")
        .append("img")
        .attr("src", d.properties.photo);
      
    context.append("p")
        .text(d.properties.name.split(" and")[0]);
        
    return context;
  }
};