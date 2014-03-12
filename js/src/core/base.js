// Base class inherited by other core classes
cwm.Base = function () {};

cwm.Base.prototype = {

    // Set the field that contains the unique id. `x` can be a string or a function
    id: function(x) {
        if (!arguments.length) return this._id.toString().match(/^\d/) ? "id-" + this._id : this._id;
        this._id = typeof x === "function" ? x(this) : x;
        return this;
    },

    // Copies this 'on' method from d3_dispatch to the prototype
    on: function() { 
        var value = this.event.on.apply(this.event, arguments);
        return value === this.event ? this : value;
    },

    extent: function() {
        if (typeof this._extent !== "undefined") return this._extent;
        this._extent = !this.bounds() ?
            null : new MM.Extent(this.bounds()[1][1], this.bounds()[0][0], this.bounds()[0][1], this.bounds()[1][0]);
        return this._extent;
    },

    // Returns null if `this` does not have a centroid, and caches the result.
    centroid: function() {
        if (typeof this._centroid !== "undefined") return this._centroid;
        this._centroid = d3.geo.centroid(this.asGeoJSON());
        this._centroid = isNaN(this._centroid[0]) ? null : this._centroid;
        return this._centroid;
    }
};