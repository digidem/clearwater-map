window.cwm = {

    init: function (selector) {

        var baseUrl = 'http://clearwater.cartodb.com/api/v2/sql?format=geojson&q=';

        var options = {
          
            // Bing Maps API key for satellite layer
            // Register for key at http://www.bingmapsportal.com
            // Currently a basic non-profit key. Need to check limits.
            bingApiKey: "Ajt-JIuGs7jVKkk4yeC5HWByvuHQ4OEISvzK2-77yRcz_EOCAGfooD4eDeZ-aY4l",

            // Mapbox ID for overlay map (this actually composites two Mapbox maps)
            mapboxId: 'gmaclennan.clearwater,gmaclennan.map-y7pgvo15',

            // Bounds for the initial view of the map (South America)
            startBounds: [ { lat: -55, lon: -90 }, { lat: 14, lon: -33 } ],

            // Data sources for overlay and markers (currently CartoDB)
            communityUrl: baseUrl + "SELECT ST_Simplify(the_geom, 0.0002) AS the_geom, c.cartodb_id, c.community, c.nationality, systems, users " +
                                     "FROM communities AS c LEFT JOIN (SELECT COUNT(*) AS systems, SUM(users) AS users, community " +
                                     "FROM clearwater_well_installations GROUP BY community) AS cwi ON c.community = cwi.community WHERE active",
                                     
            installationUrl: baseUrl + "SELECT *, to_char(date, 'YYYY-MM-DD') AS date FROM clearwater_well_installations WHERE photo IS NOT NULL",

            // Width taken by the stories on the left.
            // This is used to calculate map views so that features are not overlapped by the stories.
            padding: 580
               
        };

        var container = d3.select(selector);
        var mapDiv = container.insert("div", ":first-child").attr("id", "map");
        var storiesDiv = container.insert("div", ":first-child").attr("id", "stories");

        var communities = cwm.Collection()
            .placeId("community")
            .placeParentId("nationality")
            .add(cwm.data.communities.features);

        var nationalities = cwm.Collection()
            .placeId("nationality")
            .placeParentId(function() { return "Ecuador"; })
            .add(cwm.data.communities.features);

        var ecuador = cwm.Collection()
            .placeId(function() { return "Ecuador"; })
            .add(cwm.data.ecuador.features);

        var narrative = cwm.narrative = cwm.Narrative()
            .add(ecuador)
            .add(nationalities)
            .add(communities);

        cwm.map = cwm.Map(mapDiv, options);
        cwm.scrollHandler = cwm.handlers.ScrollHandler(cwm.map);
        cwm.stories = cwm.Stories(storiesDiv).map(cwm.map);

    }
  
};