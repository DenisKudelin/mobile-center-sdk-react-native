var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var glob = require('glob');
var which = require('which').sync;
var debug = require('debug')('mobile-center-link:ios:Podfile');

var Podfile = function (file) {
    debug(`Podfile located at ${file}`);
    this.file = file;
    this.fileContents = fs.readFileSync(file, 'utf-8');
};

function checkIsCocoaPodsInstalled() {
    if(process.platform != 'darwin') {
        debug(`Current platform doesn't support to run CocoaPods`);
        return false;
    }

    try {
        return !!which('pod');
    } catch (e) {
        debug(`Error with CocoaPods - ${e}`);
        throw new Error('Could not find "pod" command. Is CocoaPods installed?');
    }
}

Podfile.prototype.addPodLine = function (pod, podspec, version) {
    if (this.fileContents.match(new RegExp(`pod\\s+'${pod}'`))) {
        debug(`${pod} already present in ${this.file}`);
        return;
    }
    var line = `pod '${pod}'`;
    if (podspec) {
        line = `${line}, :podspec => '${podspec}'`;
    } else if (version) {
        line = `${line}, '~> ${version}'`;
    }
    var patterns = this.fileContents.match(/# Pods for .*/);
    if (patterns === null) {
        throw new Error(
    `
    Error: Could not find a "# Pods for" comment in your Podfile. Please add a "# Pods for Mobile Center" line
    in ${this.file}, inside
    the "target" section, then rerun the react-native link. Mobile Center pods will be added below the comment.
    `);
    }
    var pattern = patterns[0];
    this.fileContents = this.fileContents.replace(pattern, `${pattern}\n  ${line}`);
    debug(`${line} ===> ${this.file}`);
};

Podfile.prototype.save = function () {
    fs.writeFileSync(this.file, this.fileContents);
    debug(`Saved ${this.file}`);
    return this.file;
};

Podfile.prototype.install = function () {
    if(!checkIsCocoaPodsInstalled()) {
        return Promise.resolve();
    }

    var cwd = path.dirname(this.file)
    return new Promise(function (resolve, reject) {
        debug(`Installing pods in ${this.file}`);
        var child = childProcess.spawn('pod', ['install'], {
            cwd: cwd,
            stdio: 'inherit'
        });

        child.on('close', resolve);
        child.on('error', reject);
    });
};

Podfile.searchForFile = function (cwd) {
    if(process.env.podfilePath){
        return process.env.podfilePath;
    }

    var podFilePaths = glob.sync(path.join(cwd, 'Podfile'), { ignore: "node_modules/**" });
    if (podFilePaths.length === 1) {
        return podFilePaths[0];
    } else if (podFilePaths.length === 0) {
        debug(`No podfile found in ${cwd}`);
        if(!checkIsCocoaPodsInstalled()) {
            throw new Error(`No podfile found in ${cwd}. In order to create a new one, you need to run it on Mac OS`);
        }

        childProcess.execSync('pod init', { cwd: cwd });
        // Remove tests sub-specification or it breaks the project
        var podfile = path.join(cwd, 'Podfile');
        var contents = fs.readFileSync(podfile, {encoding: 'utf-8'});
        var subspecRegex = /target '[^']*Tests' do[\s\S]*?end/m;
        fs.writeFileSync(podfile, contents.replace(subspecRegex, ""));
        return podfile;
    }
};

module.exports = Podfile;