/* Adapted from https://github.com/mapbox/mapbox.js/blob/master/extensions/mapbox.converters.googledocs.js
 * Takes JSON returned from a Google Spreadsheet public feed
 * and turns it into GeoJSON
*/

googleJson2GeoJson = function(googlejson) {
  var geojson = [],
    latField = '',
    rows = googlejson.feed.entry,
    lonField = '';
    
  if (!googlejson || !googlejson.feed) return geojson;

  // Check first row for any columns that start with "Lat" or "Lon".
  // Use these columns for lat and lon fields in the output GeoJSON
  for (var column in rows[0]) {
    if (column.match(/\$Lat/i)) latField = column;
    if (column.match(/\$Lon/i)) lonField = column;
  }

  // Loop through each row in the spreadsheet
  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var row = rows[rowIndex];
    
    // Template for each feature in the GeoJSON (based on GeoJSON spec)
    var feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: []
      },
      properties: {}
    };
    
    // Loop through each column in the spreadsheet row
    for (var column in row) {
      var cellData = (row[column].$t != "") ? row[column].$t : false;
      // If column contains Latitude, add to geometry.coordinates
      if ((column == latField) && cellData) feature.geometry.coordinates[1] = parseFloat(cellData);
      // If coloum contains Longitude, att to geometry.coordates
      else if ((column == lonField) && cellData) feature.geometry.coordinates[0] = parseFloat(cellData);
      // Otherwise, add the data to the properties object of the feature.
      else if (column.indexOf('gsx$') === 0) {
        feature.properties[column.replace('gsx$', '')] = row[column].$t;
      }
    }
    // Only push the row to the geoJSON object if it contains both Lat & Lon.
    if (feature.geometry.coordinates.length == 2) geojson.push(feature);
  }

  return geojson;
};
