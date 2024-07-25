const { expect } = require('chai');
const sinon = require('sinon');
const core = require('@actions/core');
const fs = require('fs');
const ActionInput = require('../src/actionInput');

describe('Action Tests', () => {
    let stubbedInput;
    let stubbedExists;

    function setupAndroid() {
        stubbedInput.withArgs("appFilePath").returns("some/random/app/path.apk");
        stubbedInput.withArgs("testFilePath").returns("some/random/test/path.apk");
        stubbedInput.withArgs("devices").returns("Samsung Galaxy S23-13.0,Samsung Galaxy Tab S8-12.0");
        stubbedExists.withArgs("some/random/app/path.apk").returns(true);
        stubbedExists.withArgs("some/random/test/path.apk").returns(true);
    }

    function setupIOS() {
        stubbedInput.withArgs("testPackagePath").returns("some/random/zip/path.zip");
        stubbedInput.withArgs("devices").returns("iPad 9th-15,iPad Air 6-17");
        stubbedExists.withArgs("some/random/zip/path.zip").returns(true);
    }

    beforeEach(() => {
        stubbedInput = sinon.stub(core, 'getInput');
        stubbedInput.withArgs("browserstackUsername").returns("username");
        stubbedInput.withArgs("browserstackAccessKey").returns("secretAccessKey");
        stubbedInput.withArgs("project").returns("actionTest");
        stubbedExists = sinon.stub(fs, 'existsSync');
    });

    afterEach(() => {
        core.getInput.restore();
        fs.existsSync.restore();
    });

    context('parse and validate input', () => {
        it('should read values from input and validate them android', () => {
            setupAndroid();

            const actionInput = new ActionInput();
            expect(actionInput.browserstackUsername).to.equal("username");
            expect(actionInput.browserstackAccessKey).to.equal("secretAccessKey");
            expect(actionInput.project).to.equal("actionTest");
            expect(actionInput.appFilePath).to.equal("some/random/app/path.apk");
            expect(actionInput.testFilePath).to.equal("some/random/test/path.apk");
            expect(actionInput.devices).to.equal("Samsung Galaxy S23-13.0,Samsung Galaxy Tab S8-12.0");
        });

        it('should read values from input and validate them ios', () => {
            setupIOS();

            const actionInput = new ActionInput();
            expect(actionInput.browserstackUsername).to.equal("username");
            expect(actionInput.browserstackAccessKey).to.equal("secretAccessKey");
            expect(actionInput.project).to.equal("actionTest");
            expect(actionInput.testPackagePath).to.equal("some/random/zip/path.zip");
            expect(actionInput.devices).to.equal("iPad 9th-15,iPad Air 6-17");
        });

        it('should throw error when iOS and Android is defined', () => {
            setupAndroid();
            setupIOS();

            expect(() => new ActionInput()).to.throw("Android and iOS at the same time is not supported");
        });

        it('should throw error when iOS and Android is not defined', () => {
            expect(() => new ActionInput()).to.throw("Action needs at least one of testPackagePath (iOS) or appFilePath & testFilePath (Android) defined");
        });

        it('should give error message in case appFilePath specified does not exist', () => {
            setupAndroid();
            stubbedExists.withArgs("some/random/app/path.apk").returns(false);
            expect(() => new ActionInput()).to.throw("App specified in appFilePath doesn't exist");
        });

        it('should give error message in case testFilePath specified does not exist', () => {
            setupAndroid();
            stubbedExists.withArgs("some/random/test/path.apk").returns(false);
            expect(() => new ActionInput()).to.throw("App specified in testFilePath doesn't exist");
        });

        it('should give error message in case testPackagePath specified does not exist', () => {
            setupIOS();
            stubbedExists.withArgs("some/random/zip/path.zip").returns(false);
            expect(() => new ActionInput()).to.throw("Package specified in testPackagePath doesn't exist");
        });
    });
});