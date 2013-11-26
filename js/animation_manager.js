cwm.AnimationManager = function() {
  var animators = [];
  cwm.scrollY = window.scrollY;
  
  window.onscroll = function () { cwm.scrollY = window.scrollY; };

  loop();

  function loop() {
    animators.forEach(function(animator, index) {
      if (!animator()) {
        animators.splice(index, 1);
      }
    });
    window.requestAnimationFrame(loop);
  }
  var animationManager = {
    add: function(animator) {
      animators.push(animator);
    }
  };
  return animationManager;
};
