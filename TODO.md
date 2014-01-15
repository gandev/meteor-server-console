## TODO 

for both, meteor-server-console and [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval))


test-packages local to project and link to test site 
limit mongodb doc size and log message if eval size to much


### long term:

- port to meteor ui

### mid term:

- create new smartpackage server-eval-helpers
- solution for performance issues with very large objects
  + nprogress loading progress
- some kind of EJSON support
- show types on autocomplete
- syntax highlighting in input + allow multiple lines
- watches with update interval

- abee scaffolding helpers
- tinytest support (run tests for specific packages and link to them)

- make object tree more interactive (e.g. jump to circulars, evaluate/show prototype)

### current bugs/limitations:

- persist max-log-entries in metadata on server
- autocomplete shortcut (CTRL + ALT + SPACE on Windows and Firefox uses CTRL + SPACE itself) (prototype?)
- styling on different platforms

- object size not very exact and useful at all/ where to go, need something to decide if objects to big?

### maybe..

- insert package scope eval per command
