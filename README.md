
sfdx-flexi-plugin
==================

[![Version](https://img.shields.io/npm/v/sfdx-flexi-plugin.svg)](https://npmjs.org/package/sfdx-flexi-plugin)
[![check](https://github.com/gitfish/sfdx-flexi-plugin/actions/workflows/check.yml/badge.svg)](https://github.com/gitfish/sfdx-flexi-plugin/actions/workflows/check.yml)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/the-money/sfdx-sample-plugin?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/sfdx-sample-plugin/branch/master)
[![Codecov](https://codecov.io/gh/the-money/sfdx-sample-plugin/branch/master/graph/badge.svg)](https://codecov.io/gh/the-money/sfdx-sample-plugin)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-flexi-plugin.svg)](https://npmjs.org/package/sfdx-flexi-plugin)
[![License](https://img.shields.io/npm/l/sfdx-flexi-plugin.svg)](https://github.com/gitfish/sfdx-flexi-plugin/blob/master/package.json)

<!-- toc -->

<!-- tocstop -->

<!-- tocstop -->

<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdx-flexi-plugin
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
sfdx-flexi-plugin/26.0.0 win32-x64 node-v16.13.2
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
```sh-session
$ npm install -g sfdx-flexi-plugin
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
sfdx-flexi-plugin/25.0.0 darwin-x64 node-v14.17.5
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->

<!-- commands -->
* [`sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexirun-namevalue--p-string--x-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Executes a function resolved from a js or ts module with a provided sfdx context

```
USAGE
  $ sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --path=path                                                                   The script module path to load the
                                                                                    function from

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  -x, --export=export                                                               The module export to execute

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

ALIASES
  $ sfdx flexi:script
  $ sfdx flexi:execute
  $ sfdx flexi:exec

EXAMPLES
  $ sfdx flexi:run --path <module path>
  $ sfdx flexi:run --path <module path> --export <module export name>
```

_See code: [src/commands/flexi/run.ts](https://github.com/gitfish/sfdx-flexi-plugin/blob/v26.0.0/src/commands/flexi/run.ts)_
<!-- commandsstop -->
* [`sfdx flexi:export [name=value...] -c <string> [-o <array>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexiexport-namevalue--c-string--o-array--d-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx flexi:import [name=value...] -c <string> [-o <array>] [-d <string>] [-r] [-p] [-h <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexiimport-namevalue--c-string--o-array--d-string--r--p--h-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexirun-namevalue--p-string--x-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx flexi:export [name=value...] -c <string> [-o <array>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Export data from your org.

```
USAGE
  $ sfdx flexi:export [name=value...] -c <string> [-o <array>] [-d <string>] [-v <string>] [-u <string>] [--apiversion 
  <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --configfile=configfile                                                       (required) The configuration file
                                                                                    location.

  -d, --datadir=datadir                                                             [default: data] The path where the
                                                                                    data resides.

  -o, --object=object                                                               The sobject(s) that you wish to
                                                                                    export data for.

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx flexi:export -o Product2 -u myOrg -c config/cpq-cli-def.json
  $ sfdx flexi:export -u myOrg -c config/cpq-cli-def.json
  $ sfdx flexi:export -u myOrg -c config/cpq-cli-def.json -d woo
```

_See code: [src/commands/flexi/export.ts](https://github.com/gitfish/sfdx-flexi-plugin/blob/v25.0.0/src/commands/flexi/export.ts)_

## `sfdx flexi:import [name=value...] -c <string> [-o <array>] [-d <string>] [-r] [-p] [-h <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Import data to your org

```
USAGE
  $ sfdx flexi:import [name=value...] -c <string> [-o <array>] [-d <string>] [-r] [-p] [-h <string>] [-u <string>] 
  [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --configfile=configfile                                                       (required) The configuration file
                                                                                    location.

  -d, --datadir=datadir                                                             [default: data] The path where the
                                                                                    data resides.

  -h, --importhandler=importhandler                                                 Allows specification of the import
                                                                                    handler to use - will look in the
                                                                                    internal registry first and then
                                                                                    looks to load a module if the file
                                                                                    exists

  -o, --object=object                                                               The sobject(s) that you wish to
                                                                                    import data for.

  -p, --allowpartial                                                                Allows the operation to continue
                                                                                    when a failure occurs.

  -r, --remove                                                                      Delete the record(s) from the target
                                                                                    within the specified directory.

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx flexi:import -o Product2 -u myOrg -c config/cpq-cli-def.json
       Deploying data, please wait.... Deployment completed!
```

_See code: [src/commands/flexi/import.ts](https://github.com/gitfish/sfdx-flexi-plugin/blob/v25.0.0/src/commands/flexi/import.ts)_

## `sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Executes a function resolved from a js or ts module with a provided sfdx context

```
USAGE
  $ sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --path=path                                                                   The script module path to load the
                                                                                    function from

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  -x, --export=export                                                               The module export to execute

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

ALIASES
  $ sfdx flexi:script
  $ sfdx flexi:execute
  $ sfdx flexi:exec

EXAMPLES
  $ sfdx flexi:run --path <module path>
  $ sfdx flexi:run --path <module path> --export <module export name>
```

_See code: [src/commands/flexi/run.ts](https://github.com/gitfish/sfdx-flexi-plugin/blob/v25.0.0/src/commands/flexi/run.ts)_
<!-- commandsstop -->

## Additional Documentation

- [Run Command](./doc/commands/flexi/run.md)

- [Pre Deploy Hook](./doc/hooks/predeploy.md)
