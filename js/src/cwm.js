window.cwm = {

  init: function (mapId, storiesId) {
    
    var baseUrl = 'https://docs.google.com/spreadsheet/pub?key=0ArHJ46D4DMthdFRCV1VGc1RoVThlSHEzSzRrbHMtclE&single=true&output=csv';
    
    var options = {
      
      // Bing Maps API key for satellite layer
      // Register for key at http://www.bingmapsportal.com
      // Currently a basic non-profit key. Need to check limits.
      bingApiKey: "Ajt-JIuGs7jVKkk4yeC5HWByvuHQ4OEISvzK2-77yRcz_EOCAGfooD4eDeZ-aY4l",
      
      // Mapbox ID for overlay map
      mapboxId: 'gmaclennan.clearwater,gmaclennan.map-y7pgvo15',
      
      // Bounds for the initial view of the map (South America)
      startBounds: [ { lat: -55, lon: -90 }, { lat: 14, lon: -33 } ],
      
      // Data sources for overlay and markers (currently CartoDB)
      communityUrl: baseUrl + "&gid=1",
                                 
      installationUrl: baseUrl + "&gid=0",
      
      padding: 580 
           
    };
    
    cwm.map = cwm.Map('map', options);
    cwm.scrollHandler = cwm.handlers.ScrollHandler(cwm.map);

    var stories = cwm.Stories('stories').map(cwm.map);

  }
  
};