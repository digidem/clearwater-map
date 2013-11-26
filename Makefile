all: \
  dist/cwm.js \
  dist/cwm.min.js
  
dist/cwm.js: \
  js/start.js \
  js/cwm.js \
  js/map.js \
  js/stories.js \
  js/render.js \
  js/util.js \
  js/util/MM.overrides.js \
  js/util/domhelpers.js \
  js/layers.js \
  js/layers/bing_layer.js \
  js/layers/mapbox_layer.js \
  js/layers/feature_layer.js \
  js/layers/marker_layer.js \
  js/handlers.js \
  js/handlers/drag_handler.js \
  js/handlers/ease_handler.js \
  js/handlers/reveal_handler.js \
  js/handlers/marker_interaction.js \
  js/end.js

dist/cwm.js: node_modules/.install Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@

dist/cwm.min.js: dist/cwm.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

node_modules/.install: package.json
	npm install && touch node_modules/.install
  
clean:
	rm -f dist/mapstory*.js dist/mapstory.css