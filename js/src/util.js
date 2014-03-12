/*jshint proto:true */

cwm.util = {

    // Helper to _sanitize a string, replacing spaces with "-" and lowercasing
    sanitize: function(string) {
        if (typeof string != "undefined" && string !== null)
            return "id-" + string.toString().toLowerCase()
                .split(" ").join("-").split("/").join("-");
    },

    preloadImages: function(geojson, community) {
        _.forEach(geojson.features, function(v) {
            if (community === v.properties.community) {
                var img = new Image();
                img.src = v.properties.photo;
            }
        });
    },

    emptyGIF: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',

    // Inspired by LeafletJS
    transformProperty: (function(props) {
        if (!this.document) return; // node.js safety
        var style = document.documentElement.style;
        for (var i = 0; i < props.length; i++) {
            if (props[i] in style) {
                return props[i];
            }
        }
        return false;
    })(['transform', '-webkit-transform', '-o-transform', '-moz-transform', '-ms-transform']),


    // Fill an array of n length
    fillArray: function(val, len) {
        var a = [];
        var v;
        var isArray = (val instanceof Array);

        for (var i = 0; i < len; i++) {
            v = (isArray) ? val.slice(0) : val;
            a.push(v);
        }
        return a;
    },

    // Converts a Modest Maps bound object to something D3 understands
    d3Bounds: function(MMbounds) {
        return [[MMbounds[0].lon, MMbounds[0].lat], [MMbounds[1].lon, MMbounds[1].lat]];
    },

    asyncMap: function(inputs, func, callback) {
        var remaining = inputs.length,
            results = [],
            errors = [];

        inputs.forEach(function(d, i) {
            func(d, function done(err, data) {
                errors[i] = err;
                results[i] = data;
                remaining--;
                if (!remaining) callback(errors, results);
            });
        });
    },

    subclass: (function() {
        return {}.__proto__ ?
        // Until ECMAScript supports array subclassing, prototype injection works well. 
        // See http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/

        function(object, prototype) {
            object.__proto__ = prototype;
        } :

        // And if your browser doesn't support __proto__, we'll use direct extension.

        function(object, prototype) {
            for (var property in prototype) object[property] = prototype[property];
        };
    })(),

    // borrowed from underscore
    extend: function(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function(source) {
            if (source) {
                for (var prop in source) {
                    obj[prop] = source[prop];
                }
            }
        });
        return obj;
    },

    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    // From https://github.com/jashkenas/backbone
    extendClass: function(protoProps, staticProps) {
        var parent = this;
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call the parent's constructor.
        if (protoProps && _.has(protoProps, 'constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        // Add static properties to the constructor function, if supplied.
        cwm.util.extend(child, parent, staticProps);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        var Surrogate = function() {
            this.constructor = child;
        };
        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) cwm.util.extend(child.prototype, protoProps);

        // Set a convenience property in case the parent's prototype is needed
        // later.
        child.__super__ = parent.prototype;

        return child;
    }

};
