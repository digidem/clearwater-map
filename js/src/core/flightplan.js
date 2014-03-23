/**
 * A flightplan is a collection of nested stories organized in a flightplan arc.
 */
cwm.Flightplan = function() {
    if (!(this instanceof cwm.Flightplan))
        return new cwm.Flightplan();

    var arr = [];
    cwm.util.subclass(arr, cwm.Flightplan.prototype);

    cwm.util.extend(arr, {
        _orphans: {},
        _filterFn: function() {
            return true;
        },
        event: d3.dispatch('add')
    });

    return arr;
};

cwm.Flightplan.prototype = Object.create(cwm.util.extend(Object.create(Array.prototype), cwm.Base.prototype));

cwm.util.extend(cwm.Flightplan.prototype, {

    // Set the filter used to choose which elements to add to the flight plan
    show: function(_) {
        if (!arguments.length) return this._filterFn;
        if (typeof _ === "string") {
            this._filterFn = function(d) {
                return d.attr(_);
            };
        } else if (typeof _ === "function") {
            this._filterFn = _;
        }
        return this;
    },

    // This adds data structured in a tree in a linear format:
    // parent -> child -> grandchild -> grandchild -> child -> grandchild -> parent etc.
    // TODO: 
    // - Allow either collections or individual places to be added
    // - Attach to collection.on("add change") to add new models as they are added to
    //   the collection or changed.
    // - Also maintain an ordered list of all stories (not just featured)
    add: function(collection) {
        var parent,
            parentId,
            children,
            inserted = [],
            self = this;

        // Used to keep track of what we have and haven't added to the flightplan
        // We can run this without a collection to check whether we have orphans to add
        var byParent = (collection) ? cwm.util.extend(this._orphans, collection.getByParent()) : this._orphans;

        // First add any places in the collection without a parent to the flightplan
        if (byParent[undefined]) {

            byParent[undefined].filter(this._filterFn).forEach(function(place) {
                this.push(place);
                inserted.push(place);
            }, this);

            // ok, added those, we can delete them from `byParent` (this is a shallow clone)
            delete byParent[undefined];
        }

        // Insert new places with parent = id after their parent with that id
        for (var i = 0; i < this.length; i++) {
            parent = this[i];
            parentId = parent.id();

            // Look up children of current story/place 
            children = byParent[parentId];

            if (children) {
                featuredChildren = children.filter(this._filterFn);
                // See http://stackoverflow.com/questions/1348178/a-better-way-to-splice-an-array-into-an-array-in-javascript
                Array.prototype.splice.apply(this, [i + 1, 0].concat(featuredChildren));
                inserted = inserted.concat(featuredChildren);
                // splicing new arguments changes the length of storyData, 
                // which we need to remember the next time we loop and 
                // append children to the next element
                i += featuredChildren.length;

                parent.children.add(children, false);
                
                children.forEach(function(place) {
                    place.parent = parent;
                });
            }

            // ok, added those, we can delete the reference to that
            delete byParent[parentId];
        }

        // Anything left is tracked in `this._orphans` and we will try to insert again
        // when we add a new colleciton to the flightplan
        this._orphans = byParent || {};

        // We need to run this again if anything was inserted and there are any orphans left
        // in order to check whether anything else needs inserted.
        if (inserted.length && Object.keys(byParent).length > 0) this.add();

        this._addFamily();

        inserted.forEach(function(d) {
            this.event.add(d);
        }, this);

        return this;
    },

    _addFamily: function() {
        for (var i = 0; i < this.length; i++) {
            this[i]._index = i;
            this[i]._prev = this[i - 1] || this[i];
            this[i]._next = this[i + 1];
            this[i]._lastDescendant = this[i].lastDescendant(this._filterFn);
        }
    }

});
