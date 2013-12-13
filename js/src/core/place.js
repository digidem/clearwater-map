/**
 * A place can either be a polygon or a point
 * @param {object}	feature A geoJSON feature with properties and geometry
 * @param {object}	options	An options object
 */
cwm.Place = function(feature, options) {
	if (!(this instanceof cwm.Place))
		return (new cwm.Place()).init(feature, options);
	return this.init(feature, options);
};

cwm.Place.prototype = {
	init: function(feature, options) {
		this.properties = feature.properties;
		this.geometry = feature.geometry;
		// Bounds will be null if feature.geometry is null
		this.bounds = feature.geometry && d3.geo.bounds(feature);
		this.centroid = feature.geometry && d3.geo.centroid(feature);
		this.id = options.id(feature);
		this.parent = options.parent && d3.functor(options.parent)(feature);
		this.children = [];
		return this;
	},

	event: d3.dispatch('changed'),

	// Copies this 'on' method from d3_dispatch to the prototype
	on: function() { 
		var value = this.event.on.apply(this.event, arguments);
		return value === this.event ? this : value;
	},

	/**
	 * Gets or sets the story associated with a Place
	 * @param  {string} html Sets the new html text for the story
	 * @return {this}        Reference to self for chaining
	 */
	story: function(html) {
		return attr(this.options.idKey, text);
	},

	storyTitle: function(text) {
		return attr(this.options.titleKey, text);
	},

	/**
	 * Gets or sets attributes for a place
	 * @param  {string} key   Property to get or set
	 * @param  {string} value Value to set property
	 * @return {}             If value isNull, returns property value
	 */
	attr: function(key, value) {
		if (!value) return this.properties[key];
		this.properties[key] = value;
		this.event.changed(this);
		return this;
	},

	/**
	 * @return {object} A geoJSON representation of the place
	 */
	asGeoJSON: function() {
		return {
			type: 'Feature',
			properties: this.properties,
			geometry: this.geometry
		};
	}
};