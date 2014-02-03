## TODO 

for both, meteor-server-console and [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval))

### current bugs/limitations:

- persist max-log-entries in metadata on server
- autocomplete shortcut (CTRL + ALT + SPACE on Windows and Firefox uses CTRL + SPACE itself)
- styling on different platforms, styling at all
- object size not very exact!? but i need something to decide if objects to big
- no control over execute if child_process waits for input!?
- if watch result bigger than mongo doc size error
- line wrap

### mid term:

- nprogress loading progress
- some kind of EJSON support
- show types on autocomplete
- syntax highlighting in input + allow multiple lines
- watches with update interval
- scaffolding (e.g. abee, boilerplate (devshop 11)!?) helpers
- make object tree more interactive (e.g. jump to circulars, evaluate/show prototype)

- tinytest restart after server restart not working properly (at the moment stays down), maybe detach but log...

### long term:

- port to meteor ui
- create new smartpackage server-eval-helpers

### maybe..

- insert package scope eval per command


