# IE issues to look at

- Check for memory leaks when removing nodes from selection with event listeners. See http://stackoverflow.com/questions/18382286/d3-js-should-i-detach-event-listener-on-exit-remove and http://stackoverflow.com/questions/12528049/if-a-dom-element-is-removed-are-its-listeners-also-removed-from-memory

- Add Object.create polyfill

- Add indexOf polyfill
- add setTImeout polyfill for ie < 9
- array.foreach
- Date.now polyfill for ie < 9
