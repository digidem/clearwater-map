window.cwm = {

  init: function (mapId, storiesId) {
    
    var baseUrl = 'http://clearwater.cartodb.com/api/v2/sql?format=geojson&q=';
    
    var options = {
      
      // Bing Maps API key for satellite layer
      // Register for key at http://www.bingmapsportal.com
      // Currently a basic non-profit key. Need to check limits.
      bingApiKey: "Ajt-JIuGs7jVKkk4yeC5HWByvuHQ4OEISvzK2-77yRcz_EOCAGfooD4eDeZ-aY4l",
      
      // Mapbox ID for overlay map
      mapboxId: 'gmaclennan.map-y7pgvo15',
      
      // Bounds for the initial view of the map (South America)
      startBounds: [ { lat: -55, lon: -90 }, { lat: 14, lon: -33 } ],
      
      // Data sources for overlay and markers (currently CartoDB)
      communityUrl: baseUrl + 'SELECT ST_Simplify(the_geom, 0.0002) AS the_geom, c.cartodb_id, c.community, c.nationality, c.overview, c.and_clearwater, systems, users ' +
                                 'FROM communities AS c LEFT JOIN (SELECT COUNT(*) AS systems, SUM(users) AS users, community ' +
                                 'FROM clearwater_well_installations GROUP BY community) AS cwi ON c.community = cwi.community WHERE active',
                                 
      installationUrl: baseUrl + 'SELECT * FROM clearwater_well_installations WHERE photo IS NOT NULL',
      
      padding: 580 
           
    };
    
    cwm.map = cwm.Map('map', options);
    cwm.scrollHandler = cwm.handlers.ScrollHandler(cwm.map);

    var stories = cwm.Stories('#stories').map(cwm.map);

  }
  
};