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

- abee scaffolding + some kind of test runner support

### current bugs/limitations:

- persist max-log-entries in metadata on server
- autocomplete shortcut
- styling on different platforms

### maybe..

- basic console commands like cd, ls, touch, mkdir, ...
- insert package scope eval per command
