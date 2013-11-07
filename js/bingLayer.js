if (typeof mapStory === 'undefined') mapStory = {};

mapStory.bingLayer = function(key, style) {
    if (!(this instanceof mapStory.bingLayer)) {
        return new mapStory.bingLayer(key, style);
    }
    
    this._subdomains = [0, 1, 2, 3];
    this._key = key;
    this._style = style;
    this._url = '';
    this.meta = '';
    
    this.parent = document.createElement('div');
    this.parent.style.cssText = 'position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; margin: 0; padding: 0; z-index: 0';
    this.levels = {};
    this.requestManager = new MM.RequestManager();
    this.requestManager.addCallback('requestcomplete', this.getTileComplete());
    this.requestManager.addCallback('requesterror', this.getTileError());
    this.setProvider(new wax.mm._provider({
        tiles: ['data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7']
    }));
    this.loadMetadata();
};

mapStory.bingLayer.prototype.initMetadata = function (bingjson) {
  var r = this.meta.resourceSets[0].resources[0];
  
  this._subdomains = r.imageUrlSubdomains;
  this._url = r.imageUrl.replace('{subdomain}', '{S}')
                        .replace('{quadkey}', '{Q}')
                        .replace('http:', document.location.protocol)
                        .replace('{culture}', '');
  this.setProvider(new MM.Template(this._url, this._subdomains));
}

mapStory.bingLayer.prototype.loadMetadata = function () {
  var url = document.location.protocol + "//dev.virtualearth.net/REST/v1/Imagery/Metadata/" + this._style;
  var that = this;
  $.ajax({
    url: url,
    data: { key: this._key },
    jsonp: 'jsonp',
    dataType: 'jsonp',
    success: function(data) {
      that.meta = data;
      that.initMetadata();
    }
  });
}

MM.extend(mapStory.bingLayer, MM.Layer);
