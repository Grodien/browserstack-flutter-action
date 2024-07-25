const request = require('request');
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const ANDROID_APP_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/app";
const ANDROID_TESTSUITE_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/test-suite";
const ANDROID_TRIGGER_BUILD_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/build";
const ANDROID_BUILDS_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/builds/";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

class Browserstack {

    static _doPost(options) {
        return new Promise(function (resolve, reject) {
                request.post(options, function (error, res, body) {
                    if (!error && res.statusCode === 200) {
                        resolve(body);
                    } else {
                        reject(error ? error : body);
                    }
                });
            }
        );
    }

    static _doGet(options) {
        return new Promise(function (resolve, reject) {
                request.get(options, function (error, res, body) {
                    if (!error && res.statusCode === 200) {
                        resolve(body);
                    } else {
                        reject(error ? error : body);
                    }
                });
            }
        );
    }

    static async _uploadFile(actionInput, filePath, endpoint) {
        const formData = {};

        formData.file = {
            value: fs.createReadStream(filePath),
            options: {
                filename: path.parse(filePath).base,
                contentType: null,
            },
        };

        const options = {
            url: `https://${actionInput.browserstackUsername}:${actionInput.browserstackAccessKey}@${endpoint}`,
            formData,
        };
        if (actionInput.customId) formData.custom_id = actionInput.customId;

        core.info(`Uploading file ${filePath}...`);
        let response;
        try {
            response = await this._doPost(options);
            core.info(`Uploaded complete ${response}`);
            return response;
        } catch (error) {
            core.setFailed(error);
            return null;
        }
    }

    static async _triggerAndroidBuild(actionInput, appUrl, testSuiteUrl) {
        const body = {
            app: appUrl,
            testSuite: testSuiteUrl,
            devices: actionInput.devices.split(","),
            networkLogs: true,
            deviceLogs: true,
        };
        if (actionInput.project) body.project = actionInput.project;
        if (actionInput.buildTag) body.buildTag = actionInput.buildTag;

        const options = {
            url: `https://${actionInput.browserstackUsername}:${actionInput.browserstackAccessKey}@${ANDROID_TRIGGER_BUILD_ENDPOINT}`,
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        };

        core.info(`Triggering android build with app=${appUrl} and testSuite=${testSuiteUrl} on devices=${actionInput.devices}`);
        let response;
        try {
            response = await this._doPost(options);
            core.info(`Triggered build ${response}`);
            return response;
        } catch (error) {
            core.setFailed(error);
            return null;
        }
    }

    static async _checkAndroidBuild(actionInput, buildId) {
        const options = {
            url: `https://${actionInput.browserstackUsername}:${actionInput.browserstackAccessKey}@${ANDROID_BUILDS_ENDPOINT}/${buildId}`,
        };

        let response;
        try {
            response = await this._doGet(options);
            core.info(`Build status ${response}`);
            return response;
        } catch (error) {
            core.setFailed(error);
            return null;
        }
    }

    static async uploadAndroidAndRunTests(actionInput) {

        const appFileResponse = await this._uploadFile(actionInput, actionInput.appFilePath, ANDROID_APP_ENDPOINT);
        if (!appFileResponse) return false;

        const appUrl = JSON.parse(appFileResponse).app_url;
        core.exportVariable("app_url", appUrl);

        const testFileResponse = await this._uploadFile(actionInput, actionInput.testFilePath, ANDROID_TESTSUITE_ENDPOINT);
        if (!testFileResponse) return false;

        const testSuiteUrl = JSON.parse(testFileResponse).test_suite_url;
        core.exportVariable("test_suite_url", testSuiteUrl);

        const buildResponse = await this._triggerAndroidBuild(actionInput, appUrl, testSuiteUrl);
        if (!buildResponse) return false;

        const buildId = JSON.parse(buildResponse).build_id;
        core.exportVariable("build_id", buildId);

        let buildSuccessful = false;
        let checkStatus = true;

        let response;

        while (checkStatus) {
            await delay(30000);

            response = await this._checkAndroidBuild(actionInput, buildId);
            if (!response) return false;

            const build = JSON.parse(response);
            checkStatus = build.status === 'queued' || build.status === 'running';
            buildSuccessful = build.status === 'passed'
        }

        if (!buildSuccessful) {
            core.setFailed(response);
            return false;
        }

        return true;
    }

}

module.exports = Browserstack;