window.cwm = {

    launch: function (selector) {

        var options = {
          
            // Bing Maps API key for satellite layer
            // Register for key at http://www.bingmapsportal.com
            // Currently a basic non-profit key. Need to check limits.
            bingApiKey: 'Ajt-JIuGs7jVKkk4yeC5HWByvuHQ4OEISvzK2-77yRcz_EOCAGfooD4eDeZ-aY4l',

            // Mapbox ID for overlay map (this actually composites two Mapbox maps)
            mapboxId: 'gmaclennan.clearwater,gmaclennan.map-y7pgvo15',

        };

        var container = d3.select(selector).append("div").classed("wrapper", true);
        var storiesDiv = container.insert("div", ":first-child").attr("id", "stories");
        var mapDiv = container.insert("div", ":first-child").attr("id", "map");

        var flightplan = cwm.flightplan = cwm.Flightplan().show("featured");

        var stories = cwm.stories = cwm.Stories(storiesDiv);

        var map = cwm.map = cwm.Map(mapDiv).paddingLeft(580);

        var missionControl = cwm.mc = cwm.MissionControl(d3.select(selector)).map(map).flightplan(flightplan).stories(stories);

        var bingLayer = cwm.layers.BingLayer(options).addTo(map);
        var mapboxLayer = cwm.layers.MapboxLayer().id(options.mapboxId).addTo(map);

        var installationsLayer = cwm.layers.MarkerLayer()
            .addTo(map)
            .on("click", function(d) {
                missionControl.go(d);
            });

        var communitiesLayer = cwm.layers.FeatureLayer()
            .addTo(map)
            .on("click", function(d) {
                if (missionControl.current().place === d.parent) {
                    missionControl.go(d);
                } else {
                    missionControl.go(d.parent);
                }
            });

        var countryLayer = cwm.layers.FeatureLayer()
            .addTo(map)
            .on("click", function(d) {
                if (missionControl.current().place === d.parent) {
                    missionControl.go(d);
                }
            });

        // We augment the community field to use it as an id, since it can potentially
        // clash with the nationality id (e.g. nationality = Secoya && community = Secoya)
        var installations = cwm.Collection("installations")
            .placeId(function(d) { return d.attr("_id"); })
            .placeParentId(function(d) { return "c-" + d.attr("community"); })
            .url("data/installations.geojson")
            .on("load", installationsLayer.data)
            .fetch(onLoad);

        var communities = cwm.Collection("communities")
            .placeId(function(d) { return "c-" + d.attr("community"); })
            .placeParentId(function(d) { return d.attr("nationality"); })
            .extentFromChildren(true)
            .url("data/communities.topojson")
            .on("load", communitiesLayer.data)
            .fetch(onLoad);

        var nationalities = cwm.Collection("nationalities")
            .placeId(function(d) { return d.attr("nationality"); })
            .placeParentId("Ecuador")
            .zoomOffset(-0.5)
            .url("data/nationalities.topojson")
            .fetch(onLoad);

        var other = cwm.Collection("overview")
            .placeId(function(d) { return d.attr("id"); })
            .placeParentId(function(d) { return d.attr("parent"); })
            .url("data/other.topojson")
            .on("load", function(d) {
                var countries = cwm.Collection("country")
                    .add(d.get("Ecuador"))
                    .extentFromChildren(true);
                countryLayer.data(countries);
            })
            .fetch(onLoad);

        // When each dataset loads, add it to the flightplan
        function onLoad() {
            flightplan.add(this);
        }

    }
  
};