import {
  DocEffectiveDate,
  DocHeading,
  DocParagraph,
  LegalDocument,
} from '@/components/common/LegalDocument';
import { EmailLink } from '@/components/common/EmailLink';
import { Fragment, type FC } from 'react';

import { STRINGS } from '@/constants/strings';

/** A section is a heading plus either a body or a list of labelled subsections. */
interface Section {
  title: string;
  body?: string;
  subsections?: { title: string; body: string }[];
}

const SECTIONS: Section[] = [
  {
    title: STRINGS.PRIVACY_COLLECTION_TITLE,
    subsections: [
      { title: STRINGS.PRIVACY_COLLECTION_ACCOUNT, body: STRINGS.PRIVACY_COLLECTION_ACCOUNT_DESC },
      {
        title: STRINGS.PRIVACY_COLLECTION_LEARNING,
        body: STRINGS.PRIVACY_COLLECTION_LEARNING_DESC,
      },
      {
        title: STRINGS.PRIVACY_COLLECTION_ANALYTICS,
        body: STRINGS.PRIVACY_COLLECTION_ANALYTICS_DESC,
      },
    ],
  },
  { title: STRINGS.PRIVACY_USE_TITLE, body: STRINGS.PRIVACY_USE },
  {
    title: STRINGS.PRIVACY_THIRD_PARTY_TITLE,
    subsections: [
      {
        title: STRINGS.PRIVACY_THIRD_PARTY_SUPABASE,
        body: STRINGS.PRIVACY_THIRD_PARTY_SUPABASE_DESC,
      },
      {
        title: STRINGS.PRIVACY_THIRD_PARTY_MIXPANEL,
        body: STRINGS.PRIVACY_THIRD_PARTY_MIXPANEL_DESC,
      },
      { title: STRINGS.PRIVACY_THIRD_PARTY_SENTRY, body: STRINGS.PRIVACY_THIRD_PARTY_SENTRY_DESC },
      { title: STRINGS.PRIVACY_THIRD_PARTY_META, body: STRINGS.PRIVACY_THIRD_PARTY_META_DESC },
      { title: STRINGS.PRIVACY_THIRD_PARTY_AUTH, body: STRINGS.PRIVACY_THIRD_PARTY_AUTH_DESC },
    ],
  },
  { title: STRINGS.PRIVACY_SECURITY_TITLE, body: STRINGS.PRIVACY_SECURITY },
];

const TAIL_SECTIONS: { title: string; body: string }[] = [
  { title: STRINGS.PRIVACY_CHILDREN_TITLE, body: STRINGS.PRIVACY_CHILDREN },
  { title: STRINGS.PRIVACY_CHANGES_TITLE, body: STRINGS.PRIVACY_CHANGES },
];

/**
 * The privacy policy, rendered once and mounted by two routes — the account
 * settings copy and the pre-signup auth copy. They were separate ~196-line
 * files that had already diverged.
 */
export const PrivacyPolicyContent: FC = () => (
  <LegalDocument>
    <DocEffectiveDate>{STRINGS.PRIVACY_EFFECTIVE_DATE}</DocEffectiveDate>
    <DocParagraph>{STRINGS.PRIVACY_INTRO}</DocParagraph>

    {SECTIONS.map(({ title, body, subsections }) => (
      <Fragment key={title}>
        <DocHeading>{title}</DocHeading>
        {body ? <DocParagraph>{body}</DocParagraph> : null}
        {subsections?.map(subsection => (
          <Fragment key={subsection.title}>
            <DocHeading level="subsection">{subsection.title}</DocHeading>
            <DocParagraph>{subsection.body}</DocParagraph>
          </Fragment>
        ))}
      </Fragment>
    ))}

    {/* Carries an inline mail link, so it can't come from the data list. */}
    <DocHeading>{STRINGS.PRIVACY_RIGHTS_TITLE}</DocHeading>
    <DocParagraph>
      {STRINGS.PRIVACY_RIGHTS}
      <EmailLink email={STRINGS.CONTACT_EMAIL} />
    </DocParagraph>

    {TAIL_SECTIONS.map(({ title, body }) => (
      <Fragment key={title}>
        <DocHeading>{title}</DocHeading>
        <DocParagraph>{body}</DocParagraph>
      </Fragment>
    ))}

    <DocHeading>{STRINGS.PRIVACY_CONTACT_TITLE}</DocHeading>
    <DocParagraph last>
      {STRINGS.PRIVACY_CONTACT}
      <EmailLink email={STRINGS.CONTACT_EMAIL} />
      {STRINGS.PRIVACY_CONTACT_SUFFIX}
    </DocParagraph>
  </LegalDocument>
);
