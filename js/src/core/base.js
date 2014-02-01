// Base class inherited by other core classes
cwm.Base = function () {
    this._bounds = this._extent = this._centroid = null;
    // Copies this 'on' method from d3_dispatch to the prototype
    this.on = function() { 
        var value = this.event.on.apply(this.event, arguments);
        return value === this.event ? this : value;
    };
};

cwm.Base.prototype = {

    id: function(_) {
        if (!arguments.length) return this._id;
        this._id = _;
        return this;
    },

    bounds: function() {
        if (this._bounds) {
            return this._bounds;
        } else {
            var bounds = d3.geo.bounds(this);
            this._bounds = isNaN(bounds[0][0]) ? null : bounds;
            return this._bounds;
        }
    },

    extent: function() {
        return this._extent || (this._extent = new MM.Extent(this.bounds()[1][1], this.bounds()[0][0], this.bounds()[0][1], this.bounds()[1][0]));
    },

    centroid: function() {
        return this._centroid || (this._centroid = this.geometry && d3.geo.centroid(this));
    },

    /**
     * @return {object} A geoJSON representation of the place
     */
    asGeoJSON: function() {
        return {
            type: this.type,
            properties: this.properties,
            geometry: this.geometry
        };
    }
};