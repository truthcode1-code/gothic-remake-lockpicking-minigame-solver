window.klaroConfig = {
  version: 1,
  elementID: 'klaro',
  storageMethod: 'localStorage',
  storageName: 'klaro-consent',
  htmlTexts: false,
  embedded: false,
  groupByPurpose: true,
  default: false,
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  noticeAsModal: false,
  translations: {
    en: {
      privacyPolicyUrl: './privacy.html',
      consentNotice: {
        description:
          'This solver stores your lock setup locally in this browser so it is still here after a reload.',
      },
      consentModal: {
        title: 'Privacy settings',
        description:
          'The app does not use analytics or advertising trackers. It only stores functional preferences needed for the solver experience.',
      },
      settingsStorage: {
        title: 'Remember setup',
        description:
          'Stores the current plate count, positions, links, and selected plate in localStorage on this device.',
      },
      purposes: {
        functional: {
          title: 'Functional storage',
          description: 'Required for remembering the current solver setup.',
        },
      },
    },
  },
  services: [
    {
      name: 'settingsStorage',
      title: 'Remember setup',
      purposes: ['functional'],
      required: true,
      default: true,
      cookies: ['gothic-lockpick-solver-state', 'klaro-consent'],
    },
  ],
};
