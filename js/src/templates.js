cwm.Templates = function() {
	// using a custom template delimiters
	_.templateSettings = {
		'interpolate': /{{([\s\S]+?)}}/g
	};
	return {
		community: _.template(document.getElementById("template-community").innerHTML),
		nationality: _.template(document.getElementById("template-nationality").innerHTML)
	};
};