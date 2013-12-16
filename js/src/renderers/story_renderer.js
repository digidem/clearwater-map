if (typeof cwm.renderers === 'undefined') cwm.renderers = {};

/**
 * Will render the stories
 * @param {[type]} selection [description]
 */
cwm.renderers.StoryRenderer = function() {
	var template;

	_.templateSettings = {
		'interpolate': /{{([\s\S]+?)}}/g
	};

	var storyRenderer = function(selection) {
	  selection.append("article")
	      .attr("id", function(d) { return d.id; })
	      .attr("class", function(d) { return d.klass; })
	      .html(template);
	};

	storyRenderer.template = function(html) {
		template = _.template(html);
		return storyRenderer;
	};

	return storyRenderer;
};