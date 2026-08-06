const request = require('request');
const core = require('@actions/core');
const {DefaultArtifactClient} = require('@actions/artifact');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ANDROID_APP_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/app";
const ANDROID_TESTSUITE_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/test-suite";
const ANDROID_TRIGGER_BUILD_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/build";
const ANDROID_BUILDS_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/android/builds";

const IOS_TEST_PACKAGE_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/ios/test-package";
const IOS_TRIGGER_BUILD_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/ios/build";
const IOS_BUILDS_ENDPOINT = "api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/ios/builds";

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
            core.info(`Upload complete`);
            core.debug(`Upload response: ${response}`);
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
            locale: actionInput.locale,
            language: actionInput.language,
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
            core.info(`Build triggered`);
            core.debug(`Trigger build response: ${response}`);
            return response;
        } catch (error) {
            core.setFailed(error);
            return null;
        }
    }

    static async _triggerIOSBuild(actionInput, testPackageUrl) {
        const body = {
            testPackage: testPackageUrl,
            devices: actionInput.devices.split(","),
            locale: actionInput.locale,
            language: actionInput.language,
            networkLogs: true,
            deviceLogs: true,
            deviceOrientation: 'landscape',
        };
        if (actionInput.project) body.project = actionInput.project;
        if (actionInput.buildTag) body.buildTag = actionInput.buildTag;

        const options = {
            url: `https://${actionInput.browserstackUsername}:${actionInput.browserstackAccessKey}@${IOS_TRIGGER_BUILD_ENDPOINT}`,
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json'
            }
        };

        core.info(`Triggering ios build with testPackage=${testPackageUrl} on devices=${actionInput.devices}`);
        let response;
        try {
            response = await this._doPost(options);
            core.info(`Build triggered`);
            core.debug(`Trigger build response: ${response}`);
            return response;
        } catch (error) {
            core.setFailed(error);
            return null;
        }
    }

    static async _checkBuild(actionInput, endpoint, buildId) {
        const options = {
            url: `https://${actionInput.browserstackUsername}:${actionInput.browserstackAccessKey}@${endpoint}/${buildId}`,
        };

        let buildSuccessful = false;
        let checkStatus = true;

        let response;
        let build;

        while (checkStatus) {
            await delay(30000);

            response = await this._doGet(options);
            if (!response) return false;

            build = JSON.parse(response);
            checkStatus = build.status === 'queued' || build.status === 'running';
            buildSuccessful = build.status === 'passed';

            if (checkStatus) {
                core.info(`Build status: ${build.status}`);
                core.debug(`Build response: ${response}`);
            } else {
                core.info(`Build finished with status: ${build.status}`);
                core.info(`Build response: ${response}`);
            }
        }

        core.exportVariable("test_result", response);

        const report = await this._printTestReport(actionInput, endpoint, build);
        await this._uploadTestReportArtifact(build, report);

        if (!buildSuccessful) {
            const failedTests = report.failed.length > 0 ? ` Failed tests: ${report.failed.join(', ')}` : '';
            core.setFailed(`Build ${buildId} finished with status '${build.status}'.${failedTests}`);
            return false;
        }

        return true;
    }

    static async _fetchSessionDetails(actionInput, endpoint, buildId, sessionId) {
        const options = {
            url: `https://${actionInput.browserstackUsername}:${actionInput.browserstackAccessKey}@${endpoint}/${buildId}/sessions/${sessionId}`,
        };

        try {
            const response = await this._doGet(options);
            core.debug(`Session ${sessionId} response: ${response}`);
            return JSON.parse(response);
        } catch (error) {
            core.warning(`Could not fetch session details for session ${sessionId}: ${error}`);
            return null;
        }
    }

    static async _printTestReport(actionInput, endpoint, build) {
        const report = {total: 0, failed: [], sessions: []};

        core.info('');
        core.info('Test report');
        core.info('===========');

        for (const device of build.devices ?? []) {
            const deviceName = `${device.device} (${device.os} ${device.os_version})`;

            for (const session of device.sessions ?? []) {
                core.info(`${deviceName} - session ${session.id}`);

                const sessionDetails = await this._fetchSessionDetails(actionInput, endpoint, build.id, session.id);
                if (sessionDetails) {
                    report.sessions.push({
                        device: device.device,
                        os: device.os,
                        os_version: device.os_version,
                        session: sessionDetails,
                    });
                }

                const testClasses = sessionDetails?.testcases?.data;
                if (!testClasses) {
                    core.warning(`No test case details available for session ${session.id} (status: ${session.status})`);
                    continue;
                }

                for (const testClass of testClasses) {
                    for (const testcase of testClass.testcases ?? []) {
                        report.total++;
                        const testName = `${testClass.class} > ${testcase.name}`;
                        const duration = testcase.duration ? ` (${testcase.duration}s)` : '';
                        const line = `  [${testcase.status}] ${testName}${duration}`;

                        if (testcase.status === 'passed' || testcase.status === 'skipped') {
                            core.info(line);
                        } else {
                            core.error(line);
                            report.failed.push(`${testName} on ${deviceName}`);
                        }
                    }
                }
            }
        }

        core.info('===========');
        if (report.total === 0) {
            core.warning('No test cases were reported by Browserstack');
        } else if (report.failed.length === 0) {
            core.info(`✅ All ${report.total} tests passed`);
        } else {
            core.error(`❌ ${report.failed.length} of ${report.total} tests failed:`);
            for (const failedTest of report.failed) {
                core.error(`  ${failedTest}`);
            }
        }
        core.info('');

        return report;
    }

    static async _uploadTestReportArtifact(build, report) {
        const artifactName = `browserstack-test-report-${build.id}`;

        try {
            const reportDir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'browserstack-test-report-'));
            const reportPath = path.join(reportDir, 'browserstack-test-report.json');
            fs.writeFileSync(reportPath, JSON.stringify({build, sessions: report.sessions}, null, 2));

            const artifactClient = new DefaultArtifactClient();
            const {size} = await artifactClient.uploadArtifact(artifactName, [reportPath], reportDir);
            core.info(`Uploaded test report artifact '${artifactName}' (${size} bytes)`);
        } catch (error) {
            core.warning(`Could not upload test report artifact '${artifactName}': ${error}`);
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

        return await this._checkBuild(actionInput, ANDROID_BUILDS_ENDPOINT, buildId);
    }

    static async uploadIOSAndRunTests(actionInput) {

        const testPackageResponse = await this._uploadFile(actionInput, actionInput.testPackagePath, IOS_TEST_PACKAGE_ENDPOINT);
        if (!testPackageResponse) return false;

        const testPackageUrl = JSON.parse(testPackageResponse).test_package_url;
        core.exportVariable("test_package_url", testPackageUrl);

        const buildResponse = await this._triggerIOSBuild(actionInput, testPackageUrl);
        if (!buildResponse) return false;

        const buildId = JSON.parse(buildResponse).build_id;
        core.exportVariable("build_id", buildId);

        return await this._checkBuild(actionInput, IOS_BUILDS_ENDPOINT, buildId);
    }

}

module.exports = Browserstack;