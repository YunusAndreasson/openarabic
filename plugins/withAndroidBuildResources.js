const { withGradleProperties } = require('expo/config-plugins');

// CNG regenerates android/, so keep the native build limits in a config plugin.
// The JVM and parallel C++ compilers share the EAS worker's memory budget.
module.exports = function withAndroidBuildResources(config) {
  return withGradleProperties(config, config => {
    const values = {
      'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
      'org.gradle.workers.max': '2',
    };
    for (const [key, value] of Object.entries(values)) {
      config.modResults = config.modResults.filter(item => item.key !== key);
      config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
};
