const core = require('@actions/core');
const fs = require("fs");

class ActionInput {
    constructor() {
        this._parseInput();
        this._validateInput();
    }

    _parseInput() {
        this.browserstackUsername = core.getInput('browserstackUsername');
        this.browserstackAccessKey = core.getInput('browserstackAccessKey');
        this.project = core.getInput('project');
        this.testPackagePath = core.getInput('testPackagePath');
        this.appFilePath = core.getInput('appFilePath');
        this.testFilePath = core.getInput('testFilePath');
        this.devices = core.getInput('devices');
        this.locale = core.getInput('locale', {required: false});
        this.language = core.getInput('language', {required: false});
        this.customId = core.getInput('customId');
        this.buildTag = core.getInput('buildTag');

        this.isAndroid = this.appFilePath && this.testFilePath;
        this.isIOS = this.testPackagePath;
    }

    _validateInput() {
        if (!this.browserstackUsername) {
            throw Error(`browserstackUsername not set`);
        }
        if (!this.browserstackAccessKey) {
            throw Error(`browserstackAccessKey not set`);
        }

        if (!this.isAndroid && !this.isIOS) {
            throw Error(`Action needs at least one of testPackagePath (iOS) or appFilePath & testFilePath (Android) defined`);
        }

        if (this.isAndroid && this.isIOS) {
            throw Error(`Android and iOS at the same time is not supported`);
        }

        if (!this.devices) {
            throw Error(`Action needs at least 1 device defined`);
        }

        if (this.appFilePath && !fs.existsSync(this.appFilePath)) {
            throw Error(`App specified in appFilePath doesn't exist`);
        }

        if (this.testFilePath && !fs.existsSync(this.testFilePath)) {
            throw Error(`App specified in testFilePath doesn't exist`);
        }

        if (this.testPackagePath && !fs.existsSync(this.testPackagePath)) {
            throw Error(`Package specified in testPackagePath doesn't exist`);
        }
    }
}

module.exports = ActionInput;