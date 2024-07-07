const config = {
    name: 'devpaydockapp',
    entryPointUriPath: 'dev-paydock-app',
    cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
    env: {
        development: {
            initialProjectKey: '${env:APP_PROJECT_KEY}',
        },
        production: {
            applicationId: '${env:CUSTOM_APPLICATION_ID}',
            url: '${env:APPLICATION_URL}',
        },
    },

    additionalEnv: {
        clientId: '${env:APP_CLIENT_ID}',
        clientSecret: '${env:APP_CLIENT_SECRET}',
        projectKey: '${env:APP_PROJECT_KEY}',
        region: '${env:APP_REGION}',
        notificationUrl: '${env:APP_NOTIFICATION_URL}',
    },
    oAuthScopes: {
        view: ['view_custom_objects', 'view_custom_types', 'view_orders'],
        manage: ['manage_custom_objects', 'manage_custom_types', 'manage_orders'],
    },
    icon: '${path:@commercetools-frontend/assets/application-icons/rocket.svg}',
    mainMenuLink: {
        defaultLabel: 'Paydock Settings',
        uriPath: 'dev-paydock-app',
        labelAllLocales: [
            { locale: 'EN-GB', label: 'Paydock Settings' },
            { locale: 'en', label: 'Paydock Settings' },
            { locale: 'de', label: 'Paydock Settings' }
        ],
        permissions: ['ViewCustomObjects'],
    },
    submenuLinks: [
        {
            uriPath: 'liveconnection',
            defaultLabel: 'Live Connection',
            labelAllLocales: [
                { locale: 'EN-GB', label: 'Live Connection' },
                { locale: 'en', label: 'Live Connection' },
                { locale: 'de', label: 'Live Connection' }
            ],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'widgetconfiguration',
            defaultLabel: 'Widget Configuration',
            labelAllLocales: [
                { locale: 'EN-GB', label: 'Widget Configuration' },
                { locale: 'en', label: 'Widget Configuration' },
                { locale: 'de', label: 'Widget Configuration' }
            ],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'sandboxconnection',
            defaultLabel: 'Sandbox Connection',
            labelAllLocales: [
                { locale: 'EN-GB', label: 'Sandbox Connection' },
                { locale: 'en', label: 'Sandbox Connection' },
                { locale: 'de', label: 'Sandbox Connection' }
            ],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'log',
            defaultLabel: 'Log',
            labelAllLocales: [
                { locale: 'EN-GB', label: 'Log' },
                { locale: 'en', label: 'Log' },
                { locale: 'de', label: 'Log' }
            ],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'orders',
            defaultLabel: 'Orders',
            labelAllLocales: [
                { locale: 'EN-GB', label: 'Orders' },
                { locale: 'en', label: 'Orders' },
                { locale: 'de', label: 'Orders' }
            ],
            permissions: ['ViewOrders'],
        },
    ],
    headers: {
        csp: {
            'connect-src': [
                '\'self\'',
                'https://api.europe-west1.gcp.commercetools.com',
                '${env:APPLICATION_URL}',
                'https://auth.europe-west1.gcp.commercetools.com/oauth/token',
                'https://auth.europe-west1.gcp.commercetools.com',
                'https://mc-api.europe-west1.gcp.commercetools.com/graphql',
                'https://jsp-test-six.vercel.app',
                'https://mc-api.europe-west1.gcp.commercetools.com',
                'https://api.paydock-commercetool-app.jetsoftpro.dev',
                'http://localhost:3003',
                'http://localhost:3001',
                'https://api-sandbox.paydock.com',
                'https://api.paydock.com'
            ],
            'script-src': [
                '\'self\'',
                '\'unsafe-inline\'',
                '\'unsafe-eval\'',
                'https://api.europe-west1.gcp.commercetools.com',
                '${env:APPLICATION_URL}',
                'https://auth.europe-west1.gcp.commercetools.com/oauth/token',
                'https://auth.europe-west1.gcp.commercetools.com',
                'https://mc-api.europe-west1.gcp.commercetools.com/graphql',
                'https://mc-api.europe-west1.gcp.commercetools.com',
                'https://api.paydock-commercetool-app.jetsoftpro.dev',
                'https://jsp-test-six.vercel.app',
                'http://localhost:3001',
                'http://localhost:3003',
                'https://api-sandbox.paydock.com',
                'https://api.paydock.com'
            ],
            'style-src': [
                '\'self\'',
                '\'unsafe-inline\'',
                'https://fonts.googleapis.com'
            ],
            'img-src': [
                '\'self\'',
                'data:',
                'https:'
            ],
            'font-src': [
                '\'self\'',
                'https://fonts.gstatic.com'
            ],
            'frame-src': [
                '\'self\'',
                'https://api.europe-west1.gcp.commercetools.com',
                '${env:APPLICATION_URL}',
                'https://auth.europe-west1.gcp.commercetools.com/oauth/token',
                'https://auth.europe-west1.gcp.commercetools.com',
                'https://jsp-test-six.vercel.app',
                'http://localhost:3003',
                'http://localhost:3001',
                'https://api-sandbox.paydock.com',
                'https://api.paydock.com'
            ],
        },
    },
};

export default config;