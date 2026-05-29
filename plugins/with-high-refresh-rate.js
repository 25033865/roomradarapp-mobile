const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withHighRefreshRate(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application = configWithManifest.modResults.manifest.application?.[0];

    if (!application?.activity) {
      return configWithManifest;
    }

    const mainActivity = application.activity.find((activity) => {
      const activityName = activity.$?.['android:name'];

      return activityName === '.MainActivity' || activityName?.endsWith('.MainActivity');
    });

    if (!mainActivity?.$) {
      return configWithManifest;
    }

    mainActivity.$['android:hardwareAccelerated'] = 'true';
    mainActivity.$['android:preferredRefreshRate'] = '240.0';

    return configWithManifest;
  });
};