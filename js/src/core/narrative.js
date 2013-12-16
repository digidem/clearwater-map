/**
 * A narrative is a collection of nested stories organized in a narrative arc.
 */
cwm.Narrative = function() {
    if (!(this instanceof cwm.Narrative))
        return new cwm.Narrative();

    var arr = [];
    cwm.util.subclass(arr, cwm.Narrative.prototype);

    cwm.util.extend(arr, {
        _orphans: {}
    });

    return arr;
};

cwm.Narrative.prototype = Object.create(Array.prototype);

cwm.util.extend(cwm.Narrative.prototype, {

    // This adds data structured in a tree in a linear format:
    // parent -> child -> grandchild -> grandchild -> child -> grandchild -> parent etc.
    add: function(collection) {
        var parentId,
            children,
            inserted;

        // Used to keep track of what we have and haven't added to the narrative
        // We can run this without a collection to check whether we have orphans to add
        var byParent = (collection) ? cwm.util.extend(this._orphans, collection.getByParent()) : this._orphans;

        // First add any places in the collection without a parent to the narrative
        if (byParent[undefined]) {

            byParent[undefined].forEach(function(place) {
                this.push(place);
                inserted = true;
            }, this);

            // ok, added those, we can delete them from `byParent` (this is a shallow clone)
            delete byParent[undefined];
        }

        // Insert new places with parent = id after their parent with that id
        for (var i = 0; i < this.length; i++) {
            parentId = this[i].id();
            // Look up children of current story/place 
            children = byParent[parentId];

            if (children) {
                // See http://stackoverflow.com/questions/1348178/a-better-way-to-splice-an-array-into-an-array-in-javascript
                Array.prototype.splice.apply(this, [i + 1, 0].concat(children));
                inserted = true;
                // splicing new arguments changes the length of storyData, 
                // which we need to remember the next time we loop and 
                // append children to the next element
                i += children.length;
            }

            // ok, added those, we can delete the reference to that
            delete byParent[parentId];
        }

        // Anything left is tracked in `this._orphans` and we will try to insert again
        // when we add a new colleciton to the narrative
        this._orphans = byParent;

        // We need to run this again if anything was inserted and there are any orphans left
        // in order to check whether anything else needs inserted.
        if (inserted && Object.keys(byParent).length > 0) this.add();

        return this;
    }

});
