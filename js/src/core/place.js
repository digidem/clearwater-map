/**
 * A place can either be a polygon or a point
 * @param {object}	feature A geoJSON feature with properties and geometry
 */
cwm.Place = function(feature) {
	if (!(this instanceof cwm.Place))
		return new cwm.Place(feature);
	feature = feature || {};
	this.properties = feature.properties || {};
	this.geometry = feature.geometry || {};
	this.type = feature.type;

	// Add any custom events as arguments to d3.dispatch
	this.event = d3.dispatch('changed');

	// Default fields used for parentId and id.
	this.id("id").parentId("parent");
};

cwm.Place.prototype = {

    // Copies this 'on' method from d3_dispatch to the prototype
    on: function() { 
        var value = this.event.on.apply(this.event, arguments);
        return value === this.event ? this : value;
    },

	// Set the field that contains the unique id. `v` can be a string or a function
	id: function(v) {
		if (!arguments.length) return this._id;
		this._id = typeof v === "function" ? v(this.properties) : this.properties[v];
		return this;
	},

	// Set the field that contains the parent id. `v` can be a string or a function
	parentId: function(v) {
		if (!arguments.length) return this._parentId;
		this._parentId = typeof v === "function" ? v(this.properties) : this.properties[v];
		return this;
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

	bounds: function() {
        return this._bounds || (this._bounds = this.geometry && d3.geo.bounds(this.asGeoJSON()));
    },

    extent: function() {
        return this._extent || (this._extent = new MM.Extent(this.bounds()[1][1], this.bounds()[0][0], this.bounds()[0][1], this.bounds()[1][0]));
    },

	centroid: function() {
		return this._centroid || (this._centroid = this.geometry && d3.geo.centroid(this.asGeoJSON()));
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