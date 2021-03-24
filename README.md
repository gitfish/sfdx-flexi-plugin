
sfdx-flexi-plugin
==================



[![Version](https://img.shields.io/npm/v/sfdx-sample-plugin.svg)](https://npmjs.org/package/sfdx-sample-plugin)
[![CircleCI](https://circleci.com/gh/the-money/sfdx-sample-plugin/tree/master.svg?style=shield)](https://circleci.com/gh/the-money/sfdx-sample-plugin/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/the-money/sfdx-sample-plugin?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/sfdx-sample-plugin/branch/master)
[![Codecov](https://codecov.io/gh/the-money/sfdx-sample-plugin/branch/master/graph/badge.svg)](https://codecov.io/gh/the-money/sfdx-sample-plugin)
[![Greenkeeper](https://badges.greenkeeper.io/the-money/sfdx-sample-plugin.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/the-money/sfdx-sample-plugin/badge.svg)](https://snyk.io/test/github/the-money/sfdx-sample-plugin)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-sample-plugin.svg)](https://npmjs.org/package/sfdx-sample-plugin)
[![License](https://img.shields.io/npm/l/sfdx-sample-plugin.svg)](https://github.com/the-money/sfdx-sample-plugin/blob/master/package.json)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ npm install -g sfdx-flexi-plugin
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
sfdx-flexi-plugin/1.0.0 darwin-x64 node-v14.15.1
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx flexi:script -p <string> [-h <string>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-flexiscript--p-string--h-string--d-string--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx flexi:script -p <string> [-h <string>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

Executes a script that is provided sfdx context

```
Executes a script that is provided sfdx context

USAGE
  $ sfdx flexi:script -p <string> [-h <string>] [-d <string>] [-v <string>] [-u <string>] [--apiversion <string>] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --hookcontextpath=hookcontextpath                                             The path to hook context - this is
                                                                                    typically used for testing

  -h, --hookcontext=hookcontext                                                     The hook context - typically passed
                                                                                    from the hook script or can be
                                                                                    provided for testing

  -p, --path=path                                                                   (required) The path of the script to
                                                                                    execute

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
  $ sfdx flexi:script --path <script file path> --hookcontextpath <hook context json path>
```

_See code: [lib/commands/flexi/script.js](https://github.com/gitfish/sfdx-flexi-plugin/blob/v1.0.0/lib/commands/flexi/script.js)_
<!-- commandsstop -->
<!-- debugging-your-plugin -->
# Debugging your plugin
We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `hello:org` command: 
1. Start the inspector
  
If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch: 
```sh-session
$ sfdx hello:org -u myOrg@example.com --dev-suspend
```
  
Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:
```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run hello:org -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program. 
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
<br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
Congrats, you are debugging!
