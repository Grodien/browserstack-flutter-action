const {expect} = require('chai');
const sinon = require('sinon');
const core = require('@actions/core');
const ActionInput = require('../src/actionInput');
const Browserstack = require('../src/browserstack');


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
describe('Browserstack Tests', () => {
    let stubbedInput;

    beforeEach(() => {
        stubbedInput = sinon.stub(core, 'getInput');
    });

    afterEach(() => {
        core.getInput.restore();
    });

    it('should upload and start android tests', async () => {
        stubbedInput.withArgs("browserstackUsername").returns("<replace-with-username>");
        stubbedInput.withArgs("browserstackAccessKey").returns("<replace-with-accessKey>");
        stubbedInput.withArgs("project").returns("actionTest");
        stubbedInput.withArgs("appFilePath").returns("<appFilePath>");
        stubbedInput.withArgs("testFilePath").returns("<testFilePath>");
        stubbedInput.withArgs("devices").returns("Samsung Galaxy Tab S9-13.0");

        const actionInput = new ActionInput();

        let result = await Browserstack.uploadAndroidAndRunTests(actionInput);
        expect(result).to.equal(true);
    }).timeout(600000);
});