const { withStringsXml } = require('@expo/config-plugins');

const MATERIAL_BADGE_PLURAL = 'mtrl_badge_content_description';

/**
 * Material labels every numeric navigation badge as a notification count.
 * OpenArabic's only numeric badge is the number of practice words due, so
 * override the library resource that TalkBack appends to the tab label.
 */
const withPracticeBadgeDescription = config =>
  withStringsXml(config, config => {
    const resources = config.modResults.resources;
    const plurals = Array.isArray(resources.plurals) ? resources.plurals : [];

    resources.plurals = plurals.filter(entry => entry?.$?.name !== MATERIAL_BADGE_PLURAL);
    resources.plurals.push({
      $: { name: MATERIAL_BADGE_PLURAL },
      item: [
        { $: { quantity: 'one' }, _: '%d word due' },
        { $: { quantity: 'other' }, _: '%d words due' },
      ],
    });

    return config;
  });

module.exports = withPracticeBadgeDescription;
