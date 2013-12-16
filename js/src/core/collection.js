/**
 * A collection of places
 */
cwm.Collection = function() {
	if (!(this instanceof cwm.Collection))
		return new cwm.Collection();

	var arr = [];
	cwm.util.subclass(arr, cwm.Collection.prototype);

	cwm.util.extend(arr, {
		_byId: {},
		_byParent: {},
		_idField: "id",
		_parentIdField: "parent"
	});

    return arr;
};

cwm.Collection.prototype = Object.create(Array.prototype);

cwm.util.extend(cwm.Collection.prototype, {

	// Add any custom events as arguments to d3.dispatch
    event: d3.dispatch('changed'),

    // Copies this 'on' method from d3_dispatch to the prototype
    on: function() { 
        var value = this.event.on.apply(this.event, arguments);
        return value === this.event ? this : value;
    },

    model: cwm.Place,

	// add one or more features to the collection
	// features can be a single geoJSON feature, an array of geoJSON features,
	// or a cwm.Place or array of cwm.Place
	add: function(features, index) {
		// Add the features to a byParentId and byId index. Defaults to true
		if (typeof index === "undefined") index = true;
		// force into array
		if (!(features instanceof Array)) features = [features];

		// Create a new place for each feature in the geoJSON
		features.forEach(function(model) {

			if (!(model instanceof this.model)) {
				model = this.model(model)
					.on("changed", this.event.changed)
					.parentId(this._parentIdField)
					.id(this._idField);
			}

			this.push(model);

			if (index) {
				// Index by id and parent id
				var parentId = model.parentId();
				// Creates a sub-collection for each group of places belonging to the same parent
				if (!(parentId in this._byParent)) this._byParent[parentId] = cwm.Collection();
				// We don't want to recurse forever, so we don't create an index for this one.
				this._byParent[parentId].add(model, false);
				this._byId[model.id()] = model;
			}

		}, this);

		return this;
	},

	placeId: function(idField) {
		if (!arguments.length) return this._idField;
		this._idField = idField;
		this._reindex();
		return this;
	},

	placeParentId: function(parentIdField) {
		if (!arguments.length) return _parentIdField;
		this._parentIdField = parentIdField;
		this._reindex();
		return this;
	},

	get: function(id) {
		return this._byId[id];
	},

	// Returns an array of places with a `parentId`
	getByParent: function(parentId) {
		if (!arguments.length) return this._byParent;
		return this._byParent[parentId] || [];
	},

	bounds: function() {
		return d3.geo.bounds(this.asGeoJSON);
	},

	asGeoJSON: function() {
		return {
			type: "FeatureCollection",
			features: this.map(function(place) {
				return place.asGeoJSON();
			})
		};
	},

	// Rebuilds byId and byParent index when the field changes.
	// This could be more efficient by doing one at a time, but 
	// this is not a bottleneck at this stage.
	_reindex: function() {
		this._byId = {};
		this._byParent = {};

		this.forEach(function(place) {
			place.id(this._idField);
			this._byId[place.id()] = place;
			place.parentId(this._parentIdField);
			var parentId = place.parentId();
			if (!(parentId in this._byParent)) this._byParent[parentId] = [];
			this._byParent[parentId].push(place);
		}, this);

		return this;
	}

});


