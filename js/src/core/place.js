/**
 * A place can either be a polygon or a point
 * @param {object}	feature A geoJSON feature with properties and geometry
 */
cwm.Place = function(feature) {
	if (!(this instanceof cwm.Place))
		return new cwm.Place(feature);
	feature = feature || {};
	this._properties = feature.properties || {};
	this._geometry = feature.geometry || {};

	// Default fields used for parentId and id.
	this.id("id").parentId("parent");
};

cwm.Place.prototype = {

	// Add any custom events as arguments to d3.dispatch
    event: d3.dispatch('changed'),

    // Copies this 'on' method from d3_dispatch to the prototype
    on: function() { 
        var value = this.event.on.apply(this.event, arguments);
        return value === this.event ? this : value;
    },

	// Set the field that contains the unique id. `v` can be a string or a function
	id: function(v) {
		if (!arguments.length) return this._id;
		this._id = typeof v === "function" ? v(this._properties) : this._properties[v];
		return this;
	},

	// Set the field that contains the parent id. `v` can be a string or a function
	parentId: function(v) {
		if (!arguments.length) return this._parentId;
		this._parentId = typeof v === "function" ? v(this._properties) : this._properties[v];
		return this;
	},

	/**
	 * Gets or sets the story associated with a Place
	 * @param  {string} html Sets the new html text for the story
	 * @return {this}        Reference to self for chaining
	 */
	story: function(html) {
		return attr("story", text);
	},

	storyTitle: function(text) {
		return attr("title", text);
	},

	/**
	 * Gets or sets attributes for a place
	 * @param  {string} key   Property to get or set
	 * @param  {string} value Value to set property
	 * @return {}             If value isNull, returns property value
	 */
	attr: function(key, value) {
		if (!value) return this._properties[key];
		this._properties[key] = value;
		this.event.changed(this);
		return this;
	},

	bounds: function() {
		return this._geometry && d3.geo.bounds(this.asGeoJSON());
	},

	centroid: function() {
		return this._geometry && d3.geo.centroid(this.asGeoJSON());
	},

	/**
	 * @return {object} A geoJSON representation of the place
	 */
	asGeoJSON: function() {
		return {
			type: 'Feature',
			properties: this._properties,
			geometry: this._geometry
		};
	}
};