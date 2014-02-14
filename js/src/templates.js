cwm.Templates = function() {
    var imagesRegex = /\.(?:jpg|gif|png)$/;
    var videoRegex = /\.(?:mp4|m4v|mov)$/;
    var _templates = {};

	// using a custom template delimiters
	_.templateSettings = {
		'interpolate': /{{([\s\S]+?)}}/g
	};

    function renderMedia(popup) {
        var mediaUrl = this.mediaUrl = this.attr("story_photo") || this.attr("photo") || this.attr("media");
        if (mediaUrl && mediaUrl.match(imagesRegex)) {
            this.mediaUrl = mediaUrl.replace(imagesRegex, "-480$&");
            return getTemplate("image")(this);
        } else if (mediaUrl && mediaUrl.match(videoRegex)) {
            // Not yet implemented
            return;
        } else {
            this.mediaUrl = cwm.util.emptyGIF;
            return getTemplate("image")(this);
        }
    }

    // Gets a template for each place's collection id, and processes it.
    function getTemplate(templateId) {
        return _templates[templateId] || _.template(d3.select("#template-" + templateId).html());
    }

	return function(d) {
        d = cwm.util.extend({ renderMedia: renderMedia }, d);
        return getTemplate(d.collection.id())(d);
    };
};