## TODO 

for both, meteor-server-console and [meteor-server-eval](https://github.com/gandev-de/meteor-server-eval))

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

### current bugs/limitations:

- autocomplete shortcut
- styling on different platforms
- log colors
- make all logs appear like 1 line and provide expand for the rest

### maybe..

- basic console commands like cd, ls, touch, mkdir, ...
- insert package scope eval per command
