cwm.Templates = function() {
    var imagesRegex = /\.(?:jpg|gif|png)$/;
    var videoRegex = /\.(?:mp4|m4v|mov)$/;
    var _templates = {};

	// using a custom template delimiters
	_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

    function renderMedia(mediaUrl, size) {
        size = size || "";
        mediaUrl = mediaUrl || this.attr("story_photo") || this.attr("photo") || this.attr("media");
        if (mediaUrl && mediaUrl.match(imagesRegex)) {
            mediaUrl = mediaUrl.replace(imagesRegex, "-" + size + "$&");
            return getTemplate("image")({ mediaUrl: mediaUrl });
        } else if (mediaUrl && mediaUrl.match(videoRegex)) {
            // Not yet implemented
            return;
        } else {
            mediaUrl = cwm.util.emptyGIF;
            return getTemplate("image")({ mediaUrl: mediaUrl });
        }
    }

    // Gets a template for each place's collection id, and processes it.
    function getTemplate(templateId) {
        return _templates[templateId] || _.template(d3.select("#template-" + templateId).html());
    }

	return function(x) {
        var d, id;
        if (x instanceof cwm.Place) {
            id = x.collection.id();
            d = cwm.util.extend({ renderMedia: renderMedia }, x);
            return getTemplate(id)(d);
        } else {
            return function(d) {
                d = cwm.util.extend({ renderMedia: renderMedia }, d);
                return getTemplate(x)(d);
            };
        }
    };
};