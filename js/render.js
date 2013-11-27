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
        .attr("r", 0)
        .style("cursor", "pointer");
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
        .style("pointer-events", "auto");
        
    return popup;
  },
  
  PopupSmall: function (d, context) {
    context.append("div")
        .attr("class", "wrapper")
        .append("img")
        .attr("src", d.properties.photo);
      
    context.append("p")
        .text(d.properties.name.split(" and")[0]);
        
    return context;
  },
  
  PopupLarge: function (d, context) {
    var format = d3.time.format("%b %e %Y")
    context.append("div")
        .attr("class", "wrapper")
        .append("img")
        .attr("src", d.properties.photo);
      
    var table = context.append("table")

    var row = table.append("tr")
    row.append("th").text("Family:");
    row.append("td").text(d.properties.name);
    
    row = table.append("tr")
    row.append("th").text("Village:");
    row.append("td").text(d.properties.community);

    row = table.append("tr")
    row.append("th").text("Installed:");
    row.append("td").text(format(new Date(d.properties.date)));

    row = table.append("tr")
    row.append("th").text("Users:");
    row.append("td").text(d.properties.users);

    if (d.properties.featured === true) {
      row = table.append("tr")
      row.append("th").text("Story:");
      row.append("td")
        .append("a")
        .attr("href", d.properties.featured_url)
        .text("Read more on our blog...");
    }

    return context;
  }
};