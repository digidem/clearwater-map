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

        var container = d3.select(selector);
        var storiesDiv = container.insert("div", ":first-child").attr("id", "stories");
        var mapDiv = container.insert("div", ":first-child").attr("id", "map");

        // used to keep track of map data as it loads.
        var loaded = { length: 0 };

        var flightplan = cwm.flightplan = cwm.Flightplan().show("featured");

        var stories = cwm.stories = cwm.Stories(storiesDiv).data(flightplan);

        var map = cwm.map = cwm.Map(mapDiv).paddingLeft(580);

        var missionControl = cwm.mc = cwm.MissionControl().map(map);

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

        var ecuadorLayer = cwm.layers.FeatureLayer()
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
            .url("data/communities.topojson")
            .on("load", communitiesLayer.data)
            .fetch(onLoad);

        var nationalities = cwm.Collection("nationalities")
            .placeId(function(d) { return d.attr("nationality"); })
            .placeParentId("Ecuador")
            .url("data/nationalities.geojson")
            .fetch(onLoad);

        var other = cwm.Collection("overview")
            .placeId(function(d) { return d.attr("id"); })
            .placeParentId(function(d) { return d.attr("parent"); })
            .url("data/other.topojson")
            .on("load", function(d) {
                ecuadorLayer.data(cwm.Collection("country").add(d.get("Ecuador")));
            })
            .fetch(onLoad);

        // When each dataset loads, add it to the flightplan
        function onLoad() {
            var loadedId = this.id();
            flightplan.add(this);
            loaded[loadedId] = true;

            // As soon as we can, set the map extents for the first view
            if (loadedId === "other") {
                setExtentCoords([this.get("Intro")]);
                map.setCoordinate(this.get("Intro")._extentCoordinate);
            }

            // Once everything is loaded, set the map extent for each place
            if (loaded.length++ == 3) {
                installationsLayer.setMinZooms();
                setExtents();
                missionControl.stories(stories);
            }
        }

        function setExtents() {
            setExtentCoords(other);
            setExtentCoords([other.get("Ecuador")], 0, true);
            setExtentCoords(nationalities, -0.5);
            setExtentCoords(communities, 0, true);
            setExtentCoords(installations);
            missionControl.setEasings();
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

        d3.select(window).on("resize.extents", setExtents);

        // cwm.scrollHandler = cwm.handlers.ScrollHandler(cwm.map);
        // cwm.stories = cwm.Stories(storiesDiv).map(cwm.map);

    }
  
};