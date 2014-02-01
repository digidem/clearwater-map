/**
 * A collection of places
 */
cwm.Collection = function(id) {
    if (!(this instanceof cwm.Collection))
        return new cwm.Collection(id);

    var arr = [];
    cwm.util.subclass(arr, cwm.Collection.prototype);

    cwm.util.extend(arr, {
        _id: id,
        _byId: {},
        _byParent: {},
        _idField: "id",
        _parentIdField: "parent",
        _boundsFn: function() { return d3.geo.bounds(this.asGeoJSON); },
        // Add any custom events as arguments to d3.dispatch
        event: d3.dispatch('changed', 'reset', 'load')
    });

    return arr;
};

cwm.Collection.extend = cwm.util.extendClass;

cwm.Collection.prototype = Object.create(Array.prototype);

cwm.util.extend(cwm.Collection.prototype, {

    // Copies this 'on' method from d3_dispatch to the prototype
    on: function() { 
        var value = this.event.on.apply(this.event, arguments);
        return value === this.event ? this : value;
    },

    model: cwm.Place,

    // add one or more features to the collection
    // features can be a single geoJSON feature, an array of geoJSON features,
    // or a cwm.Place or array of cwm.Place
    add: function(models, index) {
        // Add the features to a byParentId and byId index. Defaults to true
        if (typeof index === "undefined") index = true;
        // force into array
        if (!(models instanceof Array)) models = [models];

        // Create a new place for each feature in the geoJSON
        models.forEach(function(model) {

            if (!(model instanceof this.model)) {
                model = this.model(model)
                    .on("changed", this.event.changed)
                    .parentId(this._parentIdField)
                    .id(this._idField);
            }

            this.push(model);

            if (index) {
                model.collection = this;
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

    reset: function(models) {
        this.length = 0;
        this.add(models);
        this.event.reset(this);
    },

    url: function(url) {
        if (!arguments.length) return this._url;
        this._url = url;
        return this;
    },

    fetch: function(callback) {
        var self = this;

        if (!self._url) throw "Url is not defined on the collection";

        // Fetch the CSV file and parse it into geoJSON
        d3.json(self._url)
            .get(function loaded(e, data) {
                if (e) throw e.response + ": Could not load " + url;
                else self.reset(data.features);
                self.event.load(self);
                if (typeof callback === "function") callback.call(self, e, data);
            });

        return this;
    },

    id: function(_) {
        if (!arguments.length) return this._id;
        this._id = _;
        return this;
    },

    placeId: function(idField) {
        if (!arguments.length) return this._idField;
        this._idField = idField;
        this._reindex();
        return this;
    },

    placeParentId: function(parentIdField) {
        if (!arguments.length) return this._parentIdField;
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

    count: function(attr) {
        if (!attr) {
            return this.length + 1;
        } else {
            return this.reduce(function(previousValue, place) {
                //console.log(place.collection.id(), place.attr(attr));
                return previousValue + (place.attr(attr) || 0);
            }, 0);
        }
    },

    // This finds the closest place to a given location, which can either be
    // a [lon, lat] array or a ModestMaps location
    nearest: function(location) {
        var lon, lat;

        if (location instanceof MM.Location) {
            lon = location.lon;
            lat = location.lat;
        } else if (location instanceof Array) {
            lon = location[0];
            lat = location[1];
        } else return;

        var nearestDistance = Infinity,
            nearestPlace;

        this.forEach(function(place) {
            var centroid = place.centroid();
            var distance = Math.pow(lon - centroid[0], 2) + Math.pow(lat - centroid[1], 2);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPlace = place;
            }
        });

        return nearestPlace;
    },

    bounds: function() {
        if (this._bounds) {
            return this._bounds;
        } else {
            var bounds = d3.geo.bounds(this.asGeoJSON());
            this._bounds = isNaN(bounds[0][0]) ? null : bounds;
            return this._bounds;
        }
    },

    // I apologize for this (and the above)
    extent: function() {
        return this._extent || 
        (this._extent = this.bounds() ?
            new MM.Extent(this.bounds()[1][1], this.bounds()[0][0], this.bounds()[0][1], this.bounds()[1][0]) :
            null);
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


