const core = require('@actions/core');
const github = require('@actions/github');

try {
    const browserstackUsername = core.getInput('browserstackUsername');
    const browserstackAccessKey = core.getInput('browserstackAccessKey');
    const project = core.getInput('project');
    const testPackagePath = core.getInput('testPackagePath');
    const appFilePath = core.getInput('appFilePath');
    const testFilePath = core.getInput('testFilePath');
    const devices = core.getInput('devices');

    if (!browserstackUsername) throw Error(`browserstackUsername not found`);
    if (!browserstackAccessKey) throw Error(`browserstackAccessKey not found`);

    console.log(`Starting action...`);
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}