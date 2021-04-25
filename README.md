
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
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdx-flexi-plugin
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
sfdx-flexi-plugin/10.0.0 darwin-x64 node-v14.15.1
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx flexi:export [name=value...] [-o <array>] [-c <string>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexiexport-namevalue--o-array--c-string--d-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx flexi:import [name=value...] [-o <array>] [-c <string>] [-d <string>] [-r] [-p] [-h <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexiimport-namevalue--o-array--c-string--d-string--r--p--h-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
* [`sfdx flexi:script [name=value...] -p <string> [-i <string>] [-h <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexiscript-namevalue--p-string--i-string--h-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx flexi:export [name=value...] [-o <array>] [-c <string>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Export data from your org.

```
Export data from your org.

USAGE
  $ sfdx flexi:export [name=value...] [-o <array>] [-c <string>] [-d <string>] [-v <string>] [-u <string>] [--apiversion 
  <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --configfile=configfile                                                       [REQUIRED] The configuration file
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

EXAMPLE
  $ sfdx flexi:export -o Product2 -u myOrg -c config/cpq-cli-def.json
       Requesting data, please wait.... Request completed! Received X records.
```

_See code: [lib/commands/flexi/export.js](https://github.com/gitfish/sfdx-flexi-plugin/blob/v10.0.0/lib/commands/flexi/export.js)_

## `sfdx flexi:import [name=value...] [-o <array>] [-c <string>] [-d <string>] [-r] [-p] [-h <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Import data to your org

```
Import data to your org

USAGE
  $ sfdx flexi:import [name=value...] [-o <array>] [-c <string>] [-d <string>] [-r] [-p] [-h <string>] [-v <string>] [-u 
  <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --configfile=configfile                                                       [REQUIRED] The configuration file
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

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLE
  $ sfdx flexi:import -o Product2 -u myOrg -c config/cpq-cli-def.json
       Deploying data, please wait.... Deployment completed!
```

_See code: [lib/commands/flexi/import.js](https://github.com/gitfish/sfdx-flexi-plugin/blob/v10.0.0/lib/commands/flexi/import.js)_

## `sfdx flexi:script [name=value...] -p <string> [-i <string>] [-h <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Executes a script that is provided with sfdx context.

```
Executes a script that is provided with sfdx context.

USAGE
  $ sfdx flexi:script [name=value...] -p <string> [-i <string>] [-h <string>] [-v <string>] [-u <string>] [--apiversion 
  <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -h, --hookcontext=hookcontext                                                     The hook context - a json string
                                                                                    containing details of the hook
                                                                                    context.

  -i, --hookcontextid=hookcontextid                                                 The id of the hook context - if a
                                                                                    hook can't be found in the hook
                                                                                    context store, then this will be
                                                                                    treated as a file path.

  -p, --path=path                                                                   (required) The path of the script to
                                                                                    execute.

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
  $ sfdx flexi:script --path <script file path>
  $ sfdx flexi:script --path <script file path> --hookcontext <hook context json>
  $ sfdx flexi:script --path <script file path> --hookcontextid <hook context json path>
```

_See code: [lib/commands/flexi/script.js](https://github.com/gitfish/sfdx-flexi-plugin/blob/v10.0.0/lib/commands/flexi/script.js)_
<!-- commandsstop -->
