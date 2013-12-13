/**
 * A collection of places
 * @param {text} id Identifier for this collection
 */
cwm.Collection = function(id) {
	var event = d3.dispatch("changed");

	if (!(this instanceof cwm.Collection))
		return new cwm.Collection();
	this.id = id;
	this._byId = {};

	return d3.rebind(this, event, 'on');
};

cwm.Collection.prototype = {
	defaults: {
		// id is either a string or a function which returns the id
		id: function(d) { return d.properties.id; },
		storyKey: "story",
		titleKey: "title",
		parent: null
	},

	add: function(geojson, options) {
		var allByParent = this._allByParent,
			places = this.places,
			byId = this._byId,
			allById = this._allById;

		_.defaults(options, this.defaults);
		// Faster to create a fixed size array http://jsperf.com/array-push-vs-array-length23333/8
		this.places = new Array(geojson.features.length);
		this.bounds = d3.geo.bounds(geojson);

		// Create a new place for each feature in the geoJSON
		geojson.features.forEach(function(feature, i) {
			// When a place changes, trigger change event on collection
			var place = cwm.Place(feature, options).on("changed", event.changed);
			// If the place's parent is not indexed, index it
			if (!(place.parent in allByParent)) allByParent[place.parent] = [];
			// If the place's parent is already cached, add this place as a child
			if (place.parent in allById) allById[place.parent].children.push(place);
			// If this place is a parent to a place already cached, add that place as a child.
			if (place.id in allByParent) place.children.push(allByParent[place.id]);
			// Index a reference to this place by parent
			allByParent[place.parent].push(place);
			// Index a reference to this place by id, both in the instance and the prototype.
			allById[place.id] = byId[place.id] = place;
			// Add the place to the instance places array
			places[i] = place;
		});
		return this;
	},

	get: function(id) {
		return (id) ? this._byId[id] : this.places;
	},

	getallByParent: function(parentId) {
		return allByParent[parentId];
	},

	asGeoJSON: function() {
		return {
			type: "FeatureCollection",
			features: places.map(function(place) {
				return place.asGeoJSON();
			})
		};
	},

	_allByParent: {},

	_allById: {}
};

// // Insert new places with parent = id after their parent with that id
// parents.forEach(function(id) {
// var index = _.findIndex(places, { id: id }) + 1;
// Array.prototype.splice.apply(places, [index, 0].concat(_.filter(newPlaces, { parent: id })));
// });