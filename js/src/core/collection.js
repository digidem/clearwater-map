/**
 * A collection of places
 * @param {text} id Identifier for this collection
 */
cwm.Collection = function(id) {
	var event = d3.dispatch("changed"),
		byId = {},
		byParent = {},
		places,
		parents = [],
		bounds;

	var defaults = {
		// id is either a string or a function which returns the id
		id: function(d) { return d.properties.id; },
		storyKey: "story",
		titleKey: "title",
		parent: null
	};

	var collection = {
		add: function(geojson, options) {
			_.defaults(options, defaults);
			// Faster to create a fixed size array http://jsperf.com/array-push-vs-array-length23333/8
			places = new Array(geojson.features.length);
			bounds = d3.geo.bounds(geojson);

			// Create a new place for each feature in the geoJSON
			geojson.features.forEach(function(feature, i) {
				var place = cwm.Place(feature, options).on("changed", event.changed);
				// Build an array of unique parents referenced from incoming data
				if (!(place.parent in byParent)) byParent[place.parent] = [];
				byParent[place.parent].push(place);
				byId[place.id] = place;
				places[i] = place;
			});
			return collection;
		},

		get: function(id) {
			return byId[id];
		},

		getByParent: function(parentId) {
			return byParent[parentId];
		},

		asGeoJSON: function() {
			return {
				type: "FeatureCollection",
				features: places.map(function(place) {
					return place.asGeoJSON();
				})
			};
		},
	};

	return d3.rebind(collection, event, 'on');
};

// // Insert new places with parent = id after their parent with that id
// parents.forEach(function(id) {
// var index = _.findIndex(places, { id: id }) + 1;
// Array.prototype.splice.apply(places, [index, 0].concat(_.filter(newPlaces, { parent: id })));
// });