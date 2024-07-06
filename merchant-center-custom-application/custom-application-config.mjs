const config = {
    name: 'devpaydockapp',
    entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
    cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
    env: {
        development: {
            initialProjectKey: '${env:APP_PROJECT_KEY}',
        },
        production: {
            applicationId: '5fe10a7a-9140-4033-8282-9d5ff972dd43',
            url: 'https://mc-app-5fe10a7a-9140-4033-8282-9d5ff972dd43.europe-west1.gcp.commercetools.app',
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
        labelAllLocales: [],
        permissions: ['ViewCustomObjects'],
    },
    submenuLinks: [
        {
            uriPath: 'dev-paydock-app/liveconnection',
            defaultLabel: 'Live Connection',
            labelAllLocales: [],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'dev-paydock-app/widgetconfiguration',
            defaultLabel: 'Widget Configuration',
            labelAllLocales: [],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'dev-paydock-app/sandboxconnection',
            defaultLabel: 'Sandbox Connection',
            labelAllLocales: [],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'dev-paydock-app/channels',
            defaultLabel: 'Channels',
            labelAllLocales: [],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'dev-paydock-app/log',
            defaultLabel: 'Log',
            labelAllLocales: [],
            permissions: ['ViewCustomObjects'],
        },
        {
            uriPath: 'dev-paydock-app/orders',
            defaultLabel: 'Orders',
            labelAllLocales: [],
            permissions: ['ViewOrders'],
        },
    ],
    headers: {
        csp: {
            'connect-src': [
                '\'self\'',
                'https://api.europe-west1.gcp.commercetools.com',
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