all: \
	dist/cwm.css \
	dist/cwm.min.css \
	dist/cwm.js \
	dist/cwm.min.js
  
dist/cwm.js: \
  js/lib/d3.v3.js \
  js/lib/lodash.modern-2.4.1.js \
  js/lib/requestAnimationFrame.js \
  js/lib/modestmaps.js \
  js/lib/waxconnector.js \
  js/lib/easey.js \
  js/lib/d3.dimensions.js \
  js/lib/d3.keybinding.js \
  js/lib/topojson.js \
  js/src/cwm.js \
  js/src/map.js \
  js/src/stories.js \
  js/src/mission_control.js \
  js/src/render.js \
  js/src/templates.js \
  js/src/util.js \
  js/src/util/MM.overrides.js \
  js/src/core/base.js \
  js/src/core/place.js \
  js/src/core/collection.js \
  js/src/core/flightplan.js \
  js/src/ui/navigation.js \
  js/src/views.js \
  js/src/ui/markers.js \
  js/src/ui/popup.js \
  js/src/ui/overlay.js \
  js/src/layers.js \
  js/src/layers/bing_layer.js \
  js/src/layers/mapbox_layer.js \
  js/src/layers/feature_layer.js \
  js/src/layers/marker_layer.js \
  js/src/handlers.js \
  js/src/handlers/drag_handler.js \


dist/cwm.js: node_modules/.install Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@

dist/cwm.min.js: dist/cwm.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

dist/cwm.css: \
	css/data_uris.css \
	css/map.css \
	css/nav.css \
	css/images.css \
	css/stories.css \
	css/markers.css \
	css/features.css \
	css/animation.css \
	css/overlay.css

dist/cwm.css: Makefile
	@rm -f $@
	cat $(filter %.css,$^) > $@

dist/cwm.min.css: dist/cwm.css Makefile
	@rm -f $@
	node_modules/.bin/cleancss -o $@ $<

node_modules/.install: package.json
	npm install && touch node_modules/.install
  
clean:
	rm -f dist/cwm*.js dist/cwm.css

lib: \
	js/lib/d3.v3.js \
	js/lib/modestmaps.js \
	js/lib/waxconnector.js \
	js/lib/easey.js \
	js/lib/lodash.modern-2.4.1.js \
	js/lib/jquery-1.8.3.js 

js/lib/lodash.modern-2.4.1.js:
	curl https://raw.github.com/lodash/lodash/2.4.1/dist/lodash.js -o $@

js/lib/jquery-1.8.3.js:
	curl http://code.jquery.com/jquery-1.8.3.js -o $@

js/lib/modestmaps.js: node_modules/.install
	@rm -f $@
	cp node_modules/modestmaps/modestmaps.js $@

js/lib/waxconnector.js: node_modules/.install
	@rm -f $@
	cp node_modules/wax/connectors/mm/waxconnector.js $@

js/lib/easey.js: node_modules/.install
	@rm -f $@
	cp node_modules/easey/src/easey.js $@


D3_FILES = \
	node_modules/d3/src/start.js \
	node_modules/d3/src/arrays/index.js \
	node_modules/d3/src/behavior/behavior.js \
	node_modules/d3/src/behavior/drag.js \
	node_modules/d3/src/core/index.js \
	node_modules/d3/src/event/index.js \
	node_modules/d3/src/time/index.js \
	node_modules/d3/src/geo/path.js \
	node_modules/d3/src/geo/stream.js \
	node_modules/d3/src/selection/index.js \
	node_modules/d3/src/transition/index.js \
	node_modules/d3/src/xhr/index.js \
	node_modules/d3/src/dsv/index.js \
	node_modules/d3/src/end.js

js/lib/d3.v3.js: $(D3_FILES)
	node_modules/.bin/smash $(D3_FILES) > $@
	@echo 'd3 rebuilt. Please reapply 7e2485d, 4da529f, and 223974d'