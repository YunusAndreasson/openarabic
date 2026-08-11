import { DocCredit, DocHeading, DocLink, DocParagraph, LegalDocument } from '@/components/common';
import { Fragment, type FC } from 'react';

import { STRINGS } from '@/constants/strings';

/** A credited third-party service: name, what it does, and where to read more. */
const SERVICES: { section: string; name: string; description: string; url: string }[] = [
  {
    section: STRINGS.LEGAL_AUDIO_TITLE,
    name: STRINGS.LEGAL_AUDIO_ELEVENLABS,
    description: STRINGS.LEGAL_AUDIO_ELEVENLABS_DESC,
    url: STRINGS.LEGAL_AUDIO_ELEVENLABS_URL,
  },
  {
    section: STRINGS.LEGAL_ERROR_TRACKING_TITLE,
    name: STRINGS.LEGAL_ERROR_SENTRY,
    description: STRINGS.LEGAL_ERROR_SENTRY_DESC,
    url: STRINGS.LEGAL_ERROR_SENTRY_URL,
  },
];

const ARABIC_FONTS: { name: string; description: string }[] = [
  { name: STRINGS.LEGAL_FONT_SCHEHERAZADE, description: STRINGS.LEGAL_FONT_SCHEHERAZADE_DESC },
  { name: STRINGS.LEGAL_FONT_AMIRI, description: STRINGS.LEGAL_FONT_AMIRI_DESC },
  { name: STRINGS.LEGAL_FONT_MADINA, description: STRINGS.LEGAL_FONT_MADINA_DESC },
  { name: STRINGS.LEGAL_FONT_NASTALIQ, description: STRINGS.LEGAL_FONT_NASTALIQ_DESC },
];

const ENGLISH_FONTS: { name: string; description: string }[] = [
  { name: STRINGS.LEGAL_FONT_NOTO_SANS, description: STRINGS.LEGAL_FONT_NOTO_SANS_DESC },
];

/**
 * Legal & Attributions Screen
 * Displays third-party service acknowledgments and open source license information
 */
const LegalAttributionsScreen: FC = () => (
  <LegalDocument>
    <DocParagraph>{STRINGS.LEGAL_INTRO}</DocParagraph>

    {SERVICES.map(({ section, name, description, url }) => (
      <Fragment key={section}>
        <DocHeading>{section}</DocHeading>
        <DocHeading level="subsection">{name}</DocHeading>
        <DocParagraph>{description}</DocParagraph>
        <DocLink url={url} />
      </Fragment>
    ))}

    <DocHeading>{STRINGS.LEGAL_FONTS_TITLE}</DocHeading>

    <DocHeading level="subsection">{STRINGS.LEGAL_FONTS_ARABIC_TITLE}</DocHeading>
    {ARABIC_FONTS.map(font => (
      <DocCredit key={font.name} description={font.description} name={font.name} />
    ))}

    <DocHeading level="subsection">{STRINGS.LEGAL_FONTS_ENGLISH_TITLE}</DocHeading>
    {ENGLISH_FONTS.map(font => (
      <DocCredit key={font.name} description={font.description} name={font.name} />
    ))}

    <DocParagraph>{STRINGS.LEGAL_FONTS_SYSTEM_NOTE}</DocParagraph>

    <DocHeading>{STRINGS.LEGAL_LICENSE_INFO}</DocHeading>
    <DocHeading level="subsection">{STRINGS.LEGAL_SIL_OFL_TITLE}</DocHeading>
    <DocParagraph>{STRINGS.LEGAL_SIL_OFL_DESC}</DocParagraph>

    <DocHeading>{STRINGS.LEGAL_OPEN_SOURCE_TITLE}</DocHeading>
    <DocParagraph last>{STRINGS.LEGAL_OPEN_SOURCE_DESC}</DocParagraph>
  </LegalDocument>
);

export default LegalAttributionsScreen;
