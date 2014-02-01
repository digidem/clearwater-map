window.cwm = {

    init: function(mapId, storiesId) {

        var baseUrl = '';

        var options = {

            // Bing Maps API key for satellite layer
            // Register for key at http://www.bingmapsportal.com
            // Currently a basic non-profit key. Need to check limits.
            bingApiKey: "Ajt-JIuGs7jVKkk4yeC5HWByvuHQ4OEISvzK2-77yRcz_EOCAGfooD4eDeZ-aY4l",

            // Mapbox ID for overlay map
            mapboxId: 'gmaclennan.clearwater,gmaclennan.map-y7pgvo15',

            // Bounds for the initial view of the map (South America)
            startBounds: [{
                lat: -55,
                lon: -90
            }, {
                lat: 14,
                lon: -33
            }],

            // Data sources for overlay and markers (currently CartoDB)
            communityUrl: baseUrl + "data/communities.geojson",

            installationUrl: baseUrl + "data/installations.geojson",

            padding: 580

        };

        // used to keep track of map data as it loads.
        var loaded = { length: 0 };

        var flightplan = cwm.flightplan = cwm.Flightplan().show("featured");

        // We augment the community field to use it as an id, since it can potentially
        // clash with the nationality id (e.g. nationality = Secoya && community = Secoya)
        cwm.data.installations = cwm.Collection("installations")
            .placeId("_id")
            .placeParentId(function(d) {
                return "c-" + d.community;
            })
            .url("data/installations.geojson")
            .fetch(onLoad);

        cwm.data.communities = cwm.Collection("communities")
            .placeId(function(d) {
                return "c-" + d.community;
            })
            .placeParentId("nationality")
            .url("data/communities.geojson")
            .fetch(onLoad);

        cwm.data.nationalities = cwm.Collection("nationalities")
            .placeId("nationality")
            .url("data/nationalities.geojson")
            .placeParentId(function() {
                return "Ecuador";
            })
            .fetch(onLoad);

        cwm.data.other = cwm.Collection("other")
            .placeId("id")
            .placeParentId("parent")
            .url("data/other.geojson")
            .on("load", function(d) {
                cwm.data.ecuador = {
                    "type": "FeatureCollection",
                    "features": [d.get("Ecuador")]
                };
                cwm.data.ecuador.features[0].properties.nationality = "ecuador";
            })
            .fetch(onLoad);

        function onLoad() {
            var loadedId = this.id();
            flightplan.add(this);
            loaded[loadedId] = true;

            // Once everything is loaded, set the map extent for each place
            if (loaded.length++ == 3) {
                cwm.render.stories(flightplan);
                cwm.map = cwm.Map('map', options);
                cwm.scrollHandler = cwm.handlers.ScrollHandler(cwm.map);

                cwm.map.onLoad();
                var stories = cwm.Stories('stories').map(cwm.map);
            }
        }

        function setExtents() {
            setExtentCoords(cwm.data.other);
            setExtentCoords([cwm.data.other.get("Ecuador")], 0, true);
            setExtentCoords(cwm.data.nationalities, -0.5);
            setExtentCoords(cwm.data.communities);
            setExtentCoords(cwm.data.installations);
        }

        function setExtentCoords(places, offset, fromChildren) {
            offset = offset || 0;

            places.forEach(function(place) {
                var extent;
                if (place.children && !place.geometry.coordinates || fromChildren) {
                    extent = place.children.extent() || place.children[0].children[0].collection.extent();
                } else {
                    extent = place.extent();
                }
                place._extentCoordinate = map.extentCoordinate(extent, true).zoomBy(offset);
            });
        }

    }

};
