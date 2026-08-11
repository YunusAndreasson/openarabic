import {
  DocEffectiveDate,
  DocHeading,
  DocParagraph,
  LegalDocument,
} from '@/components/common/LegalDocument';
import { EmailLink } from '@/components/common/EmailLink';
import { Fragment, type FC } from 'react';

import { STRINGS } from '@/constants/strings';

/** Ordered title/body pairs — the document is data, not markup. */
const SECTIONS: { title: string; body: string }[] = [
  { title: STRINGS.TERMS_SERVICE_DESCRIPTION_TITLE, body: STRINGS.TERMS_SERVICE_DESCRIPTION },
  { title: STRINGS.TERMS_ACCOUNT_TITLE, body: STRINGS.TERMS_ACCOUNT },
  { title: STRINGS.TERMS_ACCEPTABLE_USE_TITLE, body: STRINGS.TERMS_ACCEPTABLE_USE },
  { title: STRINGS.TERMS_CONTENT_TITLE, body: STRINGS.TERMS_CONTENT },
  { title: STRINGS.TERMS_USER_DATA_TITLE, body: STRINGS.TERMS_USER_DATA },
  { title: STRINGS.TERMS_DISCLAIMER_TITLE, body: STRINGS.TERMS_DISCLAIMER },
  { title: STRINGS.TERMS_LIABILITY_TITLE, body: STRINGS.TERMS_LIABILITY },
  { title: STRINGS.TERMS_CHANGES_TITLE, body: STRINGS.TERMS_CHANGES },
  { title: STRINGS.TERMS_TERMINATION_TITLE, body: STRINGS.TERMS_TERMINATION },
];

/**
 * The terms of service, rendered once and mounted by two routes — the account
 * settings copy and the pre-signup auth copy. They were separate 150-line files
 * that had already diverged.
 */
export const TermsOfServiceContent: FC = () => (
  <LegalDocument>
    <DocEffectiveDate>{STRINGS.TERMS_EFFECTIVE_DATE}</DocEffectiveDate>
    <DocParagraph>{STRINGS.TERMS_INTRO}</DocParagraph>

    {SECTIONS.map(({ title, body }) => (
      <Fragment key={title}>
        <DocHeading>{title}</DocHeading>
        <DocParagraph>{body}</DocParagraph>
      </Fragment>
    ))}

    <DocHeading>{STRINGS.TERMS_CONTACT_TITLE}</DocHeading>
    <DocParagraph last>
      {STRINGS.TERMS_CONTACT}
      <EmailLink email={STRINGS.CONTACT_EMAIL} />
    </DocParagraph>
  </LegalDocument>
);
