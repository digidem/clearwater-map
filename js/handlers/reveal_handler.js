// Handles the display of elements as the scroll on and off the screen
// Provides curtain effect & fades elements in and out.
cwm.handlers.RevealHandler = function() {
  var sa = {},
      wHeight = window.innerHeight,
      dHeight = document.body.scrollHeight,
      scrollStyles = new Array(dHeight),
      rangeStyles = [],
      enabled = false,
      animFrame = null,
      lastScroll;
      
  var query = function(s) { return document.querySelectorAll(s); };

  // Prefer Sizzle, if available.
  if (typeof Sizzle === "function") {
    query = function(s) { return Sizzle(s) ; };
  }
  
  var subclass = {}.__proto__?

    // Until ECMAScript supports array subclassing, prototype injection works well. 
    // See http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
    function(object, prototype) {
      object.__proto__ = prototype;
    }:

    // And if your browser doesn't support __proto__, we'll use direct extension.
    function(object, prototype) {
      for (var property in prototype) object[property] = prototype[property];
    };
  
  function Cache () {
    var arr = [ ];
    arr.push.apply(arr, arguments);
    subclass(arr, Cache.prototype);
    return arr;
  }
  
  Cache.prototype = Object.create(Array.prototype);
  Cache.prototype.add = function (value) {
    for (var i=0; i<this.length; i++) {
      if (equal(this[i], value)) return i;
    }
    return this.push(value) - 1;
    
    function equal (x, y) {
      if (!x || !y) return false;
      if (x == y) return true;
      if (x instanceof Array && y instanceof Array) {
        if (x.length != y.length) return false;
        for (var i = 0; i < x.length; i++) {
          // Check if we have nested arrays
          if (x[i] instanceof Array && y[i] instanceof Array) {
              // recurse into the nested arrays
              if (!equal(x[i], y[i])) return false;
          }
          // Warning - two different object instances will never be equal: {x:20} != {x:20}
          else if (x[i] != y[i]) return false;
        }
        return true;
      }
      return false;
    }
  };
  
  function ElementCache () {
    this.origStyles = {};
    this.length = 0;
    this.wrapped = {};
  }
  
  ElementCache.prototype.add = function (el) {
    for (var i=0; i<this.length; i++) {
      if (this[i] == el) return i;
    }
    this[i] = el;
    this.origStyles[i] = el.getAttribute("style");
    this.length += 1;
    return i;
  };
  
  var elements = new ElementCache(),
      styles = new Cache();

  // will apply class `classname` to elements selected by `selector` between
  // scroll points `start` and `end`, which can be numbers or functions
  // `this` will be passed to the function as the current element.
  sa.addClass = function (selector, className, start, end) {
    var i,
        elementId,
        range,
        els = query(selector);
    
    for (i = 0; i < els.length; i++) {
      elementId = elements.add(els[i]);
      range = getStartEnd.call(els[i], start, end);
      if (range[1] >= 0) {
        rangeStyles.push([range, elementId, className + " "]);
      }
    }
    return sa;
  };
  
  sa.affixTop = function (selector, end, offset) {
    offset = offset || 0;
    var e,
        endOffset,
        start = function () { return scrollTop(this) - offset; };
        
    wrapElements(selector);
    if (end) {
      if (typeof end === "function") {
        e = function () { return end.call(this) - offset; };
        endOffset = function () { return end.call(this) - scrollTop(this); };
      } else {
        e = function () { return end - offset; };
        endOffset = function () { return end - scrollTop(this); };
      }
      sa.addStyle(selector, { position: "relative", top: endOffset }, e, 999999);
    }
    sa.addStyle(selector, { position: "fixed", top: offset, bottom: "auto" }, start, e || 999999);
    return sa;
  };
  
  sa.affixBottom = function (selector, start, offset) {
    offset = offset || 0;
    var s,
        startOffset,
        end = function () { return scrollTop(this) - wHeight + this.offsetHeight + offset; };
    
    wrapElements(selector);
    if (start) {
      if (typeof start === "function") {
        s = function () { return start.call(this) - offset; };
        startOffset = function () { return start.call(this) - scrollTop(this) + wHeight - this.offsetHeight; };
      } else {
        s = function () { return start - offset; };
        startOffset = function () { return start - scrollTop(this); };
      }
      sa.addStyle(selector, { position: "relative", top: startOffset }, 0, s);
    }
    sa.addStyle(selector, { position: "fixed", bottom: offset, top: "auto" }, s || 0, end);
    return sa;
  };
  
  sa.fadeIn = function (selector, start, end) {
    fade(selector, end, start);
    sa.addStyle(selector, { opacity: 0 }, 0, start);
    return sa;
  };
  
  sa.fadeOut = function (selector, start, end) {
    fade(selector, start, end);
    sa.addStyle(selector, { opacity: 0 }, end, 999999);
    return sa;
  };
  
  function fade (selector, start, end) {
    var i, 
        elementId,
        range,
        s,
        e,
        fadeFunc,
        els = query(selector);
    
    for (i = 0; i < els.length; i++) {
      elementId = elements.add(els[i]);
      range = getStartEnd.call(els[i], start, end);
      s = range[0];
      e = range[1];
      if (s < e && e > 0) {
        // Fade out
        fadeFunc = (function (s,e) { return function (y) {
          return "opacity:" + easeOut(Math.max(e - y, 0) / (e - s)).toFixed(2) + ";";
        }; })(s,e);
        rangeStyles.push([[s,e], elementId, fadeFunc]);
      } else if (e < s && s > 0) {
        // Fade in
        fadeFunc = (function (s,e) { return function (y) {
          return "opacity:" + easeIn(Math.min(y - e, s - e) / (s - e)).toFixed(2) + ";";
        }; })(s,e);
        rangeStyles.push([[e,s], elementId, fadeFunc]);
      }
    }
  }
  
  // will apply `style` with `value` (function or string) 
  // to elements selected by `selector` between
  // scroll points `start` and `end`, which can be numbers or functions
  // `this` will be passed to the function as the current element.
  sa.addStyle = function (selector, styles, start, end) {
    var i,
        elementId,
        range,
        key,
        value,
        styleString,
        els = query(selector);  
    
    for (i = 0; i < els.length; i++) {
      elementId = elements.add(els[i]);
      range = getStartEnd.call(els[i], start, end);
      styleString = "";
      
      if (range[1] >= 0) {
        for (key in styles) {
          value = (typeof styles[key] === "function") ? styles[key].call(els[i]) : styles[key];
          value += (typeof value === "number" && key.match(/top|bottom/)) ? "px" : "";
          styleString += key + ":" + value + ";";
        }
        rangeStyles.push([range, elementId, styleString]);
      }
    }
    
    return sa;
  };
  
  sa.enable = function () {
    var t0 = performance.now();
    cacheScrollPointStyles();
    var t1 = performance.now();
    console.log("caching took " + (t1 - t0) + "ms");
    enabled = true;
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
    return sa;
  };
  
  function cacheScrollPointStyles () {
    var pixel,
        updated,
        styleId,
        i,
        start,
        end,
        elementId,
        style,
        elementStyles;
    
    styles.length = 0;
    styleId = styles.add(cwm.util.fillArray([""], elements.length));
    
    for (pixel = 0; pixel < dHeight; pixel++) {
      elementStyles = cwm.util.fillArray([""], elements.length);
      updated = false;
      
      for (i = 0; i < rangeStyles.length; i++) {
        start = rangeStyles[i][0][0];
        end = rangeStyles[i][0][1];
        elementId = rangeStyles[i][1];
        style = rangeStyles[i][2];
        
        if (pixel >= start && pixel < end) {
          if (typeof style === "function") {
            // For now only handle one function style per element
            // using push here doubles the time for caching
            elementStyles[elementId][1] = style;
          } else {
            elementStyles[elementId][0] += style;
          }
          updated = true;
        }
      }
      
      if (updated) styleId = styles.add(elementStyles);
      
      scrollStyles[pixel] = styleId;
    }
  }

  function getStartEnd (start, end) {
    return [
      (typeof start === "function") ? start.call(this) : start,
      (typeof end === "function") ? end.call(this) : end
    ];  
  }
  
  function update (y) {
    var styleId = scrollStyles[Math.max(y,0)];
    var elementStyles = styles[styleId];
    var i, 
        el,
        styleString,
        j;
    
    for (i = 0; i < elementStyles.length; i++) {
      el = elements[i];
      styleString = elementStyles[i][0];
      for (j = 1; j < elementStyles[i].length; j++) {
        styleString += elementStyles[i][j].call(el,y);
      }
      if (el.getAttribute("style") !== styleString) {
        el.setAttribute("style", styleString);
      }
    }
  }
  
  function loop () {
    var y = window.pageYOffset;

    if (!enabled) return false;
    
    // Avoid calculations if not needed and just loop again
    if (lastScroll == y) {
        animFrame = requestAnimationFrame(loop);
    } else {
      lastScroll = y;
      update(y);
      animFrame = requestAnimationFrame(loop);
    }
  }
  
  function scrollTop (el) {
    if (!el) return 0;
    return el.offsetTop + scrollTop(el.offsetParent);
  }
  
  function easeIn (t) {
    return t*t;
  }
  
  function easeOut (t) {
    return 1 - easeIn(1-t);
  }
  
  function wrapElements(selector) {
    var height,
        els = query(selector);
    for (var i = 0; i < els.length; i++) {
      if (els[i].parentNode.getAttribute("data-wrap") !== "") {
        height = els[i].offsetHeight + "px";
        $(els[i]).wrapAll('<div data-wrap style="position: relative; height: ' + height + '" />');
      }
    }
  }
  
  return sa;
};
