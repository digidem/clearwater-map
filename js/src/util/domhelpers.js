(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
})('$x', this, function() {

  function offsetTop (el) {
    if (!el) return 0;
    return el.offsetTop + offsetTop(el.offsetParent);
  }
  
  function parent (el, tag) {
    if (el.tagName == "HTML" || el.tagName == tag.toUpperCase()) return dh(el);
    return parent(el.parentNode, tag);
  }
  
  var dh = function (el) {
    if (!(this instanceof dh)) {
      return new dh(el);
    }
    this[0] = el;
  };

  dh.prototype = {
    
    get: function () {
      return this[0] || null
    },
    
    next: function () {
      return dh(this[0].nextElementSibling);
    },
    
    offsetTop: function () {
      return offsetTop(this[0]);
    },

    offsetBottom: function () {
      return this[0] && this[0].offsetHeight + offsetTop(this[0]);
    },

    parent: function (tag) {
      return parent(this[0], tag);
    },
  
    previousSiblingOrCousin: function () {
      var parentPrevSibling = this[0].parentNode.previousElementSibling;
      return dh(this[0].previousElementSibling || (parentPrevSibling && parentPrevSibling.lastElementChild));
    },
    
    nextSiblingOrCousin: function () {
      var parentPrevSibling = this[0].parentNode.nextElementSibling;
      return dh(this[0].nextElementSibling || (parentPrevSibling && parentPrevSibling.firstElementChild));
    }
    
  };
  
  return dh;
  
});