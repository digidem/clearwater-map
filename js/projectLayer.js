
projectLayer = cwm.d3Layer("project-area");

projectLayer.onLoadData = function (projectLayer) {
  projectLayer.draw().addFilters();
  projectLayer.loaded = true;
};
