cwm.render = {
  
  // Container for the interactive layer
  SvgContainer: function (selection) {
    var svg;

    svg = selection.select('svg');

    if (!svg.node()) {
      svg = selection.append('svg')
        .style("position", "absolute");
    }

    return svg;
  },
  
  Markers: function (data, context) {
    return context.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", 0)
        .style("cursor", "pointer");
  },
  
  Label: function (d, context) {
    var label = context.append("div")
        .attr("class", "marker-tooltip")
        .style("width", "100%")
        .datum(d);
      
    label.append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .append("div")
        .attr("class", "feature-label")
        .style("pointer-events", "auto")
        .text(d.attr("community") || d.id());
        
    return label;
  },
  
  Popup: function (d, context) {
    var popup = context.append("div")
        .attr("class", "marker-tooltip")
        .style("width", "100%")
        .datum(d);
      
    popup.append("div")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .append("div")
        .attr("class", "marker-popup")
        .style("pointer-events", "auto")
        .classed("featured", function () { return d.attr("featured") === true; });
        
    return popup;
  },
  
  PopupSmall: function (d, context) {
    var imgUrl = (d.attr("photo")) ? d.attr("photo").replace(".jpg", "-150.jpg") : cwm.util.emptyGIF;
    context.append("div")
        .attr("class", "image-wrapper")
        .append("img")
        .attr("src", imgUrl);
      
    context.append("p")
        .text((d.attr("name")) ? d.attr("name").split(" and")[0] : "");
        
    return context;
  },
  
  PopupLarge: function (d, context) {
    var imgUrl = (d.attr("photo")) ? d.attr("photo").replace(".jpg", "-150.jpg") : cwm.util.emptyGIF;
    var format = d3.time.format("%b %e %Y");
    context.append("div")
        .attr("class", "image-wrapper")
        .append("img")
        .attr("src", imgUrl);
      
    var text = context.append("p")
        .html("<em>" + d.attr("name") + "’s</em> rainwater collection system, in the village of <em>" + d.attr("community") + 
            "</em>, was installed on <em>" + format(new Date(d.attr("date"))) + "</em>, and provides clean drinking water to <strong>" +
            d.attr("users") + " people</strong>.");

    // var row = table.append("tr")
    // row.append("th").text("Family:");
    // row.append("td").text(d.attr("name"));
    
    // row = table.append("tr")
    // row.append("th").text("Village:");
    // row.append("td").text(d.attr("community"));

    // row = table.append("tr")
    // row.append("th").text("Installed:");
    // row.append("td").text(format(new Date(d.attr("date"))));

    // row = table.append("tr")
    // row.append("th").text("Users:");
    // row.append("td").text(d.attr("users"));

    if (d.attr("featured") === true) {
      text.append("p")
        .html('<a href="' + d.attr("blog_url") + '">Read more about this.</a>');
    }

    return context;
  }
};