var fs = require('fs');

var glob = require('glob');
var inquirer = require('inquirer');
var debug = require('debug')('mobile-center-link:android:MobileCenterConfig');

var MobileCenterConfig = require('./MobileCenterConfig');
function getAppSecret(config) {
    return new Promise(function (resolve, reject) {
        if(process.env.appSecretAndroid){
            resolve(process.env.appSecretAndroid);
        } else {
            inquirer.prompt([{
                type: 'input',
                default: config.get('app_secret'),
                message: 'What is the Android App Secret?',
                name: 'app_secret',
            }]).then(function (answers) {
                resolve(answers['app_secret']);
            });
        }
    });
}

module.exports = {
    initMobileCenterConfig: function () {
        var config = new MobileCenterConfig(MobileCenterConfig.searchForFile());
        return getAppSecret(config).then(function(appSecret) {
            try {
                config.set('app_secret', appSecret);
                return config.save();
            } catch (e) {
                debug('Could not save config', e);
                Promise.reject(e);
            }
        });
    }
};
