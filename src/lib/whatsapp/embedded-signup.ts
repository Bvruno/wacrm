const SDK_URL = 'https://connect.facebook.net/es_LA/sdk.js';
const GRAPH_VERSION = 'v21.0';

interface FbLoginResponse {
  authResponse?: {
    code?: string;
  } | null;
}

interface FbLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  extras: Record<string, unknown>;
}

interface FbSdk {
  init: (options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FbLoginResponse) => void,
    options: FbLoginOptions
  ) => void;
}

declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

export interface EmbeddedSignupResult {
  code: string;
  phoneNumberId: string;
  wabaId: string;
}

export class EmbeddedSignupError extends Error {
  constructor(
    public readonly reason: 'missing_env' | 'cancelled' | 'missing_ids',
    message: string
  ) {
    super(message);
    this.name = 'EmbeddedSignupError';
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(appId: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: GRAPH_VERSION,
      });
      resolve();
    };
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Failed to load Facebook SDK'));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

interface WaEmbeddedSignupMessage {
  type?: string;
  event?: string;
  data?: {
    phone_number_id?: string;
    waba_id?: string;
  };
}

export async function launchEmbeddedSignup(): Promise<EmbeddedSignupResult> {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID;
  if (!appId || !configId) {
    throw new EmbeddedSignupError(
      'missing_env',
      'NEXT_PUBLIC_META_APP_ID or NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID is not set'
    );
  }

  await loadSdk(appId);

  return new Promise<EmbeddedSignupResult>((resolve, reject) => {
    let phoneNumberId = '';
    let wabaId = '';

    const listener = (event: MessageEvent) => {
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }
      try {
        const raw: unknown =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const message = raw as WaEmbeddedSignupMessage;
        if (message.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (message.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          phoneNumberId = message.data?.phone_number_id ?? '';
          wabaId = message.data?.waba_id ?? '';
        }
      } catch {
        // non-JSON message — ignore
      }
    };

    const cleanup = () => window.removeEventListener('message', listener);
    window.addEventListener('message', listener);

    window.FB?.login(
      (response) => {
        cleanup();
        const code = response.authResponse?.code;
        if (!code) {
          reject(
            new EmbeddedSignupError(
              'cancelled',
              'Embedded Signup was cancelled before completing'
            )
          );
          return;
        }
        if (!phoneNumberId || !wabaId) {
          reject(
            new EmbeddedSignupError(
              'missing_ids',
              'Meta did not return the phone number and WABA identifiers'
            )
          );
          return;
        }
        resolve({ code, phoneNumberId, wabaId });
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v3' },
      }
    );
  });
}
