all: \
  dist/mapstory.css \
  dist/mapstory.js \
  dist/mapstory.min.js
  
dist/mapstory.js: \
  js/jquery-1.8.3.min.js \
  js/lodash.custom.js \
  js/mapbox.uncompressed.js \
  js/binglayer.MM.js \
  js/d3layer.js \
  js/mapstory.js

dist/mapstory.js: node_modules/.install Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@

dist/mapstory.min.js: dist/mapstory.js Makefile
	@rm -f $@
	node_modules/.bin/uglifyjs $< -c -m -o $@

dist/mapstory.css: css/*.css
	cat css/map.css > $@

node_modules/.install: package.json
	npm install && touch node_modules/.install
  
clean:
	rm -f dist/mapstory*.js dist/mapstory.css