/* ==========================================================
 * bootstrap-affix.js v2.3.2
 * http://twitter.github.com/bootstrap/javascript.html#affix
 * ==========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!function ($) {

  "use strict"; // jshint ;_;


 /* AFFIX CLASS DEFINITION
  * ====================== */

  var Collapse = function (element, options) {
    this.options = $.extend({}, $.fn.collapse.defaults, options)
    this.$window = $(window)
      .on('scroll.collapse.data-api', $.throttle($.proxy(this.checkPosition, this),40))
      .on('click.collapse.data-api',  $.proxy(function () { setTimeout($.proxy(this.checkPosition, this), 1) }, this))
    this.$element = $(element)
    var $parent = this.$element.parent()
    this.$element.nextAll().wrapAll('<div class="background" />')
    this.height = this.$element.height()
    this.width = this.$element.width()
    this.$nextAll = this.$element.next()
                     .add($parent.nextAll())
                     .add($parent.parent().nextAll()).reverse()
                     console.log(this.$nextAll)
    this.checkPosition()
  }

  Collapse.prototype.checkPosition = function () {
    if (!this.$element.is(':visible')) return

    var scrollHeight = $(document).height()
      , scrollTop = this.$window.scrollTop()
      , offset = this.$element.offset()
      , height = this.height
      , width = this.width
      , affix
      , scrolledPast
         
    // Check whether content should be 'affixed' as element scrolls into our out of view
    affix = offset.top - scrollTop <= height && scrollTop < offset.top
    
    // Check if scroll is already past the element
    scrolledPast = scrollTop >= offset.top
    
    // Exit if nothing has changed since last time
    if (this.affixed === affix) return

    // If this is the first time this is called and we have not yet
    // scrolled passed the element, then move everything up
    console.log('this.affixed', (typeof this.affixed === 'undefined'), this.affixed)
    if (typeof this.affixed === 'undefined' && !scrolledPast) {
      this.$element.css('position', 'absolute')
      this.affixed = affix
      return
    }

    if (affix) {
      if (offset.top - scrollTop > height) this.$element.css('position','absolute')
      this.$nextAll.each(function () {
        var $this = $(this)
        var top = $this.offset().top
        var width = $this.width()
        console.log($this.attr('id'), top, scrollTop)
        $this.css({ 
          top: top - scrollTop, 
          width: width
        }).addClass('affixed')
        console.log($this.css('top'))
      })
    } else {
      this.$element.css('position', scrolledPast ? 'relative' : 'absolute')
      this.$nextAll.each(function () {
        var $this = $(this)
        $this.css({ top: '', width: '' }).removeClass('affixed')
      })
    }
    this.affixed = affix
  }

  $.fn.reverse = [].reverse;

 /* AFFIX PLUGIN DEFINITION
  * ======================= */

  var old = $.fn.affix

  $.fn.collapse = function (option) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('collapse')
        , options = typeof option == 'object' && option
      if (!data) $this.data('collapse', (data = new Collapse(this, options)))
      if (typeof option == 'string') data[option]()
    })
  }

  $.fn.collapse.Constructor = Collapse

  $.fn.collapse.defaults = {
    offset: 0
  }


 /* AFFIX NO CONFLICT
  * ================= */

  $.fn.collapse.noConflict = function () {
    $.fn.collapse = old
    return this
  }


 /* AFFIX DATA-API
  * ============== */

  $(window).on('load', function () {

  })


}(window.jQuery);