cwm.render.stories = function(data) {
    var article;
    var div = d3.select("#stories");
    var templates = cwm.Templates();

    data.forEach(function(d) {
        if (d.collection.id() === "other" || d.collection.id() === "nationalities") {
        }

        var id;

        switch (d.collection.id()) {
            case "other":
            case "nationalities":
                id = cwm.util.sanitize(d.id());
                article = div.append("article")
                    .attr("class", id);
                break;
            case "communities":
                id = cwm.util.sanitize(d.attr("community") + "-overview");
                break;
            case "installations":
                id = cwm.util.sanitize(d.attr("story_url"));
                break;
        } 

        id = d.id() === "Ecuador" ? "project-overview" : d.id() === "Intro" ? "ecuador" : id;

        var section = article.append("section")
            .attr("id", id)
            .html(templates(d));
    });
};