const core = require('@actions/core');
const github = require('@actions/github');
const ActionInput = require('./actionInput');

const IOS_TESTPACKAGE_ENDPOINT = "https://api-cloud.browserstack.com/app-automate/flutter-integration-tests/v2/ios/test-package";

const run = async () => {
    try {
        console.log(`Starting action...`);
        const actionInput = new ActionInput();
        const payload = JSON.stringify(github.context.payload, undefined, 2)
        console.log(`The event payload: ${payload}`);
    } catch (e) {
        core.setFailed(`Action Failed: ${e}`);
    }
};

run();