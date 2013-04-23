// Adapted from https://github.com/mapbox/mapbox.js/blob/master/extensions/mapbox.converters.googledocs.js

googledocs2geojson = function(x) {
  var features = [],
      latfield = '',
      lonfield = '';
  if (!x || !x.feed) return features;

  for (var f in x.feed.entry[0]) {
      if (f.match(/\$Lat/i)) latfield = f;
      if (f.match(/\$Lon/i)) lonfield = f;
  }

  for (var i = 0; i < x.feed.entry.length; i++) {
      var entry = x.feed.entry[i];
      var feature = {
          type: 'Feature',
          geometry: {
              type: 'Point',
              coordinates: []
          },
          properties: {
            "marker-symbol": "circle",
            "marker-size": "small",
            "marker-color": "#ebf4fa"
          }
      };
      for (var y in entry) {
          if ((y === latfield) && (entry[y].$t != "")) feature.geometry.coordinates[1] = parseFloat(entry[y].$t);
          else if ((y === lonfield) && (entry[y].$t != "")) feature.geometry.coordinates[0] = parseFloat(entry[y].$t);
          else if (y.indexOf('gsx$') === 0) {
              feature.properties[y.replace('gsx$', '')] = entry[y].$t;
          }
      }
      if (feature.geometry.coordinates.length == 2) features.push(feature);
  }

  return features;
  
};