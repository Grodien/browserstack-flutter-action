const core = require('@actions/core');
const ActionInput = require('./actionInput');
const Browserstack = require('./browserstack');

const run = async () => {
    try {
        console.log(`Starting action...`);
        const actionInput = new ActionInput();

        if (actionInput.isAndroid) {
            await Browserstack.uploadAndroidAndRunTests(actionInput);
        } else if (actionInput.isIOS) {
            await Browserstack.uploadIOSAndRunTests(actionInput);
        }
    } catch (e) {
        core.setFailed(`Action Failed: ${e}`);
    }
};

run();