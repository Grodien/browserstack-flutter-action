# Browserstack Flutter Action

This action fulfils the following objectives in your runner environment:

* Uploading the app/testsuite paths provided to browserstack
* Starting the testrun on browserstack
* Waiting until the tests are done and checking the result

## Prerequisites

* The [actions/checkout](https://github.com/marketplace/actions/checkout) action should be invoked prior to invoking this action as we will be using config files committed to the repo
* App and Tests have to be build before this step see:
    * iOS: https://www.browserstack.com/docs/app-automate/flutter-ios/getting-started
    * Android: https://www.browserstack.com/docs/app-automate/flutter/getting-started

## Inputs

* `browserstackUsername`:
    * Browserstack Username
* `browserstackAccessKey`:
    * Browserstack Access Key
* `testPackagePath`:
    * Path to the iOS testPackage that will be uploaded
* `appFilePath`:
    * Path to the android app that will be uploaded
* `testFilePath`:
    * Path to the android test apk that will be uploaded
* `devices`:
    * Devices to test on see https://www.browserstack.com/list-of-browsers-and-platforms/app_automate'
* `locale`:
    * The locale of the app, defaults to `US`
* `language`:
    * The language of the app, defaults to `en`
* `project`:
    * Optional projectname that will be shown on browserstack
* `buildTag`:
    * Optional buildTag for the testrun that will be shown on browserstack
* `customId`:
    * Optional customId for the uploaded packages that will be shown on browserstack
* `generateTestReport`:
    * Optional, defaults to `true`. Whether to fetch per-session test details, print the test report, and write the report file. When `false`, `uploadTestReportArtifact` is silently ignored, since there is no report to upload.
* `uploadTestReportArtifact`:
    * Optional, defaults to `true`. Whether to upload the test report file as a job artifact. Ignored when `generateTestReport` is `false`.

## Outputs

* `app_url`:
    * The app url for the Android APK on Browserstack
* `test_suite_url`:
    * The test file url for the Android APK on Browserstack
* `test_package_url`:
    * The test package url for the iOS App on Browserstack
* `build_id`:
    * The build id for the triggered testrun
* `test_result`:
    * The test result from browserstack (json)
* `test_report_path`:
    * The file path of the generated test report json. Only set when `generateTestReport` is `true`.

All outputs are exported as environment variables (e.g. `env.test_report_path`), not as
[GitHub Actions step outputs](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#outputsoutput_id).

## Artifacts

When `generateTestReport` is `true` (the default), the testrun's report is fetched and
printed to the log, and `browserstack-test-report.json` (containing the full build result
and the detailed testcase results of every session, as returned by the Browserstack API)
is written to disk; its path is exported as `test_report_path`.

When `uploadTestReportArtifact` is also `true` (the default), that file is additionally
uploaded as a job artifact named `browserstack-test-report-<build_id>`. The build id suffix
keeps artifact names unique when multiple builds (e.g. Android and iOS) run in the same
workflow. Set `uploadTestReportArtifact` to `false` to keep the local file and skip the
artifact upload.

Set `generateTestReport` to `false` to skip fetching session details, printing the report,
writing the file, and uploading the artifact altogether; in that case
`uploadTestReportArtifact` is ignored.

## Usage

Use the code snippet below in your workflow to upload run a flutter android test:

```yaml
  name: Upload and Run Tests on Browserstack
  uses: Grodien/browserstack-flutter-action@v1.3
  with:
    browserstackUsername: ${{ secrets.BROWSERSTACK_USERNAME }}
    browserstackAccessKey: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
    project: example
    customId: example_android
    buildTag: example_android
    appFilePath: ${{ github.workspace }}/build/app/outputs/flutter-apk/app-dev-debug.apk
    testFilePath: ${{ github.workspace }}/build/app/outputs/apk/androidTest/dev/debug/app-dev-debug-androidTest.apk
    devices: Samsung Galaxy Tab S9-13.0,Samsung Galaxy Tab S8-12.0
```

Use the code snippet below in your workflow to upload run a flutter ios test:

```yaml
- name: Upload and Run on Browserstack
  uses: Grodien/browserstack-flutter-action@v1.3
  with:
    browserstackUsername: ${{ secrets.BROWSERSTACK_USERNAME }}
    browserstackAccessKey: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
    project: example
    customId: example_ios
    buildTag: example_ios
    testPackagePath: ${{ github.workspace }}/build/ios_integration/Build/Products/app-integrationtest-release.zip
    devices: iPad 9th-15
```
